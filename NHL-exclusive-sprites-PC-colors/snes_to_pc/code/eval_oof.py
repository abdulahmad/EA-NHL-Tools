import sys;sys.path.insert(0,'/workspace/snes-to-pc')
from s2g import *
from pcexp import *
import percolor,pickle,json,collections
from stripes3d import FL
from percolor import pcfam
from fam import score,FG
P=pickle.load(open('pairs.pkl','rb'));ok=[p for p in P if p['iou']>=0.7]
grps=sorted(set(p['grp'] for p in ok));folds=[grps[i::5] for i in range(5)]
OOF={}
for f in folds:
    rf=train([(p['S'],p['G'],p['cat']=='goalie') for p in ok if p['grp'] not in f])
    for p in ok:
        if p['grp'] in f:
            o=convert_core(rf,p['S'],p['cat']=='goalie');o,_=add_eye(o);OOF[p['s']]=o
pickle.dump(OOF,open('oof_B.pkl','wb'))
te_sk=set(n for n,o in percolor.split(percolor.pairs('skater'))[1]);te_go=set(n for n,o in percolor.split(percolor.pairs('goalie'))[1])
PR=percolor.PR
def z(v):return pcfam(v) if 144<=v<=191 else v
def agree(C,E):
    m=(C!=255)&(E>=0);ys,xs=np.nonzero(m)
    if not len(ys):return np.zeros(4)
    return np.array([sum(tuple(FL[C[y,x]])==tuple(FL[E[y,x]]) for y,x in zip(ys,xs)),sum(z(C[y,x])==z(E[y,x]) for y,x in zip(ys,xs)),int((C[m]==E[m]).sum()),len(ys)],float)
res=collections.defaultdict(lambda:collections.defaultdict(lambda:np.zeros(4)));per={}
trip=triples()
F3L='/workspace/g94-to-pc-zones/v5/final3l/npy/'
for r in trip.itertuples():
    g=r.g94
    if g not in PR or PR[g]['pc']!=r.pc_shown+1 or PR[g]['iou']<0.97:continue
    kind='sk' if g in te_sk else 'go' if g in te_go else None
    if kind is None or r.s94 not in OOF:continue
    G,E=percolor.aligned_arrays(g,PR[g]);G=G.astype(int)
    B=OOF[r.s94];Cb=convert_93(B).astype(int);Cg=convert_93(G).astype(int)
    a1=agree(Cb,E);a2=agree(Cg,E)
    import os
    h=None
    if os.path.exists(F3L+f'g94_{g}_pcidx.npy'):h=agree(np.load(F3L+f'g94_{g}_pcidx.npy').astype(int),E)
    cat=kind
    res[cat]['e2e']+=a1;res[cat]['g2pc_nojoint']+=a2
    if h is not None:res[cat]['g2pc_hybrid_joints']+=h
    res[cat]['snes2g']+=np.array([0,0,0,0])
    per[r.s94]=dict(g=g,pc=r.pc_shown,kind=kind,e2e=a1.tolist(),g2pc=a2.tolist(),hyb=None if h is None else h.tolist(),s2g=score(B,G))
pickle.dump(per,open('oof_eval_per.pkl','wb'))
out={}
for cat,d in res.items():
    out[cat]={k:dict(vs_pc_same_colour=round(100*v[0]/max(v[3],1),1),zone_aware=round(100*v[1]/max(v[3],1),1),exact_index=round(100*v[2]/max(v[3],1),1),px=int(v[3])) for k,v in d.items() if v[3]>0}
    out[cat]['n_frames']=sum(1 for p in per.values() if p['kind']==cat)
# step 1 numbers for the same triples
for cat in ('sk','go'):
    ss=[p['s2g'] for p in per.values() if p['kind']==cat];out[cat]['snes2g_mean']={k:round(float(np.mean([s[k] for s in ss])),3) for k in ss[0]}
print(json.dumps(out,indent=1));json.dump(out,open('oof_eval.json','w'),indent=1)
