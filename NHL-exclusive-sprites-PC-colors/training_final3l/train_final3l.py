#!/usr/bin/env python3
"""final3l: retrain per-colour zone classifiers on 94G training pairs + Abdul's
completed exclusive frames. The 55 held-out skaters stay held out. 3 Abdul fight
frames (357, 360, 368) are also held out to score his style.

94G features: context + full kfeats (joints/parts/base).
Abdul 93G features: context + zeros for kfeats + flag.
"""
import os,sys,json,pickle,collections
import numpy as np
import joblib
from sklearn.ensemble import HistGradientBoostingClassifier
from PIL import Image

sys.path[:0]=[
  '/workspace/g94-to-pc-zones/v5/final3j/work',
  '/workspace/g94-to-pc-zones/v5/final3c/work',
  '/workspace/wt-exclusive/NHL-exclusive-sprites-PC-colors/tools',
]
import percolor as PC
from percolor import (
  A,PR,pairs,split,kfeats,aligned_arrays,lab,COLOURS,CLS,NC,ndi,TE
)

ROOT='/workspace/g94-to-pc-zones/v5/final3l/'
WORK=ROOT+'work/'
ABDIR='/workspace/wt-exclusive/NHL-exclusive-sprites-PC-colors/frames_pc/'
J3='/workspace/g94-to-pc-zones/v5/final3j/'
HOLD_ABDUL=(357,360,368)  # ready, high punch, hit — FULL frames, held out of training
KFEAT_DIM=152
ORIENT_DIM=35
os.makedirs(WORK,exist_ok=True)

import json as _json
_ORIENT={ (r['game'],int(r['frame'])):r for r in _json.load(open('/workspace/g94-to-pc-zones/v5/final3l/orient/orientation_table.json')) }
BODY=('front','qfront_right','side_right','qback_right','back','qback_left','side_left','qfront_left')
def orient_vec(game, n):
  """35-d frame-level orientation/crest features, tiled per pixel in unified()."""
  r=_ORIENT.get((game,int(n)), {})
  v=np.zeros(35, np.float32)
  d=r.get('dir')
  if d is not None:
    v[int(d)%8]=1.0
  body=r.get('body')
  if body in BODY:
    v[8+BODY.index(body)]=1.0
  yaw=r.get('yaw')
  if yaw is not None:
    import math
    v[16]=math.sin(math.radians(float(yaw)))
    v[17]=math.cos(math.radians(float(yaw)))
  crest=r.get('crest')
  if crest=='visible': v[18]=1
  elif crest=='partial': v[19]=1
  elif crest=='none': v[20]=1
  if r.get('near_arm')=='left': v[21]=1
  elif r.get('near_arm')=='right': v[22]=1
  v[23]=float(r.get('conf') or 0)
  src=r.get('source') or ''
  if 'anim' in src and 'visual' not in src and 'ambiguous' not in src: v[24]=1
  elif 'visual' in src: v[25]=1
  if 'ambiguous' in src: v[26]=1
  dirs=(r.get('anim') or {}).get('dirs') or []
  for dd in dirs:
    if isinstance(dd,int) and 0<=dd<8: v[27+dd]=1
  return v

def ctx_feats(g):
  g=g.astype(int); H,W=g.shape
  cl=np.vectorize(lambda v: CLS.get(int(v),10))(g)
  oh=np.stack([(cl==k).astype(float) for k in range(NC)],-1)
  def mixes(sz):
    return np.stack([ndi.uniform_filter(oh[...,k],sz,mode='constant') for k in range(NC)],-1).reshape(-1,NC)
  dts=np.stack([
    ndi.distance_transform_edt(cl!=k) if (cl==k).any() else np.full(g.shape,40.)
    for k in range(NC)],-1).reshape(-1,NC)
  ys,xs=np.nonzero(g>0)
  if len(ys)==0:
    box=np.zeros((H*W,3))
  else:
    y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
    yy,xx=np.mgrid[0:H,0:W]
    yr=((yy-y0)/max(1,y1-y0)).ravel()
    xr=((xx-x0)/max(1,x1-x0)).ravel()
    box=np.stack([yr,xr,1.0-yr],1)
  def sh(dy,dx):
    o=np.full(g.shape,-1)
    ys_,xs_=np.mgrid[0:H,0:W]
    yy2=ys_+dy; xx2=xs_+dx
    ok=(yy2>=0)&(yy2<H)&(xx2>=0)&(xx2<W)
    o[ok]=g[yy2[ok],xx2[ok]]
    return o.ravel()
  nb=np.stack([sh(-1,0),sh(1,0),sh(0,-1),sh(0,1),sh(-2,0),sh(2,0)],1)
  return np.concatenate([mixes(3),mixes(5),mixes(7),dts,box,nb],1)

