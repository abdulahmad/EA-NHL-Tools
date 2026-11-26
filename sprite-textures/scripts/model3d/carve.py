"""Voxel reconstruction of the NHL 95 PC skater from the 8 directions of one pose (space carving)."""
import sys,os,json,numpy as np
sys.path.insert(0,os.path.join(os.path.dirname(os.path.abspath(__file__)),'..'))
from lib import *
import parts
from scipy import ndimage as ndi
PN=parts.PN;P=parts.P
RES=0.5                       # voxel size in sprite pixels
def load(frames):
    V=[]
    for n in frames:
        p=frame(n);lab,_=parts.segment(n)
        ax,ay=H[n-1][4],H[n-1][5]
        fg=(p!=255)&(lab!=P['shadow'])&(p!=88)&(p!=82)&(p!=99)
        V.append(dict(n=n,p=p,lab=lab,fg=fg,stick=(lab==P['stick'])&fg,a=np.array([ax,ay],float)))
    return V
def grid(R=20,Y0=-8,Y1=32):
    xs=np.arange(-R,R,RES)+RES/2;ys=np.arange(Y0,Y1,RES)+RES/2
    X,Y,Z=np.meshgrid(xs,ys,xs,indexing='ij');return X,Y,Z
def proj(X,Y,Z,d,phi,yaw=None):
    th=np.deg2rad(45*d if yaw is None else yaw);ph=np.deg2rad(phi)
    sx=X*np.cos(th)+Z*np.sin(th);w=-X*np.sin(th)+Z*np.cos(th)
    sy=-(Y*np.cos(ph)+w*np.sin(ph));dep=w*np.cos(ph)-Y*np.sin(ph)
    return sx,sy,dep
def sample(mask,sx,sy,a,off=(0,0)):
    px=np.floor(sx+a[0]+off[0]).astype(int);py=np.floor(sy+a[1]+off[1]).astype(int)
    h,w=mask.shape;ok=(px>=0)&(px<w)&(py>=0)&(py<h)
    o=np.zeros(sx.shape,mask.dtype);o[ok]=mask[py[ok],px[ok]];return o,px,py,ok
def hull(V,G,phi,offs,T,key='body'):
    cnt=np.zeros(G[0].shape,np.int8)
    for d,v in enumerate(V):
        sx,sy,_=proj(*G,d,phi);m,_,_,_=sample(v[key],sx,sy,v['a'],offs[d]);cnt+=m
    return cnt>=T,cnt
def render_mask(vox,G,d,phi,v,off):
    sx,sy,_=proj(*G,d,phi);_,px,py,ok=sample(v['fg'],sx,sy,v['a'],off)
    m=np.zeros(v['fg'].shape,bool);s=vox&ok;m[py[s],px[s]]=True;return m
def iou(a,b): return (a&b).sum()/max(1,(a|b).sum())
def fit(V,phi,T,iters=4,key='body'):
    G=grid();offs=[np.zeros(2) for _ in V]
    for it in range(iters):
        vox,_=hull(V,G,phi,offs,T,key)
        for d,v in enumerate(V):
            best=(-1,None)
            for dx in (-1,0,1):
                for dy in (-1,0,1):
                    o=offs[d]+(dx,dy);s=iou(render_mask(vox,G,d,phi,v,o),v[key])-0.002*(abs(dx)+abs(dy))
                    if s>best[0]:best=(s,o)
            offs[d]=best[1]
    vox,cnt=hull(V,G,phi,offs,T,key)
    sc=[iou(render_mask(vox,G,d,phi,v,offs[d]),v[key]) for d,v in enumerate(V)]
    return G,vox,cnt,offs,sc
if __name__=='__main__':
    FR=[int(x) for x in sys.argv[1].split(',')]
    V=load(FR)
    for v in V: v['body']=v['fg']&~v['stick'];
    # the stick may hide the body: body test passes on stick pixels too
    for v in V: v['bodyw']=v['fg']
    for T in (8,7):
        for phi in (0,10,15,20,25,30,35,40):
            G,vox,cnt,offs,sc=fit(V,phi,T,key='bodyw')
            print(T,phi,vox.sum(),'%.3f'%np.mean(sc),' '.join('%.2f'%s for s in sc),[tuple(int(x) for x in o) for o in offs])
