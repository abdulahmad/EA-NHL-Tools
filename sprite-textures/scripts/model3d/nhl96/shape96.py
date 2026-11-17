"""Shape refinement under the clean texture: vertices move (hill-climb, Laplacian-regularised) to lower the wrong-pixel count
when the model is coloured ONLY by the texture rules. The rules are re-tuned between rounds."""
import numpy as np,sys,pickle,time,ctypes
from clean96 import *
class Shape:
    def __init__(s,cl,pal):
        s.cl=cl;fit=cl.fit;s.fit=fit;n=fit.n;s.tgt=np.zeros((n,MH,MW,3),int);s.body=np.zeros((n,MH,MW),bool);s.empty=np.ones((n,MH,MW),bool);s.pal=pal.astype(int)
        for d,v in enumerate(fit.V):
            pd=fit.pad;sp=FL[v['p']];st=np.isin(v['p'],err96.STK);s.tgt[d,pd:pd+v['h'],pd:pd+v['w']]=pal[sp];s.body[d,pd:pd+v['h'],pd:pd+v['w']]=(sp!=255)&~st;s.empty[d,pd:pd+v['h'],pd:pd+v['w']]=(v['p']==255)
        s.zo=np.zeros((n,MH,MW));s.fid=np.full((n,MH,MW),-1,np.int32);L.set_zout.argtypes=[ctypes.c_void_p];s.cam=fit.cam
    def err(s,Vt):
        fit=s.fit;L.set_zout(s.zo.ctypes.data);old=fit.fid;fit.fid=s.fid;fit.score(Vt,fid=True);fit.fid=old;L.set_zout(None);cov=s.fid>=0
        e=int((s.body&~cov).sum())+int((s.empty&cov).sum());d,ys,xs=np.nonzero(cov&s.body);c=s.cam[d];sx=xs+0.5-c[:,4];sy=ys+0.5-c[:,5];zz=s.zo[d,ys,xs]
        Y=-sy*c[:,2]-zz*c[:,3];w=-sy*c[:,3]+zz*c[:,2];p=np.stack([sx*c[:,0]-w*c[:,1],Y,sx*c[:,1]+w*c[:,0]],1)
        return e+int((s.pal[s.cl.label(p,s.fid[d,ys,xs])]!=s.tgt[d,ys,xs]).any(-1).sum())
def climb2(sh,Vt,F,secs,lam=0.15,sig=0.5,seed=0):
    rng=np.random.default_rng(seed);nb=neighbours(len(Vt),F);Vt=Vt.copy();err=sh.err(Vt);t0=time.time();it=0;acc=0;print('shape start',err,flush=True)
    def lap(i):
        t=0.0
        for j in [i,*nb[i]]:
            if len(nb[j]):t+=((Vt[j]-Vt[nb[j]].mean(0))**2).sum()
        return t
    while time.time()-t0<secs:
        i=rng.integers(len(Vt));old=Vt[i].copy();l0=lap(i);Vt[i]=old+rng.normal(0,sig*(0.3+0.7*rng.random()),3);l1=lap(i);e=sh.err(Vt)
        if e+lam*l1<=err+lam*l0:err=e;acc+=1
        else:Vt[i]=old
        it+=1
        if it%5000==0:print(it,err,acc,'%.0fs'%(time.time()-t0),flush=True)
    return Vt,err
if __name__=='__main__':
    D,fit=load(sys.argv[1]);out=sys.argv[2];rounds=int(sys.argv[3]);secs=float(sys.argv[4]);pal=with_number(pals()['!bfh'],88,fg=np.array([12,0,174]))
    S=samples(D,fit);cl=Clean(D,fit,S);cl.cache(pal);cl.tune(2)
    for r in range(rounds):
        sh=Shape(cl,pal);D['verts'],e=climb2(sh,D['verts'],D['faces'],secs,seed=r);n=np.cross(D['verts'][D['faces'][:,1]]-D['verts'][D['faces'][:,0]],D['verts'][D['faces'][:,2]]-D['verts'][D['faces'][:,0]])
        n/=np.linalg.norm(n,axis=1,keepdims=True)+1e-9;sgn=np.sign((n*cl.nrm).sum(1).mean());cl.nrm=n*sgn;cl.cache(pal);cl.tune(2)
        pickle.dump(dict(D,rules=dict(hem=cl.hem,hemk=cl.hemk,yoke=cl.yoke,misc=cl.misc,pant=cl.pant,par=cl.par,grid=cl.grid,fz=cl.fz,tc=cl.tc)),open(out+'.pkl','wb'))
    cl.sheet(pal,out+'.png');Image.fromarray(np.concatenate([np.concatenate(cl.novel(pal,None,[22.5+45*k for k in range(8)],p),1) for p in (D['phi'],40)],0)).save(out+'_novel.png')
