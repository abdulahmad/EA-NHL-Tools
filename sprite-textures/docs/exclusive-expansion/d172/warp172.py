# D172: smooth warp per bone segment (affine per segment, continuity penalty at joints) vs frozen D169 texture.
# Genesis exclusives have no D162 skeleton (D162 is PC-only); joints are estimated from part-label boundaries
# (shoulder = torso/sleeve, wrist = sleeve/glove, hip = torso/pants, knee = pants/sock, ankle = sock/skate) and the
# elbow is the midpoint of each sleeve component along its principal axis.
# Outline ruling (pt995s3501, option b): a black px whose body neighbours are mostly non-black is an outline; its family
# is the neighbours' majority family and it renders as that family's darkest shade.
import numpy as np,collections
from scipy import ndimage
from tex import GFAM
SLEEVE_COLS=set(range(0,3))|set(range(16,24))|set(range(34,38))
def side(u):return 'sleeve' if u in SLEEVE_COLS else 'body'
# segment -> (column class, row range) in the 38x32 texture
ZONE={'head':('body',0,5),'torso':('body',6,16),'upperarm':('sleeve',6,12),'forearm':('sleeve',12,17),'hand':('sleeve',17,20),
      'thigh':('body',17,23),'shin':('body',23,27),'skate':('body',27,31)}
LAB2={2:'head',3:'head',4:'torso',5:'torso',6:'arm',7:'arm',8:'hand',9:'thigh',10:'shin',11:'skate',12:'skate'}
ORDER=['torso','head','upperarm','forearm','hand','thigh','shin','skate']
DARK={'navy':40,'white':45,'skin':39,'black':34}
def inzone(t,z):c,a,b=ZONE[z];return side(t[0])==c and a<=t[1]<=b
def families(g):
  F={};OL=set()
  for y,x in zip(*np.nonzero(g)):
    gi=int(g[y,x])
    if gi in GFAM:F[(y,x)]=GFAM[gi]
  for (y,x),f in list(F.items()):
    if f!='black':continue
    nb=[F[(y+a,x+b)] for a in(-1,0,1) for b in(-1,0,1) if (a or b) and (y+a,x+b) in F]
    nn=[q for q in nb if q!='black']
    if nn and len(nn)>=len(nb)-len(nn):F[(y,x)]=collections.Counter(nn).most_common(1)[0][0];OL.add((y,x))
  return F,OL
def segments(g,lab,F):
  Z={}
  for p in F:Z[p]=LAB2.get(int(lab[p]))
  lab_pts=[p for p in Z if Z[p]]
  for p in F:
    if Z[p] is None and lab_pts:q=min(lab_pts,key=lambda r:abs(r[0]-p[0])+abs(r[1]-p[1]));Z[p]=Z[q]
  segs=[]
  for k in ('torso','head','arm','hand','thigh','shin','skate'):
    m=np.zeros(g.shape,bool)
    for p,z in Z.items():
      if z==k:m[p]=1
    L,n=ndimage.label(m,structure=np.ones((3,3)))
    for i in range(1,n+1):
      P=np.argwhere(L==i)
      if k=='arm' and len(P)>=8:   # split at the elbow: midpoint along the principal axis, upper = end nearer the torso
        c=P.mean(0);w,V=np.linalg.eigh(np.cov((P-c).T));a=V[:,-1];s=(P-c)@a
        tor=[p for p,z in Z.items() if z=='torso'];tc=np.mean(tor,0) if tor else c
        if (tc-c)@a<0:s=-s
        segs.append(('upperarm',[tuple(p) for p in P[s>=0]]));segs.append(('forearm',[tuple(p) for p in P[s<0]]))
      else:segs.append(({'arm':'forearm'}.get(k,k),[tuple(p) for p in P]))
  segs.sort(key=lambda s:ORDER.index(s[0]))
  return segs
