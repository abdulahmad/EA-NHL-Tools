import sys,json,os,numpy as np
from export import *
from tex3 import SHADE,FLAT
from lib import ZN
def shade_idx(vc,nrm,yaw,phi):
    """put the game's own light / medium / dark index back, from the surface normal (light from the upper left of the screen)"""
    th=np.deg2rad(yaw);nx=nrm[:,0]*np.cos(th)+nrm[:,2]*np.sin(th);nw=-nrm[:,0]*np.sin(th)+nrm[:,2]*np.cos(th)
    L=np.array([-0.45,0.75,-0.45]);L/=np.linalg.norm(L);l=nx*L[0]+nrm[:,1]*L[1]+nw*L[2];out=vc.copy()
    for rep,(li,me,da) in SHADE.items():
        m=vc==rep;out[m&(l>0.55)]=li;out[m&(l<-0.15)]=da
    return out
def turntable(ctr,vc,nrm,pal,phi,path,n=32,scale=1,up=8,size=(44,44),cy=-13,game_shade=True):
    fr=[]
    for k in range(n):
        yaw=360*k/n;c=shade_idx(vc,nrm,yaw,phi) if game_shade else vc
        im=render(ctr,c,nrm,pal,yaw,phi,scale,(size[0]*scale,size[1]*scale),cy,shade=not game_shade)
        fr.append(np.asarray(Image.fromarray(im).resize((im.shape[1]*up,im.shape[0]*up),Image.NEAREST)))
    gif(path,fr,90);return fr
if __name__=='__main__':
    M=np.load(sys.argv[1]);out=sys.argv[2];tm=sys.argv[3] if len(sys.argv)>3 else 'tor';os.makedirs(out,exist_ok=True)
    full,vcol,lo=voxelise(M['pts'],M['col'],M['pid']);pal=spritepal(team(tm))
    Q,CI=faces(full,vcol,lo);m=write_glb(f'{out}/nhl95pc_player.glb',Q,CI,pal);write_obj(f'{out}/nhl95pc_player.obj',Q,CI,pal,ZN);write_vox(f'{out}/nhl95pc_player.vox',full,vcol,pal)
    ctr,vc,nrm=surface(full,vcol,lo);print('voxels',full.sum(),'quads',len(Q),'grid',full.shape)
    cy=-(ctr[:,1].max()+ctr[:,1].min())/2*np.cos(np.deg2rad(25))*-1
    fr=turntable(ctr,vc,nrm,pal,25,f'{out}/turntable_sprite_size.gif',cy=cy)
    turntable(ctr,vc,nrm,pal,25,f'{out}/turntable_large.gif',n=48,scale=8,up=1,cy=cy)
    # 16-direction strip: the 8 game directions plus the 8 in between
    strip=np.concatenate([fr[(i*2)%32] for i in range(16)],1);Image.fromarray(strip).save(f'{out}/sixteen_directions.png')
