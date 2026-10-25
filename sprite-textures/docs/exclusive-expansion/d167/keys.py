import pickle,collections,numpy as np,json,sys
from tex94 import D,A,corr,T
_,P=pickle.load(open('votes_G94.pkl','rb'))
K={k:collections.defaultdict(collections.Counter) for k in ('texel','texel+pcidx','leafsRGB+pcidx','pcidx')}
for pr in P:
  f=D['frames'][str(pr[1])];tm=f['tmap'];px=np.array(f['px']);g=A['G94'][pr[0]]
  for gy,gx,py,qx in corr(pr):
    gv=int(g[gy,gx]);t=tm.get(f'{py},{qx}')
    if gv==0 or t is None:continue
    pi=int(px[py,qx]);t=tuple(t)
    K['texel'][t][gv]+=1;K['texel+pcidx'][(t,pi)][gv]+=1;K['leafsRGB+pcidx'][(tuple(T[t[1],t[0]]),pi)][gv]+=1;K['pcidx'][pi][gv]+=1
for k,V in K.items():
  tot=sum(sum(c.values()) for c in V.values());ok=sum(c.most_common(1)[0][1] for c in V.values());print(k,len(V),'keys; px agreement',round(ok/tot,3))
pickle.dump({k:dict(v) for k,v in K.items()},open('keys_G94.pkl','wb'))
