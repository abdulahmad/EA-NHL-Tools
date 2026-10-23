# measure torso V=0.5 isolines: 'flat' = isoline confined to one screen row (>=5px) => no wrap curvature
import uv,json,sys
from uv import *
def iso(n):
    p,part,U,V,R=solve(n);m=np.isin(R,['torso_front','torso_back'])
    if m.sum()<20:return None
    Vv=np.where(m,V,np.nan);o=m&(Vv<.5)&(np.roll(Vv,-1,0)>=.5)
    ys=np.nonzero(o)[0]
    if len(ys)<5:return None
    return int(np.ptp(ys))
res={}
for wrap in (False,True):
    uv.WRAP=wrap;flat=[];tot=0
    for n in range(1,1135):
        try:r=iso(n)
        except Exception:continue
        if r is None:continue
        tot+=1
        if r==0:flat.append(n)
    res['wrap' if wrap else 'before']=dict(total=tot,flat=len(flat),frames=flat)
    print(wrap,tot,len(flat))
json.dump(res,open('jerseys/flat_stripe_check.json','w'))
