"""Outputs for a fitted NHL 96 pose: GLB mesh (vertex colours), turntables (large and sprite size), novel-angle sheet."""
import numpy as np,sys,pickle,os,imageio
from PIL import Image
from scipy import ndimage
from scipy.spatial import cKDTree
from skimage import measure
import trimesh
import carve96 as C
from hull96 import FL,pals,render,surface
def full_surface(D,G):
    X,Y,Z=G;occ=ndimage.binary_closing(D['occ'],iterations=1)|D['occ'];s=surface(occ);pts=np.stack([X[s],Y[s],Z[s]],1);col=D['col'][cKDTree(D['pts']).query(pts)[1]];return occ,pts,col
def mesh(occ,G,D,pal):
    f=ndimage.gaussian_filter(np.pad(occ,2).astype(np.float32),0.8);v,fc,n,_=measure.marching_cubes(f,0.5);v=(v-2)*0.5+np.array([G[0].min(),G[1].min(),G[2].min()])
    col=D['col'][cKDTree(D['pts']).query(v)[1]];m=trimesh.Trimesh(v*np.array([-1,1,1]),fc[:,::-1],vertex_colors=np.c_[pal[col],np.full(len(v),255)].astype(np.uint8),process=False);return m
if __name__=='__main__':
    D=pickle.load(open(sys.argv[1],'rb'));out=sys.argv[2];os.makedirs(out,exist_ok=True);G=C.grid(0.5);pal=pals()['!bfh'];phi=D['phi']
    occ,pts,col=full_surface(D,G);m=mesh(occ,G,D,pal);m.export(out+'/nhl96pc_buffalo_player_mesh.glb');print('verts',len(m.vertices),'faces',len(m.faces))
    fr=[render(pts,col,pal,y,phi,sc=1,size=(64,72),anchor=(32,64)) for y in range(0,360,10)]
    imageio.mimsave(out+'/turntable_sprite_size.gif',[np.kron(f,np.ones((4,4,1),np.uint8)) for f in fr],duration=0.09,loop=0)
    imageio.mimsave(out+'/turntable_large.gif',[render(pts,col,pal,y,20,sc=6,size=(64,76),anchor=(32,68)) for y in range(0,360,10)],duration=0.09,loop=0)
    Image.fromarray(np.concatenate([np.concatenate([render(pts,col,pal,y,p,sc=5,size=(64,76),anchor=(32,68)) for y in (22.5,67.5,112.5,157.5,202.5,247.5,292.5,337.5)],1) for p in (phi,40)],0)).save(out+'/angles_the_game_never_drew.png')
