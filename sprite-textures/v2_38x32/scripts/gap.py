import numpy as np
from PIL import Image,ImageDraw,ImageFont
F=lambda z:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',z)
D=np.asarray(Image.open('/workspace/preview_v2/raw/stripe_diagnostic_v2.png').convert('RGB'))
MAG=(252,0,252)
# zone column spans per row (rows 6-17) from the v2 rules
def zones(v):
    Z={}
    for name,a,b in (('FR',0,3),('FT',3,16),('FL',16,19),('BL',20,23),('BT',23,35),('BR',34,37)):pass
    return Z
import json
J=json.load(open('/workspace/preview_v2/column_map_v2.json'))
ZN={}
for k,(x,y) in J['map_new_to_oldwide'].items():
    nx,v=map(int,k.split(','))
    if not 6<=v<=17 or x>=50:continue
    ZN[(nx,v)]='FR' if x<=3 else 'FT' if x<=18 else 'FL' if x<=23 else 'BL' if x<=28 else 'BT' if x<=43 else 'BR'
def spacer(D,ZN):
    SH={'FR':0,'FT':1,'FL':2,'BL':3,'BT':4,'BR':5}
    E=np.zeros((32,D.shape[1]+5,3),np.uint8);E[:]=MAG;Z2={}
    for v in range(32):
        for x in range(D.shape[1]):
            if tuple(D[v,x])==MAG:continue
            z=ZN.get((x,v));sh=SH[z] if z else (1 if x<=19 else 4)
            E[v,x+sh]=D[v,x]
            if z:Z2[(x+sh,v)]=z
    return E,Z2
def panel(D,ZN,title):
    S=16;r0,r1=5,18;w=D.shape[1]
    crop=D[r0:r1]
    im=Image.fromarray(crop).resize((w*S,(r1-r0)*S),Image.NEAREST).convert('RGB')
    im=Image.blend(im,Image.new('RGB',im.size,(0,0,0)),0.35)
    P=Image.new('RGB',(w*S+40,(r1-r0)*S+120),(0,0,0));P.paste(im,(20,90));d=ImageDraw.Draw(P)
    d.text((20,10),title,font=F(48),fill=(255,255,0))
    col={'FT':(255,255,255),'BT':(255,255,255),'FR':(80,160,255),'FL':(80,160,255),'BL':(80,160,255),'BR':(80,160,255)}
    # outlines: each texel edge where neighbour is different zone
    for (x,v),z in ZN.items():
        X=20+x*S;Y=90+(v-r0)*S
        for dx,dy,seg in ((-1,0,[(X,Y),(X,Y+S)]),(1,0,[(X+S,Y),(X+S,Y+S)]),(0,-1,[(X,Y),(X+S,Y)]),(0,1,[(X,Y+S),(X+S,Y+S)])):
            if ZN.get((x+dx,v+dy))!=z:d.line(seg,fill=col[z],width=3)
    n=0
    for (x,v),z in ZN.items():
        z2=ZN.get((x+1,v))
        if z2 and z2!=z:
            n+=1;X=20+(x+1)*S;Y=90+(v-r0)*S+S//2
            d.ellipse([X-9,Y-9,X+9,Y+9],fill=(255,230,0),outline=(0,0,0),width=3)
    for name,cx in (('FRONT torso',(3+16)/2),('BACK torso',(23+35)/2)):
        pass
    return P,n
A,na=panel(D,ZN,'A  current')
E,Z2=spacer(D,ZN);B,nb=panel(E,Z2,'B  with spacers')
W=A.width+B.width+40;H=max(A.height,B.height)+330
I=Image.new('RGB',(W,H),(0,0,0));I.paste(A,(0,0));I.paste(B,(A.width+40,0));d=ImageDraw.Draw(I)
y=max(A.height,B.height)+10
for t in [f'Yellow dots = arm touching torso/other arm, no gap (A: {na}, B: {nb}).',
          'White outline = torso, blue outline = arms.',
          'Why it matters: column-based segmentation, bilinear filtering or neighbour bleed',
          'would mix arm and torso colours. Pure per-texel lookup is NOT affected.',
          'Fix: insert a 1px magenta spacer column at each join (B: +5 cols, 38 -> 43 wide).']:
    d.text((20,y),t,font=F(30),fill=(255,255,255));y+=60
I.save('/workspace/preview_v2/gap_explain.png');print(na,nb,I.size)
