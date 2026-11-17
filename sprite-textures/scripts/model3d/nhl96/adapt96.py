"""Adaptive low-poly fit: climb, then split the faces that still cover pixels of more than one zone (longest-edge bisection), repeat.
Edges migrate to the zone boundaries, which is where the original model's polygon edges were."""
import numpy as np,sys,pickle
from scipy import ndimage
import carve96 as C
from poly96 import *
def split(Vt,F,conf,maxsplit):
    F=[tuple(f) for f in F];Vt=[v for v in Vt];order=np.argsort(-conf);used=set();edges={}
    for fi,f in enumerate(F):
        for k in range(3):
            e=tuple(sorted((f[k],f[(k+1)%3])));edges.setdefault(e,[]).append(fi)
    newF=list(F);dead=set();n=0
    for fi in order:
        if conf[fi]<2 or n>=maxsplit:break
        if fi in used:continue
        f=F[fi];P=np.array([Vt[i] for i in f]);ls=[np.linalg.norm(P[k]-P[(k+1)%3]) for k in range(3)];k=int(np.argmax(ls))
        if ls[k]<1.0:continue
        e=tuple(sorted((f[k],f[(k+1)%3])));adj=edges[e]
        if any(a in used for a in adj):continue
        m=len(Vt);Vt.append((Vt[e[0]]+Vt[e[1]])/2)
        for a in adj:
            g=F[a];used.add(a);dead.add(a)
            for j in range(3):
                if tuple(sorted((g[j],g[(j+1)%3])))==e:
                    p,q,r=g[j],g[(j+1)%3],g[(j+2)%3];newF.append((p,m,r));newF.append((m,q,r))
        n+=1
    newF=[f for i,f in enumerate(newF) if i not in dead];return np.ascontiguousarray(np.array(Vt),np.float64),np.ascontiguousarray(np.array(newF),np.int32),n
if __name__=='__main__':
    D=pickle.load(open(sys.argv[1],'rb'));out=sys.argv[2];nf=int(sys.argv[3]);rounds=int(sys.argv[4]);iters=int(sys.argv[5]);V,phi,P=D['V'],D['phi'],D['P']
    for d in range(8):C.YAW[d]=P[d][2]
    pal=pals()['!bfh'];fit=Fit(V,phi,[p[2] for p in P])
    if 'verts' in D:Vt,F=D['verts'],D['faces']
    else:
        G=C.grid(0.5);occ=C.carve(V,phi,1,G,need=8);lab,n=ndimage.label(occ);sz=ndimage.sum(occ,lab,range(1,n+1));occ=lab==(1+int(np.argmax(sz)));Vt,F=init_mesh(occ,G,nf)
    for r in range(rounds):
        fit.bind(F);print('round',r,'faces',len(F),'start',fit.score(Vt),flush=True);Vt,err=climb(fit,Vt,F,iters,seed=r,sig=0.6 if r<2 else 0.4);fit.score(Vt)
        pickle.dump(dict(V=V,phi=phi,P=P,verts=Vt,faces=F,facelab=fit.fl.copy(),rep=fit.rep),open(out+'.pkl','wb'));print('round',r,'end',err,flush=True)
        if r<rounds-1:
            v=fit.votes.reshape(fit.nf,fit.K);conf=v.sum(1)-v.max(1);Vt,F,n=split(Vt,F,conf,200);print('split',n)
    fit.bind(F);sheet(fit,Vt,pal,out+'.png');novel(fit,Vt,pal,out+'_novel.png',phi)
