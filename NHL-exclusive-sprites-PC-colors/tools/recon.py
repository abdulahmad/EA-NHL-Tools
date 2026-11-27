import os,sys;sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)));import paths
"""Rebuild Abdul's PSD frames in place (base layer + overlays at their real positions), line each up
against the retail NHLPA 93 Genesis frame, and classify every pixel as 95 PC index / Genesis-only / other."""
import json,pickle,collections,numpy as np
from PIL import Image
from scipy import ndimage
AB=paths.ABDUL
A,S=paths.frames();G93=A['G93']
LY=json.load(open(AB+'layers.json'))
for i,m in enumerate(LY):m['z']=i;m['img']=np.array(Image.open(AB+m['file']).convert('RGBA'))
byname={}
for m in LY:byname.setdefault(m['name'],[]).append(m)
BP,GIDX=paths.guide()   # Abdul's complete guide palette (abdul/act/abdul_palette_complete.act)
GUIDE={BP[i]:i for i in GIDX}
PCU=set()
for f in (A['PC'].values() if isinstance(A['PC'],dict) else A['PC']):
  if f is not None:PCU|=set(np.unique(f).tolist())
STAR=set()
for m in LY:
  if m['name'].endswith('offset') or 'offset copy' in m['name'] or 'offset_copy' in m['file']:
    a=m['img'];STAR|={tuple(int(t) for t in c) for c in a[a[:,:,3]>0][:,:3]}
BG={(255,255,255),(144,252,252),(0,255,0)}|STAR
ORDER={'Layer 27':371,'Layer 28':372,'Layer 29':373,'Layer 30':374,'Layer 31':375,'Layer 32':376}  # PSD left-to-right order; 373/376 are identical in retail
CANDS=list(range(353,377))+list(range(633,645))
# ---- units: base layer + overlays (small layers whose box sits inside the base box, same group, later in z) ----
SKIP_GROUPS={'reference','snes',''}
def kind(m):
  n=m['name']
  if 'offset' in n:return 'offset'
  if 'GEN PAL' in n:return 'GEN_PAL'
  if 'PC PAL' in n:return 'PC_PAL'
  if n.startswith('PC ') or n in('crest',) or 'Crest' in n or 'Head' in n:return 'overlay'
  if n=='color guide PC':return 'guide'
  return 'plain'
units=[]
for m in LY:
  if m['group'] in SKIP_GROUPS:continue
  k=kind(m);m['kind']=k
  if k in('overlay','offset','guide'):continue
  units.append(dict(base=m,overlays=[]))
for m in LY:
  if m['group'] in SKIP_GROUPS or m['kind']!='overlay':continue
  x0,y0,x1,y1=m['bbox'];best=None
  for u in units:
    b=u['base'];X0,Y0,X1,Y1=b['bbox']
    if b['group']==m['group'] and b['z']<m['z'] and X0<=x0 and Y0<=y0 and x1<=X1 and y1<=Y1:
      if best is None or b['z']>best['base']['z']:best=u
  # an overlay applies to every base variant sharing that box (e.g. IF0021 and IF0021etc)
  for u in units:
    if best and u['base']['bbox']==best['base']['bbox'] and u['base']['group']==m['group']:u['overlays'].append(m)
def composite(u):
  b=u['base'];X0,Y0=b['bbox'][:2];im=Image.fromarray(b['img'])
  for o in sorted(u['overlays'],key=lambda o:o['z']):
    im.alpha_composite(Image.fromarray(o['img']),(o['bbox'][0]-X0,o['bbox'][1]-Y0))
  return np.array(im)
def fgmask(a):
  rgb=a[:,:,:3];m=a[:,:,3]>0
  for c in BG:m&=~np.all(rgb==c,2)
  return m
def align(mask,g):
  gm=g>0;h,w=gm.shape;H,W=mask.shape;pad=max(h,w)+2;best=(-1,0,0,0)
  P=np.zeros((H+2*pad,W+2*pad),bool);P[pad:pad+H,pad:pad+W]=mask;ms=mask.sum()
  for mir in(0,1):
    gg=gm[:,::-1] if mir else gm;gs=gg.sum()
    for y in range(-h+1,H):
      for x in range(-w+1,W):
        i=(P[y+pad:y+pad+h,x+pad:x+pad+w]&gg).sum();s=i/(ms+gs-i)
        if s>best[0]:best=(s,mir,y,x)
  return best
def pairs(a,g,al):
  s,mir,y,x=al;gg=g[:,::-1] if mir else g;out=[]
  for gy,gx in zip(*np.nonzero(gg)):
    ly,lx=gy+y,gx+x
    rgba=tuple(int(t) for t in a[ly,lx]) if 0<=ly<a.shape[0] and 0<=lx<a.shape[1] else (0,0,0,0)
    out.append((int(gg[gy,gx]),rgba,gy,gx))
  return out
# pass 1: align every unit by silhouette
for u in units:
  a=composite(u);u['a']=a;mk=fgmask(a)
  sc=sorted(((align(mk,G93[f]),f) for f in CANDS),key=lambda t:-t[0][0])
  u['cands']=sc[:4]
# Genesis value->RGB, learned from layers that are Genesis captures (GEN PAL + unfinished), modal colour
votes=collections.defaultdict(collections.Counter)
for u in units:
  if u['base']['kind']=='GEN_PAL' or u['base']['group'] in('unfinished',):
    al,f=u['cands'][0]
    if al[0]<0.9:continue
    for v,rgba,_,_ in pairs(u['a'],G93[f],al):
      if rgba[3]:votes[v][rgba[:3]]+=1
