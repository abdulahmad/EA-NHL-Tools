"""Silhouette carving for NHL 96 PC sprites: one animation frame = one rigid pose rendered from 8 yaw angles."""
import numpy as np,pickle
B=pickle.load(open('total.pkl','rb'))
def views(i0):return [B[i0+d] for d in range(8)]
YAW=[0.0]*8      # per-view yaw correction in degrees (from calibration)
def proj(X,Y,Z,d,phi,sgn=1,yaw0=0):
    th=sgn*np.deg2rad(45*d+YAW[d])+np.deg2rad(yaw0);ph=np.deg2rad(phi)
    sx=X*np.cos(th)+Z*np.sin(th);w=-X*np.sin(th)+Z*np.cos(th)
    return sx,-(Y*np.cos(ph)+w*np.sin(ph)),w*np.cos(ph)-Y*np.sin(ph)
def grid(step=0.5,R=28,H=66):
    ax=np.arange(-R,R+1e-6,step);ay=np.arange(-6,H,step);return np.meshgrid(ax,ay,ax,indexing='ij')
def sil(v,nostick=True):
    p=v['p'];m=p!=255
    if nostick:m&=~np.isin(p,[157,158,159])
    return m
def carve(V,phi,sgn=1,G=None,nostick=True,need=8):
    X,Y,Z=G;cnt=np.zeros(X.shape,np.int8)
    for d,v in enumerate(V):
        sx,sy,_=proj(X,Y,Z,d,phi,sgn);px=np.floor(sx+v['xo']).astype(int);py=np.floor(sy+v['yo']).astype(int);m=sil(v,nostick)
        m=v['p']!=255          # stick pixels may hide the body: they count as inside when carving
        ok=(px>=0)&(px<v['w'])&(py>=0)&(py<v['h']);ins=np.zeros(X.shape,bool);ins[ok]=m[py[ok],px[ok]];cnt+=ins
    return cnt>=need
def iou(V,occ,phi,sgn,G,nostick=True):
    X,Y,Z=G;x,y,z=X[occ],Y[occ],Z[occ];r=[]
    for d,v in enumerate(V):
        sx,sy,_=proj(x,y,z,d,phi,sgn);px=np.floor(sx+v['xo']).astype(int);py=np.floor(sy+v['yo']).astype(int);m=sil(v,nostick)
        ok=(px>=0)&(px<v['w'])&(py>=0)&(py<v['h']);re=np.zeros_like(m);re[py[ok],px[ok]]=True;r.append((re&m).sum()/max(1,(re|m).sum()))
    return np.array(r)
if __name__=='__main__':
    import sys
    G=grid(1.0)
    for i0 in (8,16,24):
        V=views(i0)
        for sgn in (1,-1):
            print(i0,sgn,[(phi,round(iou(V,carve(V,phi,sgn,G),phi,sgn,G).mean(),3)) for phi in (0,10,20,30,40,50,60)])
