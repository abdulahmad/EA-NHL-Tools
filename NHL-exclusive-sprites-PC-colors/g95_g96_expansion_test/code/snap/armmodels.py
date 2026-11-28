"""final3i arm-band placement: three candidates per arm and a learned chooser.
 G = Genesis-anchored (final3h: stripe 2 = the Genesis armband pixels, 1/3 hugging them)
 W = blend (final3g: Genesis band position, traced and wrapped across the limb like PC)
 P = PC-position model: a regressor trained on real-PC training pairs predicts where along shoulder->elbow->hand (t in 0..2)
     PC puts arm stripe 2, from the Genesis band position + limb geometry; a full-width 3 x 1px stack is drawn there.
 chooser = classifier trained on training pairs only (label = candidate with the best per-arm stripe match to real PC)."""
import sys,pickle;sys.path.insert(0,'.')
from armgeom import *
import post3g
from post3g import stack,snap4,at,shade_of,ARMF
ARMALL=('arm stripe 1','arm stripe 2','arm stripe 3','upper arm','forearm')
def region(d,sd):
  PU,PF=PARTS[sd];A0=np.isin(d['P'],[PU,PF])
  fg=famarr(d['c3g']);fh=famarr(d['c3h'])
  other=np.isin(d['P'],PARTS['L' if sd=='R' else 'R'])
  # final3j: never reach into the other arm (its stripes were being cleared -> 'overwritten' lines in final3i)
  R=A0|(ndi.binary_dilation(A0,np.ones((3,3)),iterations=2)&(np.isin(fg,ARMF)|np.isin(fh,ARMF))&~other)
  return A0,R,fg,fh
def geomfeat(d,sd):
  pl=poly(d['J'],sd);b=d['bands'].get(sd,[])
  PU,PF=PARTS[sd];A0=np.isin(d['P'],[PU,PF])
  if pl is None:return None
  lu=float(np.linalg.norm(pl[1]-pl[0]));lf=float(np.linalg.norm(pl[2]-pl[1]))
  v1=pl[1]-pl[0];v2=pl[2]-pl[1];ang=float(np.degrees(np.arccos(np.clip(v1@v2/max(1e-6,np.linalg.norm(v1)*np.linalg.norm(v2)),-1,1)))) if lu>0 and lf>0 else 0.
  if b:
    ts=[tproj(pl,y,x)[0] for y,x in b];tg=float(np.median(ts));ys=[q[0] for q in b];xs=[q[1] for q in b]
    bh=max(ys)-min(ys)+1;bw=max(xs)-min(xs)+1;comp=len(b)/(bh*bw);nfore=float(np.mean([d['P'][q]==PF for q in b]))
    near_elb=float(min(abs(t-1) for t in ts))
  else:tg=-1;bh=bw=0;comp=0;nfore=0;near_elb=-1
  return dict(tg=tg,nb=len(b),bh=bh,bw=bw,comp=comp,nfore=nfore,near_elb=near_elb,lu=lu,lf=lf,ang=ang,
              nu=int((d['P']==PU).sum()),nf=int((d['P']==PF).sum()))
TF=['tg','nb','bh','bw','comp','nfore','near_elb','lu','lf','ang','nu','nf']
LAST_P=[None,None];ORIENT_OVERRIDE=[None]
class Fixed:
  def __init__(s,k):s.k=k
  def fit(s,X,y):return s
  def predict(s,X):return np.full(len(X),s.k)
