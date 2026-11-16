import sys,json,numpy as np
from fit import *
from lib import spritepal,team,BG,act
from PIL import Image
import parts as PT
ALLOW={C['head']:PT.HELM,C['skin']:PT.SKIN,C['torso']:PT.BODYZ|PT.CREST,C['sleeve']:PT.ARMZ,C['glove']:{0},C['pants']:PT.PANTZ,C['sock']:PT.SOCKZ,C['skate']:{0},C['stick']:{136}}
DEF={C['head']:190,C['skin']:134,C['torso']:166,C['sleeve']:157,C['glove']:0,C['pants']:180,C['sock']:182,C['skate']:0,C['stick']:136}
def model(x,step=0.3):
    parts,J,p=build(x,step);pts=np.concatenate([q['pts'] for q in parts]);cls=np.concatenate([q['cls'] for q in parts])
    pid=np.concatenate([np.full(len(q['pts']),i) for i,q in enumerate(parts)]);return parts,J,pts,cls,pid
def texture(x,V,phi,offs,step=0.3,R=3):
    parts,J,pts,cls,pid=model(x,step);N=len(pts);votes=np.zeros((N,256),np.float32)
    for d,v in enumerate(V):
        sx,sy,dep=proj(pts[:,0],pts[:,1],pts[:,2],d,phi)
        fx=sx+v['a'][0]+offs[d][0]+PAD;fy=sy+v['a'][1]+offs[d][1]+PAD;px=np.floor(fx).astype(int);py=np.floor(fy).astype(int)
        h,w=v['cls'].shape;ok=(px>=0)&(px<w)&(py>=0)&(py<h);zb=np.full((h,w),1e9);np.minimum.at(zb,(py[ok],px[ok]),dep[ok])
        vis=ok.copy();vis[ok]=dep[ok]<=zb[py[ok],px[ok]]+0.7
        pp=np.pad(v['p'],PAD,constant_values=255);fgp=np.pad(v['fg'],PAD)
        for c,al in ALLOW.items():
            if c in (C['glove'],C['skate'],C['stick']):continue
            m=np.isin(pp,list(al))&fgp
            if not m.any():continue
            dist,ind=ndi.distance_transform_edt(~m,return_indices=True)
            s=vis&(cls==c);dd=dist[py[s],px[s]];good=dd<=R
            qy=ind[0][py[s],px[s]][good];qx=ind[1][py[s],px[s]][good]
            np.add.at(votes,(np.flatnonzero(s)[good],pp[qy,qx]),1.0/(1+dd[good])**2)
    col=np.array([DEF[c] for c in cls]);has=votes.sum(1)>0;col[has]=votes[has].argmax(1)
    # points nobody saw: copy from the nearest seen point of the same part
    from scipy.spatial import cKDTree
    for i in range(len(parts)):
        m=pid==i;a=m&has;b=m&~has
        if a.any() and b.any():col[b]=col[np.flatnonzero(a)[cKDTree(pts[a]).query(pts[b])[1]]]
    blade=(cls==C['stick'])&(pid==len(parts)-1);col[blade]=0
    return pts,cls,pid,col,parts,J
def splat(pts,col,d,phi,a,off,shape,pal,yaw=None,scale=1,bg=BG):
    sx,sy,dep=proj(pts[:,0],pts[:,1],pts[:,2],d,phi,yaw)
    px=np.floor((sx+a[0]+off[0])*scale).astype(int);py=np.floor((sy+a[1]+off[1])*scale).astype(int)
    h,w=shape[0]*scale,shape[1]*scale;ok=(px>=0)&(px<w)&(py>=0)&(py<h);o=np.argsort(-dep[ok])
    img=np.zeros((h,w,3),np.uint8);img[:]=bg;img[py[ok][o],px[ok][o]]=np.clip(pal[col[ok][o]],0,255);return img
def sheet3(V,pts,col,cls,phi,offs,pal,path,s=8):
    CC=np.array([[240,240,240],[230,150,120],[220,60,60],[60,160,230],[20,20,20],[40,60,200],[240,200,40],[90,90,90],[200,120,80]])
    tiles=[]
    for d,v in enumerate(V):
        p=v['p'];a=np.zeros(p.shape+(3,),np.uint8);a[:]=BG;a[v['fg']]=np.clip(pal[p[v['fg']]],0,255)
        b=splat(pts,col,d,phi,v['a'],offs[d],p.shape,pal)
        c=splat(pts,cls,d,phi,v['a'],offs[d],p.shape,CC)
        sp=np.full((1,)+a.shape[1:],20,np.uint8);t=np.concatenate([a,sp,b,sp,c],0)
        tiles.append(Image.fromarray(t).resize((t.shape[1]*s,t.shape[0]*s),Image.NEAREST))
    W=sum(t.width+8 for t in tiles);Hh=max(t.height for t in tiles);im=Image.new('RGB',(W,Hh),(20,20,20));x=0
    for t in tiles: im.paste(t,(x,Hh-t.height));x+=t.width+8
    im.save(path)
if __name__=='__main__':
    F=json.load(open(sys.argv[1]));V=load(F['frames']);prep(V);x=np.array(F['x']);offs=[np.array(o) for o in F['offs']]
    pts,cls,pid,col,parts,J=texture(x,V,F['phi'],offs);pal=spritepal(team(sys.argv[3] if len(sys.argv)>3 else 'tor'))
    sheet3(V,pts,col,cls,F['phi'],offs,pal,sys.argv[2]);print(dict(zip(NAMES,np.round(x,1))))
