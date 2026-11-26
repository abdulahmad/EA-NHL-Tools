import sys,json,numpy as np
from tex import *
from scipy.spatial import cKDTree
def texture2(x,XV,V,phi,offs,step=0.3,R=2.5):
    parts,J,pts,cls,pid=model(x,step);N=len(pts);votes=np.zeros((N,256),np.float32)
    for d,v in enumerate(V):
        pd=model(np.array(XV[d]),step)[2];assert len(pd)==N
        sx,sy,dep=proj(pd[:,0],pd[:,1],pd[:,2],d,phi)
        px=np.floor(sx+v['a'][0]+offs[d][0]).astype(int)+PAD;py=np.floor(sy+v['a'][1]+offs[d][1]).astype(int)+PAD
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
    for i in range(len(parts)):
        m=pid==i;a=m&has;b=m&~has
        if a.any() and b.any():col[b]=col[np.flatnonzero(a)[cKDTree(pts[a]).query(pts[b])[1]]]
    col[(pid==len(parts)-1)]=0
    return pts,cls,pid,col,parts,J
def sheet_pv(V,XV,x,col,phi,offs,pal,path,s=8):
    """row 1 sprite, row 2 per-view pose, row 3 shared pose"""
    pts=model(x,0.3)[2];tiles=[]
    for d,v in enumerate(V):
        p=v['p'];a=np.zeros(p.shape+(3,),np.uint8);a[:]=BG;a[v['fg']]=np.clip(pal[p[v['fg']]],0,255)
        b=splat(model(np.array(XV[d]),0.3)[2],col,d,phi,v['a'],offs[d],p.shape,pal);c=splat(pts,col,d,phi,v['a'],offs[d],p.shape,pal)
        sp=np.full((1,)+a.shape[1:],20,np.uint8);t=np.concatenate([a,sp,b,sp,c],0);tiles.append(Image.fromarray(t).resize((t.shape[1]*s,t.shape[0]*s),Image.NEAREST))
    W=sum(t.width+8 for t in tiles);Hh=max(t.height for t in tiles);im=Image.new('RGB',(W,Hh),(20,20,20));xx=0
    for t in tiles: im.paste(t,(xx,Hh-t.height));xx+=t.width+8
    im.save(path)
if __name__=='__main__':
    F=json.load(open(sys.argv[1]));V=load(F['frames']);prep(V);x=np.array(F['x']);offs=[np.array(o) for o in F['offs']]
    pts,cls,pid,col,parts,J=texture2(x,F['xv'],V,F['phi'],offs);pal=spritepal(team('tor'))
    sheet_pv(V,F['xv'],x,col,F['phi'],offs,pal,sys.argv[2]);np.savez(sys.argv[3],pts=pts,cls=cls,pid=pid,col=col)
