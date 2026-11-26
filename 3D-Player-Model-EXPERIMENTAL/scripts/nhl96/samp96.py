"""Surface samples for the clean texture: every sprite pixel covered by the fitted mesh gives a 3D point, the sprite's own zone there, and the zone of the face it landed on."""
import numpy as np,pickle,ctypes
import carve96 as C
from poly96 import *
def load(path):
    D=pickle.load(open(path,'rb'));V,phi,P=D['V'],D['phi'],D['P']
    for d in range(8):C.YAW[d]=P[d][2]
    fit=Fit(V,phi,[p[2] for p in P]);fit.bind(D['faces']);return D,fit
def unproject(cam,px,py,zz):
    c,s,cp,sp_,xo,yo=cam;sx=px+0.5-xo;sy=py+0.5-yo;Y=-sy*cp-zz*sp_;w=-sy*sp_+zz*cp;return np.stack([sx*c-w*s,Y,sx*s+w*c],-1)
def depth_render(fit,Vt,cam=None,W=None,H=None,n=None):
    n=fit.n if n is None else n;zo=np.zeros((n,MH,MW));fid=np.zeros((n,MH,MW),np.int32);L.set_zout.argtypes=[ctypes.c_void_p];L.set_zout(zo.ctypes.data);old=fit.fid;fit.fid=fid
    lab=np.full((n,MH,MW),-2,np.int16) if cam is not None else None;fit.score(Vt,fid=True,cam=cam,W=W,H=H,lab=lab,n=n);fit.fid=old;L.set_zout(None);return fid,zo
def samples(D,fit):
    Vt=D['verts'];fid,zo=depth_render(fit,Vt);fit.score(Vt);fl=fit.fl.copy();out=[]
    for d,v in enumerate(fit.V):
        pd=fit.pad;f=fid[d,pd:pd+v['h'],pd:pd+v['w']];z=zo[d,pd:pd+v['h'],pd:pd+v['w']];ys,xs=np.nonzero((f>=0)&(v['p']!=255)&~np.isin(v['p'],err96.STK))
        p=unproject(fit.cam[d],xs+pd,ys+pd,z[ys,xs]);out.append(np.c_[p,v['p'][ys,xs],fit.rep[fl[f[ys,xs]]],np.full(len(xs),d),f[ys,xs]])
    S=np.concatenate(out);return dict(p=S[:,:3],idx=S[:,3].astype(int),fz=(S[:,4].astype(int))>>2,view=S[:,5].astype(int),face=S[:,6].astype(int))
if __name__=='__main__':
    D,fit=load('a8.pkl');S=samples(D,fit);pickle.dump(S,open('samp8.pkl','wb'));z=np.where(S['idx']<148,S['idx']>>2,np.where(S['idx']>=160,40,37+(S['idx']-148)//3));p=S['p'];print(len(p))
    for zz in (29,30):
        for sg in (-1,1):
            m=(z==zz)&(np.sign(p[:,0])==sg);print(zz,sg,m.sum(),'x %.1f±%.1f y %.1f..%.1f z %.1f±%.1f'%(p[m,0].mean(),p[m,0].std(),p[m,1].min(),p[m,1].max(),p[m,2].mean(),p[m,2].std()))
    m=(z==28);print('pants x',np.percentile(p[m,0],[2,50,98]).round(1),'z',np.percentile(p[m,2],[2,50,98]).round(1))
    for zz in (4,5,24,25,1,36):
        m=(z==zz)&(p[:,0]<0);print(zz,'L',m.sum(),p[m].mean(0).round(1),p[m].std(0).round(1))
