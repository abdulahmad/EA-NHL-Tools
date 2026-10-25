# D174 (pt997u). Rule: a part is allowed for an index if >=2% (and >=3 px) of that index's 94G pixels carry it;
# upperarm (sleeve, rarely labelled on its own) is allowed wherever forearm is. 46 stick / 47 shadow are unconstrained.
# D174 (pt997u): which body parts each Genesis palette index occurs on, from the 94G frames' part labels.
import pickle,json,collections,numpy as np
R=pickle.load(open('../v2/map3.pkl','rb'))
PN={2:'head',3:'head',4:'torso',5:'torso',6:'upperarm',7:'forearm',8:'hand',9:'thigh',10:'shin',11:'skate',12:'skate'}
C=collections.defaultdict(collections.Counter);labs=collections.Counter();CL=collections.defaultdict(collections.Counter)
from warp173 import OK
for (s,n,d),r in R.items():
  if s!='G94':continue
  g,lab=np.asarray(r['g']),np.asarray(r['lab'])
  for y,x in zip(*np.nonzero(g)):
    l=int(lab[y,x]);labs[l]+=1
    C[int(g[y,x])][PN.get(l,f'lab{l}')]+=1;CL[int(g[y,x])][l]+=1
T={}
for i in sorted(C):
  tot=sum(C[i].values());T[i]={'total':tot,'parts':dict(C[i].most_common()),'allowed':(lambda A:sorted(A|({'upperarm'} if 'forearm' in A else set())))({p for p,c in C[i].items() if c>=max(3,0.02*tot) and not p.startswith('lab')}) if i not in (46,47) else None}
  print(i,tot,T[i]['allowed'],dict(C[i].most_common()))
print(labs)
json.dump(T,open('palzone174.json','w'),indent=1)
