"""Shading: each palette zone has 4 shades (index & 3, dark to light). Fit shade level against the surface normal to find the light."""
import numpy as np,sys,pickle
from ss96 import setup
from clean96 import *
def camframe(cam):
    c,s,cp,sp_=cam[:4];return np.array([[c,0,s],[-s*sp_,cp,c*sp_],[s*cp,sp_,-c*cp]])     # rows: screen right, screen up, towards camera
def gather(cl):
    fit=cl.fit;fid,zo=depth_render(fit,cl.D['verts']);out=[]
    for d,v in enumerate(fit.V):
        pd=fit.pad;f=fid[d,pd:pd+v['h'],pd:pd+v['w']];m=(f>=0)&(v['p']>=4)&(v['p']<148);n=cl.nrm[f[m]];out.append(np.c_[n,n@camframe(fit.cam[d]).T,v['p'][m]&3,v['p'][m]>>2,np.full(m.sum(),d)])
    return np.concatenate(out)
if __name__=='__main__':
    D,fit,cl=setup(sys.argv[1]);G=gather(cl);s=G[:,6];print('samples',len(G),'shade histogram',np.bincount(s.astype(int)))
    for nm,X in (('model frame (light fixed to the player)',G[:,0:3]),('camera frame (light fixed to the camera)',G[:,3:6])):
        A=np.c_[X,np.ones(len(X))];co=np.linalg.lstsq(A,s,rcond=None)[0];pred=A@co;r2=1-((s-pred)**2).sum()/((s-s.mean())**2).sum();q=np.clip(np.round(pred),0,3)
        print(nm,'coef',co.round(2),'R2 %.3f'%r2,'exact shade %.1f%%'%(100*(q==s).mean()),'within 1: %.1f%%'%(100*(np.abs(q-s)<=1).mean()))
    for d in range(8):
        m=G[:,8]==d;X=G[m,3:6];A=np.c_[X,np.ones(m.sum())];co=np.linalg.lstsq(A,s[m],rcond=None)[0];print('view',d,'camera-frame coef',co.round(2))
    for d in range(8):
        m=G[:,8]==d;X=G[m,0:3];A=np.c_[X,np.ones(m.sum())];co=np.linalg.lstsq(A,s[m],rcond=None)[0];print('view',d,'model-frame coef',co.round(2))

def smooth_normals(cl,iters):
    """face normals averaged with their neighbours' (area weighted) a few times"""
    Vt,F=cl.D['verts'],cl.D['faces'];n=cl.nrm.copy();ar=np.linalg.norm(np.cross(Vt[F[:,1]]-Vt[F[:,0]],Vt[F[:,2]]-Vt[F[:,0]]),axis=1)[:,None]
    for _ in range(iters):
        vn=np.zeros_like(Vt)
        for k in range(3):np.add.at(vn,F[:,k],n*ar)
        vn/=np.linalg.norm(vn,axis=1,keepdims=True)+1e-9;n=vn[F].mean(1);n/=np.linalg.norm(n,axis=1,keepdims=True)+1e-9
    return n
def fit_light(cl,iters=2):
    raw=cl.nrm;cl.nrm=smooth_normals(cl,iters);G=gather(cl);cl.nrm=raw;s=G[:,6];A=np.c_[G[:,0:3],np.ones(len(G))];co=np.linalg.lstsq(A,s,rcond=None)[0];pred=A@co;q=np.clip(np.round(pred),0,3)
    return co,1-((s-pred)**2).sum()/((s-s.mean())**2).sum(),(q==s).mean(),(np.abs(q-s)<=1).mean()
if __name__=='__main__':
    for it in (0,1,2,4,8):
        co,r2,ex,w1=fit_light(cl,it);print('normal smoothing',it,'coef',co.round(2),'R2 %.3f exact %.1f%% within1 %.1f%%'%(r2,100*ex,100*w1))

def fit_light_clipped(cl,iters=1):
    """Light fit that knows the shade is clipped to 0..3 (least absolute error, a few starts). Better than the plain regression: 46% exact shade against 37%."""
    from scipy.optimize import minimize
    raw=cl.nrm;cl.nrm=smooth_normals(cl,iters);G=gather(cl);cl.nrm=raw;s=G[:,6];X=G[:,0:3];best=None
    f=lambda c:np.abs(np.clip(X@c[:3]+c[3],0,3)-s).mean()
    for st in ([0,1.5,0,1.5],[0,3,-3,1],[0,0,-4,1.5],[0,4,0,0],[2,2,-2,1],[-2,2,-2,1]):
        r=minimize(f,st,method='Nelder-Mead',options=dict(maxiter=4000,xatol=1e-3,fatol=1e-5))
        if best is None or r.fun<best.fun:best=r
    c=best.x;q=np.clip(np.round(X@c[:3]+c[3]),0,3);return c,(q==s).mean(),(np.abs(q-s)<=1).mean()
