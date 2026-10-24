# Goalie v16 segmentation (Abdul pt907u, full cross-reference): every facing of an animation frame is fitted JOINTLY.
#  POSE     one 3D skeleton (skel10 joints) per animation frame, rotated to each facing d (yaw 45deg*d, pitch 30) and
#           scaled/shifted onto each facing's sprite. Siblings = the frames at the same sequence index in the other
#           facings' sequences (980 poke d0 -> 982..994).
#  TERMS    per facing: head -> mask centroid, hands -> blocker/catcher centroids, ankles -> pad bottoms, hips -> pad tops
#           (from the current labels); every bone sampled at 7 points must lie on the goalie (distance to the nearest
#           non-bg/shadow/stick px), pad bones on pad-colour px (colour zone), forearm->hand on glove px;
#           bone lengths held to skel10 BASE, weak prior to the BASE pose; hand-fit ADJ facings pin their joints.
#  ITERATE  fit -> label every facing (g15 label rules) -> refit, until labels stop changing (max 4 rounds).
#  FROZEN   538 (19,19),(19,21),(20,21) and 1044 (24,9) keep their g15 labels until Abdul answers.
import sys,os,math,json
H16=os.path.dirname(os.path.abspath(__file__));sys.path.insert(0,H16+'/../goalie15');sys.path.insert(0,H16+'/../goalie9')
import g15seg,g14seg
from g15seg import *
import numpy as np
from scipy import ndimage,optimize
from g9common import spa_tables
FROZEN={538:[(19,19),(19,21),(20,21)],1044:[(24,9)]}
_T=spa_tables()
def siblings(n):
    a,d=GF[n][0];w=_T[a];S=[]
    for dd,o in enumerate(w[:8]):
        i=o//2;q=[]
        while i+1<len(w):
            q.append(w[i]);du=w[i+1];i+=2
            if du<0:break
        S.append(q)
    k=S[d].index(n);return {dd:S[dd][k] for dd in range(8) if k<len(S[dd])}
def evidence(n):
    p=frame(n);H,Wd=p.shape;SP=spray(p)
    try:P=dict(g11.parts(n));CQ={tuple(c) for c in catcher_q(n)}
    except KeyError:   # sibling facing without goalie9 parts: colour zones only (catcher core piece; 164 mask face)
        P={};CQ=set(zip(*np.nonzero(np.isin(p,list(CATZ)))))
    ev=np.zeros((H,Wd),int);ev[p==88]=SHADOW;ev[p==136]=STICK
    for c in SP:ev[c]=SHADOW
    for c in catcher_trim(p,CQ):ev[c]=CATCH
    for g,L in (('blocker',BLOCK),('mask',MASK)):
        for c in P.get(g,[]):
            if ev[tuple(c)]==0:ev[tuple(c)]=L
    for g,q in P.items():
        if g.startswith('pad'):
            for c in q:
                c=tuple(c)
                if ev[c]==0 and int(p[c]) in PADIDX|{22,30,31}:ev[c]=PADL if g.endswith('L') else PADR
    for c in blade(p,ev):ev[c]=STICK
    return p,ev
JN=skel10.J;BASE=np.array([skel10.BASE[k] for k in JN],float);IX={k:i for i,k in enumerate(JN)}
LB=[(a,b) for a,b,_ in BONES if a!=b]+[('neck','Rsh'),('neck','Lsh'),('pelvis','Rhip'),('pelvis','Lhip')]
BL=np.array([np.linalg.norm(BASE[IX[a]]-BASE[IX[b]]) for a,b in LB])
def project(X,d,s,ox,oy):
    t=math.radians(45*d);c,sn=math.cos(t),math.sin(t);x,y,z=X[:,0],X[:,1],X[:,2]
    sx=x*c+z*sn;dep=x*sn-z*c;sy=-y*math.cos(skel10.PITCH)+dep*math.sin(skel10.PITCH)
    return np.stack([ox+s*sx,oy+s*sy],1)
class Facing:
    def __init__(s,n,d):
        s.n,s.d=n,d;s.p,s.ev=evidence(n);s.lab=None;fg=(s.p!=255)&(s.ev!=SHADOW)&(s.ev!=STICK)
        s.fg=fg;s.dfg=ndimage.distance_transform_edt(~fg)
        s.dpad=ndimage.distance_transform_edt(~(np.isin(s.p,list(PADIDX|{22,30}))&fg))
        s.dglv=ndimage.distance_transform_edt(~((s.ev==BLOCK)|(s.ev==CATCH)|np.isin(s.p,list(CATZ|{144,147}))))
        ys,xs=np.nonzero(fg);P=project(BASE,d,1,0,0)
        sc=min((np.ptp(xs)+1)/(np.ptp(P[:,0])+1e-6),(np.ptp(ys)+1)/(np.ptp(P[:,1])+1e-6))
        s.init=[sc,(xs.max()+xs.min())/2-sc*(P[:,0].max()+P[:,0].min())/2,(ys.max()+ys.min())/2-sc*(P[:,1].max()+P[:,1].min())/2]
        s.adj=skel10.ADJ.get(n);s.obs={}
    def observe(s):
        L=s.lab if s.lab is not None else s.ev;O={}
        def cells(k):return list(zip(*np.nonzero(L==k)))
        M=cells(MASK)
        if M:O['head']=cen(M)
        for k,j in ((BLOCK,'Rhand'),(CATCH,'Lhand')):
            C=cells(k)
            if len(C)>=3:O[j]=cen(C)
        for k,a,h in ((PADR,'Rank','Rhip'),(PADL,'Lank','Lhip')):
            C=cells(k)
            if len(C)>=4:
                yb=max(y for y,x in C);yt=min(y for y,x in C)
                O[a]=cen([c for c in C if c[0]>=yb-1]);O[h]=cen([c for c in C if c[0]<=yt+1])
        s.obs=O
