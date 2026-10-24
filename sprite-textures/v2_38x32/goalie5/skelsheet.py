# Skeleton sheets: (1) base pose rotated over the 8 SPAgready directions, (2) adjusted skeleton on the 8 test frames.
# Colour-blind safe: goalie RIGHT = yellow, goalie LEFT = blue, spine/head = white; all lines black-outlined; sprite dimmed.
import sys,os;sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from skel5 import *
from lib import spritepal,team
from PIL import Image,ImageDraw,ImageFont
B=lambda s:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',s)
sp=spritepal(team('chi'));YEL=(255,225,0);BLU=(40,110,255);WHT=(255,255,255)
BONES=[('head','neck',WHT),('neck','pelvis',WHT),('Rsh','Lsh',WHT),('Rhip','Lhip',WHT),
       ('Rsh','Relb',YEL),('Relb','Rhand',YEL),('Rhip','Rknee',YEL),('Rknee','Rank',YEL),
       ('Lsh','Lelb',BLU),('Lelb','Lhand',BLU),('Lhip','Lknee',BLU),('Lknee','Lank',BLU)]
def tile(n,P,z,lab=True):
    p=frame(n);h,w=p.shape;a=np.zeros((h,w,3),np.uint8);a[:]=(70,70,70);m=p!=255;a[m]=(sp[p[m]]*0.45).astype(np.uint8)
    im=Image.fromarray(a).resize((w*z,h*z),Image.NEAREST);d=ImageDraw.Draw(im)
    c=lambda k:((P[k][0]+.5)*z,(P[k][1]+.5)*z)
    # far side first (depth if available)
    order=sorted(BONES,key=lambda b:(P[b[0]][2] if len(P[b[0]])>2 else 0))
    for a_,b_,col in order:d.line([c(a_),c(b_)],fill=(0,0,0),width=7)
    for a_,b_,col in order:d.line([c(a_),c(b_)],fill=col,width=3)
    for k in J:
        col=YEL if k[0]=='R' else BLU if k[0]=='L' else WHT;x,y=c(k);r=5 if k!='head' else 8
        d.ellipse([x-r,y-r,x+r,y+r],fill=col,outline=(0,0,0),width=2)
    if lab:
        for k,t in (('Rhand','R'),('Lhand','L'),('Rank','R'),('Lank','L')):
            x,y=c(k);col=YEL if t=='R' else BLU
            d.text((x+9,y-9),t,fill=col,font=B(18),stroke_width=3,stroke_fill=(0,0,0))
    return im
def legend(d,y):
    for i,(col,t) in enumerate(((YEL,'goalie RIGHT side (blocker hand)'),(BLU,'goalie LEFT side (catcher hand)'),(WHT,'head / spine / shoulders / hips'))):
        x=10+i*330;d.line([x,y+12,x+40,y+12],fill=(0,0,0),width=9);d.line([x,y+12,x+40,y+12],fill=col,width=4)
        d.text((x+48,y),t,fill='white',font=B(15))
# (1) base rotation
cw=245;fr=list(GREADY)
tiles=[(n,tile(n,fit(n),min(7,(cw-10)//frame(n).shape[1]),False)) for n in fr]
th=max(t.height for _,t in tiles);H=70+2*(th+34)+40
Im=Image.new('RGB',(1000,H),(30,30,30));d=ImageDraw.Draw(Im)
d.text((8,6),'Goalie base skeleton rotated (SPAgready, yaw 45 deg x d)',fill='white',font=B(24))
d.text((8,38),'one 3D pose, projected per direction, scale/offset fitted; NOT yet adjusted',fill=YEL,font=B(16))
for i,(n,t) in enumerate(tiles):
    x=8+(i%4)*cw;y=64+(i//4)*(th+34);d.text((x,y),f'{n}  d{GREADY[n]}',fill='white',font=B(20));Im.paste(t,(x,y+28+th-t.height))
legend(d,H-34);Im.save('/workspace/preview_v2/goalie5/skeleton_base_rotation.png');print(Im.size)
# (2) adjusted on test frames
FRG=[413,416,422,428,449,519,980,1000]
SHORT={413:'FRONT (side)',416:'FRONT',422:'FRONT',428:'BACK + front side',449:'BACK',519:'BACK',980:'BACK',1000:'BACK + front side'}
tiles=[(n,tile(n,{k:(*v,fit(n)[k][2]) for k,v in ADJ[n].items()},min(7,(cw-10)//frame(n).shape[1]))) for n in FRG]
th=max(t.height for _,t in tiles);H=70+2*(th+58)+40
Im=Image.new('RGB',(1000,H),(30,30,30));d=ImageDraw.Draw(Im)
d.text((8,6),'Goalie skeleton per frame (base rotated + adjusted)',fill='white',font=B(24))
d.text((8,38),'facing = Abdul pt861u; d = SPA direction (d0 away, d4 toward camera)',fill=YEL,font=B(16))
for i,(n,t) in enumerate(tiles):
    x=8+(i%4)*cw;y=64+(i//4)*(th+58);d.text((x,y),f'{n} d{DIRS[n]}',fill='white',font=B(20));d.text((x,y+24),SHORT[n],fill=YEL,font=B(16))
    Im.paste(t,(x,y+50+th-t.height))
legend(d,H-34);Im.save('/workspace/preview_v2/goalie5/skeleton_v5.png');print(Im.size)
