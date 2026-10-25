"""D183: stick-first fit (hard constraint) and black-coverage-driven limb refit (Abdul t1025u/t1026u/t1027u)."""
import numpy as np
from scipy.ndimage import label
from blackcov import classify
E8=np.ones((3,3),int)
def stickfit(stickm,black,skinloc=None,body=None):
    """stickm: stick-colour pixels. On 95PC the stick colour is shared with skin (index 136), so components are kept by SHAPE:
    long, thin, straight. Returns {'stick butt','stick heel','stick toe'} (x,y continuous) or None."""
    m=stickm.copy()
    if skinloc is not None:m&=~skinloc
    ys,xs=np.nonzero(m)
    if len(ys)<4:return None
    P=np.stack([xs+.5,ys+.5],1);rng=np.random.default_rng(0);best=None
    pairs=[(a,b) for a in range(len(P)) for b in range(a+1,len(P))]
    if len(pairs)>600:pairs=[pairs[k] for k in rng.choice(len(pairs),600,replace=False)]
    for a,b in pairs:
        d=P[b]-P[a];L0=np.hypot(*d)
        if L0<3:continue
        ax=d/L0;nrm=np.array([-ax[1],ax[0]]);inl=np.abs((P-P[a])@nrm)<=1.0
        t=np.sort((P[inl]-P[a])@ax);cut=np.nonzero(np.diff(t)>4)[0]+1   # one straight run (gloves may break it by <=4 px)
        runs=np.split(t,cut);t=max(runs,key=len);sc=len(t)
        if best is None or sc>best[0]:best=(sc,P[a],ax,t)
    if best is None or best[0]<4 or best[3].max()-best[3].min()<5:return None
    sc,c,ax,t=best
    # extend through collinear black (tape at the butt, blade start)
    bys,bxs=np.nonzero(black);Q=np.stack([bxs+.5,bys+.5],1);nrm=np.array([-ax[1],ax[0]])
    if len(Q):
        tq=(Q-c)@ax;on=(np.abs((Q-c)@nrm)<=1.0)&(tq>=t.min()-4)&(tq<=t.max()+4);t=np.concatenate([t,tq[on]])
    best=(t.max()-t.min(),c,ax,t)
    L,c,ax,t=best;e1=c+ax*t.min();e2=c+ax*t.max()
    my,mx=np.nonzero(body if body is not None else (black|stickm));cen=np.array([mx.mean()+.5,my.mean()+.5])
    heel,butt=(e1,e2) if np.hypot(*(e1-cen))>np.hypot(*(e2-cen)) else (e2,e1)   # blade end is away from the body; the butt is held near it
    # blade: black + stick pixels near the heel, not above it
    H,W=black.shape;ys,xs=np.nonzero(black|stickm);P=np.stack([xs+.5,ys+.5],1)
    d=np.hypot(*(P-heel).T);k=(d<=7)&(P[:,1]>=heel[1]-1.5)&(((P-heel)@((butt-heel)/max(1e-6,np.hypot(*(butt-heel)))))<=1.5)
    toe=P[k][np.argmax(d[k])] if k.any() and d[k].max()>=2 else heel+np.array([2.,0])
    return {'stick butt':tuple(butt),'stick heel':tuple(heel),'stick toe':tuple(toe)}
ARMS=[('R',['R shoulder','R elbow','R wrist','R glove']),('L',['L shoulder','L elbow','L wrist','L glove'])]
LEGS=[('R',['R hip','R knee','R ankle','R skate']),('L',['L hip','L knee','L ankle','L skate'])]
HARD=(6,)          # 'other' is the hard category; outline/head/ice/shaft/torso are allowed pending Abdul's ruling
def uncovered(black,mask,J,bones,cats=HARD):
    ys,xs,cat=classify(black,mask,J,bones);k=np.isin(cat,cats);return ys[k],xs[k],cat
def place_chain(J,ch,tgt):
    """move chain end to tgt; inner joints on the straight line, keeping the chain's length proportions (bent if too long)"""
    J=dict(J);r=np.asarray(J[ch[0]],float);L=[np.hypot(*np.subtract(J[ch[i+1]],J[ch[i]])) for i in range(len(ch)-1)];tot=sum(L)
    v=np.asarray(tgt,float)-r;dist=np.hypot(*v)
    if dist>1.35*tot+1:return None
    u=v/max(dist,1e-6);perp=np.array([-u[1],u[0]]);acc=0;bend=np.sqrt(max(0,tot**2-dist**2))/2 if tot>dist else 0
    for i in range(1,len(ch)):
        acc+=L[i-1];f=acc/max(tot,1e-6);J[ch[i]]=tuple(r+v*f+perp*bend*np.sin(np.pi*f)*(i<len(ch)-1))
    return J
