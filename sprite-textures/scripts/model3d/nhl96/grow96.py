"""Second hill-climb: voxels may also be ADDED (from a 1-pixel-loose hull) where a sprite pixel is still uncovered, if the wrong-pixel total drops."""
import numpy as np,sys,pickle
from scipy import ndimage
import carve96 as C,err96,climb96
from hull96 import FL,pals
def loosehull(V,phi,G):
    X,Y,Z=G;keep=np.ones(X.shape,bool)
    for d,v in enumerate(V):
        sx,sy,_=C.proj(X,Y,Z,d,phi);px=np.floor(sx+v['xo']).astype(int)+1;py=np.floor(sy+v['yo']).astype(int)+1;m=ndimage.binary_dilation(np.pad(v['p']!=255,1),np.ones((3,3)))
        ok=(px>=0)&(px<m.shape[1])&(py>=0)&(py<m.shape[0]);a=np.zeros(X.shape,bool);a[ok]=m[py[ok],px[ok]];keep&=a
    return keep
def missmask(ev,alive):
    """dead voxels that project onto an uncovered body pixel in some view"""
    hit=np.zeros(ev.n,bool)
    for pix,order,sp,body,empty,npx in ev.views:
        o=order[alive[order]&(pix[order]>=0)];cov=np.zeros(npx,bool);cov[pix[o]]=True;miss=body&~cov;g=pix>=0;hit[g]|=miss[pix[g]]
    return hit&~alive
def grow(ev,alive,shape,iters=300,seed=1):
    rng=np.random.default_rng(seed);best,votes,conf,tot=ev.run(alive);print('grow start',best);nb=np.zeros(shape,bool)
    for it in range(iters):
        nb[:]=False;nb.ravel()[ev.idx[alive]]=True;near=ndimage.binary_dilation(nb,iterations=2).ravel()[ev.idx]
        if it%2==0:
            cand=np.flatnonzero(missmask(ev,alive)&near);mode='add'
        else:
            cand=np.flatnonzero(alive&(conf>0));mode='del'
        if len(cand)==0:continue
        pick=cand[rng.random(len(cand))<0.4*rng.random()]
        if len(pick)==0:pick=cand[[rng.integers(len(cand))]]
        a2=alive.copy();a2[pick]=(mode=='add');e,v2,c2,t2=ev.run(a2)
        if e<best:alive,best,votes,conf,tot=a2,e,v2,c2,t2
        if it%50==0:print(it,best,int(alive.sum()),flush=True)
    return alive,best,votes,tot
if __name__=='__main__':
    D=pickle.load(open(sys.argv[1],'rb'));V,phi,P=D['V'],D['phi'],D['P'];out=sys.argv[2]
    for d in range(8):C.YAW[d]=P[d][2]
    G=C.grid(0.5);pal=pals()['!bfh'];L=loosehull(V,phi,G)|D['occ'];ev=climb96.Ev(V,phi,G,L,pal);alive=D['occ'].ravel()[ev.idx]
    alive,best,votes,tot=grow(ev,alive,L.shape,int(sys.argv[3]) if len(sys.argv)>3 else 300);seen=alive&(tot>0);pts=ev.xyz[seen];col=ev.rep[votes[seen].argmax(1)]
    E=err96.sheet(V,phi,pts,col,pal,out+'.png');err96.report(E);o2=np.zeros(L.shape,bool);o2.ravel()[ev.idx[alive]]=True
    pickle.dump(dict(V=V,phi=phi,P=P,occ=o2,pts=pts,col=col,i0=D.get('i0')),open(out+'.pkl','wb'))