def draw_P(d,sd,tstar,g):
  """PC-position stack at t*: stripe 2 = the arm pixels at the cross-section through the bone point at t*, then 1/3 hug it
  (toward shoulder / toward hand), all extended across the limb like PC."""
  pl=poly(d['J'],sd);A0,R,fg,fh=region(d,sd);PU,PF=PARTS[sd]
  out=d['c3h'].copy()
  for y,x in zip(*np.nonzero(R&np.isin(fh,ARMF))):out[y,x]=at('forearm' if d['P'][y,x]==PF else 'upper arm',shade_of(out[y,x]))
  q,dv=tpoint(pl,tstar)
  if np.linalg.norm(dv)==0:return None
  u1=snap4(dv)
  if ORIENT_OVERRIDE[0] is not None:
    # final3j: line orientation from the trained orientation model (real PC: lines across the limb, mostly horizontal)
    u1=(0,1 if dv[1]>=0 else -1) if ORIENT_OVERRIDE[0]=='H' else (1 if dv[0]>=0 else -1,0);u2=(abs(u1[1]),abs(u1[0]));u2=(u2[0]*(1 if dv[0]>=0 else -1),u2[1]*(1 if dv[1]>=0 else -1));H,W=g.shape
  allowed=A0&~np.isin(g,[0,34,46])&np.isin(famarr(out),['upper arm','forearm'])
  if not allowed.any():return None
  ys,xs=np.nonzero(allowed)
  ts=np.array([tproj(pl,y,x)[0] for y,x in zip(ys,xs)])
  near=np.abs(ts-tstar)<=0.45
  if not near.any():return None
  def bands(u):
    kk=xs*u[0]+ys*u[1];kq=q[0]*u[0]+q[1]*u[1]
    ks=sorted(set(kk[near].tolist()),key=lambda k:abs(k-kq))
    return [[(int(y),int(x)) for y,x,k,nr in zip(ys,xs,kk,near) if k==k0 and nr] for k0 in ks[:3]]
  # lines go across the limb's narrow way (as final3g): for a diagonal bone try both axes, shorter cross-section first
  # (final3i tried the final3g narrow-axis choice here; it lowered held-out P and chooser scores, so bone axis only)
  B1=bands(u1);order=[(u1,B1)]
  for u,BB in order:
    for band in BB:
      o2=out.copy();ln=stack(o2,g,band,u,ARMF,allowed,allowed,maxext=3)
      if ln:
        LAST_P[:]=[ln,u];return o2
  return None
def cand_outputs(d,sd,g,tstar):
  A0,R,fg,fh=region(d,sd)
  G=d['c3h']
  # W: final3g's arm stripes are copied wherever they sit on arm or plain jersey pixels now (final3i copied only onto
  # arm pixels, so 3g line pixels on jersey were logged but never drawn = 'overwritten')
  W=d['c3h'].copy();m=R&((np.isin(fh,ARMALL)&np.isin(fg,ARMALL))|(np.isin(fg,ARMF)&(fh=='jersey')&~np.isin(d.get('g',np.zeros(1)),[0,34,46])));W[m]=d['c3g'][m]
  P=draw_P(d,sd,tstar,g) if tstar is not None else None
  return {'G':G,'W':W,'P':P if P is not None else G},R
def armscore(c,p,R):
  fc=famarr(c);fp=famarr(np.where(p>=0,p,255));S=R&(np.isin(fc,ARMF)|np.isin(fp,ARMF))
  if S.sum()==0:return None
  return float((fc[S]==fp[S]).mean())

import json
_M={};CAPT={};KPRED=[None];FORCE_ARM=[None]
def _load():
  if not _M:
    _M['reg']=pickle.load(open('/workspace/g94-to-pc-zones/v5/final3j/work/armreg.pkl','rb'))
    m=pickle.load(open('/workspace/g94-to-pc-zones/v5/final3j/work/armclf.pkl','rb'));_M.update(m)
    _M['orient']=pickle.load(open('/workspace/g94-to-pc-zones/v5/final3j/work/orient.pkl','rb'))
    _M['g3']={r['g94']:r for r in json.load(open('/workspace/g94-to-pc-zones/v5/final3g/final3g_frames.json'))}
  return _M
