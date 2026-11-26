import sys,json,time
from fit3 import *
EXTRA=[(289,4),(290,4),(291,4),(305,0),(306,0),(307,0),(313,2),(329,6)]
SH=~POSE
def posefit(x0s,v,d,phi,iters=260):
    best=(1e9,None)
    for k,x0 in enumerate(x0s):
        z,f=cma_fit(lambda z:cost1(Xp(x0,z),x0,v,d,phi,(0,0),lam=0.0)+0.03*np.mean(z**2),POSE.sum(),0.7,iters,pop=20,seed=k+1)
        if f<best[0]:best=(f,Xp(x0,z))
    return best
def Xp(x0,z): x=x0.copy();x[POSE]+=SIG[POSE]*z;return x
def vc(x,v,d,phi,off):
    parts,J,p=build(x,0.6);pts=np.concatenate([q['pts'] for q in parts]);cls=np.concatenate([q['cls'] for q in parts])
    img,_,nout=rast(pts,cls,d,phi,v,off);return viewcost(img,v,nout,(C['stick'],))
if __name__=='__main__':
    F=json.load(open(sys.argv[1]));phi=F['phi'];xf=np.array(F['x']);t=time.time()
    E=load([n for n,_ in EXTRA]);prep(E)
    spread=setp(xf,Ra2=70,Rf2=70,La2=70,Lf2=70,Rb2=25,Lb2=25,Ra1=0,La1=0,Rf1=0,Lf1=0)
    XE=[]
    for (n,d),v in zip(EXTRA,E):
        f,x=posefit([xf,spread],v,d,phi);XE.append(x);print(n,d,'%.3f'%f,'%.0fs'%(time.time()-t),flush=True)
    # joint shape refinement over the clean frames (controls + falls), poses fixed
    CT=load([370,185]);prep(CT);views=[(CT[0],4,np.array(F['xv'][8])),(CT[1],0,np.array(F['xv'][9]))]+[(v,d,x) for (n,d),v,x in zip(EXTRA,E,XE)]
    def shp(z):
        c=0
        for v,d,x in views:
            y=x.copy();y[SH]=xf[SH]+SIG[SH]*z;c+=vc(y,v,d,phi,(0,0))
        return c/len(views)+0.01*np.mean(z**2)
    print('shape before','%.3f'%shp(np.zeros(SH.sum())),flush=True)
    z,f=cma_fit(shp,SH.sum(),0.4,160,pop=16);print('shape after','%.3f'%f,'%.0fs'%(time.time()-t),flush=True)
    xn=xf.copy();xn[SH]=xf[SH]+SIG[SH]*z;print(dict(zip(np.array(NAMES)[SH],np.round(xn[SH],2))))
    # poses again with the new shape (short)
    V=load(F['frames']);prep(V);XV=[]
    for i,v in enumerate(V):
        x0=np.array(F['xv'][i]);x0[SH]=xn[SH];xd,f=refine(x0,v,F['dirs'][i],phi,F['offs'][i],iters=90,seed=i+1);XV.append(xd.tolist())
    for (n,d),v,x in zip(EXTRA,E,XE):
        x0=x.copy();x0[SH]=xn[SH];xd,f=refine(x0,v,d,phi,(0,0),iters=90,seed=n);XV.append(xd.tolist());print(n,'%.3f'%f,flush=True)
    xr=np.array(XV[8]);
    json.dump(dict(phi=phi,frames=F['frames']+[n for n,_ in EXTRA],dirs=F['dirs']+[d for _,d in EXTRA],x=xr.tolist(),xv=XV,offs=F['offs']+[[0,0]]*len(EXTRA),
                   wts=[1]*8+[3,3]+[2]*len(EXTRA),names=NAMES),open(sys.argv[2],'w'));print('done','%.0fs'%(time.time()-t))
