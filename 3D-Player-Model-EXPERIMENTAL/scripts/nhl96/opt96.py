"""Drive per-frame pixel error down: patch outline misses, then give each voxel the colour that minimises wrong pixels over the pixels it owns."""
import numpy as np,sys,pickle
from scipy import ndimage
from hull96 import *
import err96
def pixmap(V,d,phi,G,occ):
    X,Y,Z=G;v=V[d];sx,sy,dp=proj(X,Y,Z,d,phi);return np.floor(sx+v['xo']).astype(int),np.floor(sy+v['yo']).astype(int),dp
def patch(V,phi,G,occ,rounds=2):
    """add voxels that cover missed body pixels, if they stay within 1 px of the outline in every other view"""
    X,Y,Z=G;PM=[pixmap(V,d,phi,G,occ) for d in range(8)];loose=np.ones(X.shape,bool);strictcnt=np.zeros(X.shape,np.int8)
    for d,v in enumerate(V):
        px,py,_=PM[d];ok=(px>=0)&(px<v['w'])&(py>=0)&(py<v['h']);m=v['p']!=255;md=ndimage.binary_dilation(m,np.ones((3,3)))
        a=np.zeros(X.shape,bool);a[ok]=md[py[ok],px[ok]];loose&=a;b=np.zeros(X.shape,bool);b[ok]=m[py[ok],px[ok]];strictcnt+=b
    occ=occ.copy()
    for r in range(rounds):
        for d,v in enumerate(V):
            px,py,_=PM[d];ok=(px>=0)&(px<v['w'])&(py>=0)&(py<v['h']);cov=np.zeros((v['h'],v['w']),bool);o=occ&ok;cov[py[o],px[o]]=True
            miss=(v['p']!=255)&~np.isin(v['p'],err96.STK)&~cov;c=np.zeros(X.shape,bool);c[ok]=miss[py[ok],px[ok]]
            cand=c&loose&(strictcnt>=7)&~occ&ndimage.binary_dilation(occ,iterations=3);occ|=cand
    return occ
def owncolour(V,phi,G,occ,pal,iters=1):
    """optimal colours for fixed geometry: each voxel takes the commonest sprite colour among the pixels where it is the front voxel"""
    X,Y,Z=G;idx=np.flatnonzero(occ.ravel());x,y,z=X.ravel()[idx],Y.ravel()[idx],Z.ravel()[idx];votes=np.zeros((len(idx),256),np.float32)
    for d,v in enumerate(V):
        sx,sy,dp=proj(x,y,z,d,phi);px=np.floor(sx+v['xo']).astype(int);py=np.floor(sy+v['yo']).astype(int);ok=np.flatnonzero((px>=0)&(px<v['w'])&(py>=0)&(py<v['h']))
        o=ok[np.argsort(-dp[ok])];own=np.full((v['h'],v['w']),-1);own[py[o],px[o]]=o;sp=FL[v['p']];g=(own>=0)&(sp!=255)&~np.isin(v['p'],err96.STK)
        np.add.at(votes,(own[g],sp[g]),1)
    seen=votes.sum(1)>0;return np.stack([x,y,z],1)[seen],votes[seen].argmax(1),votes[seen]
if __name__=='__main__':
    D=pickle.load(open(sys.argv[1],'rb'));V,phi=D['V'],D['phi'];pal=pals()['!bfh'];G=grid(0.5);occ=D['occ']
    for nm,o in (('refined',occ),('patched',patch(V,phi,G,occ))):
        pts,col,votes=owncolour(V,phi,G,o,pal);print(nm,len(pts));E=err96.sheet(V,phi,pts,col,pal,sys.argv[2]+'_'+nm+'.png');err96.report(E)
    pickle.dump(dict(V=V,phi=phi,occ=o,pts=pts,col=col),open(sys.argv[2]+'.pkl','wb'))
