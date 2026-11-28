import sys;sys.path.insert(0,'.')
from feat import *
import joblib,collections,json
from sklearn.ensemble import HistGradientBoostingClassifier
G94CLS=list(range(33,48))
def dataset(prs):
    Xs=[];ys_=[];meta=[]
    for n,o in prs:
        g,p=aligned_arrays(n,o)
        ys,xs,X=feats(p)
        gv=g[ys,xs]
        ok=(gv>=33)&(gv<=47)
        Xs.append(X[ok]);ys_.append(gv[ok]);meta+= [(n)]*int(ok.sum())
    return np.concatenate(Xs),np.concatenate(ys_),np.array(meta)
def learn_allow(X,y,thr=0.02):
    C=collections.defaultdict(collections.Counter)
    for pi,gi in zip(X[:,0].astype(int),y):C[pi][int(gi)]+=1
    A_={}
    for pi,c in C.items():
        t=sum(c.values());A_[pi]={g for g,v in c.items() if v/t>=thr}
    return A_,{pi:sum(c.values()) for pi,c in C.items()},C
def fit(X,y):
    m=HistGradientBoostingClassifier(max_iter=80,learning_rate=0.15,max_leaf_nodes=31,min_samples_leaf=15,l2_regularization=1.0,
        categorical_features=CATIDX,random_state=0,early_stopping=False)
    m.fit(X,y);return m
def predict(m,allow,cnt,X,minn=30):
    pr=m.predict_proba(X);cl=m.classes_;pi=X[:,0].astype(int)
    out=np.zeros(len(X),int)
    for i in range(len(X)):
        a=allow.get(pi[i]) if cnt.get(pi[i],0)>=minn else None
        p=pr[i].copy()
        if a:
            mask=np.array([c in a for c in cl]);
            if mask.any():p=np.where(mask,p,-1)
        out[i]=cl[int(np.argmax(p))]
    return out
if __name__=='__main__':
    res={}
    for kind in('skater','goalie'):
        ps=pairs(kind);tr,te=split(ps)
        Xtr,ytr,_=dataset(tr);Xte,yte,mte=dataset(te)
        allow,cnt,C=learn_allow(Xtr,ytr)
        # baseline A0: majority per pc index
        maj={pi:c.most_common(1)[0][0] for pi,c in C.items()}
        a0=np.array([maj.get(int(pi),44) for pi in Xte[:,0]])
        m=fit(Xtr,ytr)
        yp=predict(m,allow,cnt,Xte)
        yp_raw=m.predict(Xte)
        RAMP={35:'A',36:'A',37:'A',40:'B',41:'B',42:'C',43:'D',44:'D',45:'D',33:'blade',34:'black',38:'skin',39:'skin',46:'stick',47:'shadow'}
        cls=lambda v:np.array([RAMP[int(x)] for x in v])
        team=(Xte[:,0]>=144)&(Xte[:,0]<=244)
        r=dict(n_train_px=len(ytr),n_test_px=len(yte),n_test_pairs=len(te),n_test_team_px=int(team.sum()),
            A0_exact=float((a0==yte).mean()),A0_ramp=float((cls(a0)==cls(yte)).mean()),
            model_exact=float((yp==yte).mean()),model_ramp=float((cls(yp)==cls(yte)).mean()),model_raw_exact=float((yp_raw==yte).mean()),
            A0_team_exact=float((a0==yte)[team].mean()),A0_team_ramp=float((cls(a0)==cls(yte))[team].mean()),
            model_team_exact=float((yp==yte)[team].mean()),model_team_ramp=float((cls(yp)==cls(yte))[team].mean()))
        res[kind]=r;print(kind,json.dumps(r,indent=1))
        joblib.dump(dict(m=m,allow=allow,cnt=cnt),f'model_{kind}_train.joblib')
    json.dump(res,open('eval_heldout.json','w'),indent=1)
