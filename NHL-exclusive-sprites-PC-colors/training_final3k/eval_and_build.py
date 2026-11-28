#!/usr/bin/env python3
"""Build final3k hybrid npy for held-out 94G skaters (and copy J for goalies),
score vs_pc vs final3i/J/K, and convert exclusive 94G + 93G fight AUTO/PART fills."""
import os,sys,json,collections
import numpy as np
import joblib
from PIL import Image

sys.path[:0]=[
  '/workspace/g94-to-pc-zones/v5/final3k/work',
  '/workspace/g94-to-pc-zones/v5/final3j/work',
  '/workspace/g94-to-pc-zones/v5/final3c/work',
  '/workspace/g94-to-pc-zones/v4/work',
  '/workspace/wt-exclusive/NHL-exclusive-sprites-PC-colors/tools',
]
from train_final3k import unified, ctx_feats, famname, apply_pcpal_overrides, HOLD_ABDUL, ROOT, WORK, ABDIR, J3
from percolor import A,PR,pairs,split,kfeats,aligned_arrays,lab,COLOURS,at,LV,shade_of,FM,TE,pcfam,SH,ndi
import armmodels,socks3i
from teams import teamact

MODELS=joblib.load(WORK+'percolor_final3k.joblib')
ZONEC=(35,36,37,40,41,42,43,44,45)
NONLINE={'jersey','yoke 1','yoke 2','yoke 3','upper arm','forearm','pants','socks','helmet'}
F3I='/workspace/g94-to-pc-zones/v5/final3i/'
F3JK=J3+'k/'
OUT=ROOT
os.makedirs(OUT+'npy',exist_ok=True)
os.makedirs(OUT+'k/npy',exist_ok=True)
os.makedirs(OUT+'exclusive/npy',exist_ok=True)

FIXED={33:8,34:0,38:133,39:135,46:136,47:88}
BLOOD={28:78,29:76}
ICECHIP={1:89,2:89}
GSHADE={35:'dark',36:'medium',37:'light',40:'dark',41:'medium',42:'medium',43:'medium',44:'light',45:'dark'}

def kpred_unified(n, is_abdul=0, g=None):
  if is_abdul:
    if g is None: g=A['G93'][n].astype(int)
    X=unified(g, None, is_abdul=1)
  else:
    Xk,g=kfeats(n)
    X=unified(g, Xk, is_abdul=0)
  H,W=g.shape
  pr=np.full(H*W,'',object); gr=g.ravel()
  for c in ZONEC:
    if c not in MODELS: continue
    i=np.nonzero(gr==c)[0]
    if len(i)==0: continue
    kind,m=MODELS[c]
    pr[i]=m if kind=='const' else m.predict(X[i])
  pr=pr.reshape(H,W)
  return pr,(pr!='')&(pr!='other'), g

def apply_nonline(out, g, kp, km):
  """Overwrite NONLINE families with classifier at(fam, shade)."""
  from percolor import famof
  fam=famof(out); nch=0
  H,W=g.shape
  for y,x in zip(*np.nonzero(km & np.isin(fam, list(NONLINE)))):
    f=kp[y,x]
    if f in NONLINE and f!=fam[y,x]:
      sh=GSHADE.get(int(g[y,x])) or (LV.get(int(g[y,x])) if hasattr(LV,'get') else None) or shade_of(out[y,x])
      out[y,x]=at(f, sh); nch+=1
  return out, nch

def spit_rt(idx):
  from ppv95 import encode_pic, decode_pic
  h,w=idx.shape
  hdr=bytes([0x81,2,4,8])+bytes(12)
  px=np.clip(idx,0,255).astype(np.uint8)
  back=decode_pic(encode_pic(hdr,w,h,px.tobytes()))
  return back['pixels']==px.tobytes()

def png_rt(idx, path):
  arr=np.clip(idx,0,255).astype(np.uint8)
  im=Image.fromarray(arr,'P')
  im.putpalette([int(v) for v in SH.ravel()])
  os.makedirs(os.path.dirname(path), exist_ok=True)
  im.save(path, transparency=255)
  b=Image.open(path)
  return np.array_equal(np.array(b),arr) and np.array_equal(np.array(b.getpalette()[:768]).reshape(256,3),SH)

def vs_pc_row(c,p,g):
  """vs_pc, zone_vs_pc, vs_genesis, n — same as verifyk.rs_"""
  from stripes3d import FL,gclass,eclass,Z
  m=(g>0)&(p>=0)&(c!=255)
  ys,xs=np.nonzero(m)
  if len(ys)==0:
    return np.zeros(4)
  v0=sum(tuple(FL[c[y,x]])==tuple(FL[p[y,x]]) for y,x in zip(ys,xs))
  def z(v):
    return pcfam(v) if 144<=v<=191 else v
  v1=sum(z(c[y,x])==z(p[y,x]) for y,x in zip(ys,xs))
  v2=sum(gclass(g[y,x])==eclass(c[y,x],Z) for y,x in zip(ys,xs))
  return np.array([v0,v1,v2,len(ys)], float)

