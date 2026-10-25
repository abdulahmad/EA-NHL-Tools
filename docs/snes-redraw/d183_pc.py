import json,pickle,collections,numpy as np
from blackcov import classify,CATS
s=open('/workspace/EA-NHL-Tools/sprite-textures/editor/data/bundle.js').read();B=json.loads(s[s.index('{'):s.rstrip().rstrip(';').rindex('}')+1])
FR={f['id']:f for f in B['frames']};PAL={k:np.array(v) for k,v in B['palettes'].items()};N=B['parts_skater']
rows=[];GT=collections.defaultdict(collections.Counter)
for x in json.load(open('sample_d180.json')):
    if x['platform']!='PC':continue
    f=FR.get(x['frame'])
    if not f or not f.get('joints'):print('skip',x['frame']);continue
    px=np.array(f['px']);mask=px!=255;pal=PAL[f['pal']];black=mask&(pal[np.where(mask,px,0)].max(-1)<60)
    J={k:(v[0]+.5,v[1]+.5) for k,v in f['joints'].items()}
    ys,xs,cat=classify(black,mask,J,f['bones'])
    lab=np.array(f['lab']) if f.get('lab') else None
    if lab is not None and lab.shape==px.shape and f['kind']=='skater':
        for y,xx,c in zip(ys,xs,cat):GT['covered' if c==0 else 'uncovered'][N[lab[y,xx]]]+=1
    rows.append(dict(pf='PC',cls=x['cls'],n=x['frame'],anim='',src='PC skeleton (bundle)',nb=int(black.sum()),cnt=[int((cat==i).sum()) for i in range(7)],px=[(int(a),int(b),int(c)) for a,b,c in zip(ys,xs,cat)]))
R=pickle.load(open('/tmp/d183_rows.pkl','rb'));R=[r for r in R if r['pf']!='PC']+rows;pickle.dump(R,open('/tmp/d183_rows.pkl','wb'))
for k in('covered','uncovered'):print('PC skater black by GT label,',k,GT[k].most_common())
G=collections.defaultdict(lambda:np.zeros(7,int));C=collections.Counter()
for r in rows:G[r['cls']]+=r['cnt'];C[r['cls']]+=1
for k,v in G.items():print('PC',k,C[k],v.sum(),' '.join(f'{c}:{x}({x/v.sum():.0%})' for c,x in zip(CATS,v)))
