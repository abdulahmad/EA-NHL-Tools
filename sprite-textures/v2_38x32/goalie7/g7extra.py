# v7 outputs: default_gear_<team>.png (base colours only, medium), big CHI view, shading layer per frame (shading/<frame>.png, value = level code),
# shading illustration (A in-game / B base colour only / C shading as luminance; local because A/B are game renders).
import sys,os,json,pickle,numpy as np
H=os.path.dirname(os.path.abspath(__file__));os.chdir('/workspace/preview_back/root/sprite-textures/out');sys.path.insert(0,'../scripts')
from lib import ZN,act,D,frame
from PIL import Image,ImageDraw,ImageFont
K=pickle.load(open('/tmp/g7_canon.pkl','rb'));A,FAMG,GL,SHADE=K['A'],K['FAMG'],K['GL'],K['SHADE']
FRG=[413,416,422,428,449,519,980,1000];P='/workspace/preview_v2/goalie7/'
SH=lambda i:next((w for w in ZN.get(str(i),'').split() if w in('light','dark','medium')),'')
fam=lambda i:' '.join(w for w in ZN[str(i)].split() if w not in('light','dark','medium')) if str(i) in ZN else f'idx{i}'
FIDX={(fam(int(k)),SH(int(k))):int(k) for k in ZN}
lev=lambda f,l:FIDX.get((f,l),FIDX.get((f,''),FIDX.get((f,'medium'))))
def spal(f,c):
    t=next(t for t in json.load(open(D+f)) if t['code']==c);p=act.copy().astype(int);p[128:192]=np.array(t['colors'])*4;return p[np.array(t['map'])]
B=lambda s:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',s)
# level code -> stored value and illustration luminance (light..dark ramp, then special levels)
CODE={'light':(3,230),'flat':(2,170),'medium':(2,170),'dark':(1,110),'grey_hi':(4,200),'grey_lo':(5,215),'outline':(6,0),'toe_shadow':(7,50),'toe_shadow2':(8,70),'cage_lt':(9,140),'cage_dk':(10,90)}
os.makedirs(H+'/shading',exist_ok=True)
for n in FRG:
    h,w=frame(n).shape;s=np.zeros((h,w),np.uint8)
    for q,l in SHADE[n].items():s[q]=CODE[l.split(':')[0]][0]
    Image.fromarray(s).save(f'{H}/shading/{n}.png')
json.dump({k:v[0] for k,v in CODE.items()},open(H+'/shading/levels.json','w'),indent=1)
for tf,c in [('HOME.json','tor'),('AWAY.json','nyr'),('HOME.json','chi'),('AWAY.json','chi'),('HOME.json','mtl')]:
    sp=spal(tf,c);t=np.zeros((32,38,3),np.uint8);t[:]=(252,0,252)
    for (x,y),f in FAMG.items():t[y,x]=sp[lev(f,'medium')] if not f.startswith('idx') else sp[int(f[3:])]
    Image.fromarray(t).save(f'{H}/default_gear_{c}_{tf[:4].lower()}.png')
    if c=='chi' and tf[0]=='H':CHI=t;spc=sp
z=24;T=Image.fromarray(CHI).resize((38*z,32*z),Image.NEAREST);I=Image.new('RGB',(38*z+16,32*z+80),(30,30,30));I.paste(T,(8,72));d=ImageDraw.Draw(I)
for k,(a,b,w,h) in GL.items():d.rectangle([8+a*z,72+b*z,8+(a+w)*z-1,72+(b+h)*z-1],outline=(255,230,0),width=3);d.text((8+a*z+4,72+b*z+2),k,fill=(255,230,0),font=B(16),stroke_width=2,stroke_fill=(0,0,0))
d.text((8,6),'Default gear texture v7 (CHI HOME): BASE colours only',fill='white',font=B(26));d.text((8,40),'164 grey, 22, idx0 outline, toe navy, cage -> shading layer',fill=(255,230,0),font=B(18))
I=I.resize((1000,int(I.height*1000/I.width)),Image.NEAREST);I.save(P+'default_gear_texture_v7_big.png')
# illustration
FR=[413,416,449,519];sc=6;cw=max(frame(n).shape[1] for n in FR)*sc+10;fh=max(frame(n).shape[0] for n in FR)*sc
I=Image.new('RGB',(100+4*cw,90+3*(fh+10)+120),(30,30,30));d=ImageDraw.Draw(I)
d.text((8,6),'Goalie gear: base colour vs shading layer (CHI HOME)',fill='white',font=B(24))
for i,n in enumerate(FR):
    p=frame(n);m=p!=255;a=np.full(p.shape+(3,),30,np.uint8);a[m]=spc[p[m]];b=a.copy();c=a.copy()
    for q,l in SHADE[n].items():
        b[q]=CHI[A[n][q][1],A[n][q][0]];c[q]=(CODE[l.split(':')[0]][1],)*3
        if l.startswith('outline'):b[q]=(0,0,0)
    x=100+i*cw;d.text((x,46),str(n),fill='white',font=B(22))
    for j,im in enumerate((a,b,c)):I.paste(Image.fromarray(im).resize((p.shape[1]*sc,p.shape[0]*sc),Image.NEAREST),(x,80+j*(fh+10)))
for j,L in enumerate('ABC'):d.text((20,80+j*(fh+10)+fh//2-30),L,fill=(255,230,0),font=B(54))
y=80+3*(fh+10);d.text((8,y),'A in-game   B base colour only (texture)   C shading layer as luminance',fill=(255,230,0),font=B(17))
d.text((8,y+28),'C: light=very light, medium=mid, dark=dark grey; 164 grey_hi / 22 grey_lo = pale;',fill='white',font=B(16))
d.text((8,y+52),'outline (idx0/109) = black, toe shadow (30/31) = near-black, cage 134/136 = mid',fill='white',font=B(16))
d.text((8,y+76),'(gear only; jersey/stick/ice drawn as in-game)',fill='white',font=B(16))
if I.width>1000:I=I.resize((1000,int(I.height*1000/I.width)),Image.NEAREST)
I.save(P+'shading_illustration_v7.png');print(I.size)
