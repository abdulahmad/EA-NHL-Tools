import os,sys;sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)));import paths
import json,numpy as np
from PIL import Image,ImageDraw,ImageFont
AB=paths.ABDUL;OUT=paths.STATUS
LY=json.load(open(AB+'layers.json'))
F=paths.font
X0,X1,Y0,Y1=-22,420,0,230;SC=2.2
W=int((X1-X0)*SC);H=int((Y1-Y0)*SC)
# background: the visible composite of all non-background layers, darkened so boxes stand out
can=Image.new('RGBA',(X1-X0,Y1-Y0),(255,255,255,255))
for m in LY[1:]:
  if not m['visible']:continue
  im=Image.open(AB+m['file']).convert('RGBA');can.alpha_composite(im,(m['bbox'][0]-X0,m['bbox'][1]-Y0)) if m['bbox'][1]<Y1 else None
bg=Image.blend(can.convert('RGB'),Image.new('RGB',can.size,(255,255,255)),0.55).resize((W,H),Image.NEAREST)
def kind(m):
  n=m['name']
  if m['group'] in('reference','snes'):return m['group']
  if 'offset' in n:return 'offset'
  if 'GEN PAL' in n:return 'GEN'
  if 'PC PAL' in n:return 'PC'
  if 'Crest' in n or 'Head' in n or n=='crest':return 'overlay'
  return 'plain'
STY={'plain':((0,0,0),3,'plain frame layer'),'PC':((0,60,220),3,'PC PAL (guide colours)'),'GEN':((230,120,0),2,'GEN PAL (Genesis colours)'),
     'offset':((120,120,120),1,'_offset (star backdrop, hidden)'),'overlay':((200,0,170),2,'overlay (PC head / crest)'),'reference':((90,40,0),1,'reference (not a frame)'),'snes':((90,40,0),1,'snes (out of scope)')}
d=ImageDraw.Draw(bg);rows=[]
for i,m in enumerate(LY[1:],1):
  x0,y0,x1,y1=m['bbox']
  if y0>=Y1:continue
  k=kind(m);c,w,_=STY[k]
  b=[(x0-X0)*SC,(y0-Y0)*SC,(x1-X0)*SC-1,(y1-Y0)*SC-1]
  dash=not m['visible']
  if dash:
    for t in range(int(b[0]),int(b[2]),8):d.line([t,b[1],min(t+4,b[2]),b[1]],fill=c,width=w);d.line([t,b[3],min(t+4,b[2]),b[3]],fill=c,width=w)
    for t in range(int(b[1]),int(b[3]),8):d.line([b[0],t,b[0],min(t+4,b[3])],fill=c,width=w);d.line([b[2],t,b[2],min(t+4,b[3])],fill=c,width=w)
  else:d.rectangle(b,outline=c,width=w)
  rows.append((i,m['name'],k,m['visible'],m['bbox']))
# numbers drawn last, on white tags, staggered for stacked boxes
used=[]
for i,n,k,v,bb in rows:
  x=(bb[0]-X0)*SC+2;y=(bb[1]-Y0)*SC+2
  while any(abs(x-a)<22 and abs(y-b)<16 for a,b in used):y+=16
  used.append((x,y));t=str(i);tw=d.textlength(t,font=F(13))
  d.rectangle([x,y,x+tw+3,y+15],fill=(255,255,255),outline=STY[k][0]);d.text((x+2,y),t,fill=(0,0,0),font=F(13))
# canvas edge
d.line([(-X0)*SC,0,(-X0)*SC,H],fill=(0,0,0),width=2);d.line([(400-X0)*SC,0,(400-X0)*SC,H],fill=(0,0,0),width=2)
# key
lines=[('PSD layout: boxes = layer extents, number = layer order (bottom to top); dashed = hidden layer; black lines = canvas edges (x=0, x=400)',None)]
for k,(c,w,lab) in STY.items():lines.append((lab,c))
names=[f"{i}:{n}" for i,n,k,v,bb in rows]
KH=30*3+ 22*((len(names)+3)//4)+20
out=Image.new('RGB',(W,H+KH),(255,255,255));out.paste(bg,(0,0));d=ImageDraw.Draw(out)
d.text((8,H+6),lines[0][0],fill=(0,0,0),font=F(13))
x=8;y=H+28
for lab,c in lines[1:]:
  tw=d.textlength(lab,font=F(14))+40
  if x+tw>W:x=8;y+=24
  d.rectangle([x,y+2,x+24,y+16],outline=c,width=3);d.text((x+30,y),lab,fill=(0,0,0),font=F(14));x+=tw+10
y+=30
for j,n in enumerate(names):
  d.text((8+(j%4)*(W//4),y+(j//4)*22),n[:30],fill=(0,0,0),font=F(14))
out.save(OUT+'psd_layout.png');print(out.size)
