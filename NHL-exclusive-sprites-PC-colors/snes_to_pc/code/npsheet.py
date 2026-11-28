import sys;sys.path.insert(0,'/workspace/snes-to-pc')
from s2g import A
import numpy as np,pandas as pd
from pal import SPB,BG
from PIL import Image,ImageDraw,ImageFont
OUT='/workspace/snes-to-pc/out/all/'
FB=lambda n:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',n)
L=pd.read_csv('out/snes_exclusive_list.csv');N=L[L.category=='nonplayer'].reset_index(drop=True)
Z=3;cols=4;cw=250;items=[]
for r in N.itertuples():
    a=A['S94'][int(r.frame)];items.append((r,a))
def cellh(a):return min(a.shape[0],40)*Z+54
rows=[items[i:i+cols] for i in range(0,len(items),cols)]
H=130+sum(max(cellh(a) for _,a in rw) for rw in rows)+30
pages=[];cur=[];h=130
for rw in rows:
    rh=max(cellh(a) for _,a in rw)
    if h+rh>1400 and cur:pages.append(cur);cur=[];h=130
    cur.append(rw);h+=rh
pages.append(cur)
for pi,pg in enumerate(pages):
    H=130+sum(max(cellh(a) for _,a in rw) for rw in pg)+10
    im=Image.new('RGB',(1000,H),(250,250,252));dr=ImageDraw.Draw(im)
    dr.text((8,6),f'NON-PLAYER SNES-exclusive frames, SNES only (A), not converted ({pi+1}/{len(pages)})',fill=(15,15,25),font=FB(16))
    dr.text((8,30),'A',fill=(15,15,25),font=FB(60));dr.text((60,40),'94 SNES (BOS): fonts, rink/bench bits, drawn by code. Skipped for B and C.',fill=(15,15,25),font=FB(12))
    dr.text((60,62),'CLEAR = no match in 94G or 95 PC.  AMBIG = possible redraw, best-match scores shown.',fill=(15,15,25),font=FB(12))
    dr.text((60,84),'Cropped to 40 rows if taller. Zoom x3.',fill=(15,15,25),font=FB(12))
    y=118;dr.line((0,y,1000,y),fill=(60,60,80),width=2);y+=6
    for rw in pg:
        rh=max(cellh(a) for _,a in rw)
        for j,(r,a) in enumerate(rw):
            x0=j*cw;clear=(r.G94_class=='none' and r.PC_class=='none')
            o=np.zeros(a.shape+(3,),np.uint8);o[:]=BG;m=a>0;o[m]=SPB[a[m]];t=Image.fromarray(o)
            if t.height>40:t=t.crop((0,0,t.width,40))
            t=t.resize((min(t.width*Z,cw-8),t.height*Z),Image.NEAREST)
            dr.text((x0+6,y),f'S{int(r.frame)} {r.label}',fill=(15,15,25),font=FB(12))
            if clear:dr.rectangle((x0+6,y+16,x0+60,y+32),fill=(255,255,255),outline=(15,15,25),width=2);dr.text((x0+10,y+17),'CLEAR',fill=(15,15,25),font=FB(11))
            else:dr.rectangle((x0+6,y+16,x0+60,y+32),fill=(15,15,25));dr.text((x0+9,y+17),'AMBIG',fill=(255,255,255),font=FB(11))
            dr.text((x0+66,y+18),f'G {r.G94_score:.2f} P {r.PC_score:.2f}',fill=(15,15,25),font=FB(10))
            im.paste(t,(x0+6,y+38))
        y+=rh
    p=OUT+f'sheets/nonplayer_snes_only_{pi+1}.png';im.save(p);print(p,im.size,sum(len(r) for r in pg))
