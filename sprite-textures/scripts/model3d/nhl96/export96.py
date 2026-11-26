"""Export the clean-textured NHL 96 PC model: GLB (faces subdivided and coloured by the texture rules), sprite-size and large turntables, 8-angle sheet."""
import numpy as np,sys,pickle,os,imageio,trimesh
from PIL import Image
from clean96 import *
def subdivide(V,F,levels=2):
    T=V[F];fid=np.arange(len(F))
    for _ in range(levels):
        a,b,c=T[:,0],T[:,1],T[:,2];ab,bc,ca=(a+b)/2,(b+c)/2,(c+a)/2;T=np.concatenate([np.stack(x,1) for x in ((a,ab,ca),(ab,b,bc),(ca,bc,c),(ab,bc,ca))]);fid=np.tile(fid,4)
    return T,fid
if __name__=='__main__':
    D,fit=load(sys.argv[1]);S=samples(D,fit);cl=Clean(D,fit,S);out=sys.argv[2]
    if 'rules' in D:
        for k,v in D['rules'].items():setattr(cl,k,v);os.makedirs(out,exist_ok=True);pal=with_number(pals()['!bfh'],88,fg=np.array([12,0,174]));phi=D['phi']
    cl.sheet(pal,out+'/sprites_vs_model_vs_errors.png')
    T,fid=subdivide(D['verts'],D['faces'],3);idx=cl.label(T.mean(1),fid);V=T.reshape(-1,3)*np.array([-1,1,1]);F=np.arange(len(V)).reshape(-1,3)[:,::-1]
    m=trimesh.Trimesh(V,F,face_colors=np.c_[pal[idx],np.full(len(idx),255)].astype(np.uint8),process=False);m.export(out+'/nhl96pc_buffalo_player_clean.glb');print('glb faces',len(F))
    ys=list(range(0,360,10));imageio.mimsave(out+'/turntable_sprite_size.gif',cl.novel(pal,None,ys,phi,sc=4),duration=0.09,loop=0)
    imageio.mimsave(out+'/turntable_sprite_size_1x.gif',cl.novel(pal,None,ys,phi,sc=1),duration=0.09,loop=0)
    Image.fromarray(np.concatenate([np.concatenate(cl.novel(pal,None,[22.5+45*k for k in range(8)],p),1) for p in (phi,40)],0)).save(out+'/angles_the_game_never_drew.png')
    Image.fromarray(np.concatenate(cl.novel(pal,None,[45*k for k in range(8)],phi,sc=6),1)).save(out+'/eight_directions.png')
