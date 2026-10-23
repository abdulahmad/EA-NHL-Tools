# per-frame audit metrics for the UV pipeline. usage: python3 audit.py <tag> [WRAP_LIMBS SIDE_FIX ELEV]
import sys,json,uv
from uv import *
tag=sys.argv[1];uv.WRAP_LIMBS=sys.argv[2]=='1';uv.SIDE_FIX=sys.argv[3]=='1';uv.ELEV=float(sys.argv[4]);uv.FRONT_SMOOTH=len(sys.argv)>5 and sys.argv[5]=='1'
CR=set([*range(192,197),*range(208,213),*range(224,229),*range(240,245)])
def straight(m,V,v0):
    Vv=np.where(m,V,np.nan);o=m&(Vv<v0)&((np.roll(Vv,-1,0)>=v0)|(np.roll(Vv,-1,1)>=v0))
    ys,xs=np.nonzero(o)
    if len(ys)<4:return None
    A=np.stack([ys,xs,np.ones_like(ys)],1).astype(float);X=A-A.mean(0)
    s=np.linalg.svd(X[:,:2],compute_uv=False);return float(s[1]/max(s[0],1e-6))  # 0 = perfectly straight
def axis(m):
    ys,xs=np.nonzero(m);c=np.cov(np.stack([ys,xs]).astype(float));w,v=np.linalg.eigh(c);return v[:,1],np.sqrt(max(w[1],0))/max(np.sqrt(max(w[0],0)),.5)
out={}
for n in range(1,1135):
    try:p,part,U,V,R=solve(n)
    except Exception as e: out[n]={'err':str(e)};continue
    d={'front':bool(solve.front)};m=p!=255
    body=m&~np.isin(part,[P['outline'],P['shadow'],P['stick'],P['skate_blade'],P['none']])
    d['cov']=float((R[body]!='').mean()) if body.any() else None
    d['goalie']=bool(segment(n,p)[1])
    T=np.isin(R,['torso_front','torso_back'])
    if T.sum()>=20:
        ys,xs=np.nonzero(T);d['torso']=[float(ys.mean()),float(xs.mean()),int(np.ptp(ys)+1),int(T.sum())]
        d['t_str']=straight(T,V,.5)
        o=T&(np.where(T,V,9)<.5)&(np.roll(np.where(T,V,-9),-1,0)>=.5);yy=np.nonzero(o)[0]
        d['t_isorow']=float((yy.mean()-ys.min())/(np.ptp(ys)+1)) if len(yy) else None
        b=T&(V>=.86)&(V<.89);d['trim_px']=int(b.sum())
        a,_=axis(T);d['t_ay']=float(abs(a[0]))
    arms=[]
    for nm in ('sleeve','sleeve_b','sock','sock_b'):
        lab,k=ndi.label(R==nm,np.ones((3,3)))
        for c in range(1,k+1):
            mm=lab==c
            if mm.sum()<6:continue
            a,el=axis(mm);ys,xs=np.nonzero(mm)
            arms.append(dict(r=nm,c=[float(ys.mean()),float(xs.mean())],n=int(mm.sum()),ay=float(abs(a[0])),el=float(el),s=straight(mm,V,.55 if 'sleeve' in nm else .5)))
    d['limbs']=arms
    cm=np.isin(p,list(CR))
    if cm.sum():ys,xs=np.nonzero(cm);d['crest']=[int(np.ptp(xs)+1),int(np.ptp(ys)+1),int(cm.sum())]
    S=np.isin(part,[P['sleeve']]);Tm=np.isin(part,[P['torso'],P['crest']])
    inner=S&np.roll(Tm,3,1)&np.roll(Tm,-3,1);d['arm_over_torso']=int(inner.sum())
    Pm=part==P['pants']
    if Pm.sum()>4:
        lab,k=ndi.label(R=='sock');ys,xs=np.nonzero(Pm);d['pants_w']=int(np.ptp(xs)+1)
        sk=[np.nonzero(lab==c)[1].mean() for c in range(1,k+1)];d['sock_sep']=float(np.ptp(sk)) if len(sk)>1 else 0
    out[n]=d
json.dump(out,open(f'audit_{tag}.json','w'))