GENPAL={v:c.most_common(1)[0][0] for v,c in votes.items()}
GENSET=set(GENPAL.values())
# pass 2: tie-break near-equal silhouettes by exact Genesis colour agreement; keep PSD order for exact retail duplicates
for u in units:
  top=[c for c in u['cands'] if c[0][0]>=u['cands'][0][0][0]-0.03]
  def agree(c):
    al,f=c;p=pairs(u['a'],G93[f],al);return sum(GENPAL.get(v)==r[:3] for v,r,_,_ in p)/max(1,len(p))
  u['agree']=[(c[1],round(agree(c),3)) for c in top]
  n=u['base']['name'];hint=None
  if n.startswith('IF00') and ' - ' in n:hint=int(n.split(' - ')[1])+1      # IF00xx - N uses 0-based numbering
  if n in ORDER:hint=ORDER[n]
  allc={c[1]:c for c in u['cands']+[(align(fgmask(u['a']),G93[hint]),hint)]} if hint else {}
  if hint and allc[hint][0][0]>=u['cands'][0][0][0]-0.03:
    u['al'],u['frame']=allc[hint][0],hint;u['how']='name/order hint, silhouette within 0.03 of best'
  elif u['base']['kind'] in('GEN_PAL',) or u['base']['group']=='unfinished':
    u['al'],u['frame']=max(top,key=lambda c:(round(agree(c),2),c[0][0]));u['how']='silhouette + Genesis colour agreement'
  else:
    u['al'],u['frame']=u['cands'][0];u['how']='best silhouette'
def cls(v,rgba):
  if rgba[3]==0:return 'missing'
  c=rgba[:3];gen=GENPAL.get(v)
  if c in BG:return 'missing'   # white = index 255 (transparent) / layer background: a hole where retail has a pixel
  if c in GUIDE:
    return 'shared' if c==gen else 'pc'
  if c[0]==c[1]==c[2] and c[0] in PCU:
    return 'genesis' if c==gen else 'pc'
  if c==gen or c in GENSET:return 'genesis'
  return 'other'
res=[]
for u in units:
  b=u['base'];al,f=u['al'],u['frame'];a=u['a']
  P=pairs(a,G93[f],al);C=collections.Counter();offc=collections.Counter();gz=collections.Counter()
  mapmask=np.zeros(G93[f].shape,'U8')
  for v,r,gy,gx in P:
    k=cls(v,r);C[k]+=1;mapmask[gy,gx]=k
    if k in('genesis','other'):offc[str(r[:3])]+=1;gz[v]+=1
  # foreground outside the retail silhouette (detached / extra parts)
  s,mir,y,x=al;g=G93[f];gg=(g[:,::-1] if mir else g)>0
  fm=fgmask(a);inside=np.zeros_like(fm)
  ys,xs=np.nonzero(gg);ok=(ys+y>=0)&(ys+y<fm.shape[0])&(xs+x>=0)&(xs+x<fm.shape[1]);inside[ys[ok]+y,xs[ok]+x]=True
  extra=fm&~inside;lab,n=ndimage.label(extra,np.ones((3,3)))
  comps=[dict(px=int((lab==i).sum()),bbox=[int(t) for t in (np.nonzero(lab==i)[1].min()+b['bbox'][0],np.nonzero(lab==i)[0].min()+b['bbox'][1],np.nonzero(lab==i)[1].max()+b['bbox'][0]+1,np.nonzero(lab==i)[0].max()+b['bbox'][1]+1)]) for i in range(1,n+1)]
  comps=[c for c in comps if c['px']>=4]
  tot=sum(C.values());done=C['pc']+C['shared']
  st='FULL' if C['genesis']+C['other']+C['missing']==0 and C['pc']>0 else ('NONE' if C['pc']==0 else 'PARTIAL')
  nk=b['kind'];flag=''
  if nk=='PC_PAL' and st=='NONE':flag='named PC PAL but pixels are Genesis colours'
  if nk=='GEN_PAL' and C['pc']>0:flag=f'named GEN PAL but {C["pc"]} px are PC indices'
  res.append(dict(layer=b['name'],file=b['file'],group=b['group'],kind=nk,visible=b['visible'],bbox=b['bbox'],overlays=[o['name'] for o in u['overlays']],
    frame=f,iou=round(float(al[0]),3),mirror=bool(al[1]),dy=int(al[2]),dx=int(al[3]),runnerups=[(c[1],round(float(c[0][0]),3)) for c in u['cands'][1:3]],agree=u['agree'],how=u['how'],
    counts=dict(C),total=tot,done_pct=round(100*done/max(1,tot),1),status=st,flag=flag,remaining_colours=dict(offc.most_common()),remaining_by_genesis_value=dict(gz),
    extra_components=comps))
  print(f"{b['name']:<16}{nk:<8}+{len(u['overlays'])}ov -> 93:{f} iou {al[0]:.3f} {st:<7} {100*done/max(1,tot):5.1f}% {dict(C)} {flag} extra:{[(c['px'],c['bbox']) for c in comps]}")
  u['map']=mapmask
json.dump(dict(genpal={str(k):v for k,v in GENPAL.items()},results=res),open(paths.WORK+'recon.json','w'),default=str)
pickle.dump([(u['base']['name'],u['a'],u['frame'],u['al'],u['map']) for u in units],open(paths.WORK+'recon.pkl','wb'))