def unified(g, kX=None, is_abdul=0, game='94G', n=None):
  C=ctx_feats(g)
  N=C.shape[0]
  if kX is None:
    kX=np.zeros((N,KFEAT_DIM),np.float32)
  flag=np.full((N,1), float(is_abdul), np.float32)
  ov=orient_vec(game if not is_abdul else '93G', n if n is not None else -1)
  O=np.tile(ov,(N,1))
  return np.concatenate([C, kX.astype(np.float32), flag, O],1)

def famname(v):
  if v is None or int(v)<0 or int(v)==255: return None
  f=lab(int(v))
  return f

def apply_pcpal_overrides(n, idx):
  """Where the grey IF layer disagrees with IF00xx PC PAL, use PC PAL (guide colour -> index)."""
  import paths
  BP,GIDX=paths.guide()
  GUIDE={tuple(int(x) for x in BP[i]):int(i) for i in GIDX}
  pkl='/workspace/wt-exclusive/NHL-exclusive-sprites-PC-colors/tools/work/recon.pkl'
  data=pickle.load(open(pkl,'rb'))
  by={item[0]:item for item in data}
  name=f'IF00{n-354+12} PC PAL' if False else None
  # map by frame number
  pal=None
  for nm,item in by.items():
    if item[2]==n and str(item[0]).endswith('PC PAL'):
      pal=item; break
  if pal is None:
    return idx, []
  _,a,f,al,_=pal
  s,mir,yo,xo=al
  H,W=idx.shape
  changes=[]
  out=idx.copy()
  for gy,gx in zip(*np.where(idx!=255)):
    gx2=(W-1-gx) if mir else gx
    ly,lx=gy+yo, gx2+xo
    if not (0<=ly<a.shape[0] and 0<=lx<a.shape[1]):
      continue
    rgb=tuple(int(t) for t in a[ly,lx,:3])
    ip=GUIDE.get(rgb)
    if ip is None: continue
    old=int(out[gy,gx])
    if old!=ip:
      out[gy,gx]=ip
      changes.append((int(gx),int(gy),old,ip))
  return out, changes

def load_abdul_frame(n):
  path=ABDIR+f'93_{n}.png'
  if not os.path.exists(path):
    return None
  idx=np.array(Image.open(path)).astype(np.int16)
  ch=[]
  if n==354 or True:
    idx2,ch=apply_pcpal_overrides(n, idx)
    idx=idx2
  return idx, ch

def list_abdul_usable():
  """FULL and PART frames with some completed PC pixels. Skip NONE/empty."""
  import csv
  rows=list(csv.DictReader(open('/workspace/wt-exclusive/NHL-exclusive-sprites-PC-colors/status/frame_status.csv')))
  out=[]
  for r in rows:
    n=int(r['frame'])
    st=r['status']
    if st in ('TODO (no layer)','NONE'):
      continue
    if not os.path.exists(ABDIR+f'93_{n}.png'):
      continue
    out.append((n,st,r['group']))
  return out

