# D192 (Abdul pt1055u): genuine game-extracted team jerseys in the editor's 38x32 (v2) layout. No hand-painting, no flatten.
# Source: out/data (frames.json/.bin = game sprite frames, HOME.json/AWAY.json = team palettes, zn.json = index -> zone/shade).
# For every editor skater frame with a texture map (editor/data/bundle.js tmap: "y,x" -> [col,row]), each sprite pixel is rendered in the
# team's game palette; shaded zones are taken at their game 'medium' palette entry (the editor re-applies the light/dark shading).
# Gear/fixed indices (<133 except skin 133/134/140, and 136 stick) are not jersey and are skipped. Per texel: majority colour; conflicts reported.
import os,sys,json,collections,numpy as np
H=os.path.dirname(os.path.abspath(__file__));R=os.path.dirname(os.path.dirname(H));sys.path.insert(0,os.path.dirname(H))
from lib import frame,spritepal,D,ZN
from PIL import Image
def fs(i):
    n=ZN.get(str(i))
    if i in(133,134,140):return 'skin',{133:'light',134:'medium',140:'dark'}[i]
    if n is None:return f'idx{i}','flat'
    if n.startswith('waist 1'):return 'waist 1',{'odd':'light','even':'medium','hidden':'dark'}[n.split()[-1]]
    if n=='pants dark':return 'pants','dark'
    if n=='pants medium':return 'pants','medium'
    if n.startswith('helmet'):return 'helmet',n.split()[-1]
    w=n.rsplit(' ',1)
    if w[-1] in('light','medium','dark'):return w[0],w[-1]
    return n,'flat'
MED={}
for k in ZN:
    f,s=fs(int(k))
    if s=='medium':MED[f]=int(k)
MED['skin']=134
B=json.loads(open(os.path.join(R,'editor','data','bundle.js')).read()[len('window.BUNDLE='):-1])
TEAMS=[('Chicago away','AWAY.json','chi'),('Leafs home','HOME.json','tor'),('Rangers away','AWAY.json','nyr'),('Montreal home','HOME.json','mtl')]
OUT=os.path.join(R,'playerlayout','v2_game');os.makedirs(OUT,exist_ok=True);REP={}
FR=[f for f in B['frames'] if f['kind']=='skater' and f['tmap']]
for name,fn,code in TEAMS:
    sp=spritepal(next(q for q in json.load(open(D+fn)) if q['code']==code)).astype(int)
    V=collections.defaultdict(collections.Counter);npx=0;nomed=0
    for f in FR:
        n=int(f['id'].split()[-1]);p=frame(n)
        for k,(c,r) in f['tmap'].items():
            y,x=map(int,k.split(','))
            if y>=p.shape[0] or x>=p.shape[1]:continue
            i=int(p[y,x])
            if i==255 or (i<133 and i not in()) or i==136:continue
            fam,s=fs(i)
            j=i if s=='flat' else MED.get(fam)
            if j is None:nomed+=1;continue
            V[(c,r)][tuple(sp[j])]+=1;npx+=1
    O=np.full((32,38,3),(252,0,252),np.uint8);conf=[]
    for (c,r),C in V.items():
        O[r,c]=C.most_common(1)[0][0]
        if len(C)>1:conf.append(dict(texel=[c,r],votes={str(k):v for k,v in C.most_common()}))
    slug=name.lower().replace(' ','_');Image.fromarray(O).save(f'{OUT}/{slug}_game_texture.png')
    Image.fromarray(O).resize((38*16,32*16),Image.NEAREST).save(f'{OUT}/{slug}_game_texture_x16.png')
    REP[name]=dict(palette=f'{fn} {code}',frames=len(FR),pixels=npx,texels=len(V),conflict_texels=len(conf),
        conflict_px=sum(sum(x['votes'].values())-max(x['votes'].values()) for x in conf),no_medium_skipped=nomed,conflicts=conf)
    print(name,{k:v for k,v in REP[name].items() if k!='conflicts'})
json.dump(REP,open(f'{OUT}/extract_report.json','w'),indent=1)
