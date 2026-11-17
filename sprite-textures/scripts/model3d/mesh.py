"""Smooth mesh export: every body part is a closed tube / ellipsoid surface, coloured from the voted zones."""
import sys,json,numpy as np,trimesh
from scipy.spatial import cKDTree
import tmpl
from PIL import Image
from carve import proj
from lib import spritepal,team,BG
from tex3 import SHADE
def part_meshes(x,M,seg=64,step=0.3,stick=None):
    tmpl.MESHSEG=seg;parts=tmpl.build(np.asarray(x),step,stick)[0];tmpl.MESHSEG=0;out=[]
    for i,q in enumerate(parts):
        P=q['pts'];nr=len(P)//seg;idx=np.arange(nr*seg).reshape(nr,seg);a=idx[:-1];b=idx[1:]
        quads=np.stack([a,np.roll(a,-1,1),np.roll(b,-1,1),b],-1).reshape(-1,4)
        c0,c1=P[:seg].mean(0),P[-seg:].mean(0);V=np.concatenate([P,[c0,c1]]);n0,n1=len(P),len(P)+1
        F=np.concatenate([quads[:,[0,1,2]],quads[:,[0,2,3]],
                          np.stack([np.full(seg,n0),np.roll(idx[0],-1),idx[0]],1),np.stack([np.full(seg,n1),idx[-1],np.roll(idx[-1],-1)],1)])
        m=M['pid']==i;ci=M['col'][m][cKDTree(M['pts'][m]).query(V)[1]]
        out.append((q['name'],V,F,ci))
    return out
def to_trimesh(pm,pal,height_m=None):
    Vs=[];Fs=[];Cs=[];CI=[];n=0
    for name,V,F,ci in pm:
        t=trimesh.Trimesh(V*[-1,1,1],F[:,::-1],process=False);trimesh.repair.fix_normals(t)
        Vs.append(t.vertices);Fs.append(t.faces+n);n+=len(V);CI.append(ci)
    V=np.concatenate(Vs);F=np.concatenate(Fs);ci=np.concatenate(CI)
    if height_m:V=(V-[0,V[:,1].min(),0])*height_m/(V[:,1].max()-V[:,1].min())
    rgb=np.clip(pal[ci],0,255).astype(np.uint8)
    return trimesh.Trimesh(V,F,vertex_colors=np.concatenate([rgb,np.full((len(V),1),255,np.uint8)],1),process=False),ci
def sample(pm,n=1500000,seed=0):
    """dense surface samples (body frame px) with zone index and outward normal, for the preview renderer"""
    Vs=[];Fs=[];CI=[];k=0
    for name,V,F,ci in pm:
        t=trimesh.Trimesh(V,F,process=False);trimesh.repair.fix_normals(t);Vs.append(t.vertices);Fs.append(t.faces+k);k+=len(V);CI.append(ci)
    t=trimesh.Trimesh(np.concatenate(Vs),np.concatenate(Fs),process=False);ci=np.concatenate(CI)
    np.random.seed(seed);P,fi=trimesh.sample.sample_surface(t,n);return np.asarray(P),ci[t.faces[fi][:,0]],t.face_normals[fi]
def shade_idx(vc,nrm,yaw):
    th=np.deg2rad(yaw);nx=nrm[:,0]*np.cos(th)+nrm[:,2]*np.sin(th);nw=-nrm[:,0]*np.sin(th)+nrm[:,2]*np.cos(th)
    L=np.array([-0.45,0.75,-0.45]);L/=np.linalg.norm(L);l=nx*L[0]+nrm[:,1]*L[1]+nw*L[2];out=vc.copy()
    for rep,(li,me,da) in SHADE.items():
        m=vc==rep;out[m&(l>0.6)]=li;out[m&(l<-0.1)]=da
    return out,l
def render(P,ci,nrm,pal,yaw,phi,scale,size,cy,game=True,bg=BG):
    sx,sy,dep=proj(P[:,0],P[:,1],P[:,2],0,phi,yaw);W,Hh=size;c2,l=shade_idx(ci,nrm,yaw)
    rgb=np.clip(pal[c2],0,255).astype(float) if game else np.clip(pal[ci],0,255)*(0.78+0.22*l)[:,None]+10*np.clip(l,0,1)[:,None]
    img=np.zeros((Hh,W,3),np.uint8);img[:]=bg;o=np.argsort(-dep)
    px=np.floor(sx[o]*scale+W/2).astype(int);py=np.floor((sy[o]+cy)*scale+Hh/2).astype(int);ok=(px>=0)&(px<W)&(py>=0)&(py<Hh)
    img[py[ok],px[ok]]=np.clip(rgb[o][ok],0,255).astype(np.uint8);return img
def gif(path,frames,ms=90):
    ims=[Image.fromarray(f) for f in frames];ims[0].save(path,save_all=True,append_images=ims[1:],duration=ms,loop=0)
if __name__=='__main__':
    F=json.load(open(sys.argv[1]));M=np.load(sys.argv[2]);out=sys.argv[3];tm=sys.argv[4] if len(sys.argv)>4 else 'tor'
    import os;os.makedirs(out,exist_ok=True);pal=spritepal(team(tm));pm=part_meshes(F['x'],M,stick=F.get('rest_stick'))
    tm_,ci=to_trimesh(pm,pal,1.8);tm_.export(f'{out}/nhl95pc_player_mesh.glb');print('verts',len(tm_.vertices),'faces',len(tm_.faces))
    P,c,n=sample(pm);cy=(P[:,1].max()+P[:,1].min())/2*np.cos(np.deg2rad(25))
    big=[render(P,c,n,pal,360*k/48,25,8,(352,352),cy,game=False) for k in range(48)];gif(f'{out}/turntable_mesh_large.gif',big)
    sm=[np.asarray(Image.fromarray(render(P,c,n,pal,360*k/32,25,1,(44,44),cy)).resize((352,352),Image.NEAREST)) for k in range(32)];gif(f'{out}/turntable_mesh_sprite_size.gif',sm)
    def strip(fr,idx,crop):
        return np.concatenate([fr[i][crop[1]:crop[3],crop[0]:crop[2]] for i in idx],1)
    cr=(88,20,264,340);Image.fromarray(strip(big,range(0,48,6),cr)).save(f'{out}/mesh_8_directions_large.png')
    Image.fromarray(np.concatenate([strip(sm,range(0,16,2),cr),strip(sm,range(16,32,2),cr)],0)).save(f'{out}/mesh_16_directions_sprite_size.png')
