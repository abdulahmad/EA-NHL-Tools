import sys,json,pickle,collections,numpy as np
sys.path[:0]=['/workspace/preview_v2/exclusive_samples/v2','/workspace/preview_v2/exclusive_samples','/workspace/preview_v2/platform_unique/v2']
from gpal import GP
from cooc import A
D=json.load(open('/tmp/sk_d163.json'));PAL=np.array(D['palette']);T=np.array(D['textures']['Leafs home'])
def fam(rgb):
  r,g,b=[int(v) for v in rgb]
  if max(r,g,b)<60:return 'black'
  if b>r+40 and b>g+20:return 'navy' if r<120 else 'iceblue'
  if r>b+40:return 'skin'
  return 'white'
GF=collections.defaultdict(lambda:'other',{i:fam(GP[i]) for i in range(33,48)});GF[46]='stick';GF[47]='shadow'
PCI={0:'black',82:'shadow',88:'shadow',99:'shadow',136:'stick',133:'skin',134:'skin',135:'skin',140:'skin',190:'helmet',191:'helmet',8:'blade',28:'blade'}
def pcfam(f):
  px=np.array(f['px']);tm=f.get('tmap') or {};o=np.full(px.shape,'',object)
  for y,x in zip(*np.nonzero(px!=255)):
    t=tm.get(f'{y},{x}');i=int(px[y,x])
    o[y,x]=PCI.get(i) or (fam(T[t[1],t[0]]) if t else fam(PAL[i]))
  return px,o
def pcrgb(f):
  px=np.array(f['px']);o=PAL[px].copy()
  for k,t in (f.get('tmap') or {}).items():y,x=map(int,k.split(','));o[y,x]=T[t[1],t[0]]
  return px,o
def pairs(src,thr=0.97,zero=None):
  AL=pickle.load(open('/workspace/preview_v2/exclusive_samples/v3/align.pkl','rb'))
  for (s,n),(pn,iou,mir,dy,dx,_) in AL.items():
    if s!=src or iou<thr or str(pn) not in D['frames'] or (zero and pn not in zero):continue
    yield n,pn,mir,dy,dx
def corr(g,p,mir,dy,dx):
  W=p.shape[1]
  for py,px in zip(*np.nonzero(p!=255)):
    x=W-1-px if mir else px;gy,gx=py+dy,x+dx
    if 0<=gy<g.shape[0] and 0<=gx<g.shape[1] and g[gy,gx]:yield gy,gx,py,px
