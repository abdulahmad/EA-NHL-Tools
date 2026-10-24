import numpy as np
from PIL import Image,ImageDraw,ImageFont
B=lambda s:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',s)
NEW={'PAD FRONT L':(0,0,9,20),'PAD FRONT R':(9,0,10,20),'PAD BACK L':(19,0,9,20),'PAD BACK R':(28,0,10,20),
     'BLOCKER':(0,20,8,12),'CATCHER':(8,20,11,9),'MASK F':(19,20,6,7),'MASK B':(25,20,5,6),'CAGE':(30,20,1,1)}
OLD={'PAD L':(0,0,9,21),'PAD R':(9,0,10,21),'BLOCKER':(19,0,10,10),'CATCHER':(19,10,10,10),'MASK':(29,0,7,6),'CAGE':(36,0,1,1)}
HUE={'PAD F':(70,110,200),'PAD B':(40,150,120),'PAD':(70,110,200),'BLOC':(200,120,40),'CATC':(170,70,170),'MASK':(180,170,40),'CAGE':(255,230,0)}
def draw(L,z,title,big):
    im=Image.new('RGB',(38*z,32*z),(252,0,252));d=ImageDraw.Draw(im)
    for k,(x,y,w,h) in L.items():
        c=next(v for kk,v in HUE.items() if k.startswith(kk));d.rectangle([x*z,y*z,(x+w)*z-1,(y+h)*z-1],fill=c,outline='white',width=2)
        for i in range(x,x+w+1):d.line([i*z,y*z,i*z,(y+h)*z],fill=tuple(int(a*.8) for a in c))
        for j in range(y,y+h+1):d.line([x*z,j*z,(x+w)*z,j*z],fill=tuple(int(a*.8) for a in c))
        d.rectangle([x*z,y*z,(x+w)*z-1,(y+h)*z-1],outline='white',width=2)
        if k!='CAGE':
            f=B(big);t=k.replace(' ','\n',1) if w<9 or 'PAD' in k else k
            d.multiline_text((x*z+4,y*z+4),t+f'\n{w}x{h}',fill='white',font=f,stroke_width=3,stroke_fill='black')
    return im
top=draw(NEW,24,'',20);old=draw(OLD,12,'',11)
fu=Image.open('/workspace/preview_v2/goalie3/fuhr_oilers_texture_v3.png').resize((38*12,32*12),Image.NEAREST)
W=38*24+20;H=50+top.height+60+old.height+10;o=Image.new('RGB',(W,H),(40,40,40));d=ImageDraw.Draw(o)
d.text((10,8),'A  GOALIE LAYOUT v3 (38x32)  cage = (30,20)',fill=(255,230,0),font=B(30));o.paste(top,(10,50))
y=50+top.height+12;d.text((10,y),'B  old D30 layout',fill=(255,230,0),font=B(26));d.text((10+38*12+12,y),'C  Fuhr Oilers in v3',fill=(255,230,0),font=B(26))
o.paste(old,(10,y+40));o.paste(fu,(10+38*12+12,y+40));o.save('/workspace/preview_v2/goalie3/goalie_layout_v3.png');print(o.size)
