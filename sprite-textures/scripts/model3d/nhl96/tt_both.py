"""Turntables of the NHL 95 PC and NHL 96 PC models side by side, at each game's sprite size and camera pitch (95: about 25 deg, player about 37 px tall; 96: about 13 deg, about 58 px tall). One sample per pixel, like the games."""
import numpy as np,sys,trimesh,imageio
from PIL import Image,ImageDraw
import hires96
def load(f,flipx,levels):
    m=trimesh.load(f,force='mesh',process=False);V=np.array(m.vertices,float);F=np.array(m.faces);col=np.array(m.visual.vertex_colors)[:,:3]
    if flipx:V[:,0]*=-1
    P,fid=hires96.subdivide(V,F,levels);rgb=col[F[fid,0]];return P,rgb,V
def norm(P,V,h,body=None):
    """feet on the ground at the origin, body height h pixels"""
    b=V if body is None else V[body];s=h/(b[:,1].max()-b[:,1].min());c=np.array([(b[:,0].min()+b[:,0].max())/2,b[:,1].min(),(b[:,2].min()+b[:,2].max())/2]);return (P-c)*s
def frame(models,yaw,pitch,size,anchor,sc):
    tiles=[]
    for P,rgb in models:
        im=hires96.render(P,rgb,yaw,pitch,sc=4,size=size,anchor=anchor)[2::4,2::4];tiles.append(np.kron(im,np.ones((sc,sc,1),np.uint8)))
    return np.concatenate(tiles,1)
def setup96():
    import pickle
    from parts96 import setup_rig,attach,refresh,with_number,pals,shade96
    D,cl,rig=setup_rig('sy8.pkl');st=pickle.load(open('pt9b.pkl','rb'));pt=attach(cl,rig)
    for k,v in st.get('rules',{}).items():setattr(cl,k,v)
    refresh(cl,pt,st['th']);return D,cl,with_number(pals()['!bfh'],88,fg=np.array([12,0,174])),shade96.smooth_normals(cl,1)
def frames96(S,yaws,pitch,h,size,anchor):
    """the 96 model through its own renderer: one sample at each pixel centre, texture rules and shading evaluated at that point"""
    from parts96 import depth_render,unproject,shade_all,pnormals
    D,cl,pal,ns=S;V=cl.D['verts'];s=h/(V[:,1].max()-V[:,1].min());c0=np.array([(V[:,0].min()+V[:,0].max())/2,V[:,1].min(),(V[:,2].min()+V[:,2].max())/2]);V2=np.ascontiguousarray((V-c0)*s);out=[]
    for i in range(0,len(yaws),8):
        ya=yaws[i:i+8];n=len(ya);cam=np.array([[np.cos(np.deg2rad(y)),np.sin(np.deg2rad(y)),np.cos(np.deg2rad(pitch)),np.sin(np.deg2rad(pitch)),anchor[0],anchor[1]] for y in ya]);fid,zo=depth_render(cl.fit,V2,cam,np.full(n,size[0],np.int32),np.full(n,size[1],np.int32),n)
        for d in range(n):
            im=np.zeros((size[1],size[0],3),np.uint8);im[:]=(40,90,60);ys,xs=np.nonzero(fid[d,:size[1],:size[0]]>=0);f=fid[d,ys,xs];p=unproject(cam[d],xs,ys,zo[d,ys,xs])/s+c0;im[ys,xs]=pal[shade_all(cl.label(p,f),pnormals(cl,ns,p,f),D['rules']['light'])];out.append(im)
    return out
if __name__=='__main__':
    out=sys.argv[1];P95,c95,V95=load('/mnt/project-files/player-3d-model/v5_mesh/nhl95pc_player_mesh.glb',True,1);P96,c96,V96=load('/mnt/project-files/player-3d-model/nhl96/clean_v5/nhl96pc_buffalo_player_clean_v5.glb',True,1)
    body95=np.abs(V95[:,2]-np.median(V95[:,2]))<0.3          # leave the stick out when measuring the 95 player's height
    S=setup96();up=lambda im,sc:np.kron(im,np.ones((sc,sc,1),np.uint8))
    for nm,pitch,h,size,anchor in (('nhl95_angle_and_size',25,37.5,(48,52),(24,44)),('nhl96_angle_and_size',13,58,(64,72),(32,66))):
        ys=list(range(0,360,10));m95=norm(P95,V95,h,body95);a=[hires96.render(m95,c95,y,pitch,sc=4,size=size,anchor=anchor)[2::4,2::4] for y in ys];b=frames96(S,ys,pitch,h,size,anchor)
        for sc,tag in ((1,'_1x'),(5,'')):imageio.mimsave('%s/turntable_%s%s.gif'%(out,nm,tag),[up(np.concatenate([x,y],1),sc) for x,y in zip(a,b)],duration=0.1,loop=0)
        Image.fromarray(np.concatenate([up(np.concatenate([a[i],b[i]],1),5) for i in (0,9,18,27)],0)).save('%s/%s_4_views.png'%(out,nm));print(nm,'done',flush=True)
