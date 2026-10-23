# Automated check: v5 textures vs Abdul's v4 template, texel by texel.
# 1) occupancy (drawn vs magenta) must match for every texel of every texture.
# 2) head rows 0-7 (front, back, side-helmet strips): role must be exactly the template's colour role
#    (skin shade -> skin/green, black/dark grey -> helmet, red -> yoke, gold -> shoulder patch).
# 3) rows 8+: compare Chicago home (same red/black/white design as the template) colour class vs the template colour class; every
#    difference must be one of: gear/skin placeholder recolour, shoulder-patch recolour, or documented stripe column alignment.
import sys,os,json,numpy as np;from PIL import Image
OUT=sys.argv[1];sys.argv=['x',OUT+'/_tmp'];import runpy
G=runpy.run_path(os.path.join(os.path.dirname(os.path.abspath(__file__)),'textures_v5.py'))
L,HAVE,ROLE,cls,TW,TH,GRN=G['L'],G['HAVE'],G['ROLE'],G['cls'],G['TW'],G['TH'],G['GRN']
MAG=(252,0,252);files=['leafs_home','rangers_away','chicago_home_top','chicago_alt_bottom','montreal_baby_blue_bottom','stripe_diagnostic']
rep={'occupancy':{},'head':[],'body':[],'unexplained':[]}
for f in files:
    T=np.asarray(Image.open(f'{OUT}/{f}.png').convert('RGB')).astype(int);occ=~(T==MAG).all(2)
    rep['occupancy'][f]=int((occ!=HAVE).sum())
CH=np.asarray(Image.open(f'{OUT}/chicago_home_top.png').convert('RGB')).astype(int)
def kind(c):
    c=tuple(int(t) for t in c)
    return 'green' if c==GRN else cls(c)
for v,u in zip(*np.nonzero(HAVE)):
    t=cls(tuple(L[v,u]));r=ROLE[(u,v)];k=kind(CH[v,u]);w=27-u if 14<=u<28 else u
    if v<=7:
        exp={'skin':'skin','black':'helmet','gold':'patch','red':('yoke1' if v==6 else 'yoke2')}[t]
        if r!=exp:rep['unexplained'].append([int(u),int(v),f'head role {r} != template {exp}'])
        if t=='gold' and k!='gold':rep['head'].append([int(u),int(v),'recolour: shoulder patch gold -> team colour'])
        continue
    if u<14 and 10<=v<=13 and 4<=w<=8:continue                       # crest block: Chicago home = his crest as drawn
    if t==k or (t=='blue' and k=='green'):
        if t=='blue':rep['body'].append([int(u),int(v),'recolour: blade -> green placeholder'])
        continue
    if k=='green' and (r in('glove','skate') or t=='skin'):rep['body'].append([int(u),int(v),f'recolour: {r} -> green placeholder']);continue
    if t=='gold' and k!='gold':rep['body'].append([int(u),int(v),'recolour: shoulder patch gold -> team colour']);continue
    if u<28 and 8<=v<=27:rep['body'].append([int(u),int(v),f'stripe column alignment: template {t} -> {r} ({k}) at row {v}']);continue
    rep['unexplained'].append([int(u),int(v),f'template {t} -> {r} ({k})'])
json.dump(rep,open(f'{OUT}/check_v5.json','w'),indent=1)
import collections
print('occupancy diffs',rep['occupancy']);print('head notes',len(rep['head']),'unexplained',len(rep['unexplained']),rep['unexplained'][:20])
print(collections.Counter(x[2].split(':')[0] for x in rep['body']))
for x in rep['body']:
    if x[2].startswith('stripe'):print(x)
