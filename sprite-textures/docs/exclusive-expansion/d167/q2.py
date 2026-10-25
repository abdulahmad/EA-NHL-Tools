import pickle,collections,numpy as np
from tex94 import D,A,corr
from gpal import col,GP
print({i:col(i) for i in range(33,48)})
_,P=pickle.load(open('votes_G94.pkl','rb'));V=collections.defaultdict(collections.Counter);W=[]
for pr in P:
  tm=D['frames'][str(pr[1])]['tmap'];g=A['G94'][pr[0]];F=collections.defaultdict(collections.Counter)
  for gy,gx,py,qx in corr(pr):
    gv=int(g[gy,gx]);t=tm.get(f'{py},{qx}')
    if gv==0 or t is None:continue
    V[tuple(t)][col(gv)]+=1;F[tuple(t)][col(gv)]+=1
  W+= [ (c.most_common(1)[0][1],sum(c.values())) for c in F.values()]
tot=sum(sum(c.values()) for c in V.values());print('across-frame colour agreement',round(sum(c.most_common(1)[0][1] for c in V.values())/tot,3))
print('within-frame agreement',round(sum(a for a,b in W)/sum(b for a,b in W),3))