def choose_arms(n,out,P,J,log,g):
  """per arm: build G / W / P, pick one with the trained chooser, write it into out and the log."""
  M=_load();CAPT.clear();CAPT['base']=out.copy();c3g=np.load(f'/workspace/g94-to-pc-zones/v5/final3g/npy/g94_{n}_pcidx.npy').astype(int)
  for sd in ('R','L'):
    bands={l['part'][0]:[tuple(q) for q in l.get('band',[])] for l in log if l['part'] in ('R arm','L arm')}
    d=dict(J=J,P=P,c3h=out.copy(),c3g=c3g,bands=bands,g=g)
    f=geomfeat(d,sd)
    if f is None:continue
    tstar=float(np.clip(M['reg'].predict([[f[t] for t in TF]])[0],0.05,1.95))
    LAST_P[:]=[None,None]
    ORIENT_OVERRIDE[0]='H' if M['orient'].predict([orient_feats(d,sd,tstar,f)])[0]==1 else 'V'
    C,R=cand_outputs(d,sd,g,tstar);lnP=list(LAST_P);ORIENT_OVERRIDE[0]=None
    fc={k:famarr(v) for k,v in C.items()}
    ex=dict(tstar=tstar,dGW=int((fc['G']!=fc['W'])[R].sum()),dGP=int((fc['G']!=fc['P'])[R].sum()),dtgp=abs(f['tg']-tstar) if f['tg']>=0 else -1,
            nG=int(np.isin(fc['G'],ARMF)[R].sum()),nW=int(np.isin(fc['W'],ARMF)[R].sum()),nP=int(np.isin(fc['P'],ARMF)[R].sum()))
    x=[{**f,**ex}[k] for k in M['FF']];ch=M['CN'][int(M['clf'].predict([x])[0])]
    if KPRED[0] is not None:
      # classifier version: pick the candidate whose zones agree best with the per-colour classifier inside this arm
      kp,km=KPRED[0];agr={k:int(((fc[k]==kp)&km&R).sum())-int(((fc[k]!=kp)&km&R&(np.isin(fc[k],ARMF)|np.isin(kp,ARMF))).sum()) for k in C if C[k] is not None}
      if ch=='P' and lnP[0] is None:agr.pop('P',None)
      ch=max(agr,key=lambda k:(agr[k],k=='P'))
    if FORCE_ARM[0] in ('G','W','P') and C.get(FORCE_ARM[0]) is not None:
      ch=FORCE_ARM[0]
    if ch=='P' and lnP[0] is None:ch='W'   # P could not be drawn: fall back to the final3g wrap
    out[:]=C[ch];CAPT[sd]=(C,R,ch)
    L=[l for l in log if l['part']==sd+' arm']
    if ch=='W':
      g3=[l for l in M['g3'][n]['stacks'] if l['part']==sd+' arm' and isinstance(l.get('lines'),dict)]
      if L and g3:
        fo=famarr(out);lw={f:[tuple(q) for q in g3[0]['lines'][f] if fo[tuple(q)]==f] for f in ARMF}
        if all(lw[f] for f in ARMF):
          L[0].update(lines=lw,axis=g3[0]['axis'],region='W: final3g (Genesis band, full wrap)',w_px_not_drawable=sum(len(g3[0]['lines'][f])-len(lw[f]) for f in ARMF))
        else:
          # a final3g line has no drawable pixel left: keep the Genesis-band stack (G) for this arm instead
          out[:]=C['G'];ch='G';CAPT[sd]=(C,R,ch);L[0]['region']='G: Genesis band pixels (W line not drawable)'
    elif ch=='P' and L:L[0].update(lines={k:[tuple(map(int,q)) for q in v] for k,v in lnP[0].items()},axis=list(lnP[1]),region=f'P: PC-position model t={tstar:.2f}')
    elif L:L[0]['region']='G: Genesis band pixels (final3h)'
    log.append(dict(part=sd+' arm choice',choice=ch,tstar=tstar,tg=f['tg']))

def orient_feats(d,sd,tstar,f):
  """features for the line-orientation model at the predicted band point"""
  pl=poly(d['J'],sd);q,dv=tpoint(pl,tstar);PU,PF=PARTS[sd];A0=np.isin(d['P'],[PU,PF]);H,W=A0.shape
  ang=float(np.degrees(np.arctan2(abs(dv[1]),abs(dv[0])))) if np.linalg.norm(dv)>0 else 45.
  qy,qx=int(round(q[1])),int(round(q[0]));qy=min(max(qy,0),H-1);qx=min(max(qx,0),W-1)
  def run(dy,dx):
    n=0;y,x=qy,qx
    while 0<=y<H and 0<=x<W and A0[y,x]:n+=1;y+=dy;x+=dx
    y,x=qy-dy,qx-dx
    while 0<=y<H and 0<=x<W and A0[y,x]:n+=1;y-=dy;x-=dx
    return n
  return [ang,run(0,1),run(1,0),f['bh'],f['bw'],f['nfore'],tstar,f['tg'],float(np.mean(A0)),f['ang']]
