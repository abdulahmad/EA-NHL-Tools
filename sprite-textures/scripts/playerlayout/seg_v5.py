# v5 body-part segmentation + stickman skeleton for the 11 test frames (Abdul pt784u).
# Game palette zone = WHICH body part a pixel may belong to (validity filter). Geometry (connectivity, position, direction)
# decides left/right, upper/lower, near/far. Parts:
#  1 head  2 torso upper  3 torso lower  4/5 R/L upper arm  6/7 R/L lower arm  8/9 R/L glove
#  10/11 R/L upper leg  12/13 R/L lower leg  14/15 R/L skate  16 pants (hip block above the crotch)  17 stick
# Left/right = the PLAYER's left/right: front views (d3-5) player's right = screen left; back views (d0/1/7) right = screen right;
# side views: d2 shows the player's right flank (near = right), d6 the left flank (near = left); near limb = the larger arm
# component / the leg whose skate reaches lower on screen (closer to the camera).
import numpy as np,collections
from scipy import ndimage
PARTS={1:'head',2:'torso upper',3:'torso lower',4:'R upper arm',5:'L upper arm',6:'R lower arm',7:'L lower arm',8:'R glove',9:'L glove',
       10:'R upper leg',11:'L upper leg',12:'R lower leg',13:'L lower leg',14:'R skate',15:'L skate',16:'pants (hips)',17:'stick'}
