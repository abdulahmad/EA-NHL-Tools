# Skeleton v6 sheet: v5 joints + goalie stick (skel6.STICK). Labels RH/LH (hands) and RL/LL (legs, at the knee) so hand and leg labels differ.
# Colour-blind safe: goalie RIGHT = yellow, LEFT = blue, spine = white, stick = pink dashed (black outline); sprite dimmed.
import sys,os,math;sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from skel6 import *
import numpy as np
sys.path.insert(0,'/workspace/preview_back/root/sprite-textures/scripts')
from lib import spritepal,team
from PIL import Image,ImageDraw,ImageFont
B=lambda s:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',s)
sp=spritepal(team('chi'));YEL=(255,225,0);BLU=(40,110,255);WHT=(255,255,255);PNK=(255,150,215)
BONES=[('head','neck',WHT),('neck','pelvis',WHT),('Rsh','Lsh',WHT),('Rhip','Lhip',WHT),('Rsh','Relb',YEL),('Relb','Rhand',YEL),('Rhip','Rknee',YEL),('Rknee','Rank',YEL),
       ('Lsh','Lelb',BLU),('Lelb','Lhand',BLU),('Lhip','Lknee',BLU),('Lknee','Lank',BLU)]
FRG=[413,416,422,428,449,519,980,1000]
SHORT={413:'FRONT (side)',416:'FRONT',422:'FRONT',428:'BACK + front side',449:'BACK',519:'BACK',980:'BACK',1000:'BACK + front side'}
def tile(n,z):
    p=frame(n);h,w=p.shape;a=np.zeros((h,w,3),np.uint8);a[:]=(70,70,70);m=p!=255;a[m]=(sp[p[m]]*0.45).astype(np.uint8)
    OX,OY=4,4;im=Image.new('RGB',(w*z+44,h*z+22),(30,30,30));im.paste(Image.fromarray(a).resize((w*z,h*z),Image.NEAREST),(OX,OY));d=ImageDraw.Draw(im);P=ADJ[n];c=lambda q:((q[0]+.5)*z+OX,(q[1]+.5)*z+OY)
    S=STICK[n];segs=S['segs']
    # hidden part of the shaft (between visible segments): thin dotted
    for s1,s2 in zip(segs,segs[1:]):
        a_,b_=c(s1[-1]),c(s2[0]);L=math.dist(a_,b_);k=max(1,int(L//8))
        for i in range(k):
            t0,t1=i/k,(i+.5)/k;d.line([(a_[0]+(b_[0]-a_[0])*t0,a_[1]+(b_[1]-a_[1])*t0),(a_[0]+(b_[0]-a_[0])*t1,a_[1]+(b_[1]-a_[1])*t1)],fill=PNK,width=2)
    for sg in segs:
        for u,v in zip(sg,sg[1:]):d.line([c(u),c(v)],fill=(0,0,0),width=9)
        for u,v in zip(sg,sg[1:]):d.line([c(u),c(v)],fill=PNK,width=5)
    for y,x in blade_px(n):d.rectangle([x*z+1+OX,y*z+1+OY,x*z+z-2+OX,y*z+z-2+OY],outline=PNK,width=2)
    for a_,b_,col in BONES:d.line([c(P[a_]),c(P[b_])],fill=(0,0,0),width=7)
    for a_,b_,col in BONES:d.line([c(P[a_]),c(P[b_])],fill=col,width=3)
    for k in J:
        col=YEL if k[0]=='R' else BLU if k[0]=='L' else WHT;x,y=c(P[k]);r=5 if k!='head' else 8
        d.ellipse([x-r,y-r,x+r,y+r],fill=col,outline=(0,0,0),width=2)
    bx,by=c(S['butt']);d.rectangle([bx-5,by-5,bx+5,by+5],fill=PNK,outline=(0,0,0),width=2)
    lab=[('Rhand','RH',YEL),('Lhand','LH',BLU),('Rknee','RL',YEL),('Lknee','LL',BLU)]
    for k,t,col in lab:
        x,y=c(P[k]);d.text((x+8,y-10),t,fill=col,font=B(17),stroke_width=3,stroke_fill=(0,0,0))
    d.text((bx+6,by-2),'butt',fill=PNK,font=B(14),stroke_width=3,stroke_fill=(0,0,0))
    if S['heel']:
        hx,hy=c(S['heel']);d.text((hx-10,hy+4),'blade',fill=PNK,font=B(14),stroke_width=3,stroke_fill=(0,0,0))
    return im
cw=245;tiles=[(n,tile(n,min(7,(cw-54)//frame(n).shape[1]))) for n in FRG]
th=max(t.height for _,t in tiles);H=70+2*(th+58)+70
Im=Image.new('RGB',(1000,H),(30,30,30));d=ImageDraw.Draw(Im)
d.text((8,6),'Goalie skeleton v6: joints + STICK',fill='white',font=B(26))
d.text((8,38),'RH/LH = right/left HAND, RL/LL = right/left LEG (knee). Stick held by RH (blocker) on all 8 frames',fill=YEL,font=B(15))
for i,(n,t) in enumerate(tiles):
    x=8+(i%4)*cw;y=64+(i//4)*(th+58);d.text((x,y),f'{n} d{DIRS[n]}',fill='white',font=B(20));d.text((x,y+24),SHORT[n],fill=YEL,font=B(16))
    Im.paste(t,(x,y+50+th-t.height))
y=H-62
for i,(col,t) in enumerate(((YEL,'goalie RIGHT (blocker hand)'),(BLU,'goalie LEFT (catcher hand)'),(WHT,'head / spine'),(PNK,'stick (square = butt, boxes = blade, dots = hidden)'))):
    x=10+(i%3)*330;yy=y+(i//3)*28;d.line([x,yy+10,x+40,yy+10],fill=(0,0,0),width=9);d.line([x,yy+10,x+40,yy+10],fill=col,width=4);d.text((x+48,yy),t,fill='white',font=B(15))
Im.save('/workspace/preview_v2/goalie6/skeleton_v6.png');print(Im.size)