def samp(D,pts):return ndimage.map_coordinates(D,[pts[:,1],pts[:,0]],order=1,mode='nearest')
TT=np.linspace(0,1,7)
def cost(v,F):
    X=v[:45].reshape(15,3);c=0.0
    bl=np.array([np.linalg.norm(X[IX[a]]-X[IX[b]]) for a,b in LB]);c+=2.0*((bl-BL)**2).sum()+0.02*((X-BASE)**2).sum()
    for i,f in enumerate(F):
        s,ox,oy=v[45+3*i:48+3*i];J=project(X,f.d,s,ox,oy)
        if f.adj:c+=5*sum((J[IX[k]][0]-x)**2+(J[IX[k]][1]-y)**2 for k,(x,y) in f.adj.items());continue
        for k,(x,y) in f.obs.items():c+=(J[IX[k]][0]-x)**2+(J[IX[k]][1]-y)**2
        for a,b,L in BONES:
            pts=J[IX[a]][None]*(1-TT[:,None])+J[IX[b]][None]*TT[:,None]
            c+=2.0*(samp(f.dfg,pts)**2).sum()
            if L in(PADL,PADR):c+=0.5*(samp(f.dpad,pts)**2).sum()
            if b in('Rhand','Lhand') and a!=b:c+=0.5*samp(f.dglv,pts[-2:])[-1]**2
    return c
def joints_of(v,F,i):
    X=v[:45].reshape(15,3);f=F[i];J=project(X,f.d,*v[45+3*i:48+3*i]);return {k:(float(J[IX[k]][0]),float(J[IX[k]][1])) for k in JN}
_G15=None
def g15lab(n):
    global _G15
    if _G15 is None:_G15=json.load(open('/tmp/g15_seg.json'))
    return np.array(_G15[str(n)]['lab'])
CACHE={}
def fit_group(n,iters=4):
    sib=siblings(n);key=tuple(sorted(sib.values()))
    if key in CACHE:return CACHE[key]
    F=[Facing(m,d) for d,m in sorted(sib.items())]
    for f in F:f.observe()
    v=np.concatenate([BASE.flatten()]+[np.array(f.init) for f in F]);hist=[];k=0
    for k in range(iters):
        v=optimize.minimize(cost,v,args=(F,),method='L-BFGS-B',options=dict(maxiter=300)).x
        ch=0
        for i,f in enumerate(F):
            J=joints_of(v,F,i)
            new=label(f.n,f.p,f.ev,J) if not f.adj else label(f.n,f.p,f.ev,{kk:(float(x),float(y)) for kk,(x,y) in f.adj.items()})
            ch+=0 if f.lab is not None and (new==f.lab).all() else 1;f.lab=new;f.observe()
        hist.append(ch)
        if ch==0:break
    R={f.n:(f,joints_of(v,F,i)) for i,f in enumerate(F)};CACHE[key]=(R,k+1,len(F));return CACHE[key]
_label=g15seg.label
def label(n,p,ev,J):
    lab=_label(n,p,ev,J);py=J['pelvis'][1]
    lab[:max(0,int(py-4))][np.isin(lab[:max(0,int(py-4))],[PADL,PADR])&(ev[:max(0,int(py-4))]==0)]=BODY   # no pad above the hips
    return lab
def snap(J,p,lab):
    FG=list(zip(*np.nonzero((p!=255)&(lab!=SHADOW)&(lab!=STICK))))
    for m in J:
        x,y=round(J[m][0]),round(J[m][1])
        if not(0<=y<p.shape[0] and 0<=x<p.shape[1]) or lab[y,x] in(BG,SHADOW,STICK) or p[y,x]==255:
            y,x=min(FG,key=lambda c:math.hypot(c[1]-J[m][0],c[0]-J[m][1]));J[m]=(float(x),float(y))
    return J
def seg(n,iters=4):
    if n in skel10.ADJ:return g15seg.seg(n)
    R,k,nf=fit_group(n,iters);f,J=R[n];lab=f.lab.copy();J=snap(dict(J),f.p,lab)
    for c in FROZEN.get(n,[]):lab[c]=g15lab(n)[c]
    return f.p,lab,J,'joint %d facings x%d'%(nf,k)
g14seg.seg=seg
