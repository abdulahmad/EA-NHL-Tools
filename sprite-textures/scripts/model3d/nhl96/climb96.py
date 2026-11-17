"""Hill-climb the voxel shape on the pixel error itself: drop voxels whose removal lowers the count of wrong pixels over the 8 views."""
import numpy as np,sys,pickle,time
from scipy import ndimage
from hull96 import *
import err96
class Ev:
    def __init__(s,V,phi,G,occ0,pal):
        X,Y,Z=G;s.idx=np.flatnonzero(occ0.ravel());s.xyz=np.stack([X.ravel()[s.idx],Y.ravel()[s.idx],Z.ravel()[s.idx]],1);s.V=V;s.views=[];s.n=len(s.idx)
        u,inv=np.unique(pal[FL].reshape(-1,3),axis=0,return_inverse=True);s.cls=inv.reshape(256);s.K=len(u);s.rep=np.array([FL[np.flatnonzero(s.cls==k)[0]] for k in range(s.K)])
        for d,v in enumerate(V):
            sx,sy,dp=proj(*s.xyz.T,d,phi);px=np.floor(sx+v['xo']).astype(int);py=np.floor(sy+v['yo']).astype(int);ok=(px>=0)&(px<v['w'])&(py>=0)&(py<v['h'])
            pix=np.where(ok,py*v['w']+px,-1);order=np.argsort(-dp);sp=s.cls[FL[v['p']]].ravel();body=((v['p']!=255)&~np.isin(v['p'],err96.STK)).ravel();empty=(v['p']==255).ravel()
            s.views.append((pix,order,sp,body,empty,v['w']*v['h']))
    def run(s,alive):
        votes=np.zeros((s.n,s.K),np.int32);owns=[];err=0;ext=np.zeros(s.n,np.int32)
        for pix,order,sp,body,empty,npx in s.views:
            o=order[alive[order]&(pix[order]>=0)];own=np.full(npx,-1);own[pix[o]]=o;owns.append(own);g=(own>=0)&body;np.add.at(votes,(own[g],sp[g]),1)
            err+=int((body&(own<0)).sum())+int((empty&(own>=0)).sum());np.add.at(ext,own[empty&(own>=0)],1)
        tot=votes.sum(1);mx=votes.max(1);return err+int((tot-mx).sum()),votes,tot-mx+ext,tot
def climb(ev,iters=400,frac=0.3,seed=0):
    rng=np.random.default_rng(seed);alive=np.ones(ev.n,bool);best,votes,conf,tot=ev.run(alive);print('start',best)
    for it in range(iters):
        cand=np.flatnonzero(alive&(conf>0))
        if len(cand)==0:break
        pick=cand[rng.random(len(cand))<frac*rng.random()];
        if len(pick)==0:pick=cand[[rng.integers(len(cand))]]
        a2=alive.copy();a2[pick]=False;e,v2,c2,t2=ev.run(a2)
        if e<best:alive,best,votes,conf,tot=a2,e,v2,c2,t2
        if it%50==0:print(it,best,int(alive.sum()))
    return alive,best,votes,tot
if __name__=='__main__':
    D=pickle.load(open(sys.argv[1],'rb'));V,phi=D['V'],D['phi'];pal=pals()['!bfh'];G=grid(0.5)
    if len(sys.argv)>4:
        from carve96 import carve
        o=carve(V,phi,1,G,need=int(sys.argv[4]));lab,n=ndimage.label(o);sz=ndimage.sum(o,lab,range(1,n+1));D['occ']=lab==(1+int(np.argmax(sz)))
    ev=Ev(V,phi,G,D['occ'],pal)
    alive,best,votes,tot=climb(ev,int(sys.argv[3]) if len(sys.argv)>3 else 400);seen=alive&(tot>0)
    pts=ev.xyz[seen];col=ev.rep[votes[seen].argmax(1)];E=err96.sheet(V,phi,pts,col,pal,sys.argv[2]+'.png');err96.report(E)
    occ=np.zeros(D['occ'].shape,bool);occ.ravel()[ev.idx[alive]]=True;pickle.dump(dict(V=V,phi=phi,occ=occ,pts=pts,col=col),open(sys.argv[2]+'.pkl','wb'))
