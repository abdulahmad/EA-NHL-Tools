"""Render the NHL 96 clean model at NHL 95 PC sprite size and camera, next to the NHL 95 PC sprites (standing, fall forward, fall back).
The 96 model has no joints yet, so the 'fall' rows are the standing model tipped over rigidly, only to compare size, angle and texture density."""
import numpy as np,sys,pickle
sys.path.insert(0,'../m3d')
from PIL import Image
from ss96 import setup
from clean96 import *
import tex3 as T95
def render_xf(cl,R,s,yaws,pitch,size=(48,48),anchor=(24,38),lift=True):
    D=cl.D;Vt=D['verts'];c0=np.array([np.median(Vt[:,0]),0,np.median(Vt[:,2])]);V2=((Vt-c0)@R.T)*s;off=np.zeros(3)
    if lift:off=np.array([-(V2[:,0].min()+V2[:,0].max())/2,-V2[:,1].min(),-(V2[:,2].min()+V2[:,2].max())/2]);V2=V2+off
    n=len(yaws);cam=np.array([[np.cos(np.deg2rad(y)),np.sin(np.deg2rad(y)),np.cos(np.deg2rad(pitch)),np.sin(np.deg2rad(pitch)),anchor[0],anchor[1]] for y in yaws])
    fid,zo=depth_render(cl.fit,np.ascontiguousarray(V2),cam,np.full(n,size[0],np.int32),np.full(n,size[1],np.int32),n);out=np.full((n,size[1],size[0]),255,np.uint8)
    for d in range(n):
        ys,xs=np.nonzero(fid[d,:size[1],:size[0]]>=0);p2=unproject(cam[d],xs,ys,zo[d,ys,xs]);p=((p2-off)/s)@R+c0;out[d,ys,xs]=cl.label(p,fid[d,ys,xs])
    return out
def sprites95(frames,pal,size=(48,48),anchor=(24,38)):
    V=T95.load(frames);out=[]
    for v in V:
        a=np.full((size[1],size[0],3),(40,90,60),np.uint8);h,w=v['p'].shape;y0=int(anchor[1]-v['a'][1]);x0=int(anchor[0]-v['a'][0])
        for yy in range(h):
            for xx in range(w):
                if v['fg'][yy,xx] and 0<=y0+yy<size[1] and 0<=x0+xx<size[0]:a[y0+yy,x0+xx]=np.clip(pal[v['p'][yy,xx]],0,255)
        out.append(a)
    return out
I=np.eye(3);FWD=np.array([[1,0,0],[0,0,-1],[0,1,0.]]);BACK=np.array([[1,0,0],[0,0,1],[0,-1,0.]])
if __name__=='__main__':
    D,fit,cl=setup(sys.argv[1]);pal=with_number(pals()['!bfh'],88,fg=np.array([12,0,174]));p2=pal.copy();p2[255]=(40,90,60);p95=T95.spritepal(T95.team('buf'));s=float(sys.argv[2]) if len(sys.argv)>2 else 0.65
    yaws=[45*d for d in range(8)];rows=[]
    for nm,frames,R,pitch in (('standing',[1+5*d for d in range(8)],I,25),('fall forward',[305+4*d+3 for d in range(8)],FWD,55),('fall back',[273+4*d+3 for d in range(8)],BACK,55)):
        rows.append(np.concatenate(sprites95(frames,p95),1));rows.append(np.concatenate(list(p2[render_xf(cl,R,s,yaws,pitch)]),1))
    Image.fromarray(np.kron(np.concatenate(rows,0),np.ones((4,4,1),np.uint8))).save('cmp95.png')
