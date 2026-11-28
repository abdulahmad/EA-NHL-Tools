import sys;sys.path.insert(0,'/workspace/snes-to-pc')
from s2g import *
import json,time,collections
from conv import FG   # genesis family per index
FG=FG.copy();FG[46]=5
P=pickle.load(open('pairs.pkl','rb'))
imap={int(k):v for k,v in json.load(open('/workspace/snesredraw/analysis.json'))['imap'].items()}
def score(C,G):
    u=(C>0)|(G>0);i=(C>0)&(G>0)
    return dict(exact_union=(C[u]==G[u]).mean(),fam_union=(FG[C][u]==FG[G][u]).mean(),sil=i.sum()/u.sum(),exact_inter=(C[i]==G[i]).mean(),fam_inter=(FG[C][i]==FG[G][i]).mean(),npx_ratio=(C>0).sum()/(G>0).sum())
def base(S):return np.array([[imap.get(int(v),int(v)) if v else 0 for v in r] for r in S])
if __name__=='__main__':
    ok=[p for p in P if p['iou']>=0.7]
    grps=sorted(set(p['grp'] for p in ok));folds=[grps[i::5] for i in range(5)]
    res=collections.defaultdict(list)
    for f in folds:
        tr=[(p['S'],p['G'],p['cat']=='goalie') for p in ok if p['grp'] not in f];t=time.time()
        rf=train(tr)
        for p in ok:
            if p['grp'] in f:
                gl=p['cat']=='goalie'
                C=predict(rf,p['S'],gl);res['rf'].append((p['s'],p['cat'],score(C,p['G'])))
                res['slotmap'].append((p['s'],p['cat'],score(base(p['S']),p['G'])))
        print('fold',f[:3],time.time()-t,flush=True)
    for k,v in res.items():
        for cat in ('all','player','goalie'):
            rr=[s for _,c,s in v if cat=='all' or c==cat or (cat=='player' and c=='celebration')]
            print(k,cat,len(rr),{kk:round(float(np.mean([r[kk] for r in rr])),3) for kk in rr[0]})
