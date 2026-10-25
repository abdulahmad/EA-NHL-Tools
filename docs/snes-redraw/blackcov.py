"""D183: black-pixel coverage by limb bones / blade (Abdul t1025u rule), with exception categories."""
import numpy as np
LIMB=('shoulder','sh','elb','wrist','glove','hand','hip','knee','ank','skate')
def is_limb(a,b):
    n=lambda k:k.lower().replace('l ','').replace('r ','')
    st=lambda k:any(t in n(k) for t in LIMB) and not k.startswith('stick')
    return st(a) and st(b) and not ({'pelvis','neck'}&{a,b})
def segdist(P,A,B):
    A=np.asarray(A,float);B=np.asarray(B,float);d=B-A;t=np.clip(((P-A)@d)/max(1e-9,d@d),0,1);return np.hypot(*(A+np.outer(t,d)-P).T) if P.ndim>1 else None
def dist_to(P,J,bones):
    D=np.full(len(P),np.inf)
    for a,b in bones:
        if a in J and b in J:
            A=np.asarray(J[a],float);B=np.asarray(J[b],float);d=B-A;t=np.clip(((P-A)@d)/max(1e-9,d@d),0,1)[:,None];D=np.minimum(D,np.hypot(*(A+t*d-P).T))
    return D
CATS=['covered','outline edge','helmet/head','skate/ice shadow','stick shaft','torso (numbers/stripes)','other']
RE=3.0
def classify(black,mask,J,bones,r=1.6):
    """black, mask: HxW bool. J: joint->(x,y) continuous (pixel centre = x+.5). Returns per-pixel category index."""
    ys,xs=np.nonzero(black);P=np.stack([xs+.5,ys+.5],1);cat=np.full(len(P),6)
    if not len(P):return ys,xs,cat
    limb=[(a,b) for a,b in bones if is_limb(a,b)]+[(a,b) for a,b in bones if {a,b}=={'stick heel','stick toe'}]
    shaft=[(a,b) for a,b in bones if {a,b}=={'stick butt','stick heel'}]
    torso=[(a,b) for a,b in bones if not is_limb(a,b) and not a.startswith('stick') and 'head' not in (a,b)]
    H,W=mask.shape;Mp=np.pad(mask,1)
    edge=np.array([not Mp[y,x+1] or not Mp[y+2,x+1] or not Mp[y+1,x] or not Mp[y+1,x+2] for y,x in zip(ys,xs)])
    skl=[J[k][1] for k in J if any(t in k.lower() for t in('skate','ank'))];ice=max(skl)-0.5 if skl else H
    hd=np.asarray(J['head'],float) if 'head' in J else None
    ends=[k for k in J if any(t in k.lower() for t in ('glove','hand','skate'))] or [k for k in J if 'ank' in k.lower()]
    de=np.min([np.hypot(*(P-np.asarray(J[k],float)).T) for k in ends],0) if ends else np.full(len(P),np.inf)
    cov=(dist_to(P,J,limb)<=r)|(de<=RE)   # limb-end blobs (gloves, skates) are wider than the bone
    cat[cov]=0;rest=~cov
    m=rest&(ys+.5>=ice);cat[m]=3;rest&=~m
    if hd is not None:m=rest&(np.hypot(*(P-hd).T)<=4.5);cat[m]=2;rest&=~m
    m=rest&(dist_to(P,J,shaft)<=r);cat[m]=4;rest&=~m
    m=rest&edge;cat[m]=1;rest&=~m
    m=rest&(dist_to(P,J,torso)<=3.5);cat[m]=5;rest&=~m
    return ys,xs,cat

# ---- D184 (Abdul t1036u): outline rule b. Uncovered black next to a labelled part takes that part's darkest shade and passes.
def bone_part(a,b):
    s={a,b}
    if s=={'head','neck'}:return 'head'
    if s=={'stick butt','stick heel'}:return 'shaft'
    if s=={'stick heel','stick toe'}:return 'blade'
    side=(a+b)[0] if (a[:2] in('L ','R ') or b[:2] in('L ','R ')) else ''
    side=next((k[0] for k in (a,b) if k[:2] in('L ','R ')),'')
    for t,p in (('glove','hand'),('skate','skate'),('elbow','arm'),('wrist','arm'),('knee','leg'),('ankle','leg')):
        if any(t in k for k in (a,b)):return side+' '+p if side else p
    return 'torso'
def gate_b(black,mask,F,J,bones,cat,amb=0.75):
    """cat from classify. Returns ({(y,x): part | 'NO PART' | 'AMBIGUOUS'} for uncovered black px, flagged count).
    Labelled px = every non-black px plus every covered black px (glove/skate/blade black), each labelled with the part of its
    nearest bone. An uncovered black px takes the part(s) first reached by walking through black (8-connected); that is the
    outline it belongs to, and it converts to that part's darkest shade (outline rule b). Flagged only when no part is reached
    (black island) or when the most-touched parts tie, have different colour zones (different darkest shade) and their bones
    are tied too (distance margin < amb px)."""
    H,W=mask.shape;bl=[(a,b) for a,b in bones if a in J and b in J];names=[bone_part(*bb) for bb in bl]
    ys,xs,_=classify(black,mask,J,bones);cov=np.zeros((H,W),bool);unc=np.zeros((H,W),bool)
    for y,x,c in zip(ys,xs,cat):(cov if c==0 else unc)[y,x]=True
    lab=np.full((H,W),-1);ly,lx=np.nonzero((mask&~black)|cov)
    if len(ly) and bl:
        P=np.stack([lx+.5,ly+.5],1);D=np.stack([dist_to(P,J,[bb]) for bb in bl],1);lab[ly,lx]=D.argmin(1)
    # zone of a part = most common non-black colour family among its px (black-only parts such as skates: black)
    zone={}
    for i,nm in enumerate(names):
        f=F[(lab==i)&~black];zone.setdefault(nm,[]).extend(f.tolist())
    zone={k:(max(set(v),key=v.count) if v else 1) for k,v in zone.items()}
    out={};flag=0
    for y,x in zip(*np.nonzero(unc)):
        seen={(y,x)};front=[(y,x)];parts=set();cnt={}
        while front and not parts:
            nf=[]
            for yy,xx in front:
                for dy in(-1,0,1):
                    for dx in(-1,0,1):
                        Y,X=yy+dy,xx+dx
                        if not(0<=Y<H and 0<=X<W) or (Y,X) in seen:continue
                        seen.add((Y,X))
                        if lab[Y,X]>=0:parts.add(names[lab[Y,X]]);cnt[names[lab[Y,X]]]=cnt.get(names[lab[Y,X]],0)+1
                        elif unc[Y,X]:nf.append((Y,X))
            front=nf
        if not parts:out[(y,x)]='NO PART';flag+=1;continue
        top=max(cnt.values());parts={p for p in parts if cnt[p]==top}   # the part it touches most is the one it outlines
        P=np.array([[x+.5,y+.5]]);d=sorted((float(dist_to(P,J,[bb])[0]),names[i]) for i,bb in enumerate(bl) if names[i] in parts)
        best=d[0][1];rival=[v for v in d if zone.get(v[1])!=zone.get(best)]
        if rival and rival[0][0]-d[0][0]<amb:out[(y,x)]='AMBIGUOUS';flag+=1
        else:out[(y,x)]=best
    return out,flag
