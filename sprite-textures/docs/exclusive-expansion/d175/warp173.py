# D173: per-bone warp driven by the D173 skeleton. Pixels go to the nearest bone; each bone gets an affine initialised
# from its axis (texture rows run along the bone, columns across it), then refined on the family objective with a
# joint-continuity penalty. Outline ruling (b) from D172.
import numpy as np,collections,json
from warp172 import families,ZONE,inzone,apply,EXC,fit_ls
from tex import GFAM
SK=json.load(open('/workspace/preview_v2/exclusive_samples/v3/skel173.json'));CUR={'k':None};CNT=collections.Counter()
SWEEPS=[6]
IDX=[False]  # D174 (pt999u): if True, FT is an index key (IdxKey) and non-outline pixels match by palette index
PALZ=[None]  # D174 (pt997u): {palette index: allowed zones} hard constraint; None = off (D173 behaviour)
ORDER=['torso','head','upperarm','forearm','hand','thigh','shin','skate']
SPAN={'body':((3,15),(24,33)),'sleeve':((0,2),(16,18),(19,23),(34,37))}
OK={2:('head',),3:('head',),4:('torso','upperarm'),5:('torso',),6:('upperarm','torso'),7:('upperarm','forearm'),8:('hand','forearm'),9:('thigh','torso'),10:('shin','thigh'),11:('skate','shin'),12:('skate',)}
def segdist(P,a,b):
  ab=b-a;L2=ab@ab+1e-9;t=np.clip(((P-a)@ab)/L2,0,1);return np.hypot(*(P-(a+t[:,None]*ab)).T)
