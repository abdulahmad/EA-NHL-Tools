# D173: full D162-style skeleton for Genesis exclusive frames, prior = joints of the best-matching PC D162/D163 pose.
# 1) prior: PC frame with skel_ok joints maximising silhouette IoU (mirror + offset search, align.best_align)
# 2) transfer joints through that alignment, 3) snap each joint onto pixels of its own part, 4) sanity checks.
import numpy as np,collections,json,pickle
from fam import D
import importlib.util as _u;_s=_u.spec_from_file_location('al3','/workspace/preview_v2/exclusive_samples/v3/align.py');_m=_u.module_from_spec(_s);_s.loader.exec_module(_m);best_align=_m.best_align
NOTEX={46:'stick',47:'shadow'}
J_PART={'head':(2,3),'neck':(2,3,4),'chest':(4,5),'belly':(4,5),'pelvis':(4,9),'shoulder':(4,6,7),'elbow':(7,),'wrist':(7,8),
        'glove':(8,),'hip':(9,),'knee':(9,10),'ankle':(10,11),'skate':(11,12)}
BONES=[('head','neck','head'),('neck','chest','torso'),('chest','pelvis','torso'),
       ('S shoulder','S elbow','upperarm'),('S elbow','S wrist','forearm'),('S wrist','S glove','hand'),
       ('S hip','S knee','thigh'),('S knee','S ankle','shin'),('S ankle','S skate','skate'),
       ('stick butt','stick heel','shaft'),('stick heel','stick toe','blade')]
def bones():
  out=[]
  for a,b,k in BONES:
    if a.startswith('S '):
      for s in 'LR':out.append((a.replace('S',s,1),b.replace('S',s,1),f'{s} {k}'))
    else:out.append((a,b,k))
  return out
PCK=[k for k,f in D['frames'].items() if f.get('skel_ok') and f.get('joints')]
PCM={k:np.array(D['frames'][k]['px'])!=255 for k in PCK}
def prior(g):
  m=g>0;h,w=np.ptp(np.nonzero(m)[0])+1,np.ptp(np.nonzero(m)[1])+1;a=m.sum()
  def quick(k):
    p=PCM[k];ys,xs=np.nonzero(p);return abs(np.ptp(ys)+1-h)+abs(np.ptp(xs)+1-w)+abs(p.sum()-a)/10
  best=None
  for k in sorted(PCK,key=quick)[:150]:
    s=best_align(m.astype(np.uint8),PCM[k].astype(np.uint8),R=3)
    if best is None or s[0]>best[1][0]:best=(k,s)
  return best
def transfer(k,mir,dy,dx,W):
  J={}
  for n,(x,y) in D['frames'][k]['joints'].items():
    if mir:x=W-1-x;n=n.replace('L ','# ').replace('R ','L ').replace('# ','R ')
    J[n]=np.array([x+dx,y+dy],float)
  return J
def snap(J,g,lab):
  from scipy import ndimage
  L_,n_=ndimage.label(g==46,structure=np.ones((3,3)))
  big=(np.bincount(L_.ravel())[1:].argmax()+1) if n_ else 0
  stick=np.argwhere((L_==big)&(L_>0))[:,::-1].astype(float);   # largest stick component only
  body=np.argwhere((g>0)&(g!=47)&(g!=46))[:,::-1].astype(float);moved={}
  for n,p in J.items():
    base=n.split(' ',1)[-1] if n[:2] in('L ','R ') else n
    if n.startswith('stick'):pool=stick
    else:
      parts=J_PART.get(base,());pool=np.array([(x,y) for y,x in zip(*np.nonzero(np.isin(lab,parts)&(g>0)))],float)
      if len(pool)==0 or np.hypot(*(pool-p).T).min()>3:pool=body   # part px only if within 3 px, else nearest body px
    if len(pool)==0:continue
    d=np.hypot(*(pool-p).T);i=d.argmin()
    if d[i]>0.5:moved[n]=round(float(d[i]),1);J[n]=pool[i]
  # stick: butt = stick px nearest the gloves, toe = farthest stick px from butt, heel = sharpest bend (farthest from butt-toe chord... use the px where the
  # shaft line ends: stick px whose distance to the butt-toe line is max)
  if len(stick)>=3:
    gl=[J[k] for k in ('L glove','R glove') if k in J];c=np.mean(gl,0) if gl else stick.mean(0)
    b=stick[np.hypot(*(stick-c).T).argmin()];t=stick[np.hypot(*(stick-b).T).argmax()]
    v=t-b;nv=np.array([-v[1],v[0]])/(np.hypot(*v)+1e-9);h=stick[np.abs((stick-b)@nv).argmax()]
    J['stick butt'],J['stick toe'],J['stick heel']=b,t,h
  return J,moved
