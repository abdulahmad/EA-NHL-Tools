import sys,json,time
from fit2 import *
def cma_fit(f,k,sig,iters,pop=24,seed=1):
    es=cma.CMAEvolutionStrategy(np.zeros(k),sig,dict(popsize=pop,maxiter=iters,verbose=-9,seed=seed))
    while not es.stop():
        zs=es.ask();es.tell(zs,[f(np.asarray(z)) for z in zs])
    return np.asarray(es.result.xbest),es.result.fbest
def setp(x,**kw):
    x=x.copy()
    for k,v in kw.items():x[NAMES.index(k)]=v
    return x
if __name__=='__main__':
    G=json.load(open(sys.argv[1]));phi=G['phi'];xg=np.array(G['x']);t=time.time()
    CT=load([370,185]);prep(CT);front,back=CT
    # 1) standing front control: shape + pose, starting upright
    xs0=setp(xg,hp=13.5,zp=0,lean=6,hy=3,hz=0.5,Ra1=5,Ra2=12,Rf1=15,Rf2=5,La1=5,La2=12,Lf1=15,Lf2=5,Rb1=8,Rb2=8,Rc1=-4,Rc2=0,Lb1=8,Lb2=8,Lc1=-4,Lc2=0,
             shx=7,shz=1,sa1=85,sa2=0,sL=22,sba=0,tx=0,y0=0,rua=1.8,Lth=6,Lsh=6.5)
    DEPTH=np.array([n in ('rzw','rzc') for n in NAMES])   # not visible from the front: keep the glide values
    best=(1e9,None)
    for seed in (1,2,3):
        z,f=cma_fit(lambda z:cost1(xs0+SIG*z*~DEPTH,xs0,front,4,phi,(0,0),lam=0.0)+0.03*np.mean(z**2),len(xs0),0.5,350,seed=seed)
        print('front seed',seed,'%.3f'%f,'%.0fs'%(time.time()-t),flush=True)
        if f<best[0]:best=(f,xs0+SIG*z*~DEPTH)
    xf=best[1]
    # 2) back control (arms up): pose only
    xb0=setp(xf,Ra1=0,Ra2=80,Rf1=0,Rf2=150,La1=0,La2=80,Lf1=0,Lf2=150,sa1=60,sa2=30,shx=0,shz=-2,sL=24)
    def Xp(x0,z): x=x0.copy();x[POSE]+=SIG[POSE]*z;return x
    best=(1e9,None)
    for seed in (1,2,3):
        z,f=cma_fit(lambda z:cost1(Xp(xb0,z),xb0,back,0,phi,(0,0),lam=0.0)+0.03*np.mean(z**2),POSE.sum(),0.6,300,pop=20,seed=seed)
        print('back seed',seed,'%.3f'%f,'%.0fs'%(time.time()-t),flush=True)
        if f<best[0]:best=(f,Xp(xb0,z))
    xb=best[1]
    # 3) glide views again with the new shape
    V=load(G['frames']);prep(V);offs=[np.array(o) for o in G['offs']];XV=[]
    for d,v in enumerate(V):
        x0=np.array(G['xv'][d]);x0[~POSE]=xf[~POSE]
        xd,f=refine(x0,v,d,phi,offs[d],iters=150,seed=d+1);XV.append(xd.tolist());print('glide',d,'%.3f'%f,'%.0fs'%(time.time()-t),flush=True)
    json.dump(dict(phi=phi,frames=G['frames']+[370,185],dirs=list(range(8))+[4,0],x=xf.tolist(),xv=XV+[xf.tolist(),xb.tolist()],
                   offs=[o.tolist() for o in offs]+[[0,0],[0,0]],names=NAMES),open(sys.argv[2],'w'))