SF=['arm stripe 1','arm stripe 2','arm stripe 3','waist 1','waist 2','waist 3',
    'pants stripe 1','pants stripe 2','socks stripe 1','socks stripe 2']

def score_set(frames_and_pairs, Cmaps, kind):
  """Cmaps: name -> array same shape as g."""
  from stripes3d import famv as _fv
  famv=np.vectorize(lambda v: pcfam(v) if 144<=v<=191 else '')
  Sm={k:np.zeros(4) for k in Cmaps}
  Sw={k:np.zeros(4) for k in Cmaps}
  # frames_and_pairs is list of (n,o,arrays_dict)
  for n,o,arrs in frames_and_pairs:
    g,p=aligned_arrays(n,o); g=g.astype(int)
    sm=np.zeros(g.shape,bool)
    for c in arrs.values():
      sm |= np.isin(famv(c), SF)
    pstripe=ndi.binary_dilation(np.isin(famv(np.where(p>=0,p,255)),SF), np.ones((3,3)), iterations=2)
    for k,c in arrs.items():
      Sm[k]+=vs_pc_row(c,p,g)
      Sw[k]+=vs_pc_row(c,p,g, ) if False else _stripe(c,p,g,sm)
  # fix stripe: use mask sm
  return Sm,Sw

def _stripe(c,p,g,sm):
  return vs_pc_row(c,p,g) if sm is None else vs_pc_row_mask(c,p,g,sm)

def vs_pc_row_mask(c,p,g,sm):
  from stripes3d import FL
  m=sm&(g>0)&(p>=0)&(c!=255)
  ys,xs=np.nonzero(m)
  if len(ys)==0: return np.zeros(4)
  v0=sum(tuple(FL[c[y,x]])==tuple(FL[p[y,x]]) for y,x in zip(ys,xs))
  def z(v):
    return pcfam(v) if 144<=v<=191 else v
  from stripes3d import gclass,eclass,Z
  v1=sum(z(c[y,x])==z(p[y,x]) for y,x in zip(ys,xs))
  v2=sum(gclass(g[y,x])==eclass(c[y,x],Z) for y,x in zip(ys,xs))
  return np.array([v0,v1,v2,len(ys)],float)

def build_hybrid_skater(n):
  """J base + new KPRED for arm/sock chooser + NONLINE override."""
  import run3g, runk
  # set KPRED via our kp
  kp,km=kpred_unified(n, is_abdul=0)
  armmodels.KPRED[0]=(kp,km)
  socks3i.KPRED[0]=(kp,km)
  try:
    res=runk.buildk(n, 'M') if False else _build_with_kpred(n)
  finally:
    armmodels.KPRED[0]=None; socks3i.KPRED[0]=None
  return res

def _build_with_kpred(n):
  import run3g
  kp,km,g=kpred_unified(n, is_abdul=0)
  armmodels.KPRED[0]=(kp,km)
  socks3i.KPRED[0]=(kp,km)
  try:
    res=run3g.build(n,'M')
    out,P,J,how,log,eyes,ne=res
    out,nch=apply_nonline(out.astype(int), g, kp, km)
    log.append(dict(part='percolor_final3k', changed=nch))
    return out,P,J,how,log,eyes,ne
  finally:
    armmodels.KPRED[0]=None
    socks3i.KPRED[0]=None

