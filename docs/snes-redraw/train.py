from conv import *
FG[46]=5
import json,pickle
from sklearn.ensemble import RandomForestClassifier
from scipy.ndimage import binary_dilation
HOLD={'skatewp','hook','stop','duck'}
imap={int(k):v for k,v in json.load(open('analysis.json'))['imap'].items()}
P=pairs();data={}
for s,g,grp in P:
    S,G,iou=align(scale(A['S94'][s]),A['G94'][g]);data[(s,g)]=(S,G,grp,iou)
def XY(S,G=None):
    X,_=feats(S);m=binary_dilation(S>0,iterations=2).ravel()
    return X,m
Xs,Ys=[],[]
for (s,g),(S,G,grp,iou) in data.items():
    if grp in HOLD or iou<0.55:continue
    X,m=XY(S);Xs.append(X[m]);Ys.append(G.ravel()[m])
X=np.concatenate(Xs);Y=np.concatenate(Ys);print('train px',len(Y))
rf=RandomForestClassifier(200,min_samples_leaf=3,n_jobs=-1,random_state=0).fit(X,Y)
pickle.dump((rf,imap),open('/tmp/snes_rf.pkl','wb'))
def convert(S):
    X,m=XY(S);o=np.zeros(S.size,int);o[m]=rf.predict(X[m]);o=o.reshape(S.shape);keep=(S>0)&(o==0);o[keep]=[imap.get(int(v),int(v)) for v in S[keep]];return o
def base(S):return np.vectorize(lambda v:imap.get(int(v),v) if v else 0)(S)
def score(C,G):
    u=(C>0)|(G>0);ex=(C[u]==G[u]).mean()
    rgb=lambda a:np.where(a[...,None]>0,GP[a],-1)
    exc=(np.all(rgb(C)[u]==rgb(G)[u],-1)).mean()
    fm=(FG[C][u]==FG[G][u]).mean();sil=((C>0)&(G>0)).sum()/u.sum()
    return ex,exc,fm,sil
res={'baseline':[],'rf':[]};per=[]
for (s,g),(S,G,grp,iou) in data.items():
    if grp not in HOLD:continue
    b=score(base(S),G);r=score(convert(S),G);res['baseline'].append(b);res['rf'].append(r);per.append((s,g,grp,iou,b,r))
out={k:dict(zip(['exact_index','exact_colour','colour_family','silhouette_iou'],np.mean(v,0).round(3).tolist())) for k,v in res.items()}
out['n_val']=len(per);out['n_train_frames']=sum(1 for v in data.values() if v[2] not in HOLD and v[3]>=0.55)
print(json.dumps(out,indent=1))
json.dump(dict(metrics=out,per=[(a,b,c,round(d,3),[round(x,3) for x in e],[round(x,3) for x in f]) for a,b,c,d,e,f in per]),open('validation.json','w'),indent=1)
pickle.dump(data,open('/tmp/snes_pairs.pkl','wb'))
