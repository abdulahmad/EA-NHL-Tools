import numpy as np
from carve import *
from PIL import Image
def zbuf(vox,G,d,phi,a,off,shape,yaw=None,scale=1):
    """front-most voxel id per pixel; returns idmap (-1 none) on a (h*scale,w*scale) grid"""
    idx=np.flatnonzero(vox);X,Y,Z=(g.ravel()[idx] for g in G)
    sx,sy,dep=proj(X,Y,Z,d,phi,yaw)
    px=np.floor((sx+a[0]+off[0])*scale).astype(int);py=np.floor((sy+a[1]+off[1])*scale).astype(int)
    h,w=shape[0]*scale,shape[1]*scale;ok=(px>=0)&(px<w)&(py>=0)&(py<h)
    o=np.argsort(-dep[ok]);ii=idx[ok][o];img=np.full((h,w),-1,np.int64);img[py[ok][o],px[ok][o]]=ii
    zb=np.full((h,w),1e9);zb[py[ok][o],px[ok][o]]=dep[ok][o]
    return img,zb,(idx,px,py,dep,ok)
def colourise(vox,G,V,phi,offs,wts=None):
    N=vox.size;votes={}
    cnt=np.zeros((N,256),np.float32)
    for d,v in enumerate(V):
        img,zb,(idx,px,py,dep,ok)=zbuf(vox,G,d,phi,v['a'],offs[d],v['p'].shape)
        vis=np.zeros(len(idx),bool);vis[ok]=dep[ok]<=zb[py[ok],px[ok]]+1.0
        s=vis.copy();s[ok]&=v['fg'][py[ok],px[ok]]&~v['stick'][py[ok],px[ok]];s&=ok
        # weight: closer to the front = more reliable
        wgt=np.exp(-(dep[s]-zb[py[s],px[s]]))*(1 if wts is None else wts[d])
        np.add.at(cnt,(idx[s],v['p'][py[s],px[s]]),wgt)
    col=np.full(N,-1,np.int16);has=cnt.sum(1)>0;col[has]=cnt[has].argmax(1)
    col=col.reshape(vox.shape)
    # fill uncoloured voxels from the nearest coloured one
    miss=vox&(col<0)
    if miss.any():
        _,ind=ndi.distance_transform_edt(~(vox&(col>=0)),return_indices=True)
        col[miss]=col[ind[0][miss],ind[1][miss],ind[2][miss]]
    col[~vox]=-1;return col
def render(vox,col,G,d,phi,a,off,shape,pal,yaw=None,scale=1,bg=BG):
    img,_,_=zbuf(vox,G,d,phi,a,off,shape,yaw,scale)
    o=np.zeros(img.shape+(3,),np.uint8);o[:]=bg;m=img>=0
    o[m]=np.clip(pal[col.ravel()[img[m]]],0,255);return o,m
def compare(V,vox,col,G,phi,offs,pal,path,s=8):
    tiles=[]
    for d,v in enumerate(V):
        p=v['p'];a=np.zeros(p.shape+(3,),np.uint8);a[:]=BG;a[v['fg']]=np.clip(pal[p[v['fg']]],0,255)
        b,_=render(vox,col,G,d,phi,v['a'],offs[d],p.shape,pal)
        t=np.concatenate([a,np.full((2,)+a.shape[1:],20,np.uint8),b],0)
        tiles.append(Image.fromarray(t).resize((t.shape[1]*s,t.shape[0]*s),Image.NEAREST))
    W=sum(t.width+8 for t in tiles);Hh=max(t.height for t in tiles)
    im=Image.new('RGB',(W,Hh),(20,20,20));x=0
    for t in tiles: im.paste(t,(x,Hh-t.height));x+=t.width+8
    im.save(path)
if __name__=='__main__':
    FR=[int(x) for x in sys.argv[1].split(',')];phi=float(sys.argv[2]);T=int(sys.argv[3])
    V=load(FR)
    for v in V: v['body']=v['fg']&~v['stick'];v['bodyw']=v['fg']
    G,vox,cnt,offs,sc=fit(V,phi,T,key='bodyw')
    col=colourise(vox,G,V,phi,offs);pal=spritepal(team('tor'))
    compare(V,vox,col,G,phi,offs,pal,sys.argv[4]);print(sc,vox.sum())