TORSOF={'yoke 1','yoke 2','yoke 3','yoke corner','shoulder patch','jersey','waist 1','waist 2','waist 3'}
ARMF={'upper arm','arm stripe 1','arm stripe 2','arm stripe 3','forearm'}
N8=np.ones((3,3),int)
def segment(q,fam,d,neck,stick,fit_torso_rows):
    """q: frame indices; fam: {(y,x):family}; neck: set of neck-136 px; stick: set of stick px.
    fit_torso_rows: fn(pixels)->{px:geometric torso row 6..16}. Returns part map {px:id}, joints, arm sides, info."""
    P={};H,W=q.shape
    def comps(px):
        m=np.zeros((H,W),bool)
        for y,x in px:m[y,x]=1
        lab,k=ndimage.label(m,N8);return [[(int(y),int(x)) for y,x in zip(*np.nonzero(lab==i))] for i in range(1,k+1)]
    head=[p for p,f in fam.items() if f in('helmet','skin')]
    for p in head:P[p]=1
    for p in stick:P[p]=17
    tor=[p for p,f in fam.items() if f in TORSOF or f.startswith('idx')];TR=fit_torso_rows(tor)
    for p in tor:P[p]=2 if TR[p]<=11 else 3
    tcx=np.mean([p[1] for p in tor]);tcy=np.mean([p[0] for p in tor])
    back=d in(0,1,7);front=d in(3,4,5)
    def side_of(cx,near=None):      # player side of a limb whose centroid x is cx
        if front:return 'R' if cx<tcx else 'L'
        if back:return 'R' if cx>tcx else 'L'
        nearside='R' if d==2 else 'L';return nearside if near else ('L' if nearside=='R' else 'R')
    # ---- arms: components of arm-zone pixels (+ gloves = gear touching them)
    arm=[p for p,f in fam.items() if f in ARMF];AC=sorted(comps(arm),key=len,reverse=True)
    big=[c for c in AC if len(c)>=4];small=[c for c in AC if len(c)<4]
    for c in small:                    # stray specks join the nearest big arm component
        if big:j=min(range(len(big)),key=lambda j:min(abs(a[0]-b[0])+abs(a[1]-b[1]) for a in c for b in big[j]));big[j]=big[j]+c
    big=big[:2];ARMS={}
    if len(big)==2 and not(front or back):sides=['R' if d==2 else 'L','L' if d==2 else 'R']
    else:
        sides=[side_of(np.mean([p[1] for p in c]),near=(i==0)) for i,c in enumerate(big)]
        if len(big)==2 and sides[0]==sides[1]:     # both on one screen side (foreshortened/crossing arm): the farther one is the other arm
            dd=[abs(np.mean([p[1] for p in c])-tcx) for c in big];o=int(dd[1]>dd[0]);sides[o]='L' if sides[o]=='R' else 'R'
    gear=[p for p,f in fam.items() if f=='gear'];GC=comps(gear)
    for c,s in zip(big,sides):
        ua=[p for p in c if fam[p]=='upper arm'];la=[p for p in c if fam[p]!='upper arm']
        for p in ua:P[p]=4 if s=='R' else 5
        for p in la:P[p]=6 if s=='R' else 7
        ARMS[s]=c
    for g in GC:
        best=None
        for s,c in ARMS.items():
            fa=[p for p in c if fam[p] in('forearm','arm stripe 3','arm stripe 2')] or c
            dist=min(max(abs(a[0]-b[0]),abs(a[1]-b[1])) for a in g for b in fa)
            if dist<=2 and (best is None or dist<best[0]):best=(dist,s)
        if best:
            for p in g:P[p]=8 if best[1]=='R' else 9
    # ---- legs
    pants=[p for p,f in fam.items() if f.startswith('pants')];socks=[p for p,f in fam.items() if f.startswith('socks')]
    sk=[p for g in GC for p in g if p not in P]+[p for p,f in fam.items() if f=='blade']
    SC=sorted([c for c in comps(socks+sk) if len(c)>=3],key=len,reverse=True)[:2]
    LEG={}
    if len(SC)==2:
        low=[max(p[0] for p in c) for c in SC];cx=[np.mean([p[1] for p in c]) for c in SC]
        if front or back:s=[side_of(x) for x in cx]
        else:i=int(low[1]>low[0]);s=[None,None];s[i]='R' if d==2 else 'L';s[1-i]='L' if s[i]=='R' else 'R'
        if s[0]==s[1]:s[1]='L' if s[0]=='R' else 'R'
        LEG={s[0]:SC[0],s[1]:SC[1]}
    elif SC:LEG={side_of(np.mean([p[1] for p in SC[0]]),near=True):SC[0]}
    for s,c in LEG.items():
        for p in c:P[p]=(12 if s=='R' else 13) if fam.get(p,'').startswith('socks') else (14 if s=='R' else 15)
    # crotch: first pants row that is two runs; pants above it = hips block, below = upper legs by nearest leg column
    rows=collections.defaultdict(list)
    for y,x in pants:rows[y].append(x)
    crotch=max(rows)+1 if rows else 0         # crotch = first pants row (from the top) that splits into two runs
    for y in sorted(rows):
        xs=sorted(rows[y]);runs=1+sum(1 for a,b in zip(xs,xs[1:]) if b-a>1)
        if runs>=2:crotch=y;break
    for p in pants:
        if p[0]<crotch-1 or not LEG:P[p]=16;continue
        s=min(LEG,key=lambda s:min(abs(p[1]-b[1])+0.3*abs(p[0]-b[0]) for b in LEG[s]));P[p]=10 if s=='R' else 11
    for p in fam:
        if p not in P:P[p]=16 if fam[p].startswith('pants') else 3 if fam[p] in TORSOF else 1 if fam[p] in('helmet','skin') else 0
    # ---- joints (centroids / boundaries), skeleton edges
    def cen(ids,pred=lambda p:True):
        px=[p for p,i in P.items() if i in ids and pred(p)];return (float(np.mean([p[1] for p in px])),float(np.mean([p[0] for p in px]))) if px else None
    def touch(ids_a,ids_b):     # mean of part-a pixels 8-adjacent to part b
        B={p for p,i in P.items() if i in ids_b}
        px=[p for p,i in P.items() if i in ids_a and any((p[0]+a,p[1]+b) in B for a in(-1,0,1) for b in(-1,0,1))]
        return (float(np.mean([p[1] for p in px])),float(np.mean([p[0] for p in px]))) if px else None
    J={'head':cen({1}),'neck':touch({2},{1}) or cen({2}),'chest':cen({2}),'belly':cen({3}),'pelvis':cen({3},lambda p:fam[p].startswith('waist')) or cen({3})}
    for s,o in(('R',0),('L',1)):
        J[s+' shoulder']=touch({4+o},{2,3}) or cen({4+o});J[s+' elbow']=cen({6+o},lambda p:fam[p].startswith('arm stripe')) or touch({6+o},{4+o})
        J[s+' wrist']=touch({6+o},{8+o}) or cen({6+o},lambda p:fam[p]=='forearm');J[s+' glove']=cen({8+o})
        J[s+' hip']=touch({10+o},{16}) or cen({10+o});J[s+' knee']=touch({10+o},{12+o}) or touch({12+o},{10+o});J[s+' ankle']=touch({12+o},{14+o});J[s+' skate']=cen({14+o})
    E=[('head','neck'),('neck','chest'),('chest','belly'),('belly','pelvis')]
    for s in'RL':E+=[('neck',s+' shoulder'),(s+' shoulder',s+' elbow'),(s+' elbow',s+' wrist'),(s+' wrist',s+' glove'),('pelvis',s+' hip'),(s+' hip',s+' knee'),(s+' knee',s+' ankle'),(s+' ankle',s+' skate')]
    return P,{k:v for k,v in J.items() if v},E,ARMS,TR
