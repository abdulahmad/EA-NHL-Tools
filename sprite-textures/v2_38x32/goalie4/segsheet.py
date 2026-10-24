import sys,numpy as np;sys.path.insert(0,'../scripts');sys.path.insert(0,'/workspace/preview_v2/goalie4')
from lib import *;from seg4 import seg,FRG
from PIL import ImageDraw,ImageFont
B=lambda s:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',s)
COL={'padF_L':((255,230,0),'FL'),'padF_R':((0,30,140),'FR'),'padB_L':((120,230,255),'BL'),'padB_R':((80,0,110),'BR'),
     'blocker':((255,255,255),'K'),'catcher':((0,0,0),'C'),'maskF':((255,150,0),'MF'),'maskB':((110,60,0),'MB'),'cage':((255,120,220),'x')}
NAME={'padF_L':'pad FRONT, screen-left','padF_R':'pad FRONT, screen-right','padB_L':'pad BACK, screen-left','padB_R':'pad BACK, screen-right',
      'blocker':'BLOCKER','catcher':'CATCHER','maskF':'MASK front','maskB':'MASK back','cage':'cage (pink, X)'}
lum=lambda c:0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
sp=spritepal(team('chi'));z=7;cw=245;BGc=(25,25,25);BODY=(150,150,150)
rowh=44*z//1
def tile(n,mode):
    p,o,f=seg(n);h,w=p.shape;zz=min(z,cw//w);im=Image.new('RGB',(w*zz,h*zz),BGc);d=ImageDraw.Draw(im)
    for y in range(h):
        for x in range(w):
            if p[y,x]==255:continue
            r=[x*zz,y*zz,x*zz+zz-1,y*zz+zz-1]
            if mode=='game':d.rectangle(r,fill=tuple(int(v) for v in sp[p[y,x]]));continue
            c=COL[o[y,x]][0] if o[y,x] else BODY;d.rectangle(r,fill=c)
            if o[y,x] in('padF_R','padB_R','catcher','maskB'):d.line([r[0],r[3],r[2],r[1]],fill=(200,200,200),width=1)
            if o[y,x]=='cage':d.line(r,fill=(0,0,0),width=2);d.line([r[0],r[3],r[2],r[1]],fill=(0,0,0),width=2)
    if mode=='seg':
        for k,(c,t) in COL.items():
            if k=='cage':continue
            ys,xs=np.nonzero(o==k)
            if len(ys)==0:continue
            # label at the part pixel nearest the centroid
            cy,cx=ys.mean(),xs.mean();j=np.argmin((ys-cy)**2+(xs-cx)**2)
            tc=(0,0,0) if lum(c)>100 else (255,255,255)
            d.text((xs[j]*zz+zz//2,ys[j]*zz+zz//2),t,fill=tc,font=B(17),anchor='mm',stroke_width=2,stroke_fill=c)
    return im
W=1000;cols=4;Hrow=None
tiles=[(n,tile(n,'game'),tile(n,'seg'),seg(n)[2]) for n in FRG]
th=max(max(a.height,b.height) for _,a,b,_ in tiles)
H=60+2*(32+2*th+16)+190
Im=Image.new('RGB',(W,H),(30,30,30));d=ImageDraw.Draw(Im)
d.text((8,6),'Goalie gear segmentation v4 (palette zones + logical masks)',fill='white',font=B(26))
d.text((8,36),'per frame: top = in-game (Chicago home), bottom = parts',fill=(255,230,0),font=B(17))
for i,(n,a,b,f) in enumerate(tiles):
    x=8+(i%4)*cw;y=64+(i//4)*(32+2*th+16)
    d.text((x,y),f"{n}  {'FRONT' if f=='F' else 'BACK'}",fill='white',font=B(22))
    Im.paste(a,(x,y+30+th-a.height));Im.paste(b,(x,y+34+2*th-b.height))
y0=H-185
for j,(k,(c,t)) in enumerate(COL.items()):
    x=8+(j%3)*330;y=y0+(j//3)*58
    d.rectangle([x,y,x+46,y+46],fill=c,outline='white',width=2)
    if k=='cage':d.line([x,y,x+46,y+46],fill=(0,0,0),width=3);d.line([x,y+46,x+46,y],fill=(0,0,0),width=3)
    else:d.text((x+23,y+23),t,fill=(0,0,0) if lum(c)>100 else (255,255,255),font=B(20),anchor='mm')
    d.text((x+56,y+12),NAME[k],fill='white',font=B(19))
Im.save('/workspace/preview_v2/goalie4/segmentation_v4.png');print(Im.size)
