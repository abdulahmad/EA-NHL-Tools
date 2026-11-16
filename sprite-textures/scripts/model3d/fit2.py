import sys,json,time
from fit import *
SHAPE={'Lt','rh','ws','wh','rxw','rzw','rxc','rzc','Lua','Lfa','rua','rfa','rg','Lth','Lsh','rth','rsh','sbl'}
POSE=np.array([n not in SHAPE for n in NAMES])
def cost1(x,xs,v,d,phi,off,lam=0.15):
    parts,J,p=build(x,0.6);pts=np.concatenate([q['pts'] for q in parts]);cls=np.concatenate([q['cls'] for q in parts])
    img,_,nout=rast(pts,cls,d,phi,v,off);c=viewcost(img,v,nout)
    for sd in 'RL': c+=0.3*abs(J[sd+' ankle'][1]-(p['y0']+2.2))
    return c+lam*np.mean(((x-xs)/SIG)[POSE]**2)
def refine(xs,v,d,phi,off,iters=150,seed=1):
    k=POSE.sum();es=cma.CMAEvolutionStrategy(np.zeros(k),0.4,dict(popsize=16,maxiter=iters,verbose=-9,seed=seed))
    def X(z): x=xs.copy();x[POSE]+=SIG[POSE]*np.asarray(z);return x
    while not es.stop():
        zs=es.ask();es.tell(zs,[cost1(X(z),xs,v,d,phi,off) for z in zs])
    return X(es.result.xbest),es.result.fbest
if __name__=='__main__':
    F=json.load(open(sys.argv[1]));V=load(F['frames']);prep(V);phi=F['phi'];x=np.array(F['x']);offs=[np.array(o) for o in F['offs']];t=time.time()
    # shared pass: the stick is drawn too differently in the straight back / front views to count there
    for d in (0,4): V[d]['skip']=(C['stick'],)
    for rnd in range(2):
        x,f=optimise(V,phi,offs,x,0.3,250,seed=10+rnd);offs=fit_offsets(x,V,phi,offs)
        c,cs=cost(x,V,phi,offs,True);print('shared','%.3f'%c,' '.join('%.2f'%a for a in cs),'%.0fs'%(time.time()-t),flush=True)
    for v in V: v.pop('skip',None)
    XV=[]
    for d,v in enumerate(V):
        xd,f=refine(x,v,d,phi,offs[d],seed=d+1);XV.append(xd.tolist());print(d,'%.3f -> %.3f'%(cost1(x,x,v,d,phi,offs[d]),f),'%.0fs'%(time.time()-t),flush=True)
    F.update(x=x.tolist(),offs=[o.tolist() for o in offs],xv=XV);json.dump(F,open(sys.argv[2],'w'))
