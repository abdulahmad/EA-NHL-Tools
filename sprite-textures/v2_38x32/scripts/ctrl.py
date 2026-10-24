# control-diff harness for a v2 mapping A2 (pixel->v2 texel)
import numpy as np,collections
def setup(NS):
    TF,NSRC,NZ,DIAG=NS['TF'],NS['NSRC'],NS['NZ'],NS['DIAG'];MAG=(252,0,252)
    FAM2={}
    for t,o in NSRC.items():FAM2[t]=TF[o]
    for (x,v),z in NZ.items():
        if (x,v) in FAM2 or tuple(DIAG[v,x])==MAG:continue
        if x in(0,19,20,37) and 18<=v<=20:FAM2[(x,v)]='gear';continue
        c=sorted([t for t in FAM2 if t[1]==v and NZ.get(t)==z],key=lambda t:abs(t[0]-x))
        FAM2[(x,v)]=FAM2[c[0]]
    return FAM2
def control_tex(NS,FAM2,team):
    G=NS['G'];sp=G['ALLP'][team];R=G['ramps'](sp);T=np.zeros((32,38,3),int);T[:]=(252,0,252)
    for (x,v),f in FAM2.items():
        T[v,x]=(0,0,0) if f=='gear' else sp[int(f[3:])] if f.startswith('idx') else R[f]['medium'] if 'medium' in R[f] else R[f]['flat']
    return T,sp,R
def render(NS,n,A2n,T,R,sp):
    G=NS['G'];q,A,LEV,fx=NS['MAPS'][n];TF=NS['TF'];cb=-np.ones(q.shape+(3,),int)
    for p in fx:cb[p]=sp[q[p]]
    for p,(x,v) in A2n.items():
        f=TF[A[p]];c=tuple(int(a) for a in T[v,x])
        cb[p]=sp[q[p]] if f=='gear' else G['shade'](c,f,LEV[p],R)
    return cb
def diff(NS,A2,team):
    FAM2=setup(NS);T,sp,R=control_tex(NS,FAM2,team);out={};imgs={}
    for n in NS['FR']:
        q,A,_,_=NS['MAPS'][n];cb=render(NS,n,A2[n],T,R,sp);m=q!=255;bad=collections.Counter();badp=[]
        for y,x in zip(*np.nonzero(m)):
            if tuple(cb[y,x])!=tuple(sp[q[y,x]]):
                p=(y,x);z=NS['ozone'](*A[p]) if p in A else 'fixed';bad[z]+=1;badp.append(p)
        occ=int(((cb>=0).all(2)!=m).sum())
        out[n]=dict(diff=sum(bad.values()),occ=occ,zones=dict(bad));imgs[n]=(cb,badp)
    return out,imgs,T
