import os,sys;sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)));import paths
import pickle,json,collections,numpy as np
from PIL import Image
U=pickle.load(open(paths.WORK+'recon.pkl','rb'));R={r['layer']:r for r in json.load(open(paths.WORK+'recon.json'))['results']}
A,S=paths.frames()
B=Image.open(paths.ABDUL+'abdul_palette.bmp');BP=np.array(B.getpalette()).reshape(-1,3)
GUIDE={tuple(int(x) for x in BP[i]):i for i in sorted(set(np.array(B).flatten().tolist()))}
FAM={33:'blade',34:'black',35:'pants',36:'pants',37:'pants',38:'skin',39:'skin',40:'trim',41:'trim',42:'trim',43:'jersey',44:'jersey',45:'jersey',46:'stick',47:'shadow',1:'chips',2:'chips',28:'blood',29:'blood'}
def pf(i):
  if i in(0,8,28,1,31):return 'black/blade'
  if i in(133,134,135,137,138,139,140):return 'skin'
  if i==136:return 'stick'
  if i in(82,88,89,99):return 'shadow'
  if 177<=i<=180:return 'pants'
  if 181<=i<=189:return 'socks'
  if 190<=i<=191:return 'helmet'
  if 144<=i<=176:return 'jersey/arm'
  if 192<=i<=255:return 'crest'
  return 'other(%d)'%i
ALLOW={'blade':{'black/blade'},'black':{'black/blade'},'pants':{'pants','socks','jersey/arm'},'skin':{'skin','stick'},'trim':{'jersey/arm','pants','socks','helmet','crest'},
 'jersey':{'jersey/arm','pants','socks','helmet','crest'},'stick':{'stick','black/blade'},'shadow':{'shadow'},'chips':{'shadow','black/blade'},'blood':set()}
zones=collections.defaultdict(set);viol=collections.Counter();vlay=collections.defaultdict(collections.Counter);tot=0
for name,a,f,al,mp in U:
  r=R[name]
  if r['status']!='PARTIAL' or r['done_pct']<80:continue
  s,mir,y,x=al;g=A['G93'][f];gg=g[:,::-1] if mir else g
  for gy,gx in zip(*np.nonzero(gg)):
    if mp[gy,gx] not in('pc','shared'):continue
    c=tuple(int(t) for t in a[gy+y,gx+x,:3]);i=GUIDE.get(c,c[0]);v=int(gg[gy,gx]);tot+=1
    fam=FAM.get(v,'line1 object');zones[fam].add(i)
    if pf(i) not in ALLOW.get(fam,set()) and fam!='line1 object':viol[(fam,pf(i),i)]+=1;vlay[name][(fam,pf(i),i)]+=1
print('pixels checked',tot)
for k in ['blade','black','pants','skin','trim','jersey','stick','shadow','chips','line1 object']:print(k,len(zones[k]),sorted(zones[k]))
print('cross-zone',sum(viol.values()));[print(' ',k,v) for k,v in viol.most_common(20)]
json.dump(dict(pixels=tot,pc_indices_per_genesis_zone={k:sorted(v) for k,v in zones.items()},cross_zone={str(k):v for k,v in viol.most_common()},per_layer={k:{str(a):b for a,b in v.items()} for k,v in vlay.items()}),open(paths.STATUS+'zone_consistency.json','w'),indent=1)
