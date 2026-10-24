# Decision 1: widen FR/BR glove blocks 3->4 cols by taking pants col 3 (front) / col 34 (back) on glove rows 18-20 only
import os,sys,collections,json,numpy as np
sys.path.insert(0,'/workspace/preview_v2/mapped');import ctrl
WIDE=int(os.environ.get('WIDE','1'))
STEAL={(3,v):'FR' for v in (18,19,20)}|{(34,v):'BR' for v in (18,19,20)}
_setup=ctrl.setup
def setup2(NS):
    F=_setup(NS)
    if WIDE:
        for t,z in STEAL.items():F[t]='gear';NS['NZ'][t]=z
    return F
ctrl.setup=setup2
os.environ['PARTS']='socks,helmet,skates,gloves'
s=open('/workspace/preview_v2/mapped/v2map3.py').read();s=s[:s.index('# ---- verification')];NS={};exec(s,NS)
MAPS,TF,FR,A2,NZ,FAM2=NS['MAPS'],NS['TF'],NS['FR'],NS['A2'],NS['NZ'],NS['FAM2'];oz=NS['ozone']
assert all(FAM2[t]=='gear' for t in STEAL) or not WIDE
def share(cat):
    out={}
    for n in FR:
        A=MAPS[n][1];c=collections.Counter(A2[n][p] for p in A if cat(p,A[p]))
        out[n]=(sum(c.values()),len(c),sum(1 for k in c.values() if k>1))
    return out
isg=lambda p,a:TF[a]=='gear' and oz(*a) in('FR','FL','BL','BR')
isp=lambda p,a:oz(*a) in('pantsF','pantsB') and a[1] in(18,19,20)
G,P=share(isg),share(isp)
TEAMS=[('HOME.json','tor'),('AWAY.json','nyr'),('HOME.json','chi'),('AWAY.json','chi'),('HOME.json','mtl')]
C={f'{a}/{b}':sum(v['diff']+v['occ'] for v in ctrl.diff(NS,A2,(a,b))[0].values()) for a,b in TEAMS}
res=dict(wide=WIDE,glove=G,pants=P,ctrl=C,glove_tot=[sum(x[i] for x in G.values()) for i in range(3)],pants_tot=[sum(x[i] for x in P.values()) for i in range(3)])
json.dump(res,open(f'/workspace/preview_v2/decisions/glove4_{WIDE}.json','w'),default=int)
import pickle;pickle.dump(dict(A2=A2,MAPS={n:MAPS[n] for n in FR},FR=FR,FAM2=dict(FAM2),gl={n:[p for p in MAPS[n][1] if isg(p,MAPS[n][1][p])] for n in FR},sp=NS['G']['ALLP'][('HOME.json','chi')]),open(f'/tmp/glove4_{WIDE}.pkl','wb'))
print(WIDE,res['glove_tot'],res['pants_tot'],C)