def warp(g,tm,lab,FT):
  sk=SK[CUR['k']];J={n:np.array(p) for n,p in sk['joints'].items()};F,OL=families(g)
  if IDX[0]:F={p:(f if p in OL else int(g[p])) for p,f in F.items()}
  B=[(a,b,n.split(' ')[-1],n) for a,b,n in sk['bones'] if a in J and b in J and n.split(' ')[-1] in ORDER]
  pix=list(F);P=np.array([(x,y) for y,x in pix],float)
  D=np.stack([segdist(P,J[a],J[b]) for a,b,_,_ in B],1) if B else None
  if B:   # nearest bone among those compatible with the pixel's part label (fallback: nearest bone)
    for j,(y,x) in enumerate(pix):
      ok=OK.get(int(lab[y,x]))
      if ok:
        m=np.array([B[i][2] in ok for i in range(len(B))])
        if m.any():D[j,~m]+=100
      if PALZ[0] is not None:
        al=PALZ[0].get(int(g[y,x]))
        if al is not None:
          m=np.array([B[i][2] in al for i in range(len(B))])
          if m.any():D[j,~m]=np.inf
          else:CNT['palette-zone conflict']+=1
  asg=D.argmin(1) if B else np.zeros(len(pix),int)
  segs=sorted(range(len(B)),key=lambda i:ORDER.index(B[i][2]))
  out={};how=collections.Counter();src={tuple(map(int,k_.split(','))):tuple(t_) for k_,t_ in tm.items()}
  for i in segs:
    a,b,z,name=B[i];idx=np.nonzero(asg==i)[0]
    if not len(idx):continue
    sp=[pix[j] for j in idx];PP=np.array(sp);Fs=[F[p] for p in sp]
    Jn=[(k,out[(y+da,x+db)]) for k,(y,x) in enumerate(sp) for da,db in((1,0),(-1,0),(0,1),(0,-1)) if (y+da,x+db) in out]
    def score(p):
      u,v=apply(p,PP);e=sum(FT.get((int(c),int(d)))!=f or not inzone((int(c),int(d)),z) for c,d,f in zip(u,v,Fs))
      j=sum(max(abs(u[k]-t[0]),abs(v[k]-t[1]))>1 for k,t in Jn);return e+0.5*j,e
    col,va,vb=ZONE[z];A_,B_=J[a],J[b];L=max(np.hypot(*(B_-A_)),1.0);e_=(B_-A_)/L;n_=np.array([-e_[1],e_[0]])
    X=PP[:,::-1].astype(float);t=(X-A_)@e_;sN=(X-A_)@n_
    t0,t1=t.min(),t.max()+1e-6;s0,s1=sN.min(),sN.max()+1e-6
    # init: the segment's own pixel extent along the bone -> zone rows va..vb, across the bone -> one column span of the zone
    cands=[]
    for (c0,c1) in SPAN[col]:
      for sg in (1,-1):
        sv=(vb+0.99-va)/(t1-t0+1);su=sg*(c1+0.99-c0)/(s1-s0+1);ub=c0 if sg>0 else c1+0.99
        # u = ub + su*(n.X - s0), v = va + sv*(e.X - t0)
        p=np.array([ub-su*(n_@A_)-su*s0,su*n_[0],su*n_[1],va-sv*(e_@A_)-sv*t0,sv*e_[0],sv*e_[1]]);cands.append((score(p),p))
    kn=[(k_,src[p_]) for k_,p_ in enumerate(sp) if p_ in src and inzone(src[p_],z)]
    if len(kn)>=6:cands.append((score(fit_ls(PP[[k_ for k_,_ in kn]],np.array([t_ for _,t_ in kn],float))),fit_ls(PP[[k_ for k_,_ in kn]],np.array([t_ for _,t_ in kn],float))));how['pipeline-init candidate']+=1
    best=min(cands,key=lambda c:c[0][0])
    for it in range(SWEEPS[0]):
      for k,steps in ((0,np.arange(-10,10.5,.5)),(3,np.arange(-6,6.5,.5)),(1,[-.6,-.3,-.15,.15,.3,.6]),(5,[-.6,-.3,-.15,.15,.3,.6]),(2,[-.6,-.3,-.15,.15,.3,.6]),(4,[-.6,-.3,-.15,.15,.3,.6])):
        for s in steps:
          q=best[1].copy();q[k]+=s;sc=score(q)
          if sc[0]<best[0][0]:best=(sc,q)
    u,v=apply(best[1],PP)
    for (y,x),c,d,f in zip(sp,u,v,Fs):
      t=(int(c),int(d))
      if FT.get(t)==f and inzone(t,z):out[(y,x)]=t;how['warp']+=1;continue
      nb=[(t[0]+da,t[1]+db) for da in(-1,0,1) for db in(-1,0,1) if (da or db) and FT.get((t[0]+da,t[1]+db))==f and inzone((t[0]+da,t[1]+db),z)]
      if nb:out[(y,x)]=min(nb,key=lambda c_:abs(c_[0]-t[0])+abs(c_[1]-t[1]));how['exception (1-texel nudge)']+=1;EXC.add((y,x))
      else:out[(y,x)]=t;how['ERROR']+=1
  how['outline px (ruling b)']=len(OL)
  return out,how,F,OL,[]

class Tok:
  # texel value under the index key: equals an int pixel index exactly, or a family name (outline pixels, rule b)
  __slots__=('i',)
  def __init__(s,i):s.i=i
  def __eq__(s,o):return s.i==o if o.__class__ is int else GFAM[s.i]==o
  def __ne__(s,o):return not s.__eq__(o)
  def __hash__(s):return hash(s.i)
class TokSet(Tok):
  # head rows (pt1002u): any shading index of the helmet / skin group matches
  __slots__=('ok',)
  def __init__(s,i,ok):s.i=i;s.ok=ok
  def __eq__(s,o):return o in s.ok if o.__class__ is int else GFAM[s.i]==o
def IdxKey(FI,headok=None,allrows=False):
  return {t:(TokSet(i,headok[i]) if headok and (allrows or t[1]<6) and i in headok else Tok(i)) for t,i in FI.items()}
