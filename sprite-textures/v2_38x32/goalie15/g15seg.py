# Goalie v15 segmentation (Abdul pt907u): colour zones x part identification x skeleton, iterated until they agree.
#  ZONES    what a px may be, from its index: catcher only {144..152}; pads PADIDX (+22/30 shading, 31 skate);
#           ice spray = low indices (1-30 except 0/8) in a run of >=3 connected low-index px (538 rows 19-24 were
#           connected to the right pad and labelled pad/blocker); single 22/30 px stay pad shading.
#  PARTS    catcher_q is trimmed to its zone and to the 4-connected piece holding catcher-only colours (148/149/150):
#           421 pad trim/pad px (155/151 below the glove) had been claimed as catcher.
#  SKELETON frames without hand-fit ADJ joints are FIT to the parts, not projected: head/neck from the mask, hands from
#           the blocker/catcher centroids, ankles from the pad bottoms (above the skate), knees
#           and elbows by 2-bone IK with the skel10 bone lengths (same lengths for every facing), bent to the side the
#           rotated 3D pose bends; shoulders, pelvis and hips = neck + the skel10 offsets rotated to the frame's facing.
#           Pelvis = above the pad tops when both pads are found (538 lunge), else neck + rotated offset.
#  ITERATE  segment -> fit joints to the new pads/hands -> segment again, until labels stop changing (max 4 rounds).
#  GROW     unfixed body px with a pad colour (not black), 4-touching a pad and at most 4 rows above the pelvis join that pad.
#           The skeleton never labels mask (mask = part evidence only); every joint off the sprite snaps to the nearest px.
#  Smoothing (3x3 majority + island cleanup) as g14.
import sys,os,math,collections
H15=os.path.dirname(os.path.abspath(__file__));sys.path.insert(0,H15+'/../goalie14')
import g14seg
from g14seg import *
import numpy as np
CATZ=set(range(144,153));CORE={148,149,150}
LOWI=lambda s:1<=s<=30 and s not in(8,)
def spray(p):
    S=[c for c in zip(*np.nonzero((p>=1)&(p<=30)&(p!=8)))];out=set()
    for cc in comps(S):
        if len(cc)>=3:out|=cc
    return out
def catcher_trim(p,C):
    C={c for c in C if int(p[c]) in CATZ};core={c for c in C if int(p[c]) in CORE};keep=set(core);fr=list(core)
    while fr:
        y,x=fr.pop()
        for d in ((y+1,x),(y-1,x),(y,x+1),(y,x-1)):
            if d in C and d not in keep:keep.add(d);fr.append(d)
    return keep
def blen(a,b):
    A,B=skel10.BASE[a],skel10.BASE[b];return math.dist(A,B)
def ik(a,c,l1,l2,away):
    """joint between a and c with bone lengths l1,l2, bent toward the side of 'away' vector."""
    dx,dy=c[0]-a[0],c[1]-a[1];D=math.hypot(dx,dy) or 1e-6
    if D>=l1+l2-1e-6:t=l1/(l1+l2);return (a[0]+dx*t,a[1]+dy*t)
    t=(l1*l1-l2*l2+D*D)/(2*D);h=math.sqrt(max(0,l1*l1-t*t));ux,uy=dx/D,dy/D;nx,ny=-uy,ux
    if nx*away[0]+ny*away[1]<0:nx,ny=-nx,-ny
    return (a[0]+ux*t+nx*h,a[1]+uy*t+ny*h)
def cen(S):
    S=list(S);return (sum(x for y,x in S)/len(S),sum(y for y,x in S)/len(S))
def fit(n,p,lab,prev):
    d=GF[n][0][1];P=skel10.proj(d);J=dict(prev)
    def cells(L):return list(zip(*np.nonzero(lab==L)))
    M=cells(MASK)
    if M:
        hx,hy=cen(M);ymax=max(y for y,x in M);J['head']=(hx,hy);J['neck']=(hx,ymax+1.0)
    nx,ny=J['neck'];off=lambda k,r='neck':(P[k][0]-P[r][0],P[k][1]-P[r][1])
    J['pelvis']=(nx+off('pelvis')[0],ny+off('pelvis')[1])
    tops=[cen([c for c in C if c[0]<=min(y for y,x in C)+1]) for C in (cells(PADL),cells(PADR)) if len(C)>=4]
    if tops:   # pelvis sits above the pad tops (a lunge or dive moves it far from neck+offset)
        tx=sum(t[0] for t in tops)/len(tops);ty=min(t[1] for t in tops);J['pelvis']=(tx,ty-1)
    for k in ('Rsh','Lsh'):J[k]=(nx+off(k)[0],ny+off(k)[1])
    for k in ('Rhip','Lhip'):J[k]=(J['pelvis'][0]+off(k,'pelvis')[0],J['pelvis'][1]+off(k,'pelvis')[1])
    for L,A in ((PADR,'Rank'),(PADL,'Lank')):
        C=cells(L)
        if len(C)>=4:yb=max(y for y,x in C);J[A]=cen([c for c in C if c[0]>=yb-1])
    for L,k in ((BLOCK,'Rhand'),(CATCH,'Lhand')):
        C=cells(L)
        if len(C)>=3:J[k]=cen(C)
    for a,m,c in (('Rhip','Rknee','Rank'),('Lhip','Lknee','Lank'),('Rsh','Relb','Rhand'),('Lsh','Lelb','Lhand')):
        # bend side = where the rotated 3D pose puts the middle joint relative to its limb line
        mx,my=(P[a][0]+P[c][0])/2,(P[a][1]+P[c][1])/2;away=(P[m][0]-mx,P[m][1]-my)
        if abs(away[0])+abs(away[1])<0.3:away=(0,-1)
        J[m]=ik(J[a],J[c],blen(a,m),blen(m,c),away)
    FG=list(zip(*np.nonzero((p!=255)&(lab!=SHADOW)&(lab!=STICK))))
    for m in J:
        if not(0<=round(J[m][1])<p.shape[0] and 0<=round(J[m][0])<p.shape[1]) or lab[round(J[m][1]),round(J[m][0])] in(BG,SHADOW,STICK):
            y,x=min(FG,key=lambda c:math.hypot(c[1]-J[m][0],c[0]-J[m][1]));J[m]=(float(x),float(y))
    return J
