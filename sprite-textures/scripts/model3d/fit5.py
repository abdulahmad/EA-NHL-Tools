"""Refit after a template change: start from an older fit (matched by parameter name), then shape + per-frame poses."""
import sys,json,time
from multiprocessing import Pool
from fit3 import *
SH=~POSE
def one(a):
    n,d,x0,off,iters,seed=a;v=load([n])[0];prep([v]);x,f=refine(np.array(x0),v,d,PHI,off,iters=iters,seed=seed);return x.tolist(),f
def vc(x,v,d,off):
    parts,J,p=build(x,0.6);pts=np.concatenate([q['pts'] for q in parts]);cls=np.concatenate([q['cls'] for q in parts])
    k=cls!=C['stick'];img,_,nout=rast(pts[k],cls[k],d,PHI,v,off);return viewcost(img,v,nout,(C['stick'],))
PHI=25.0
if __name__=='__main__':
    F=json.load(open(sys.argv[1]));t=time.time();old=F['names']
    def conv(xo):
        m=dict(zip(old,xo));return np.array([m.get(n,X0[i]) for i,n in enumerate(NAMES)])
    x=conv(F['x']);XV=[conv(a) for a in F['xv']];fr=F['frames'];dr=F['dirs'];offs=F['offs']
    V=load(fr);prep(V);i0=fr.index(370)
    DEPTH=np.array([n in ('rzw','rzc') for n in NAMES])
    z,f=cma_fit(lambda z:cost1(x+SIG*z*~DEPTH,x,V[i0],4,PHI,(0,0),lam=0.0)+0.03*np.mean(z**2),len(x),0.4,220,seed=1);x=x+SIG*z*~DEPTH
    print('front','%.3f'%f,'%.0fs'%(time.time()-t),flush=True)
    for rnd,(iters,sit) in enumerate([(140,110),(90,0)]):
        for a in XV:a[SH]=x[SH]
        XV[i0]=x.copy()
        with Pool(4) as p:R=p.map(one,[(fr[i],dr[i],XV[i].tolist(),offs[i],iters,i+1+10*rnd) for i in range(len(fr))])
        XV=[np.array(r[0]) for r in R];print('poses',rnd,' '.join('%.2f'%r[1] for r in R),'%.0fs'%(time.time()-t),flush=True)
        if not sit:break
        use=[i for i in range(len(fr)) if i>=8 or dr[i] in (2,6)]
        def shp(z):
            c=0
            for i in use:
                y=XV[i].copy();y[SH]=x[SH]+SIG[SH]*z;c+=vc(y,V[i],dr[i],offs[i])
            return c/len(use)+0.02*np.mean(z**2)
        b=shp(np.zeros(SH.sum()));z,f=cma_fit(shp,SH.sum(),0.3,sit,pop=16);x[SH]+=SIG[SH]*z
        print('shape %.3f -> %.3f'%(b,f),dict(zip(np.array(NAMES)[SH],np.round(x[SH],2))),'%.0fs'%(time.time()-t),flush=True)
    xr=XV[i0]
    F.update(x=xr.tolist(),xv=[a.tolist() for a in XV],names=NAMES);json.dump(F,open(sys.argv[2],'w'));print('done')
