# D171: smooth per-part affine warp (straight texture rows/cols stay straight lines on the sprite) fitted against the
# frozen D169 family texture. Objective = family mismatches + out-of-zone, plus a penalty for drifting from the pipeline init.
import numpy as np,collections,itertools
from tex import GFAM
from refit170 import tzone,PART2Z
GROUP={'sleeve':'sleeve','torso':'torso','legs':'legs','head':'head'}
def part_of(lab,g):
  H,W=g.shape;z=np.full((H,W),None,object)
  for y,x in zip(*np.nonzero(g)):z[y,x]=PART2Z.get(int(lab[y,x]))
  pts=[(y,x) for y,x in zip(*np.nonzero(g)) if z[y,x]]
  for y,x in zip(*np.nonzero(g)):           # unlabelled body px -> part of nearest labelled px
    if z[y,x] is None and pts:yy,xx=min(pts,key=lambda p:abs(p[0]-y)+abs(p[1]-x));z[y,x]=z[yy,xx]
  return z
def fit_ls(P,T):
  X=np.c_[np.ones(len(P)),P[:,1],P[:,0]];a,*_=np.linalg.lstsq(X,T[:,0],rcond=None);b,*_=np.linalg.lstsq(X,T[:,1],rcond=None);return np.r_[a,b]
def apply(p,P):
  u=p[0]+p[1]*P[:,1]+p[2]*P[:,0];v=p[3]+p[4]*P[:,1]+p[5]*P[:,0];return np.rint(u).astype(int),np.rint(v).astype(int)
def score(p,P,F,FT,z,p0,lam=0.5):
  u,v=apply(p,P);e=0
  for uu,vv,f in zip(u,v,F):
    t=(int(uu),int(vv));e+=FT.get(t)!=f or tzone(*t)!=z
  return e+lam*(abs(p[0]-p0[0])+abs(p[3]-p0[3])),e
def warp(g,tm,lab,FT):
  Z=part_of(lab,g);src={tuple(map(int,k.split(','))):tuple(t) for k,t in tm.items()};out={};how=collections.Counter();params={}
  from scipy import ndimage
  segs=[]
  for z in ('torso','sleeve','legs','head'):
    m=np.vectorize(lambda a:a==z)(Z)&(g>0);L,n=ndimage.label(m,structure=np.ones((3,3)))
    for k in range(1,n+1):
      pix=[(int(y),int(x)) for y,x in zip(*np.nonzero(L==k)) if int(g[y,x]) in GFAM]
      if len(pix)<4 and segs:   # tiny fragment: fold into the previous segment of the same zone if any
        pz=[s for s in segs if s[0]==z]
        if pz:pz[-1][1].extend(pix);continue
      if pix:segs.append((z,pix))
  for si,(z,pix) in enumerate(segs):
    P=np.array(pix);F=[GFAM[int(g[y,x])] for y,x in pix]
    known=[(i,src[p]) for i,p in enumerate(pix) if p in src and tzone(*src[p])==z]
    if len(known)>=6:
      p0=fit_ls(P[[i for i,_ in known]],np.array([t for _,t in known],float))
    else:   # no usable init (e.g. 93G 353 gloves): centre of zone, 1 texel per px
      zt=np.array([t for t in FT if tzone(*t)==z],float);c=zt.mean(0);m=P.mean(0);p0=np.array([c[0]-m[1],1,0,c[1]-m[0],0,1.])
    best=(score(p0,P,F,FT,z,p0),p0)
    for it in range(5):   # coordinate search: offsets, scales, shear
      for k,steps in ((0,np.arange(-8,8.5,.5)),(3,np.arange(-8,8.5,.5)),(1,[-.3,-.15,.15,.3]),(5,[-.3,-.15,.15,.3]),(2,[-.2,-.1,.1,.2]),(4,[-.2,-.1,.1,.2])):
        for s in steps:
          q=best[1].copy();q[k]+=s;sc=score(q,P,F,FT,z,p0)
          if sc[0]<best[0][0]:best=(sc,q)
    p=best[1];params[f'{z}{si}']=[round(float(a),3) for a in p];u,v=apply(p,P)
    for (y,x),uu,vv,f in zip(pix,u,v,F):
      t=(int(uu),int(vv))
      if FT.get(t)==f and tzone(*t)==z:out[(y,x)]=t;how['warp']+=1;continue
      nb=[(t[0]+a,t[1]+b) for a in(-1,0,1) for b in(-1,0,1) if FT.get((t[0]+a,t[1]+b))==f]
      if nb:out[(y,x)]=min(nb,key=lambda c:abs(c[0]-t[0])*2+abs(c[1]-t[1]));how['exception (1-texel local snap)']+=1
      else:out[(y,x)]=t;how['ERROR after warp']+=1
  return out,how,params
