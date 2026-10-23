# measure the goalie head (mask/helmet) pixel extent per frame, square pixels (no aspect correction)
import json,numpy as np
from parts import *
from scipy import ndimage as ndi
HEAD={177,184,185,186,187,188,189,164,135}
out={}
for n in range(1,1135):
    try:p=frame(n);part,goalie=segment(n,p)
    except Exception:continue
    if not goalie:continue
    hm=np.isin(p,list(HEAD-{135}));lab,k=ndi.label(hm,np.ones((3,3)))
    if k==0:continue
    c=np.argmin([np.nonzero(lab==i)[0].min() for i in range(1,k+1)])+1   # top-most blob = head
    m=lab==c;m|=ndi.binary_dilation(m,np.ones((3,3)))&(p==135)        # strap row under it
    ys,xs=np.nonzero(m);n177=int(((p==177)&m).sum());n164=int(((p==164)&m).sum())
    view='back' if n177>=5 and n164<=2 else 'front' if n177==0 else 'side'
    out[n]=dict(w=int(np.ptp(xs)+1),h=int(np.ptp(ys)+1),px=int(m.sum()),view=view,box=[int(xs.min()),int(ys.min()),int(xs.max())+1,int(ys.max())+1])
json.dump(out,open('data/goalie_head_extent.json','w'))
for v in ('back','front','side'):
    L=[d for d in out.values() if d['view']==v]
    if L:W=[d['w'] for d in L];H=[d['h'] for d in L];print(v,len(L),'frames  w median',np.median(W),'max',max(W),' h median',np.median(H),'max',max(H),' px median',np.median([d['px'] for d in L]))
print({n:(d['view'],d['w'],d['h']) for n,d in out.items() if 405<=n<=432})
