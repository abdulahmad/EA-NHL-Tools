# D174 (pt1004u) comparison sheet: original | control palette native | control via texture mapping | Leafs D169 | Abdul layout
import pickle,sys,numpy as np
sys.path[:0]=['/workspace/preview_v2/exclusive_samples','/workspace/preview_v2/exclusive_samples/v2']
import render as RD;from gpal import GP;from PIL import Image,ImageDraw
from palsheet174 import PC;from warp172 import DARK
F_=RD.F_;REP={'white':44,'navy':36,'skin':38,'black':34}
_,_,FT=pickle.load(open('tex_G94_d169.pkl','rb'));_,FI=pickle.load(open('tex175_ctl.pkl','rb'))
ABD=np.array(Image.open('/workspace/EA-NHL-Tools/sprite-textures/v2_38x32/textures/layout_v2_38x32_abdul.png').convert('RGB'))
DU=pickle.load(open('/tmp/d175_dump.pkl','rb'))
from tex175ctl import CANON
TN=['original','control zones\nnative 94G','control zones\nvia our mapping','Leafs D169\nvia our mapping','Abdul layout\nvia our mapping']
X0=10;CW=196;NC=5;BG=(20,20,20)
def cols(r):
  g=r['g'];M=r['M'];OL=r['OL'];FM=r['FM'];h,w=g.shape
  org=np.full((h,w,3),BG[0],np.uint8);org[g>0]=GP[g[g>0]]
  nat=np.full((h,w,3),BG[0],np.uint8)
  for i,c in PC.items():nat[g==i]=PC[CANON.get(i,i)]
  ctl=nat.copy();lf=org.copy();ab=org.copy()
  for (y,x),(u,v) in M.items():
    i=FI.get((u,v));ctl[y,x]=PC[i] if i is not None else (25,25,25)
    fm=FT[(u,v)];lf[y,x]=(GP[DARK[fm]] if (y,x) in OL else GP[g[y,x]]) if fm==FM[(y,x)] else GP[REP[fm]]
    ab[y,x]=ABD[v,u]
  # body pixels with no texel at all: dark grey in the mapped columns
  for (y,x) in r['E']:
    if (y,x) not in M:ctl[y,x]=lf[y,x]=ab[y,x]=(60,60,60)
  return [org,nat,ctl,lf,ab]
def sheet(keys,fn,title):
  rs=[DU[k] for k in keys];mw=max(r['g'].shape[1] for r in rs);mh=max(r['g'].shape[0] for r in rs)
  S_=lambda r:max(1,min(5,(CW-12)//r['g'].shape[1]));SC=0
  top=150;H=top+sum(r['g'].shape[0]*S_(r)+68 for r in rs)+140
  im=Image.new('RGB',(1000,H),BG);d=ImageDraw.Draw(im)
  d.text((X0,6),title,font=F_(24),fill='white')
  for j,t in enumerate(TN):          # headings centred on a fixed grid
    cx=X0+j*CW+CW//2
    for li,line in enumerate(t.split('\n')):
      f=F_(18);tw=d.textlength(line,font=f);d.text((cx-tw/2,48+li*24),line,font=f,fill='white')
    d.line([X0+j*CW+4,100,X0+(j+1)*CW-4,100],fill=(120,120,120),width=1)
  y=top-36
  for k,r in zip(keys,rs):
    nm=len(r['IM']);d.text((X0,y),f"{k.replace('_',' ')}:  {nm} wrong index vs control,  {len(r['EX'])} nudged,  {r['err']} Leafs errors  / {r['px']} px",font=F_(18),fill='white')
    P=cols(r);h,w=r['g'].shape;SC=S_(r);RH=h*SC+40
    for j,a in enumerate(P):
      ox=X0+j*CW+(CW-w*SC)//2;oy=y+28
      im.paste(Image.fromarray(a).resize((w*SC,h*SC),Image.NEAREST),(ox,oy))
      mark=r['IM'] if j==2 else ([p for p in r['E']] if j==3 else [])
      if j in(2,3):
        for yy,xx in r['EX']:d.rectangle([ox+xx*SC,oy+yy*SC,ox+xx*SC+SC-1,oy+yy*SC+SC-1],outline=(0,255,255),width=1)
        for yy,xx in mark:d.ellipse([ox+xx*SC-2,oy+yy*SC-2,ox+xx*SC+SC+1,oy+yy*SC+SC+1],outline=(0,0,0),width=3);d.ellipse([ox+xx*SC-1,oy+yy*SC-1,ox+xx*SC+SC,oy+yy*SC+SC],outline=(255,255,255),width=1)
    y+=RH+28
  # legend
  ly=y;d.text((X0,ly),'Legend',font=F_(20),fill='white');ly+=28
  d.ellipse([X0,ly+2,X0+16,ly+18],outline=(0,0,0),width=4);d.ellipse([X0+1,ly+3,X0+15,ly+17],outline=(255,255,255),width=2)
  d.text((X0+26,ly),'white/black ring: col 3 = wrong index vs control (shade groups 43-45, 40-42, 35-37, 38-39 = same);'
  ,font=F_(15),fill='white');ly+=22;d.text((X0+26,ly),'col 4 = wrong Leafs family',font=F_(15),fill='white');ly+=24
  d.rectangle([X0,ly+2,X0+16,ly+18],outline=(0,255,255),width=2)
  d.text((X0+26,ly),'cyan box: pixel nudged 1 texel to a same-family texel (cols 3 and 4)',font=F_(15),fill='white');ly+=24
  d.rectangle([X0,ly+2,X0+16,ly+18],fill=(60,60,60))
  d.text((X0+26,ly),'dark grey: body pixel with no texel.  Stick, shadow, blood keep their own colour (not mapped).',font=F_(15),fill='white');ly+=30
  im.crop((0,0,1000,ly+6)).save(fn);print(fn,SC)
sheet([f'G94_{n}' for n in range(739,744)],'d175_compare_94G_739-743.png','D175: control zones native vs via our mapping - 94G 739-743')
sheet([f'G93_{n}' for n in range(353,358)],'d175_compare_93G_353-357.png','D175: control zones native vs via our mapping - 93G 353-357')