def eval_heldout():
  print('evaluating held-out 94G…')
  tr,te=split(pairs('skater'))
  # skaters
  Sm={k:np.zeros(4) for k in ('final3i','final3j','final3jK','final3k')}
  Sw={k:np.zeros(4) for k in Sm}
  famv=np.vectorize(lambda v: pcfam(v) if 144<=v<=191 else '')
  spit_ok=0; png_ok=0; nfr=0; invalid=[]
  for n,o in te:
    g,p=aligned_arrays(n,o); g=g.astype(int)
    out,P,J,how,log,eyes,ne=_build_with_kpred(n)
    out=np.asarray(out).astype(int)
    np.save(OUT+f'npy/g94_{n}_pcidx.npy', out.astype(np.int16))
    Ci={
      'final3i':np.load(F3I+f'npy/g94_{n}_pcidx.npy').astype(int),
      'final3j':np.load(J3+f'npy/g94_{n}_pcidx.npy').astype(int),
      'final3jK':np.load(F3JK+f'npy/g94_{n}_pcidx.npy').astype(int),
      'final3k':out,
    }
    sm=np.zeros(g.shape,bool)
    for c in Ci.values():
      sm |= np.isin(famv(c), SF)
    for k,c in Ci.items():
      Sm[k]+=vs_pc_row(c,p,g)
      Sw[k]+=vs_pc_row_mask(c,p,g,sm)
    if spit_rt(out): spit_ok+=1
    if png_rt(out, OUT+f'png/g94_{n}_idx.png'): png_ok+=1
    bad=sorted(set(int(v) for v in np.unique(out) if v not in (255,) and v not in VALID))
    if bad: invalid.append((n,bad))
    nfr+=1
    if nfr%10==0: print('  skater',nfr, 'acc so far', round(100*Sm['final3k'][0]/max(Sm['final3k'][3],1),1))
  sk={k:dict(overall=dict(vs_pc=round(100*Sm[k][0]/Sm[k][3],1), zone_vs_pc=round(100*Sm[k][1]/Sm[k][3],1), vs_genesis=round(100*Sm[k][2]/Sm[k][3],1), px=int(Sm[k][3])),
             stripe_area=dict(vs_pc=round(100*Sw[k][0]/Sw[k][3],1), zone_vs_pc=round(100*Sw[k][1]/Sw[k][3],1), px=int(Sw[k][3]))) for k in Sm}
  print('SKATER', sk)
  # goalies: K/J did not change them; copy J and score
  Smg={k:np.zeros(4) for k in Sm}; Swg={k:np.zeros(4) for k in Sm}
  for n,o in TE:
    g,p=aligned_arrays(n,o); g=g.astype(int)
    out=np.load(J3+f'npy/g94_{n}_pcidx.npy').astype(int)
    np.save(OUT+f'npy/g94_{n}_pcidx.npy', out.astype(np.int16))
    Ci={
      'final3i':np.load(F3I+f'npy/g94_{n}_pcidx.npy').astype(int),
      'final3j':out,
      'final3jK':np.load(F3JK+f'npy/g94_{n}_pcidx.npy').astype(int) if os.path.exists(F3JK+f'npy/g94_{n}_pcidx.npy') else out,
      'final3k':out,  # unchanged (no joints-free goalie change; J path)
    }
    sm=np.zeros(g.shape,bool)
    for c in Ci.values():
      sm |= np.isin(famv(c), SF)
    for k,c in Ci.items():
      Smg[k]+=vs_pc_row(c,p,g)
      Swg[k]+=vs_pc_row_mask(c,p,g,sm)
  go={k:dict(overall=dict(vs_pc=round(100*Smg[k][0]/Smg[k][3],1), zone_vs_pc=round(100*Smg[k][1]/Smg[k][3],1), px=int(Smg[k][3])),
             stripe_area=dict(vs_pc=round(100*Swg[k][0]/Swg[k][3],1), px=int(Swg[k][3]))) for k in Smg}
  print('GOALIE (J, unchanged)', go)
  ev=dict(skater=sk, goalie=go, spit_ok=spit_ok, png_ok=png_ok, n_skater=nfr, invalid=invalid)
  json.dump(ev, open(WORK+'eval_heldout.json','w'), indent=1)
  print('held-out skater RT spit',spit_ok,'png',png_ok,'invalid',invalid)
  return ev

# VALID from PC bank + approved blood 76
VALID=set()
def init_valid():
  global VALID
  for p in A['PC'].values():
    VALID |= set(int(v) for v in np.unique(p))
  VALID |= {76,255}

def convert_93(g, models=MODELS):
  H,W=g.shape
  out=np.full((H,W),255,np.int16)
  for gv,pv in {**FIXED,**BLOOD,**ICECHIP}.items():
    out[g==gv]=pv
  X=unified(g, None, is_abdul=1)
  gr=g.ravel()
  for c in ZONEC:
    i=np.nonzero(gr==c)[0]
    if len(i)==0 or c not in models: continue
    kind,m=models[c]
    fams=np.array([m]*len(i) if kind=='const' else m.predict(X[i]))
    sh=GSHADE.get(c,'medium')
    for k,idx in enumerate(i):
      y,x=divmod(int(idx),W)
      fam=str(fams[k])
      if fam not in FM:
        fam='pants' if c in (35,36,37) else 'jersey'
      if fam=='crest':
        fam='jersey'
      out[y,x]=at(fam,sh)
  out[g==0]=255
  return out

if __name__=='__main__':
  init_valid()
  # KPRED must be set during _build_with_kpred
  ev=eval_heldout()
  print(json.dumps({k:{kk:vv['overall'] for kk,vv in ev[k].items()} for k in ('skater','goalie')}, indent=2))
