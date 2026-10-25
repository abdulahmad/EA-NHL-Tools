import pickle,numpy as np
F=pickle.load(open('feat.pkl','rb'));K=F['K'];V=F['V'];Vm=F['Vm'];HW=F['HW']
sets=sorted(set(k[0] for k in K));idx={t:[i for i,k in enumerate(K) if k[0]==t] for t in sets}
def shifted(X,dx):
    Y=X.reshape(len(X),4,32,32);return np.roll(Y,dx,axis=3).reshape(len(X),4,-1)
def score(ia,ib):
    a=V[ia];best=None;arg=None
    for mi,B0 in enumerate((V[ib],Vm[ib])):
        for dx in (-1,0,1):
            B=shifted(B0,dx);inter=a[:,0]@B[:,0].T
            ua=a[:,0].sum(1)[:,None]+B[:,0].sum(1)[None]-inter
            agree=sum(a[:,k]@B[:,k].T for k in (1,2,3))/np.maximum(inter,1)
            s=0.5*inter/np.maximum(ua,1)+0.5*agree
            if best is None:best=s;arg=np.full(s.shape,mi)
            else:upd=s>best;best=np.where(upd,s,best);arg=np.where(upd,mi,arg)
    ha=HW[ia,0][:,None].astype(float);hb=HW[ib,0][None].astype(float);r=np.minimum(ha,hb)/np.maximum(ha,hb)
    best=best*np.minimum(1,r/0.75)
    return best,arg,hb/ha
out={}
for ta in sets:
    for tb in sets:
        if ta==tb:continue
        s,m,sc=score(idx[ta],idx[tb]);j=s.argmax(1)
        A=[K[i][1] for i in idx[ta]];B=[K[i][1] for i in idx[tb]]
        out[(ta,tb)]=dict(A=A,B=B,best=[B[x] for x in j],score=s.max(1),mir=m[np.arange(len(j)),j],scale=sc[np.arange(len(j)),j],S=s.astype(np.float16))
        print(ta,tb,np.histogram(s.max(1),[0,.5,.6,.7,.75,.8,.85,.9,1.01])[0],flush=True)
pickle.dump(out,open('match.pkl','wb'))
