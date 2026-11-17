"""Shared fit on several poses: the part sizes and positions (one set for all poses) are tuned on the summed wrong pixels of the
fit poses, each with its own joint angles; a pose that takes no part in the tuning is scored before and after as the check."""
import numpy as np,sys,pickle,time
from rigparts96 import *
def tune_shared(rig,fits,th,rounds=2):
    pt=rig.pt;th=th.copy()
    def f(t):rig.set(t);return sum(pf.err(x) for pf,x in fits)
    best=f(th);print('shared tune start',best,flush=True)
    for r in range(rounds):
        for scale in (1.0,0.5):
            for i in range(len(th)):
                for sg in (1,-1):
                    while True:
                        old=th[i];new=np.clip(old+sg*pt.step[i]*scale,pt.lo[i],pt.hi[i])
                        if new==old:break
                        th[i]=new;e=f(th)
                        if e<best:best=e
                        else:th[i]=old;break
        rng=np.random.default_rng(r)
        for _ in range(600):
            n,i,k=pt.names[rng.integers(len(pt.names))];y=th.copy();y[i:i+k]=np.clip(y[i:i+k]+rng.normal(0,1,k)*pt.step[i:i+k]*rng.choice([0.5,1,2,3]),pt.lo[i:i+k],pt.hi[i:i+k]);e=f(y)
            if e<best:best=e;th=y
        print('shared tune round',r,best,flush=True)
    rig.set(th);return th,best
if __name__=='__main__':
    D,cl,rig,th=make(sys.argv[1],sys.argv[2]);pal=with_number(pals()['!bfh'],88,fg=np.array([12,0,174]));yaw=[p[2] for p in D['P']];out=sys.argv[3];held=int(sys.argv[4]);train=[int(a) for a in sys.argv[5:]];L_=D['rules']['light']
    known=pickle.load(open('rp.pkl','rb')) if os.path.exists('rp.pkl') else {}
    mk=lambda i0:PoseFit(rig,D['V'] if i0==8 else C.views(i0),D['phi'],yaw,pal)
    ph=mk(held);xh,eh=fit_one(ph,200);print('held-out pose',held,'before shared fit: %d wrong (%.1f%%)'%(eh,100*eh/ph.nb),flush=True);sheet(ph,xh,pal,'%s_held_before.png'%out,L_)
    fits=[]
    for i0 in train:
        pf=mk(i0)
        if i0==8:x=np.zeros(NX);e=pf.err(x)
        elif i0 in known:x,e=fit_pose(pf,known[i0],30,log=False)
        else:x,e=fit_one(pf,200)
        fits.append([pf,x]);print('fit pose',i0,'%d wrong (%.1f%%)'%(e,100*e/pf.nb),flush=True)
    for rnd in range(2):
        th,e=tune_shared(rig,fits,th,1)
        for ft,i0 in zip(fits,train):
            if i0!=8:ft[1],e=fit_pose(ft[0],ft[1],40,seed=rnd,log=False)
            print('round',rnd,'pose',i0,'%.1f%%'%(100*ft[0].err(ft[1])/ft[0].nb),flush=True)
        pickle.dump(dict(th=th,poses={i0:ft[1] for ft,i0 in zip(fits,train)}),open(out+'.pkl','wb'))
    xh2,eh2=fit_one(ph,200);xh3,eh3=fit_pose(ph,xh,60,log=False)
    if eh3<eh2:xh2,eh2=xh3,eh3
    print('held-out pose',held,'after shared fit: %d wrong (%.1f%%)'%(eh2,100*eh2/ph.nb),flush=True);sheet(ph,xh2,pal,'%s_held_after.png'%out,L_)
    for ft,i0 in zip(fits,train):sheet(ft[0],ft[1],pal,'%s_%d.png'%(out,i0),L_)
    pickle.dump(dict(th=th,poses={i0:ft[1] for ft,i0 in zip(fits,train)},held={held:xh2}),open(out+'.pkl','wb'))
