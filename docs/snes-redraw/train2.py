"""D177 v2 pipeline + validation. Run after analyse.py."""
from facing import *
import sys
GGRP={int(x['frame']):x['spf_group'] for x in rows if x['set']=='G94'}
clf=train()
def dir_of(a,G,n=None):
    if G and n is not None and gdir(n)[0] is not None:return gdir(n)[0]
    return int(clf.predict([feat(a,G)])[0])
P=pairs();data={}
for s,g,grp in P:
    S=sscale(A['S94'][s]);S2,G,iou=align(S,A['G94'][g]);data[(s,g)]=(S2,G,grp,iou)
def XY(S):
    X,_=feats(S);m=binary_dilation(S>0,iterations=2).ravel();return X,m
Xs,Ys=[],[]
for (s,g),(S,G,grp,iou) in data.items():
    if grp in HOLD or iou<0.55:continue
    X,m=XY(S);Xs.append(X[m]);Ys.append(G.ravel()[m])
from sklearn.ensemble import RandomForestClassifier
rf=RandomForestClassifier(200,min_samples_leaf=3,n_jobs=-1,random_state=0).fit(np.concatenate(Xs),np.concatenate(Ys))
def rfconv(S):
    X,m=XY(S);o=np.zeros(S.size,int);o[m]=rf.predict(X[m]);o=o.reshape(S.shape);keep=(S>0)&(o==0);o[keep]=[imap.get(int(v),int(v)) for v in S[keep]];return o
def lib_for(excl_groups):
    L=headlib(exclude={n for n,g in GGRP.items() if g in excl_groups})
    for h in L:
        d=gdir(h['n'])[0];h['dir']=None if h['mir'] else (d if d is not None else dir_of(A['G94'][h['n']],1))
    return [h for h in L if h['dir'] is not None]
def pastehead2(O,S,lib,d):
    hm,f,c=head(S,SK_S,HD_S)
    if hm is None:return O,None
    ys,xs=np.nonzero(hm);y0,x0,y1,x1=ys.min(),xs.min(),ys.max(),xs.max()
    fam=MF(FG[O]);best=None
    for h in lib:
        if h['dir']!=d:continue
        p=h['patch'];ph,pw=p.shape
        for oy in(-2,-1,0,1,2):
            for ox in(-2,-1,0,1,2):
                py=y1+1-ph+oy;px=int(round((x0+x1)/2-(pw-1)/2))+ox
                P=np.zeros_like(S);ok=True
                yy,xx=np.nonzero(p)
                Y,X=yy+py,xx+px
                if Y.min()<0 or X.min()<0 or Y.max()>=S.shape[0] or X.max()>=S.shape[1]:continue
                P[Y,X]=p[yy,xx];cand=P>0;u=cand|hm
                sc=(((P==O)&u).sum()+0.5*((MF(FG[P])==fam)&u).sum())/u.sum()
                if best is None or sc>best[0]:best=(sc,cand,P,h)
    if best is None:return O,None
    sc,cand,P,h=best;O=O.copy();O[hm&~cand]=O[hm&~cand]*0+imap.get(45,42)  # SNES head px not covered by the 94G head -> collar/navy
    O[(hm&~cand)&~binary_dilation(cand)]=0
    O[cand]=P[cand];return O,dict(n=h['n'],dir=h['dir'],score=round(float(sc),2))
def convert2(a,lib,d=None):
    S=sscale(a);d=dir_of(S,0) if d is None else d
    O=rfconv(S);O=smooth(O);O,hd=pastehead2(O,S,lib,d);O=repair(S,O);return S,O,dict(head=hd,dir=d,disc=disconnected(S,O))
def jag(a):
    m=a>0;rows_=[np.nonzero(r)[0] for r in m];st=[];prev=None
    for r in rows_:
        if len(r):
            if prev is not None:st+= [abs(r[0]-prev[0]),abs(r[-1]-prev[1])]
            prev=(r[0],r[-1])
        else:prev=None
    st=np.array(st);return float((st>1).mean()) if len(st) else 0
def score(C,G):
    u=(C>0)|(G>0);ex=(C[u]==G[u]).mean();fm=(FG[C][u]==FG[G][u]).mean();sil=((C>0)&(G>0)).sum()/u.sum();return ex,fm,sil
if __name__=='__main__':
    import pickle
    old_rf,_=pickle.load(open('/tmp/snes_rf.pkl','rb'))
    def oldconv(a):
        S=scale(a);X,_=feats(S);m=binary_dilation(S>0,iterations=2).ravel();o=np.zeros(S.size,int);o[m]=old_rf.predict(X[m]);o=o.reshape(S.shape);k=(S>0)&(o==0);o[k]=[imap.get(int(v),int(v)) for v in S[k]];return S,o
    lib=lib_for(HOLD);R={'old':[],'new':[]};per=[];J={'old':[],'new':[],'real':[]};D={'old':0,'new':0};fac=[0,0,0]
    for s,g,grp in P:
        if grp not in HOLD:continue
        G=A['G94'][g]
        So,Oo=oldconv(A['S94'][s]);Sn,On,info=convert2(A['S94'][s],lib)
        D['old']+=disconnected(So,Oo)>0;D['new']+=info['disc']>0
        a1,_,_=align(Oo,G);a2,G2,_=align(On,G)
        Gc=align(Oo,G)[1];R['old'].append(score(a1,Gc));R['new'].append(score(a2,G2))
        J['old'].append(jag(Oo));J['new'].append(jag(On));J['real'].append(jag(G))
        td=gdir(g)[0]
        if td is not None:fac[0]+=1;fac[1]+=info['dir']==td;fac[2]+=min((info['dir']-td)%8,(td-info['dir'])%8)<=1
        per.append(dict(s=s,g=g,grp=grp,dir=info['dir'],true_dir=td,head=info['head'],disc=info['disc'],old=[round(x,3) for x in R['old'][-1]],new=[round(x,3) for x in R['new'][-1]]))
    M={k:dict(zip(['exact_index','colour_family','silhouette_iou'],np.mean(v,0).round(3).tolist())) for k,v in R.items()}
    M['jagged_step_frac']={k:round(float(np.mean(v)),3) for k,v in J.items()}
    M['frames_with_disconnected_zone']=D;M['n_val']=len(per)
    M['facing']=dict(n=fac[0],exact=fac[1],within_1=fac[2])
    sk=[p for p in per if p['grp']=='skatewp'];M['skatewp_only']=dict(old=np.mean([p['old'] for p in sk],0).round(3).tolist(),new=np.mean([p['new'] for p in sk],0).round(3).tolist(),n=len(sk))
    print(json.dumps(M,indent=1));json.dump(dict(metrics=M,per=per),open('validation2.json','w'),indent=1,default=int)
    pickle.dump((rf,clf),open('/tmp/snes_v2.pkl','wb'))
