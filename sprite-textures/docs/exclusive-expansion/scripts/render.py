import sys,os,json,collections,numpy as np
sys.argv=['x'];exec(open('/workspace/preview_v2/d162/met.py').read().split('HARD=')[0].replace("ARGS=list(sys.argv[1:])",""))
from PIL import Image,ImageDraw,ImageFont
S='/workspace/EA-NHL-Tools/sprite-textures';sys.path[:0]=[S,S+'/scripts']
import test_textures as TT
from lib import team,spritepal
F_=lambda s:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',s)
PN={2:'skin',3:'helmet',4:'torso',5:'crest',6:'shoulder_patch',7:'sleeve',8:'glove',9:'pants',10:'sock',11:'skate',12:'skate_blade',13:'stick',19:'other',1:'part 1'}
TEXD=set(PN)-{13,19,1}
def pf2(i):return 'skin' if i==136 else pf(i)
def ng(o):
  o=o.astype(int).copy();g=(o[...,1]>o[...,0]+30)&(o[...,1]>o[...,2]+30);o[g]=(150,150,150);return o.astype(np.uint8)
V=S+'/v2_38x32/'
def tex():
  L=lambda f:np.asarray(Image.open(V+f).convert('RGB')).astype(int)
  base=L('textures/raw/stripe_diagnostic_v2.png');used=~np.all(base==(252,0,252),2)
  T=TT.make(base,used,regions={'arm R':(0,0,3,21),'front torso':(3,0,13,17),'arm L':(16,0,4,21),'back arm L':(20,0,4,21),'back torso':(24,0,10,17),'back arm R':(34,0,4,21),'pants':(0,17,38,6),'legs/socks/skates':(0,23,38,9)})
  out={'Leafs home (default team)':L('textures/raw/leafs_home_v2.png')}
  for k in T:
    if 'Horizontal' in k or 'Vertical' in k:out[k]=np.array(T[k])
  return out
PAL=np.array(spritepal(team('tor')))
def render(q,lab,tm,T,C=None):
  MAG=np.all(T==(252,0,252),2);o=PAL[q].astype(np.uint8);bad=[]
  for y,x in zip(*np.nonzero(q!=255)):
    l=int(lab[y,x]);pn=PN.get(l,str(l));t=(tm or {}).get(f'{y},{x}')
    if C is not None:C[pn]['px']+=1
    if t is None:
      if l in TEXD:bad.append((y,x));C is not None and C[pn].update(['no texel'])
      continue
    if MAG[t[1],t[0]]:bad.append((y,x));C is not None and C[pn].update(['unused texel']);continue
    if pf2(int(q[y,x])) not in FAM2.get(tuple(t),set()):bad.append((y,x));C is not None and C[pn].update(['wrong band']);continue
    o[y,x]=T[t[1],t[0]];C is not None and C[pn].update(['ok'])
  o[q==255]=(40,40,40);return ng(o),bad
def grey(g):
  o=np.full(g.shape+(3,),40,np.uint8);m=g!=0;v=(60+ (g[m].astype(int)%16)*12).clip(0,255);o[m]=np.stack([v]*3,1);return o
def sheet(title,key,R,out,note=''):
  T=tex();C=collections.defaultdict(collections.Counter);SC=5
  g,q,lab,tm,conf=R['g'],R['q'],R['lab'],R['tmap'],R['conf']
  sw=max(g.shape[1],q.shape[1])*SC;sh=max(g.shape[0],q.shape[0])*SC
  RH=max(sh,160)+40;im=Image.new('RGB',(1000,110+RH*len(T)),(15,15,15));d=ImageDraw.Draw(im)
  d.text((8,6),title,font=F_(22),fill='white');d.text((8,36),note,font=F_(15),fill=(220,220,220))
  d.text((8,58),'cols: TEXTURE USED | console original (index grey) | translated PC-index frame (Leafs pal) | expanded render',font=F_(15),fill='white')
  d.text((8,80),'yellow ring = error (no texel / unused texel / wrong colour band); green shown grey',font=F_(15),fill=(255,230,0))
  y=110;tot=None
  for i,(nm,t) in enumerate(T.items()):
    cc=collections.defaultdict(collections.Counter) if i==0 else None
    o,bad=render(q,lab,tm,t,cc)
    if i==0:C=cc;nb=len(bad)
    d.text((8,y),nm,font=F_(16),fill='white')
    im.paste(Image.fromarray(ng(t.astype(np.uint8))).resize((190,160),Image.NEAREST),(8,y+22))
    x=215
    for a in (grey(g),ng(PAL[q].astype(np.uint8)*(q!=255)[...,None]+np.uint8(40)*(q==255)[...,None]),o):
      e=Image.fromarray(a).resize((a.shape[1]*SC,a.shape[0]*SC),Image.NEAREST);im.paste(e,(x,y+22));last=(x,e)
      x+=sw+20
    dd=ImageDraw.Draw(im);x0=last[0]
    for yy,xx in bad:dd.ellipse([x0+xx*SC-2,y+22+yy*SC-2,x0+xx*SC+SC+1,y+22+yy*SC+SC+1],outline=(255,230,0),width=2)
    d.text((x0,y),f'{len(bad)} err',font=F_(16),fill=(255,230,0))
    y+=RH
  if im.size[0]>1000:im=im.resize((1000,int(im.size[1]*1000/im.size[0])))
  im.save(out);return {p:dict(c) for p,c in C.items()},nb
