# D167 step 3: map exclusive Genesis frames to texels under a HARD colour constraint: tex94[texel] == original colour.
# Start texel = translator + unchanged PC pipeline (exclusive_samples/expand.py); if its colour differs, move to the nearest
# texel with the right colour, preferring the same zone, then the same column (straight columns), then the same row.
import sys,json,pickle,collections,numpy as np
sys.path[:0]=['/workspace/preview_v2/exclusive_samples','/workspace/preview_v2/exclusive_samples/v2','/workspace/preview_v2/platform_unique/v2']
import expand as E
from gpal import col
from tex94 import zone,REG
from cooc import crop,A,rows
TEX=np.load('tex_G94.npy');NOTEX={46,47}   # stick, shadow keep game colour (as on PC)
D={}
for a,dirs in json.load(open('/workspace/preview_back/spa95pc.json')).items():
  for d,fl in enumerate(dirs):
    for f in fl:D.setdefault(f,collections.Counter())[d]+=1
def pdir(src,n):return D.get(rows[(src,n)]['PC']['best'],collections.Counter({3:1})).most_common(1)[0][0]
FR=[('G93',n) for n in range(353,377)]+[('G94',n) for n in range(738,754)]
FR=[f for f in FR if not rows[f]['empty']]
S=[(s,n,pdir(s,n)) for s,n in FR]
R,err=E.run(S)
CAND=collections.defaultdict(list)
for v,u in zip(*np.nonzero(TEX)):CAND[int(TEX[v,u])].append((int(u),int(v)))
OUT={};TOT=collections.Counter()
for (s,n,d),r in R.items():
  g=r['g'];tm=r['tmap'] or {};M={};c=collections.Counter();moves=[]
  for y,x in zip(*np.nonzero(g)):
    cv=col(int(g[y,x]))
    if cv in NOTEX:c['stick/shadow (game colour)']+=1;continue
    c['px']+=1;t0=tm.get(f'{y},{x}')
    if t0 and TEX[t0[1],t0[0]]==cv:M[(y,x)]=tuple(t0);c['kept pipeline texel']+=1;continue
    if not CAND[cv]:c['ERROR colour not in texture (%d)'%cv]+=1;continue
    if t0 is None:  # no start texel: use translator zone of neighbours' texels
      nb=[tm.get(f'{y+a},{x+b}') for a in(-1,0,1) for b in(-1,0,1)];nb=[t for t in nb if t]
      t0=tuple(np.median(nb,0).astype(int)) if nb else None
    if t0 is None:c['ERROR no start texel']+=1;continue
    z=zone(*t0)
    best=min(CAND[cv],key=lambda t:((zone(*t)!=z)*100+abs(t[0]-t0[0])*2+abs(t[1]-t0[1])))
    M[(y,x)]=best;moves.append(abs(best[0]-t0[0])+abs(best[1]-t0[1]));c['moved to colour-valid texel']+=1
    if zone(*best)!=z:c['moved out of zone']+=1
  err=sum(v for k,v in c.items() if k.startswith('ERROR'))
  OUT[f'{s}_{n}']=dict(dir=d,errors=err,mean_move=round(float(np.mean(moves)),2) if moves else 0,**c);TOT.update(c)
  r['M']=M
pickle.dump(R,open('map3.pkl','wb'));json.dump(dict(frames=OUT,total=dict(TOT)),open('map3.json','w'),indent=1)
print(json.dumps(dict(TOT),indent=1));[print(k,v) for k,v in OUT.items()]
