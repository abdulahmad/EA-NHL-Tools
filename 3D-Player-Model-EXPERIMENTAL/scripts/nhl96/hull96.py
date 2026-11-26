"""Hull + colour for one 96 pose; renders novel views."""
import numpy as np,sys,pickle
from PIL import Image
from scipy import ndimage
from carve96 import *
from align96 import align
from pal96 import pals
FL=np.arange(256);FL[4:148]=np.arange(4,148)|3;FL[[148,149,150]]=150;FL[[151,152,153]]=153;FL[[154,155,156]]=156;FL[[157,158,159]]=159;FL[166:174]=170
def build(i0,phi=11,step=0.5,need=7):
    G1=grid(1.0);V=align(views(i0),phi,G1);G=grid(step);occ=carve(V,phi,1,G,need=need)
    lab,n=ndimage.label(occ);sz=ndimage.sum(occ,lab,range(1,n+1));occ=lab==(1+int(np.argmax(sz)))
    return V,G,occ
def surface(occ):return occ&~ndimage.binary_erosion(occ)
def normals(occ,sig=1.5):
    f=ndimage.gaussian_filter(occ.astype(np.float32),sig);g=np.stack(np.gradient(f),-1);return -g/(np.linalg.norm(g,axis=-1,keepdims=True)+1e-9)
def colour(V,G,occ,phi,step=0.5,tol=1.5):
    """each surface voxel takes its (flattened) colour from the view that faces it most squarely among those that see it"""
    X,Y,Z=G;s=surface(occ);x,y,z=X[s],Y[s],Z[s];N=normals(occ)[s];best=np.full(len(x),-2.0);col=np.zeros(len(x),int)
    ax,ay,az=X[occ],Y[occ],Z[occ];votes=np.zeros((len(x),256),np.float32)
    for d,v in enumerate(V):
        def pix(a,b,c):
            sx,sy,dp=proj(a,b,c,d,phi);return np.floor(sx+v['xo']).astype(int)+4,np.floor(sy+v['yo']).astype(int)+4,dp
        th=np.deg2rad(45*d);ph=np.deg2rad(phi);cam=-np.array([-np.sin(th)*np.cos(ph),-np.sin(ph),np.cos(th)*np.cos(ph)])   # towards the camera
        pp=np.pad(v['p'],4,constant_values=255);h,w=pp.shape;zb=np.full((h,w),1e9)
        px,py,dp=pix(ax,ay,az);ok=(px>=0)&(px<w)&(py>=0)&(py<h);np.minimum.at(zb,(py[ok],px[ok]),dp[ok])
        px,py,dp=pix(x,y,z);ok=(px>=0)&(px<w)&(py>=0)&(py<h);vis=ok.copy();vis[ok]=dp[ok]<=zb[py[ok],px[ok]]+tol
        ii=np.flatnonzero(vis);c=FL[pp[py[ii],px[ii]]];g=(c!=255)&(c!=159);ii=ii[g];c=c[g];f=N[ii]@cam
        np.add.at(votes,(ii,c),np.clip(f,0.05,1)**2);b=f>best[ii];col[ii[b]]=c[b];best[ii[b]]=f[b]
    return np.stack([x,y,z],1),col,votes
def render(pts,col,pal,yaw,phi,sc=6,size=(80,80),anchor=(40,70),bg=(40,90,60)):
    th=np.deg2rad(yaw);ph=np.deg2rad(phi);X,Y,Z=pts.T
    sx=X*np.cos(th)+Z*np.sin(th);w=-X*np.sin(th)+Z*np.cos(th);sy=-(Y*np.cos(ph)+w*np.sin(ph));dp=w*np.cos(ph)-Y*np.sin(ph)
    W,H=size[0]*sc,size[1]*sc;im=np.zeros((H,W,3),np.uint8);im[:]=bg;zb=np.full((H,W),1e9);o=np.argsort(-dp);r=int(np.ceil(sc*0.5))
    px=((sx+anchor[0])*sc).astype(int);py=((sy+anchor[1])*sc).astype(int)
    for dx in range(-r,r+1):
        for dy in range(-r,r+1):
            qx,qy=px+dx,py+dy;ok=(qx>=0)&(qx<W)&(qy>=0)&(qy<H);np.minimum.at(zb,(qy[ok],qx[ok]),dp[ok])
    for dx in range(-r,r+1):
        for dy in range(-r,r+1):
            qx,qy=px+dx,py+dy;ok=(qx>=0)&(qx<W)&(qy>=0)&(qy<H);ok[ok]=dp[ok]<=zb[qy[ok],qx[ok]]+1e-6;im[qy[ok],qx[ok]]=pal[col[ok]]
    return im
if __name__=='__main__':
    i0=int(sys.argv[1]);phi=float(sys.argv[2]);V,G,occ=build(i0,phi);pts,col,votes=colour(V,G,occ,phi);pal=pals()['!bfh']
    print(occ.sum(),len(pts));np.savez(sys.argv[3]+'.npz',pts=pts,col=col)
    ims=[render(pts,col,pal,y,p,sc=5) for p in (phi,35) for y in (0,22.5,90,157.5,180,247.5)]
    row=lambda a:np.concatenate(a,1);Image.fromarray(np.concatenate([row(ims[:6]),row(ims[6:])],0)).save(sys.argv[3]+'.png')
