import sys,os,json;sys.path.insert(0,'.');sys.path.insert(0,'/workspace/wt-exclusive/NHL-exclusive-sprites-PC-colors/tools')
from sets import *
from conv import *
import joblib,sheet as S
from sheet import paint,legend
import zones as ZN
OUT='out/validation/';os.makedirs(OUT,exist_ok=True)
RAMP={35:'A',36:'A',37:'A',40:'B',41:'B',42:'C',43:'D',44:'D',45:'D',33:'blade',34:'black',38:'skin',39:'skin',46:'stick',47:'shadow'}
ZRGB=np.zeros((64,3),np.uint8)
for k,(n,c) in ZN.Z.items():
    if k:ZRGB[32+k]=c
res={};cells=[];cellsz=[]
for kind in('skater','goalie'):
    mm=joblib.load(f'model_{kind}_train.joblib');tr,te=split(pairs(kind))
    tot=ex=rp=0;tt=tex=trp=0;fb=0
    for n,o in te:
        g,p=aligned_arrays(n,o);pa=np.where(p<0,255,p)
        c,st=convert(pa,mm);fb+=st['fallback']
        m=(g>=33)&(g<=47)&(pa!=255)
        tot+=m.sum();ex+=(c[m]==g[m]).sum()
        r=lambda v:np.array([RAMP.get(int(x),'o') for x in v])
        rp+=(r(c[m])==r(g[m])).sum()
        t=m&(pa>=144)&(pa<=244);tt+=t.sum();tex+=(c[t]==g[t]).sum();trp+=(r(c[t])==r(g[t])).sum()
    res[kind]=dict(pairs=len(te),px=int(tot),exact=round(ex/tot,4),ramp=round(rp/tot,4),team_px=int(tt),team_exact=round(tex/tt,4),team_ramp=round(trp/tt,4),fallback_px=int(fb))
    # sheet cells: every 3rd held-out pair, native PC frame
    for n,o in te[::2]:
        pc=np.asarray(A['PC'][o['pc']]).astype(int);c,_=convert(pc,mm);gr=np.asarray(A['G94'][n]).astype(int)
        e=dict(label=f'94G {n} / PC {pcn(o["pc"])}',tag=kind,imgs=[paint(pc,BOSPC,transp=(255,)),paint(c,GRGB,transp=(0,)),paint(gr,GRGB,transp=(0,))])
        cells.append(e)
        cellsz.append(dict(label=e['label'],tag=kind,imgs=[paint(pc,BOSPC,transp=(255,)),paint(c,ZRGB,transp=(0,)),paint(gr,ZRGB,transp=(0,))]))
json.dump(res,open(OUT+'agreement.json','w'),indent=1);print(json.dumps(res,indent=1))
ROLE={33:'blade',34:'black',35:'A dark',36:'A mid',37:'A light',38:'skin lt',39:'skin dk',40:'B dark',41:'B light',42:'C',43:'D mid',44:'D light',45:'D dark',46:'stick',47:'shadow'}
leg=legend(GRGB,[(k,f'{k} {v}') for k,v in ROLE.items()],'Genesis palette line 2, BOS home',cols=8)
legz=legend(ZRGB,[(k,f'{k} {v}') for k,v in ROLE.items()],'Genesis index colours (zone view, colour-blind safe)',cols=8)
f=S.pages('CHECK on held-out pairs (BOS)',cells,3,leg,OUT+'val_bos',sub='A = 95 PC (BOS)   B = backport   C = real 94G (BOS)',letters='ABC')
f+=S.pages('CHECK on held-out pairs (zone view)',cellsz,3,legz,OUT+'val_zone',sub='A = 95 PC (BOS)   B = backport (zones)   C = real 94G (zones)',letters='ABC')
print(f)