def seg(n,iters=4):
    p=frame(n);H,Wd=p.shape;P=dict(g11.parts(n));SP=spray(p)
    def evidence():
        ev=np.zeros((H,Wd),int);ev[p==88]=SHADOW;ev[p==136]=STICK
        for c in SP:ev[c]=SHADOW
        for c in catcher_trim(p,{tuple(c) for c in catcher_q(n)}):ev[c]=CATCH
        for g,L in (('blocker',BLOCK),('mask',MASK)):
            for c in P.get(g,[]):
                if ev[tuple(c)]==0:ev[tuple(c)]=L
        for g,q in P.items():
            if g.startswith('pad'):
                for c in q:
                    c=tuple(c)
                    if ev[c]==0 and int(p[c]) in PADIDX|{22,30,31}:ev[c]=PADL if g.endswith('L') else PADR
        for c in blade(p,ev):ev[c]=STICK
        return ev
    ev=evidence()
    if n in skel10.ADJ:
        J={k:(float(x),float(y)) for k,(x,y) in skel10.ADJ[n].items()};src='ADJ';lab=label(n,p,ev,J);return p,lab,J,src
    J,_=g14seg.joints(n,p,ev);lab=label(n,p,ev,J);k=0
    for k in range(iters):
        J=fit(n,p,lab,J);new=label(n,p,ev,J)
        if (new==lab).all():break
        lab=new
    return p,lab,J,'fit x%d'%(k+1)
def label(n,p,ev,J):
    H,Wd=p.shape;lab=ev.copy();fixed=ev!=0
    for y in range(H):
        for x in range(Wd):
            if p[y,x]==255 or fixed[y,x]:continue
            L=min(BONES,key=lambda B:segd((x,y),J[B[0]],J[B[1]])-(0.5 if B[2] in(BLOCK,CATCH) else 0))[2]
            s=int(p[y,x])
            if L in(PADL,PADR) and s not in PADIDX|{22,30}:L=BODY
            if L==CATCH and s not in CATZ:L=BODY
            if L==MASK and (ev==MASK).any():L=BODY   # mask from part evidence when the frame has it (980 has none)
            lab[y,x]=L
    fg=p!=255
    for _ in range(2):
        new=lab.copy()
        for y in range(H):
            for x in range(Wd):
                if not fg[y,x] or fixed[y,x]:continue
                C=collections.Counter(int(lab[yy,xx]) for yy in range(max(0,y-1),min(H,y+2)) for xx in range(max(0,x-1),min(Wd,x+2)) if fg[yy,xx] and lab[yy,xx] not in(SHADOW,STICK))
                if C:
                    L,k=C.most_common(1)[0];s=int(p[y,x])
                    if k>=5 and not(L in(PADL,PADR) and s not in PADIDX|{22,30}) and not(L==CATCH and s not in CATZ):new[y,x]=L
        lab=new
    lab=cleanup(lab,fg,p)
    for y in range(H):
        for x in range(Wd):
            if lab[y,x] in(PADL,PADR) and int(p[y,x]) not in PADIDX|{22,30,31}:lab[y,x]=BODY
    # zone growth: unfixed body px with a pad colour, 4-touching a pad, below the pelvis, join that pad (421 left pad)
    py=J['pelvis'][1];ch=True
    while ch:
        ch=False
        for y in range(H):
            for x in range(Wd):
                if lab[y,x]!=BODY or fixed[y,x] or y<py-4 or int(p[y,x]) not in PADIDX-{0}:continue
                for d in ((y+1,x),(y-1,x),(y,x+1),(y,x-1)):
                    if 0<=d[0]<H and 0<=d[1]<Wd and lab[d] in(PADL,PADR):lab[y,x]=lab[d];ch=True;break
    cs=comps(list(zip(*np.nonzero(fg&(lab!=SHADOW)))))
    for cc in cs[1:]:
        if len(cc)<0.5*len(cs[0]):
            for c in cc:lab[c]=SHADOW
    return lab
g14seg.seg=seg
