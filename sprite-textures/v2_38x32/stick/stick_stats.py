# stick pixel statistics over all skater frames (index 136 = stick)
import sys,json,collections,numpy as np
sys.path.insert(0,'../scripts');from lib import H,frame
import uv
from scipy import ndimage as ndi
out={}
for n in range(len(H)):
    try:p=frame(n)
    except Exception:continue
    if p is None or p.size==0:continue
    try:_,goalie=uv.segment(n,p)
    except Exception:goalie=None
    m=p==136
    if m.sum()<3:continue
    lab,k=ndi.label(m,np.ones((3,3)));sz=ndi.sum(m,lab,range(1,k+1));c=lab==(1+int(np.argmax(sz)))
    a=np.argwhere(c).astype(float);c0=a.mean(0);_,_,vt=np.linalg.svd(a-c0);t=np.round((a-c0)@vt[0]).astype(int);pp=(a-c0)@vt[1]
    th=collections.Counter(t);steps=sorted(th);L=steps[-1]-steps[0]+1;prof=[th.get(s,0) for s in range(steps[0],steps[-1]+1)]
    e=[max(prof[:4]),max(prof[-4:])];bl=int(np.argmax(e))
    shaft=prof[4:-4] if len(prof)>8 else prof
    ang=float(np.degrees(np.arctan2(vt[0][0],vt[0][1])))%180
    out[n]=dict(goalie=bool(goalie),px=int(c.sum()),comps=int(k),length=L,blade_w=e[bl],other_end=e[1-bl],shaft_med=float(np.median(shaft)) if shaft else 0,shaft_max=max(shaft) if shaft else 0,angle=ang,
               perp_spread=float(np.ptp(pp)))
json.dump(out,open('/workspace/preview_v2/stick/stick_stats.json','w'),indent=0,default=float)
sk={n:r for n,r in out.items() if not r['goalie']}
print(len(out),'skater',len(sk))
for key in ('length','blade_w','shaft_med','shaft_max','perp_spread'):
    v=np.array([r[key] for r in sk.values()]);print(key,'p10/50/90/max',np.percentile(v,[10,50,90]).round(1),v.max(),collections.Counter(np.round(v).astype(int)).most_common(8))
