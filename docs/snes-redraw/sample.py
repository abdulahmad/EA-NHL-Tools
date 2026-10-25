"""D180: fixed ~5% stratified frame sample (Abdul t1020u). Systematic every-20th pick after sorting by
(platform, class, animation, direction, frame), so every stratum is spread across. Saved to sample_d180.json and reused."""
import json,pickle
from dirmap import build,sclass
A,_=pickle.load(open('/workspace/preview_v2/platform_unique/v2/all.pkl','rb'))
s=open('/workspace/EA-NHL-Tools/sprite-textures/editor/data/bundle.js').read();B=json.loads(s[s.index('{'):s.rindex('}')+1])
rows=[]
for g in('G94','S94'):
    _,M,_=build(g)
    for n in A[g]:
        v=M.get(n,{});rows.append((g,sclass(g,n),(v.get('anims') or ['none'])[0],v.get('dir',-1) if v.get('dir') is not None else -1,n))
for f in B['frames']:
    n=f['id'];rows.append(('PC' if f['kind']!='exclusive' else 'GENEX','goalie' if f['kind']=='goalie' else 'skater','bundle',-1,n))
rows.sort(key=lambda r:tuple(str(x) for x in r[:4])+(str(r[4]).zfill(6),))
pick=[r for i,r in enumerate(rows) if i%20==7]
for n in(196,527,800):
    if not any(r[0]=='S94' and r[4]==n for r in pick):pick.append(('S94','skater','must',-1,n))
json.dump([dict(platform=r[0],cls=r[1],anim=r[2],dir=r[3],frame=r[4]) for r in pick],open('sample_d180.json','w'),indent=0)
from collections import Counter
print(len(rows),'->',len(pick),Counter(r[0] for r in pick),Counter(r[1] for r in pick),Counter(r[3] for r in pick))
