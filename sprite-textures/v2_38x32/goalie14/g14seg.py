# Goalie v14 segmentation (Abdul pt904u): a per-frame body-part map from the skel10 3D goalie + index evidence, smoothed.
#  1 EVIDENCE  index-certain px: 88 shadow; 136 stick; catcher_q catcher; goalie9 blocker/mask parts; goalie9 pad parts
#              (pad indices only, minus catcher/blocker/mask).
#  2 BLADE     the stick blade is drawn black (0/8) next to the lowest 136 px. Blade = black px inside the box of the lowest
#              136 cluster (+-1 px) that are NOT enclosed left and right in their row by non-black pad px (pad straps and
#              toe are enclosed, the blade is not), flood-filled through such black px. 538 and 1044 had the blade in the pad.
#  3 SKELETON  skel10 joints: hand-adjusted ADJ for the ready facings, else the base 3D model projected at the frame's
#              facing d (yaw 45deg*d, pitch 30) and scaled/translated onto the sprite's body box. Each unlabelled px takes
#              the label of its nearest bone (head->mask, torso/arms->body, Rhand->blocker, Lhand->catcher, legs->pads;
#              a leg label needs a pad index, else body).
#  4 SMOOTH    two passes of a 3x3 majority filter on the non-evidence px, then connected-component cleanup: every
#              component of a label except the largest that is < 4 px and not within 1 px of the largest becomes the
#              most common neighbouring label (no stray islands).
#            Px not 8-connected to the goalie's main component (ice spray) go to the shadow class.
#  5 SKATE     inside each leg, g13 skate rule (31 blade px + unenclosed black reaching the foot) -> label skate.
import sys,os,math,collections
H14=os.path.dirname(os.path.abspath(__file__));sys.path.insert(0,H14+'/../goalie13');sys.path.insert(0,H14+'/../goalie12');sys.path.insert(0,H14+'/../goalie10')
from g13pad import *
import g13pad,skel10
import numpy as np
NAMES=['bg','body','mask','catcher','blocker','stick','padL','padR','skate','shadow']
BG,BODY,MASK,CATCH,BLOCK,STICK,PADL,PADR,SKATE,SHADOW=range(10)
BONES=[('head','neck',MASK),('neck','pelvis',BODY),('Rsh','Lsh',BODY),('Rhip','Lhip',BODY),('Rsh','Relb',BODY),('Lsh','Lelb',BODY),
       ('Relb','Rhand',BODY),('Lelb','Lhand',BODY),('Rhand','Rhand',BLOCK),('Lhand','Lhand',CATCH),
       ('Rhip','Rknee',PADR),('Rknee','Rank',PADR),('Lhip','Lknee',PADL),('Lknee','Lank',PADL)]
def joints(n,p,ev):
    if n in skel10.ADJ:return {k:(float(x),float(y)) for k,(x,y) in skel10.ADJ[n].items()},'ADJ'
    d=GF[n][0][1];P=skel10.proj(d);ys,xs=np.nonzero((p!=255)&(ev!=SHADOW)&(ev!=STICK))
    jx=[v[0] for v in P.values()];jy=[v[1] for v in P.values()]
    s=min((xs.max()-xs.min()+1)/(max(jx)-min(jx)+1e-6),(ys.max()-ys.min()+1)/(max(jy)-min(jy)+1e-6))
    ox=(xs.max()+xs.min())/2-s*(max(jx)+min(jx))/2;oy=(ys.max()+ys.min())/2-s*(max(jy)+min(jy))/2
    return {k:(ox+s*v[0],oy+s*v[1]) for k,v in P.items()},'proj d%d'%d
def segd(px,a,b):
    (x,y),(ax,ay),(bx,by)=px,a,b;dx,dy=bx-ax,by-ay;L=dx*dx+dy*dy
    t=0 if L==0 else max(0,min(1,((x-ax)*dx+(y-ay)*dy)/L));return math.hypot(x-ax-t*dx,y-ay-t*dy)
def blade(p,ev):
    S=list(zip(*np.nonzero(p==136)))
    if not S:return set()
    yb=max(y for y,x in S);low=[(y,x) for y,x in S if y>=yb-5]
    a,b=min(y for y,x in low)-1,max(y for y,x in low)+1;c,e=min(x for y,x in low)-1,max(x for y,x in low)+1
    padc=lambda y,x:0<=y<p.shape[0] and 0<=x<p.shape[1] and ev[y,x] in(PADL,PADR,0) and int(p[y,x]) in PADIDX-{0}
    def enc(y,x):return any(padc(y,xx) for xx in range(x-1,x-8,-1)) and any(padc(y,xx) for xx in range(x+1,x+8))
    blk=lambda y,x:0<=y<p.shape[0] and 0<=x<p.shape[1] and int(p[y,x]) in(0,8)
    out={(y,x) for y in range(a,b+1) for x in range(c,e+1) if blk(y,x) and not enc(y,x)};fr=list(out)
    while fr:
        y,x=fr.pop()
        for d in nb8((y,x)):
            if d not in out and blk(*d) and a-2<=d[0]<=b+2 and c-2<=d[1]<=e+2 and not enc(*d):out.add(d);fr.append(d)
    return out