def limbfit(black,mask,J,bones,cand_extra=None,rounds=4):
    """greedy: for each uncovered black cluster (hard category, plus black blobs above the head = raised gloves),
    try moving each arm/leg chain end onto it; keep the move that most reduces uncovered black."""
    J=dict(J);log=[]
    def cost(J):
        ys,xs,cat=classify(black,mask,J,bones);return int((cat==6).sum()),int((cat!=0).sum())
    for _ in range(rounds):
        ys,xs,cat=classify(black,mask,J,bones);hd=np.asarray(J.get('head',(0,0)),float)
        sel=(cat==6)|(cat==4)|((cat==2)&(ys+.5<hd[1]-1))  # 'other', black on the shaft (a glove on the stick), or black above the head (a raised glove)
        if not sel.any():break
        Z=np.zeros_like(black);Z[ys[sel],xs[sel]]=1;l,n=label(Z,E8)
        cl=sorted([np.argwhere(l==i) for i in range(1,n+1)],key=len,reverse=True)
        c0=cost(J);best=None
        for g in cl[:3]:
            if len(g)<2:continue
            tgt=(g[:,1].mean()+.5,g[:,0].mean()+.5)
            for side,ch in ARMS+LEGS:
                if not all(k in J for k in ch):continue
                J2=place_chain(J,ch,tgt)
                if J2 is None:continue
                c=cost(J2)
                if c[0]+0.25*c[1]<c0[0]+0.25*c0[1]-1.5 and (best is None or c<best[0]):best=(c,J2,ch[-1],tgt)
        if best is None:break
        J=best[1];log.append((best[2],tuple(round(v,1) for v in best[3]),c0,best[0]))
    return J,log

def is_player(F,cls='skater'):
    """F: colour-family map. A player sprite is at least 18 px tall with at least 4 colour families; skaters also show skin
    (goalies may be fully masked)."""
    ys=np.nonzero((F>0).any(1))[0];fams=set(np.unique(F))-{0}
    return len(ys)>0 and ys.max()-ys.min()+1>=18 and len(fams)>=4 and (4 in fams or cls=='goalie')
STICK=('stick butt','stick heel','stick toe')
def drop_stick(J):return {k:v for k,v in J.items() if k not in STICK}
def attach(J,black,mask,bones,r=1.5):
    """t1031u: one tree. The stick shaft must be held: the nearest glove is put on the shaft (nearest shaft point) if it is
    farther than r. Returns J, grip glove, and (uncovered before, after) so a worse fit can be reported."""
    if not all(k in J for k in STICK[:2]):return J,None,None
    A=np.asarray(J['stick butt'],float);B=np.asarray(J['stick heel'],float);d=B-A
    best=None
    for side,ch in ARMS:
        if not all(k in J for k in ch):continue
        g=np.asarray(J[ch[-1]],float);t=np.clip(((g-A)@d)/max(1e-9,d@d),0,1);p=A+t*d;dist=np.hypot(*(g-p))
        if best is None or dist<best[0]:best=(dist,ch,tuple(p))
    if best is None:return J,None,None
    dist,ch,p=best
    def u(J):return int((classify(black,mask,J,bones)[2]==6).sum())
    if dist<=r:return J,ch[-1],(u(J),u(J))
    J2=place_chain(J,ch,p)
    if J2 is None:return J,None,(u(J),None)          # cannot reach: reported as an unattached stick
    return J2,ch[-1],(u(J),u(J2))
def tree_ok(J,bones,grip):
    """all present joints connected through bones, with the stick joined at the grip glove"""
    E=[(a,b) for a,b in bones if a in J and b in J]+([(grip,'stick butt')] if grip else [])
    adj={};[adj.setdefault(a,set()).add(b) or adj.setdefault(b,set()).add(a) for a,b in E]
    seen={'pelvis'};st=['pelvis']
    while st:
        u=st.pop()
        for v in adj.get(u,()):
            if v not in seen:seen.add(v);st.append(v)
    return all(k in seen for k in J if not k.startswith('_'))
