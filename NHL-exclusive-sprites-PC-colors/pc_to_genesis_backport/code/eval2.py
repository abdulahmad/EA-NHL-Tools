import sys;sys.path.insert(0,'.')
from train import *
RAMP={35:'A',36:'A',37:'A',40:'B',41:'B',42:'C',43:'D',44:'D',45:'D',33:'blade',34:'black',38:'skin',39:'skin',46:'stick',47:'shadow'}
out={}
for kind in('skater','goalie'):
    mm=joblib.load(f'model_{kind}_train.joblib');ps=pairs(kind);tr,te=split(ps)
    Xte,yte,mte=dataset(te);yp=predict(mm['m'],mm['allow'],mm['cnt'],Xte)
    fam=np.array([FAMS[FAMLUT[int(i)]] for i in Xte[:,0]])
    rows={}
    for f in sorted(set(fam)):
        k=fam==f
        rows[f]=dict(px=int(k.sum()),exact=round(float((yp==yte)[k].mean()),3),ramp=round(float((np.array([RAMP[int(v)] for v in yp])==np.array([RAMP[int(v)] for v in yte]))[k].mean()),3))
    # per pair
    pp={}
    for n in sorted(set(mte)):
        k=mte==n;pp[int(n)]=round(float((yp==yte)[k].mean()),3)
    out[kind]=dict(by_family=rows,per_pair=pp)
    print(kind);[print(' ',f,r) for f,r in rows.items()]
json.dump(out,open('eval_by_family.json','w'),indent=1)
