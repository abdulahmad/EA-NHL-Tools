# measure per-region pixel capacity: across-axis width (U) and along-axis length (V) of each UV region, per frame
import json,uv
from uv import *
uv.WRAP_LIMBS=True;uv.SIDE_FIX=True;uv.FRONT_SMOOTH=True;uv.ELEV=40
out={}
for n in range(1,1135):
    try:p,part,U,V,R=solve(n)
    except Exception:continue
    d={}
    for nm in ATLAS:
        lab,k=ndi.label(R==nm,np.ones((3,3)))
        for c in range(1,k+1):
            m=lab==c
            if m.sum()<4:continue
            ys,xs=np.nonzero(m);cv=np.cov(np.stack([ys,xs]).astype(float));w,v=np.linalg.eigh(cv);a=v[:,1]
            t=(ys)*a[0]+(xs)*a[1];q=-(ys)*a[1]+(xs)*a[0]
            if nm in('helmet','glove','skate','goalie_mask','pad','blocker','catcher'):L,W=np.ptp(ys)+1,np.ptp(xs)+1
            else:L,W=np.ptp(t)+1,np.ptp(q)+1
            if nm=='torso_front' or nm=='torso_back':W=W  # visible half only
            d.setdefault(nm,[]).append([float(W),float(L),int(m.sum())])
    cm=np.isin(p,[*range(192,197),*range(208,213),*range(224,229),*range(240,245)])
    if cm.sum()>=2:ys,xs=np.nonzero(cm);d['crest']=[[float(np.ptp(xs)+1),float(np.ptp(ys)+1),int(cm.sum())]]
    out[n]=d
json.dump(out,open('capacity_raw.json','w'))
