"""Voxelise the textured point model and export GLB / OBJ / MagicaVoxel .vox, plus turntables."""
import sys,json,struct,numpy as np
from scipy import ndimage as ndi
from scipy.spatial import cKDTree
from PIL import Image
from carve import proj
from lib import spritepal,team,BG
VS=0.5
def voxelise(pts,col,pid):
    lo=np.floor(pts.min(0)/VS).astype(int)-2;ijk=np.floor(pts/VS).astype(int)-lo;shape=ijk.max(0)+3
    occ=np.zeros(shape,bool);occ[ijk[:,0],ijk[:,1],ijk[:,2]]=True
    # fill each part separately so that gaps between parts stay open
    full=np.zeros(shape,bool)
    for i in np.unique(pid):
        o=np.zeros(shape,bool);q=ijk[pid==i];o[q[:,0],q[:,1],q[:,2]]=True;full|=ndi.binary_fill_holes(ndi.binary_closing(o,iterations=1))|o
    idx=np.argwhere(full);ctr=(idx+lo+0.5)*VS;_,nn=cKDTree(pts).query(ctr)
    vcol=np.full(shape,-1,int);vcol[idx[:,0],idx[:,1],idx[:,2]]=col[nn]
    return full,vcol,lo
def faces(full,vcol,lo):
    """exposed voxel faces -> quads (vertices in body frame px), colour index per quad"""
    Q=[];CI=[];pad=np.pad(full,1)
    cube=np.array([[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]])
    FD={(1,0,0):[1,2,6,5],(-1,0,0):[0,4,7,3],(0,1,0):[3,7,6,2],(0,-1,0):[0,1,5,4],(0,0,1):[4,5,6,7],(0,0,-1):[0,3,2,1]}
    for dv,f in FD.items():
        nb=pad[1+dv[0]:pad.shape[0]-1+dv[0],1+dv[1]:pad.shape[1]-1+dv[1],1+dv[2]:pad.shape[2]-1+dv[2]]
        e=np.argwhere(full&~nb)
        Q.append((e[:,None,:]+cube[f][None]+lo)*VS);CI.append(vcol[e[:,0],e[:,1],e[:,2]])
    return np.concatenate(Q),np.concatenate(CI)
def write_glb(path,Q,CI,pal,height_m=1.8):
    import trimesh
    V=Q.reshape(-1,3).copy();ymin=V[:,1].min();s=height_m/(V[:,1].max()-ymin);V[:,1]-=ymin;V*=s;V[:,0]*=-1   # right-handed, Y up, faces +Z
    n=len(Q);F=np.concatenate([np.arange(n)[:,None]*4+[0,2,1],np.arange(n)[:,None]*4+[0,3,2]])
    rgb=np.clip(pal[CI],0,255).astype(np.uint8);vc=np.repeat(np.concatenate([rgb,np.full((n,1),255,np.uint8)],1),4,0)
    m=trimesh.Trimesh(V,F,vertex_colors=vc,process=False);m.export(path);return m
def write_obj(path,Q,CI,pal,names):
    used=sorted(set(CI.tolist()));mtl=path[:-4]+'.mtl'
    with open(mtl,'w') as f:
        for u in used:
            r,g,b=np.clip(pal[u],0,255)/255;f.write(f"newmtl idx{u:03d}_{names.get(str(u),'gear').replace(' ','_')}\nKd {r:.4f} {g:.4f} {b:.4f}\n")
    with open(path,'w') as f:
        f.write(f"mtllib {mtl.split('/')[-1]}\n");V=Q.reshape(-1,3).copy();V[:,0]*=-1
        for v in V:f.write("v %.3f %.3f %.3f\n"%tuple(v))
        for u in used:
            f.write(f"usemtl idx{u:03d}_{names.get(str(u),'gear').replace(' ','_')}\n")
            for q in np.flatnonzero(CI==u):f.write("f %d %d %d %d\n"%(q*4+1,q*4+4,q*4+3,q*4+2))
def write_vox(path,full,vcol,pal):
    used=sorted(set(vcol[full].tolist()));remap={u:i+1 for i,u in enumerate(used)}
    idx=np.argwhere(full);sx,sy,sz=full.shape   # vox: x right, y depth, z up
    xyzi=b''.join(struct.pack('4B',sx-1-i,k,j,remap[vcol[i,j,k]]) for i,j,k in idx)
    def chunk(id,content,children=b''):return id+struct.pack('<ii',len(content),len(children))+content+children
    rgba=b''.join(struct.pack('4B',*(list(np.clip(pal[u],0,255).astype(int))+[255])) for u in used)+b'\0\0\0\xff'*(256-len(used))
    main=chunk(b'SIZE',struct.pack('<iii',sx,sz,sy))+chunk(b'XYZI',struct.pack('<i',len(idx))+xyzi)+chunk(b'RGBA',rgba)
    open(path,'wb').write(b'VOX '+struct.pack('<i',150)+chunk(b'MAIN',b'',main));return remap
def render(ctr,vc,nrm,pal,yaw,phi,scale,size,cy,shade=True,bg=BG):
    sx,sy,dep=proj(ctr[:,0],ctr[:,1],ctr[:,2],0,phi,yaw);W,Hh=size
    rgb=np.clip(pal[vc],0,255).astype(float)
    if shade and scale>1:
        th=np.deg2rad(yaw);ph=np.deg2rad(phi)
        # light from the upper left of the camera
        Lc=np.array([-0.35,0.8,-0.5]);Lc/=np.linalg.norm(Lc)
        nx=nrm[:,0]*np.cos(th)+nrm[:,2]*np.sin(th);nw=-nrm[:,0]*np.sin(th)+nrm[:,2]*np.cos(th)
        l=np.clip(nx*Lc[0]+nrm[:,1]*Lc[1]+nw*Lc[2],-1,1);rgb=rgb*(0.82+0.18*l)[:,None]+12*np.clip(l,0,1)[:,None]
    img=np.zeros((Hh,W,3),np.uint8);img[:]=bg;o=np.argsort(-dep);k=max(1,int(np.ceil(VS*scale)))
    px=np.floor(sx[o]*scale+W/2).astype(int);py=np.floor((sy[o]+cy)*scale+Hh/2).astype(int);c=np.clip(rgb[o],0,255).astype(np.uint8)
    dx,dy=np.meshgrid(np.arange(k)-k//2,np.arange(k)-k//2);x=(px[:,None]+dx.ravel()[None]).ravel();y=(py[:,None]+dy.ravel()[None]).ravel();cc=np.repeat(c,k*k,0)
    ok=(x>=0)&(x<W)&(y>=0)&(y<Hh);img[y[ok],x[ok]]=cc[ok]
    return img
def surface(full,vcol,lo):
    er=ndi.binary_erosion(full);s=full&~er;idx=np.argwhere(s);ctr=(idx+lo+0.5)*VS
    g=ndi.gaussian_filter(full.astype(float),1.2);gr=np.stack(np.gradient(g),-1)[idx[:,0],idx[:,1],idx[:,2]];n=-gr/np.maximum(1e-9,np.linalg.norm(gr,axis=1))[:,None]
    return ctr,vcol[idx[:,0],idx[:,1],idx[:,2]],n
def gif(path,frames,ms=90):
    ims=[Image.fromarray(f) for f in frames];ims[0].save(path,save_all=True,append_images=ims[1:],duration=ms,loop=0)
