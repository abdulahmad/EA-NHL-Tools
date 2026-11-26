"""Colour-consistency carving: drop surface voxels whose visible views cannot agree on a colour (within 1 pixel)."""
import numpy as np,sys
from PIL import Image
from scipy import ndimage
from hull96 import *
def classes(pal):
    rgb=pal[FL];u,inv=np.unique(rgb.reshape(-1,3),axis=0,return_inverse=True);c=inv.reshape(256)+1;c[255]=0;c[159]=0;return c,len(u)+1
def refine(V,G,occ,phi,pal,iters=12,tol=1.5,minviews=2):
    X,Y,Z=G;CL,K=classes(pal);occ=occ.copy()
    # per view: for each class, a mask of pixels within 1 px of that class
    near=[]
    for v in V:
        c=np.pad(CL[v['p']],4);near.append(np.stack([ndimage.binary_dilation(c==k,np.ones((3,3))) for k in range(K)],-1))
    for it in range(iters):
        s=surface(occ);x,y,z=X[s],Y[s],Z[s];ax,ay,az=X[occ],Y[occ],Z[occ];agree=np.zeros((len(x),K),np.int16);nv=np.zeros(len(x),np.int16)
        for d,v in enumerate(V):
            def pix(a,b,c):
                sx,sy,dp=proj(a,b,c,d,phi);return np.floor(sx+v['xo']).astype(int)+4,np.floor(sy+v['yo']).astype(int)+4,dp
            h,w=near[d].shape[:2];zb=np.full((h,w),1e9)
            px,py,dp=pix(ax,ay,az);ok=(px>=0)&(px<w)&(py>=0)&(py<h);np.minimum.at(zb,(py[ok],px[ok]),dp[ok])
            px,py,dp=pix(x,y,z);ok=(px>=0)&(px<w)&(py>=0)&(py<h);vis=ok.copy();vis[ok]=dp[ok]<=zb[py[ok],px[ok]]+tol
            ii=np.flatnonzero(vis);agree[ii]+=near[d][py[ii],px[ii]];nv[ii]+=1
        bad=(nv>=minviews)&(agree[:,1:].max(1)<nv)
        if not bad.any():break
        idx=np.argwhere(s)[bad];occ[idx[:,0],idx[:,1],idx[:,2]]=False;print(it,int(bad.sum()),int(occ.sum()))
    lab,n=ndimage.label(occ);sz=ndimage.sum(occ,lab,range(1,n+1));return lab==(1+int(np.argmax(sz)))
if __name__=='__main__':
    i0=int(sys.argv[1]);phi=float(sys.argv[2]);pal=pals()['!bfh'];V,G,occ=build(i0,phi);occ=refine(V,G,occ,phi,pal)
    pts,col,votes=colour(V,G,occ,phi);np.savez(sys.argv[3]+'.npz',pts=pts,col=col,occ=occ)
    ims=[render(pts,col,pal,y,p,sc=5) for p in (phi,35) for y in (0,22.5,90,157.5,180,247.5)]
    row=lambda a:np.concatenate(a,1);Image.fromarray(np.concatenate([row(ims[:6]),row(ims[6:])],0)).save(sys.argv[3]+'.png')
