"""Large preview renderer (any size): faces are subdivided, each small face is drawn as a dot with a depth test. For looking at the model, not for scoring."""
import numpy as np
from PIL import Image
def subdivide(V,F,levels):
    T=V[F];fid=np.arange(len(F))
    for _ in range(levels):
        a,b,c=T[:,0],T[:,1],T[:,2];ab,bc,ca=(a+b)/2,(b+c)/2,(c+a)/2;T=np.concatenate([np.stack(x,1) for x in ((a,ab,ca),(ab,b,bc),(ca,bc,c),(ab,bc,ca))]);fid=np.tile(fid,4)
    return T.mean(1),fid
def render(P,rgb,yaw,pitch,sc=8,size=(64,76),anchor=(32,68),bg=(40,90,60)):
    th,ph=np.deg2rad(yaw),np.deg2rad(pitch);sx=P[:,0]*np.cos(th)+P[:,2]*np.sin(th);w=-P[:,0]*np.sin(th)+P[:,2]*np.cos(th);sy=-(P[:,1]*np.cos(ph)+w*np.sin(ph));dep=w*np.cos(ph)-P[:,1]*np.sin(ph)
    W,H=size[0]*sc,size[1]*sc;img=np.zeros((H,W,3),np.uint8);img[:]=bg;zb=np.full((H,W),-1e9);px=np.floor((sx+anchor[0])*sc).astype(int);py=np.floor((sy+anchor[1])*sc).astype(int)
    for dx in (0,1):
        for dy in (0,1):
            x=px+dx;y=py+dy;ok=(x>=0)&(x<W)&(y>=0)&(y<H);o=np.argsort(dep[ok]);xi,yi=x[ok][o],y[ok][o];far=dep[ok][o]>zb[yi,xi]-1e-9;zb[yi[far],xi[far]]=dep[ok][o][far];img[yi[far],xi[far]]=rgb[ok][o][far]
    return img