def apply(p,P):
  return np.rint(p[0]+p[1]*P[:,1]+p[2]*P[:,0]).astype(int),np.rint(p[3]+p[4]*P[:,1]+p[5]*P[:,0]).astype(int)
def fit_ls(P,T):
  X=np.c_[np.ones(len(P)),P[:,1],P[:,0]];return np.r_[np.linalg.lstsq(X,T[:,0],rcond=None)[0],np.linalg.lstsq(X,T[:,1],rcond=None)[0]]
def warp(g,tm,lab,FT):
  F,OL=families(g);segs=segments(g,lab,F)
  src={tuple(map(int,k.split(','))):tuple(t) for k,t in tm.items()}
  out={};how=collections.Counter();info=[]
  for z,pix in segs:
    pix=[p for p in pix if p in F]
    if not pix:continue
    P=np.array(pix);Fs=[F[p] for p in pix]
    # joint continuity: neighbouring px already mapped in another segment
    J=[(i,out[(y+a,x+b)]) for i,(y,x) in enumerate(pix) for a,b in((1,0),(-1,0),(0,1),(0,-1)) if (y+a,x+b) in out]
    def score(p,zz):
      u,v=apply(p,P);e=sum(FT.get((int(a),int(b)))!=f or not inzone((int(a),int(b)),zz) for a,b,f in zip(u,v,Fs))
      j=sum(max(abs(u[i]-t[0]),abs(v[i]-t[1]))>1 for i,t in J) if zz==z else 0
      return e+0.5*j,e
    known=[(i,src[p]) for i,p in enumerate(pix) if p in src and inzone(src[p],z)]
    def init(zz):
      if zz==z and len(known)>=6:return fit_ls(P[[i for i,_ in known]],np.array([t for _,t in known],float))
      c,a,b=ZONE[zz];zt=np.array([t for t in FT if inzone(t,zz)],float);m=P.mean(0);cc=zt.mean(0)
      return np.array([cc[0]-m[1],1,0,cc[1]-m[0],0,1.])
    def search(zz):
      p0=init(zz);best=(score(p0,zz),p0)
      for it in range(6):
        for k,steps in ((0,np.arange(-10,10.5,.5)),(3,np.arange(-10,10.5,.5)),(1,[-.4,-.2,-.1,.1,.2,.4]),(5,[-.4,-.2,-.1,.1,.2,.4]),(2,[-.3,-.15,.15,.3]),(4,[-.3,-.15,.15,.3]),(1,[-2]),(5,[-2])):
          for s in steps:
            q=best[1].copy();q[k]+=s;sc=score(q,zz)
            if sc[0]<best[0][0]:best=(sc,q)
      return best
    best=search(z);zz=z
    if best[0][1]>0.5*len(pix) and not J:   # detached segment whose label looks wrong (e.g. 93G 353 loose gloves labelled skate): try every segment zone
      for alt in ZONE:
        if alt==z:continue
        b=search(alt)
        if b[0][1]<best[0][1]:best,zz=b,alt
      if zz!=z:how[f'segment re-zoned {z}->{zz}']+=len(pix)
    p=best[1];u,v=apply(p,P);info.append((z,zz,len(pix),best[0][1]))
    for (y,x),a,b,f in zip(pix,u,v,Fs):
      t=(int(a),int(b))
      if FT.get(t)==f and inzone(t,zz):out[(y,x)]=t;how['warp']+=1;continue
      nb=[(t[0]+da,t[1]+db) for da in(-1,0,1) for db in(-1,0,1) if (da or db) and FT.get((t[0]+da,t[1]+db))==f and inzone((t[0]+da,t[1]+db),zz)]
      if nb:out[(y,x)]=min(nb,key=lambda c_:abs(c_[0]-t[0])+abs(c_[1]-t[1]));how['exception (1-texel nudge)']+=1;out[(y,x)]=out[(y,x)];EXC.add((y,x))
      else:out[(y,x)]=t;how['ERROR']+=1
  how['outline px (ruling b)']=len(OL)
  return out,how,F,OL,info
EXC=set()