def sanity(J,Jp):
  why=[]
  L=lambda S,a,b:np.hypot(*(S[a]-S[b])) if a in S and b in S else None
  for a,b,k in bones():
    if k in('shaft','blade'):continue
    l,lp=L(J,a,b),L(Jp,a,b)
    if l is not None and lp and lp>2 and not 0.5<=l/lp<=2.0:why.append(f'{k} length {l:.1f} vs prior {lp:.1f}')
  for s in 'LR':
    for a,b,c in (('shoulder','elbow','wrist'),('hip','knee','ankle')):
      A_,B_,C_=(J.get(f'{s} {q}') for q in (a,b,c))
      if A_ is None or B_ is None or C_ is None:continue
      u,v=A_-B_,C_-B_;nu,nv=np.hypot(*u),np.hypot(*v)
      if nu>1 and nv>1:
        ang=np.degrees(np.arccos(np.clip(u@v/(nu*nv),-1,1)))
        if ang<25:why.append(f'{s} {b} angle {ang:.0f} deg')
  for k in ('upperarm','forearm','thigh','shin'):
    a,b=[(x,y) for x,y,z in bones() if z==f'L {k}'][0];c,d=[(x,y) for x,y,z in bones() if z==f'R {k}'][0]
    l1,l2=L(J,a,b),L(J,c,d)
    if l1 and l2 and min(l1,l2)>2 and max(l1,l2)/min(l1,l2)>2.2:why.append(f'L/R {k} {l1:.1f} vs {l2:.1f}')
  return why
def loose(g):
  # frame with no body (e.g. 93G 353 gloves + sticks on the ice): every black blob = a hand segment, every stick blob = shaft+blade
  from scipy import ndimage
  J={};segs=[]
  for idx,kind in ((34,'hand'),(33,'hand'),(46,'stick')):
    L,n=ndimage.label(g==idx,structure=np.ones((3,3)))
    for i in range(1,n+1):
      P=np.argwhere(L==i)[:,::-1].astype(float)
      if len(P)<3:continue
      c=P.mean(0);w,V=np.linalg.eigh(np.cov((P-c).T));a=V[:,-1];t=(P-c)@a;e0,e1=c+a*t.min(),c+a*t.max()
      j=len(segs);J[f'{kind}{j} a']=e0;J[f'{kind}{j} b']=e1;segs.append((f'{kind}{j} a',f'{kind}{j} b','hand' if kind=='hand' else 'shaft'))
  return J,segs
def skeleton(g,lab):
  if not np.isin(lab[g>0],(2,3,4,5,9,10)).any() and not np.isin(g,(35,36,37,40,41,42,43,44,45)).any():
    J,segs=loose(g);return dict(prior=None,iou=0,mirror=False,joints={n:[round(float(a),2) for a in p] for n,p in J.items()},bones=segs,snapped={},flags=['no body: loose-equipment skeleton (gloves/sticks)'])
  k,(iou,mir,dy,dx)=prior(g);W=PCM[k].shape[1]
  Jp=transfer(k,mir,dy,dx,W);J,moved=snap({n:p.copy() for n,p in Jp.items()},g,lab);why=sanity(J,Jp)
  if iou<0.7:why.insert(0,f'weak prior IoU {iou:.2f}')
  return dict(bones=[list(b) for b in bones()],prior=int(k),iou=round(float(iou),3),mirror=bool(mir),joints={n:[round(float(a),2) for a in p] for n,p in J.items()},snapped=moved,flags=why)
if __name__=='__main__':
  R=pickle.load(open('../v2/map3.pkl','rb'));RT=pickle.load(open('../v2/retry.pkl','rb'));OUT={}
  for (s,n,d),r in sorted(R.items(),key=lambda k:(k[0][0]!='G93',k[0][1])):
    lab=r['lab'] if r['tmap'] else next((r2['lab'] for (s2,n2,_),r2 in RT.items() if (s2,n2)==(s,n)),r['lab'])
    OUT[f'{s}_{n}']=skeleton(r['g'],lab);print(s,n,OUT[f'{s}_{n}']['prior'],OUT[f'{s}_{n}']['iou'],OUT[f'{s}_{n}']['flags'])
  json.dump(OUT,open('skel173.json','w'),indent=1)