def main():
  sk=pairs('skater'); tr,te=split(sk)
  held94=sorted(int(n) for n,o in te)
  train94=sorted(int(n) for n,o in tr)
  goalie_held=sorted(int(n) for n,o in TE)
  assert len(te)==55, len(te)
  assert len(set(held94)&set(train94))==0

  split_doc=dict(
    held_out_skaters=held94,
    train_skaters=train94,
    held_out_goalies=goalie_held,
    held_out_abdul_fight=list(HOLD_ABDUL),
    split='pairs(skater) every 5th is held (i%5==0); 55 frames, never trained on',
    abdul_hold_reason='357 ready, 360 high punch, 368 hit — full frames, diverse fight poses',
  )
  json.dump(split_doc, open(WORK+'heldout_lists.json','w'), indent=1)
  print('held skaters',len(held94),'train',len(train94),'goalie held',len(goalie_held),'abdul hold',HOLD_ABDUL)

  # --- Abdul labels ---
  usable=list_abdul_usable()
  abdul_train=[]; abdul_hold=[]; conflicts={}
  for n,st,group in usable:
    idx,ch=load_abdul_frame(n)
    if ch:
      conflicts[n]=[(x,y,a,b) for x,y,a,b in ch]
      print(f'  PC PAL overrides on {n}: {len(ch)} px', collections.Counter((a,b) for *_,a,b in ch).most_common(8))
    g=A['G93'][n].astype(int)
    if idx.shape!=g.shape:
      print('SHAPE skip',n,idx.shape,g.shape); continue
    rec=dict(n=n,status=st,group=group,idx=idx,g=g)
    if n in HOLD_ABDUL:
      abdul_hold.append(rec)
    else:
      abdul_train.append(rec)
  json.dump({str(k):v for k,v in conflicts.items()}, open(WORK+'pcpal_overrides.json','w'), indent=1)
  print('Abdul train frames', [r['n'] for r in abdul_train], 'hold', [r['n'] for r in abdul_hold])

  # --- gather examples ---
  data={'train':collections.defaultdict(lambda:[[],[]]),
        'held94':collections.defaultdict(lambda:[[],[]]),
        'held_abdul':collections.defaultdict(lambda:[[],[]])}
  extra94=collections.defaultdict(list)  # (lab_3i, lab_3j, n)

  print('collecting 94G training pairs…')
  for n,o in tr:
    Xk,g=kfeats(n)
    X=unified(g, Xk, is_abdul=0, game="94G", n=n)
    _,p=aligned_arrays(n,o); p=p.astype(int).ravel(); gr=g.ravel()
    for i in np.nonzero((gr>0)&(p>=0)&(p!=255))[0]:
      c=int(gr[i])
      if c not in COLOURS: continue
      f=famname(p[i])
      if not f: continue
      data['train'][c][0].append(X[i]); data['train'][c][1].append(f)

  print('collecting 94G held-out (eval only)…')
  for n,o in te:
    Xk,g=kfeats(n)
    X=unified(g, Xk, is_abdul=0, game="94G", n=n)
    _,p=aligned_arrays(n,o); p=p.astype(int).ravel(); gr=g.ravel()
    ci=np.load(J3.replace('final3j','final3i')+f'npy/g94_{n}_pcidx.npy').astype(int).ravel()
    cj=np.load(J3+f'npy/g94_{n}_pcidx.npy').astype(int).ravel()
    ck=np.load(J3+f'k/npy/g94_{n}_pcidx.npy').astype(int).ravel() if os.path.exists(J3+f'k/npy/g94_{n}_pcidx.npy') else cj
    for i in np.nonzero((gr>0)&(p>=0)&(p!=255))[0]:
      c=int(gr[i])
      if c not in COLOURS: continue
      f=famname(p[i])
      if not f: continue
      data['held94'][c][0].append(X[i]); data['held94'][c][1].append(f)
      extra94[c].append((famname(ci[i]) or '', famname(cj[i]) or '', famname(ck[i]) or '', n))

  def add_abdul(recs, bucket):
    px=0
    for r in recs:
      g=r['g']; idx=r['idx']
      X=unified(g, None, is_abdul=1, game='93G', n=r['n'])
      gr=g.ravel(); pr=idx.ravel()
      for i in np.nonzero((gr>0)&(pr!=255)&(pr>=0))[0]:
        c=int(gr[i])
        if c not in COLOURS: continue
        f=famname(pr[i])
        if not f: continue
        data[bucket][c][0].append(X[i]); data[bucket][c][1].append(f); px+=1
    return px
  ntr=add_abdul(abdul_train,'train')
  nte=add_abdul(abdul_hold,'held_abdul')
  print('Abdul pixels added to train',ntr,'held_abdul',nte)

  # --- train ---
  models={}; rep=[]
  for c in COLOURS:
    Xtr,ytr=data['train'][c]
    if len(ytr)<20:
      print('skip colour',c,'train',len(ytr)); continue
    cnt=collections.Counter(ytr); keep={k for k,v in cnt.items() if v>=8}
    ytr2=[y if y in keep else 'other' for y in ytr]
    Xtr=np.asarray(Xtr, np.float32)
    if len(set(ytr2))==1:
      models[c]=('const', ytr2[0])
    else:
      clf=HistGradientBoostingClassifier(
        max_iter=250, learning_rate=0.08, max_leaf_nodes=31,
        l2_regularization=1.0, random_state=0)
      clf.fit(Xtr, ytr2)
      models[c]=('clf', clf)
    def ev(bucket):
      Xte,yte=data[bucket][c]
      if not yte: return None
      pr=[models[c][1]]*len(yte) if models[c][0]=='const' else models[c][1].predict(np.asarray(Xte,np.float32))
      yte=np.array(yte); pr=np.array(pr)
      return float((pr==yte).mean()), int(len(yte)), collections.Counter((a,b) for a,b in zip(yte,pr) if a!=b).most_common(3)
    row=dict(colour=int(c), classes=sorted(set(ytr2)), n_train=int(len(ytr2)),
             train_dist=collections.Counter(ytr2).most_common(8))
    h=ev('held94')
    if h:
      acc,npix,conf=h
      ei=np.array([e[0] for e in extra94[c]]); ej=np.array([e[1] for e in extra94[c]]); ek=np.array([e[2] for e in extra94[c]])
      yte=np.array(data['held94'][c][1])
      row.update(held94_px=npix, acc=acc,
                 acc_final3i=float((ei==yte).mean()),
                 acc_final3j=float((ej==yte).mean()),
                 acc_final3jK=float((ek==yte).mean()),
                 top_confusions=[(f'PC {a} -> pred {b}',k) for (a,b),k in conf])
    ha=ev('held_abdul')
    if ha:
      acc,npix,conf=ha
      row.update(held_abdul_px=npix, acc_abdul=acc,
                 abdul_confusions=[(f'PC {a} -> pred {b}',k) for (a,b),k in conf])
    rep.append(row)
    print(f"  colour {c}: train {row['n_train']} held94 {row.get('held94_px',0)} acc {row.get('acc')} "
          f"(3i {row.get('acc_final3i')} 3j {row.get('acc_final3j')} K {row.get('acc_final3jK')}) "
          f"abdul {row.get('acc_abdul')} n={row.get('held_abdul_px')}")

  # overall
  def overall(key_acc, key_n):
    num=sum(r[key_acc]*r[key_n] for r in rep if key_acc in r and key_n in r)
    den=sum(r[key_n] for r in rep if key_acc in r and key_n in r)
    return (num/den if den else None), den
  o,n=overall('acc','held94_px')
  oi,ni=overall('acc_final3i','held94_px')
  oj,nj=overall('acc_final3j','held94_px')
  ok,nk=overall('acc_final3jK','held94_px')
  oa,na=overall('acc_abdul','held_abdul_px')
  summary=dict(held94_acc_final3l=o, held94_acc_final3i=oi, held94_acc_final3j=oj, held94_acc_final3jK=ok,
               held94_px=n, held_abdul_acc=oa, held_abdul_px=na,
               colour_40=next((r for r in rep if r['colour']==40),None),
               colour_42=next((r for r in rep if r['colour']==42),None))
  print('OVERALL held94 final3l %.3f  3i %.3f  3j %.3f  K %.3f  n=%d'%(o or 0, oi or 0, oj or 0, ok or 0, n or 0))
  print('OVERALL held Abdul %.3f n=%d'%(oa or 0, na or 0))

  joblib.dump(models, WORK+'percolor_final3l.joblib', compress=3)
  json.dump(rep, open(WORK+'percolor_report.json','w'), indent=1, default=lambda o: int(o) if isinstance(o,np.integer) else o)
  json.dump(summary, open(WORK+'train_summary.json','w'), indent=1, default=lambda o: float(o) if isinstance(o,float) else (int(o) if isinstance(o,np.integer) else o))
  # also a small meta
  sz=os.path.getsize(WORK+'percolor_final3l.joblib')
  print('wrote models', WORK+'percolor_final3l.joblib', 'bytes', sz)
  json.dump(dict(feature='ctx53 + kfeats152 + abdul_flag', kfeat_dim=KFEAT_DIM,
                 hold_abdul=list(HOLD_ABDUL), model_bytes=sz), open(WORK+'model_meta.json','w'), indent=1)

if __name__=='__main__':
  main()
