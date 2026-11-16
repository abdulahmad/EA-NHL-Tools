import sys,numpy as np,json,cma,time
from carve import load,proj,P as LP
from tmpl import *
from scipy import ndimage as ndi
PAD=8;CAP=6.0
# sprite part label -> template class (-1 = don't care)
MAP={LP['helmet']:C['head'],LP['skin']:C['skin'],LP['torso']:C['torso'],LP['crest']:C['torso'],LP['shoulder_patch']:C['torso'],LP['sleeve']:C['sleeve'],
     LP['glove']:C['glove'],LP['pants']:C['pants'],LP['sock']:C['sock'],LP['skate']:C['skate'],LP['skate_blade']:C['skate'],LP['stick']:C['stick']}
def prep(V):
    for v in V:
        lab=np.pad(v['lab'],PAD);fg=np.pad(v['fg'],PAD);cls=np.full(lab.shape,-2,int)   # -2 background, -1 don't care
        cls[fg]=-1
        for k,c in MAP.items(): cls[(lab==k)&fg]=c
        v['cls']=cls;v['dt']=[np.minimum(ndi.distance_transform_edt(cls!=c),CAP) if (cls==c).any() else np.full(cls.shape,CAP) for c in range(len(CL))]
        v['n']=max(1,(cls>=0).sum())
def rast(pts,cls,d,phi,v,off,yaw=None):
    sx,sy,dep=proj(pts[:,0],pts[:,1],pts[:,2],d,phi,yaw)
    px=np.floor(sx+v['a'][0]+off[0]).astype(int)+PAD;py=np.floor(sy+v['a'][1]+off[1]).astype(int)+PAD
    h,w=v['cls'].shape;ok=(px>=0)&(px<w)&(py>=0)&(py<h);o=np.argsort(-dep[ok])
    img=np.full((h,w),-2,int);img[py[ok][o],px[ok][o]]=cls[ok][o];ids=np.full((h,w),-1,int);ids[py[ok][o],px[ok][o]]=np.flatnonzero(ok)[o]
    return img,ids,(~ok).sum()
def viewcost(img,v,nout,skip=()):
    c=nout*CAP*0.05
    for k in range(len(CL)):
        if k in skip:continue
        R=img==k;S=v['cls']==k
        if R.any():
            c+=np.where(v['cls'][R]==-1,0.5,v['dt'][k][R]).sum()
            if S.any(): c+=np.minimum(ndi.distance_transform_edt(~R)[S],CAP).sum()
        elif S.any(): c+=CAP*S.sum()
    return c/v['n']
def cost(x,V,phi,offs,full=False):
    parts,J,p=build(x,0.6);pts=np.concatenate([q['pts'] for q in parts]);cls=np.concatenate([q['cls'] for q in parts])
    cs=[viewcost(*rast(pts,cls,d,phi,v,offs[d])[::2],v) if False else None for d,v in enumerate(V)]
    cs=[]
    for d,v in enumerate(V):
        img,_,nout=rast(pts,cls,d,phi,v,offs[d]);cs.append(viewcost(img,v,nout,v.get('skip',())))
    reg=0
    for sd in 'RL':
        reg+=0.3*abs(J[sd+' ankle'][1]-(p['y0']+2.2))            # skates on the ice
        a,b=J['stick heel'],J['stick butt'];g=J[sd+' glove'];t=np.clip((g-a)@(b-a)/((b-a)@(b-a)),0,1);reg+=0.15*np.linalg.norm(g-(a+t*(b-a)))   # hands on the stick
    reg+=0.02*np.sum(((x-X0)/SIG)**2)/len(x)
    return (np.mean(cs)+reg,cs) if full else np.mean(cs)+reg
def optimise(V,phi,offs,x0=None,sig=0.5,iters=250,seed=1):
    x0=X0 if x0 is None else x0
    es=cma.CMAEvolutionStrategy(np.zeros(len(X0)),sig,dict(popsize=24,maxiter=iters,verbose=-9,seed=seed))
    while not es.stop():
        zs=es.ask();es.tell(zs,[cost(x0+SIG*z,V,phi,offs) for z in zs])
    return x0+SIG*es.result.xbest,es.result.fbest
def fit_offsets(x,V,phi,offs,R=2):
    parts,J,p=build(x,0.6);pts=np.concatenate([q['pts'] for q in parts]);cls=np.concatenate([q['cls'] for q in parts]);new=[]
    for d,v in enumerate(V):
        best=(1e9,None)
        for dx in range(-R,R+1):
            for dy in range(-R,R+1):
                o=offs[d]+(dx,dy);img,_,nout=rast(pts,cls,d,phi,v,o);c=viewcost(img,v,nout,v.get('skip',()))+0.01*(abs(dx)+abs(dy))
                if c<best[0]:best=(c,o)
        new.append(best[1])
    return new
if __name__=='__main__':
    FR=[int(a) for a in sys.argv[1].split(',')];phi=float(sys.argv[2]);out=sys.argv[3]
    V=load(FR);prep(V);offs=[np.zeros(2) for _ in V];x=X0.copy();t=time.time()
    print('start',cost(x,V,phi,offs,True))
    for rnd,(sig,it) in enumerate([(0.6,250),(0.4,250),(0.25,300)]):
        offs=fit_offsets(x,V,phi,offs)
        x,f=optimise(V,phi,offs,x,sig,it,seed=rnd+1)
        c,cs=cost(x,V,phi,offs,True);print(rnd,'%.3f'%c,' '.join('%.2f'%a for a in cs),[tuple(int(a) for a in o) for o in offs],'%.0fs'%(time.time()-t),flush=True)
    json.dump(dict(frames=FR,phi=phi,x=x.tolist(),names=NAMES,offs=[o.tolist() for o in offs]),open(out,'w'))
