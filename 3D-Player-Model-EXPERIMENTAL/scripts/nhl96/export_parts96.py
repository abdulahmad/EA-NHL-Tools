"""Export the clean NHL 96 PC model with the modelled helmet, gloves and skates: large views, turntables, sprite sheet, GLB."""
import numpy as np,sys,pickle,os,imageio,trimesh
from PIL import Image
from parts96 import *
D,cl,rig=setup_rig(sys.argv[1]);st=pickle.load(open(sys.argv[2],'rb'));th=st['th'];out=sys.argv[3];os.makedirs(out,exist_ok=True);pal=with_number(pals()['!bfh'],88,fg=np.array([12,0,174]));co=D['rules']['light'];phi=D['phi']
pt=attach(cl,rig)
for k,v in st.get('rules',{}).items():setattr(cl,k,v)
refresh(cl,pt,th);cl.cache(pal);cl.sheet(pal,out+'/sprites_vs_model_vs_errors.png')
ns=shade96.smooth_normals(cl,1)
def small(yaws,pitch,sc,size=(64,76),anchor=(32,68)):
    n=len(yaws);cam=np.array([[np.cos(np.deg2rad(y)),np.sin(np.deg2rad(y)),np.cos(np.deg2rad(pitch)),np.sin(np.deg2rad(pitch)),anchor[0],anchor[1]] for y in yaws]);fid,zo=depth_render(cl.fit,cl.D['verts'],cam,np.full(n,size[0],np.int32),np.full(n,size[1],np.int32),n)
    p2=pal.copy();p2[255]=(40,90,60);res=[]
    for d in range(n):
        im=np.full((MH,MW),255,np.uint8);ys,xs=np.nonzero(fid[d]>=0);f=fid[d,ys,xs];pp=unproject(cam[d],xs,ys,zo[d,ys,xs]);im[ys,xs]=shade_all(cl.label(pp,f),pnormals(cl,ns,pp,f),co);res.append(np.kron(p2[im[:size[1],:size[0]]],np.ones((sc,sc,1),np.uint8)))
    return res
ys=list(range(0,360,10));imageio.mimsave(out+'/turntable_sprite_size.gif',small(ys,phi,4),duration=0.09,loop=0);imageio.mimsave(out+'/turntable_sprite_size_1x.gif',small(ys,phi,1),duration=0.09,loop=0)
Image.fromarray(np.concatenate(small([45*k for k in range(8)],phi,6),1)).save(out+'/eight_directions.png')
big=hires(cl,co,pal,(180,135,90,45,0,315,270,225),sc=8);Image.fromarray(np.concatenate([np.concatenate(big[:4],1),np.concatenate(big[4:],1)],0)).save(out+'/large_views.png')
# close-ups of the three parts
def crop(yaw,box,sc=20):
    im=hires(cl,co,pal,(yaw,),sc=sc)[0];x0,y0,x1,y1=[int(v*sc) for v in box];return im[y0:y1,x0:x1]
hd=np.concatenate([crop(y,(22,4,42,24)) for y in (180,90,0)],1);gl=np.concatenate([crop(y,(14,30,50,48),sc=20)[:,:400] if False else crop(y,(12,30,52,50)) for y in (180,90)],1)
sk=np.concatenate([crop(y,(14,56,50,72)) for y in (180,90)],1)
for nm,im in (('closeup_helmet.png',hd),('closeup_gloves.png',gl),('closeup_skates.png',sk)):Image.fromarray(im).save(out+'/'+nm)
imageio.mimsave(out+'/turntable_large.gif',hires(cl,co,pal,list(range(0,360,15)),sc=6,levels=4),duration=0.12,loop=0)
V,F=cl.D['verts'],cl.D['faces'];T=V[F];fid=np.arange(len(F))
for _ in range(3):
    a,b,c=T[:,0],T[:,1],T[:,2];ab,bc,ca=(a+b)/2,(b+c)/2,(c+a)/2;T=np.concatenate([np.stack(x,1) for x in ((a,ab,ca),(ab,b,bc),(ca,bc,c),(ab,bc,ca))]);fid=np.tile(fid,4)
idx=shade_all(cl.label(T.mean(1),fid),pnormals(cl,ns,T.mean(1),fid),co);Vg=T.reshape(-1,3)*np.array([-1,1,1]);Fg=np.arange(len(Vg)).reshape(-1,3)[:,::-1]
trimesh.Trimesh(Vg,Fg,face_colors=np.c_[pal[idx],np.full(len(idx),255)].astype(np.uint8),process=False).export(out+'/nhl96pc_buffalo_player_clean_'+os.path.basename(out)[-2:]+'.glb')
pickle.dump(dict(D,verts=V,faces=F,parts=dict(th=th,fixed=cl.fixed,nbody=cl.nbody,fz=cl.fz)),open(out+'/state.pkl','wb'));print('done',len(Fg))