def seg(n):
    p=frame(n);H,Wd=p.shape;ev=np.zeros((H,Wd),int);P=dict(g11.parts(n))
    ev[p==88]=SHADOW;ev[p==136]=STICK
    for c in catcher_q(n):ev[tuple(c)]=CATCH
    for g,L in (('blocker',BLOCK),('mask',MASK)):
        for c in P.get(g,[]):
            if ev[tuple(c)]==0:ev[tuple(c)]=L
    for g,q in P.items():
        if g.startswith('pad'):
            for c in q:
                c=tuple(c)
                if ev[c]==0 and int(p[c]) in PADIDX|{22,30,31}:ev[c]=PADL if g.endswith('L') else PADR
    for c in blade(p,ev):ev[c]=STICK
    J,src=joints(n,p,ev);lab=ev.copy();fixed=ev!=0
    for y in range(H):
        for x in range(Wd):
            if p[y,x]==255 or fixed[y,x]:continue
            L=min(BONES,key=lambda B:segd((x,y),J[B[0]],J[B[1]])-(0.5 if B[2] in(BLOCK,CATCH) else 0))[2]
            if L in(PADL,PADR) and int(p[y,x]) not in PADIDX|{22,30}:L=BODY
            lab[y,x]=L
    for y in range(H):         # a pad label always needs a pad index (980/520: blocker 147 / catcher 150 px)
        for x in range(Wd):
            if lab[y,x] in(PADL,PADR) and int(p[y,x]) not in PADIDX|{22,30,31}:lab[y,x]=BODY
    fg=p!=255
    for _ in range(2):           # 3x3 majority on non-evidence px
        new=lab.copy()
        for y in range(H):
            for x in range(Wd):
                if not fg[y,x] or fixed[y,x]:continue
                C=collections.Counter(int(lab[yy,xx]) for yy in range(max(0,y-1),min(H,y+2)) for xx in range(max(0,x-1),min(Wd,x+2)) if fg[yy,xx] and lab[yy,xx] not in(SHADOW,STICK))
                if C:
                    L,k=C.most_common(1)[0]
                    if k>=5 and not(L in(PADL,PADR) and int(p[y,x]) not in PADIDX|{22,30}):new[y,x]=L
        lab=new
    lab=cleanup(lab,fg,p)
    # px not 8-connected to the goalie (largest non-shadow component) are ice spray / debris (538 rows 19-24): shadow class
    cs=comps(list(zip(*np.nonzero(fg&(lab!=SHADOW)))))
    for cc in cs[1:]:
        if len(cc)<0.5*len(cs[0]):
            for c in cc:lab[c]=SHADOW
    return p,lab,J,src
def comps(cells):
    s=set(cells);out=[]
    while s:
        c=s.pop();cc={c};fr=[c]
        while fr:
            for d in nb8(fr.pop()):
                if d in s:s.remove(d);cc.add(d);fr.append(d)
        out.append(cc)
    return sorted(out,key=len,reverse=True)
def cleanup(lab,fg,p):
    H,Wd=lab.shape
    for L in (BODY,MASK,CATCH,BLOCK,PADL,PADR):
        cs=comps(list(zip(*np.nonzero(lab==L))))
        if not cs:continue
        big=cs[0]
        for cc in cs[1:]:
            if len(cc)>=4 or any(abs(a[0]-b[0])<=1 and abs(a[1]-b[1])<=1 for a in cc for b in big):continue
            C=collections.Counter(int(lab[d]) for c in cc for d in nb8(c) if 0<=d[0]<H and 0<=d[1]<Wd and fg[d] and lab[d] not in(L,SHADOW,STICK))
            if C:
                for c in cc:
                    N=C.most_common(1)[0][0]
                    lab[c]=BODY if N in(PADL,PADR) and int(p[c]) not in PADIDX|{22,30,31} else N
    return lab
def legs(n):
    """pads for mapping = padL/padR of the smoothed segmentation, merged when touching and one pad wide (g13 rule),
    largest body kept, minus skate."""
    p,lab,J,src=seg(n);raw=[(g,set(zip(*np.nonzero(lab==L)))) for g,L in (('padF_L',PADL),('padF_R',PADR))];raw=[(g,s) for g,s in raw if s]
    def narrow(s):
        R=collections.defaultdict(list)
        for y,x in s:R[y].append(x)
        w=sorted(max(v)-min(v)+1 for v in R.values());return w[len(w)//2]<=9
    out=[]
    for g,s in raw:
        for o in out:
            if narrow(o[1]|s) and any(d in o[1] for c in s for d in ((c[0],c[1]-1),(c[0],c[1]+1),(c[0]-1,c[1]),(c[0]+1,c[1]))):o[1].update(s);o[0].append(g);break
        else:out.append([[g],set(s)])
    res=[]
    for gs,s in out:
        s=main_body(s);sk=skate(p,s)
        for c in sk:lab[c]=SKATE
        res.append(('+'.join(gs),sorted(s-sk),sorted(sk)))
    return res,lab,J,src
