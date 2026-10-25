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
