"""Two-pose shape refinement: one rest shape, skinned by the rig, must match the standing sprites (rest pose) and a second pose's
sprites (fitted joint angles) at the same time. Texture rules stay fixed. This is what separates limbs that one pose cannot show."""
import numpy as np,sys,pickle,time
from rig96 import *
def climb_joint(rig,fits,secs,lam=0.15,sig=0.5,seed=0):
    rng=np.random.default_rng(seed);nb=neighbours(len(rig.V0),rig.F);V=rig.V0;tot=lambda:sum(pf.err(x) for pf,x in fits);err=tot();t0=time.time();it=acc=0;print('joint start',err,flush=True)
    def lap(i):
        t=0.0
        for j in [i,*nb[i]]:
            if len(nb[j]):t+=((V[j]-V[nb[j]].mean(0))**2).sum()
        return t
    while time.time()-t0<secs:
        i=rng.integers(len(V));old=V[i].copy();l0=lap(i);V[i]=old+rng.normal(0,sig*(0.3+0.7*rng.random()),3);l1=lap(i);e=tot()
        if e+lam*l1<=err+lam*l0:err=e;acc+=1
        else:V[i]=old
        it+=1
    print('joint end',err,'iterations',it,'accepted',acc,flush=True);return err
if __name__=='__main__':
    D,cl,rig=setup_rig(sys.argv[1]);pal=with_number(pals()['!bfh'],88,fg=np.array([12,0,174]));yaw=[p[2] for p in D['P']];i1=int(sys.argv[2]);x1=pickle.load(open(sys.argv[3],'rb'))['x'];out=sys.argv[4];rounds=int(sys.argv[5]);secs=float(sys.argv[6])
    pa=PoseFit(rig,D['V'],D['phi'],yaw,pal);xa=np.zeros(NX);pb=PoseFit(rig,C.views(i1),D['phi'],yaw,pal);print('standing',pa.err(xa),'second pose',pb.err(x1))
    for r in range(rounds):
        climb_joint(rig,[(pa,xa),(pb,x1)],secs,seed=r);x1,e=arm_search(pb,x1);x1,e=fit_pose(pb,x1,45,seed=r,log=False);print('round',r,'standing',pa.err(xa),'second pose',e,flush=True)
        pickle.dump(dict(V0=rig.V0,x=x1,i0=i1),open(out+'.pkl','wb'))
    L_=D['rules']['light'];sheet(pa,xa,pal,out+'_standing.png',L_);sheet(pb,x1,pal,out+'_pose.png',L_)
