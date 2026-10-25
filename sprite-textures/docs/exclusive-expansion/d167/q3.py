import pickle,collections,numpy as np
from tex94 import D,A,corr
from gpal import col,GP
for i in sorted({col(i) for i in range(33,48)}):print(i,GP[i])
FAM={33:'dark',34:'dark',40:'dark',35:'navy',36:'navy',37:'navy',43:'white',44:'white',45:'white',38:'skin',39:'skin',46:'stick',47:'shadow'}
_,P=pickle.load(open('votes_G94.pkl','rb'));V=collections.defaultdict(collections.Counter);S=collections.defaultdict(collections.Counter);S2=collections.defaultdict(collections.Counter)
rec=[]
for pr in P:
  f=D['frames'][str(pr[1])];tm=f['tmap'];px=np.array(f['px']);g=A['G94'][pr[0]]
  for gy,gx,py,qx in corr(pr):
    gv=int(g[gy,gx]);t=tm.get(f'{py},{qx}')
    if gv==0 or t is None:continue
    c=col(gv);V[tuple(t)][FAM.get(c,c)]+=1;rec.append((tuple(t),int(px[py,qx]),c))
TF={t:c.most_common(1)[0][0] for t,c in V.items()}
tot=sum(sum(c.values()) for c in V.values());print('texel->family agreement',round(sum(c.most_common(1)[0][1] for c in V.values())/tot,3))
for t,pi,c in rec:S[(TF[t],pi)][c]+=1;S2[(t,pi)][c]+=1
n=len(rec);print('(texel family, PC idx)->colour',round(sum(c.most_common(1)[0][1] for c in S.values())/n,3),len(S))
print('(texel, PC idx)->colour',round(sum(c.most_common(1)[0][1] for c in S2.values())/n,3))
