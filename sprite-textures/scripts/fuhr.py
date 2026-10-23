# Grant Fuhr goalie gear: own pixel redraw at measured capacity (pad 19x21, blocker/catcher 10x10, mask 7x6), rendered on goalie frames
import uv,json
from jerseys import *
from lib import H
uv.WRAP_LIMBS=uv.SIDE_FIX=uv.FRONT_SMOOTH=uv.GLOVE_UV=uv.PAD_UV=True;uv.ELEV=40
CAP={k:tuple(v) for k,v in json.load(open('data/capacity.json')).items()}
WH=(240,240,236);RD=(215,40,30);NB=(25,35,95);OR=(240,110,30);TN=(205,185,150);BK=(20,20,20)
def pad(w,h):
    im=Image.new('RGB',(w,h),WH);d=ImageDraw.Draw(im)
    d.rectangle((0,round(.36*h),w-1,round(.55*h)-1),fill=RD)           # knee/thigh band
    a=round(.64*w);d.rectangle((a,0,a+max(1,round(.08*w))-1,h-1),fill=NB)  # inner-edge vertical stripe
    for v in (.66,.78):d.line((round(.2*w),round(v*h),round(.5*w),round(v*h)),fill=(200,200,200))  # boot-strap hints
    return im
def blocker(w,h):
    im=Image.new('RGB',(w,h),RD);d=ImageDraw.Draw(im);d.rectangle((0,0,w-1,h-1),outline=WH)
    d.rectangle((round(.72*w),0,w-1,h-1),fill=WH);d.rectangle((round(.82*w),round(.6*h),w-1,h-1),fill=TN);return im
def catcher(w,h):
    im=Image.new('RGB',(w,h),WH);d=ImageDraw.Draw(im);d.rectangle((0,0,w-1,h-1),outline=RD)
    d.rectangle((round(.3*w),round(.35*h),round(.75*w),round(.85*h)),fill=RD);d.rectangle((0,0,w-1,max(1,round(.15*h))-1),fill=RD);return im
def mask(w,h):
    im=Image.new('RGB',(w,h),WH);d=ImageDraw.Draw(im)
    d.rectangle((0,0,w-1,0),fill=OR);d.point([(1,1),(w-2,1)],fill=NB);d.rectangle((0,h-1,w-1,h-1),fill=NB)
    d.rectangle((round(.3*w),round(.4*h),round(.7*w)-1,round(.8*h)-1),fill=BK);return im
G={'pad':pad(*CAP['pad']),'blocker':blocker(*CAP['blocker']),'catcher':catcher(*CAP['catcher']),'goalie_mask':mask(*CAP['goalie_mask'])}
A,crest=build('thrashers_home',None)
A=Image.new('RGB',(512,512),(30,30,30));Dd=ImageDraw.Draw(A)
for nm,(x,y,w,h) in ATLAS.items():Dd.rectangle((x,y,x+w-1,y+h-1),fill={'torso_front':(30,60,150),'torso_back':(30,60,150),'sleeve':(30,60,150),'sleeve_b':(30,60,150),'pants':(30,60,150),'sock':(30,60,150),'sock_b':(30,60,150),'helmet':WH,'glove':(30,60,150)}.get(nm,(60,60,60)))
for nm,im in G.items():
    x,y,w,h=ATLAS[nm];A.paste(im.resize((w,h),Image.NEAREST),(x,y));im.save(J+f'fuhr_{nm}_{im.width}x{im.height}.png')
sp=spritepal(team('edm'))
FR=[407,410,413,416,419,422,425,428]+[408,411,447,449,519,521,471,1000]  # SPAgready 8 dirs (+1), glove, stack, dive, stick, 95 goalie
ims=[];an=[]
for n in FR:
    p,part,U,V,Rg=solve(n);m=p!=255;has=Rg!='';o=sp[p].astype(float);sh=shade_of(p)[...,None]
    o[has]=(sample(A,p,U,V,Rg)*sh)[has]
    if not solve.front: mm=Rg=='goalie_mask';o[mm]=np.array(NB)*sh[mm]   # back of mask = navy helmet back
    ims.append(toimg(np.clip(o,0,255),m,6));an.append((H[n-1][4],H[n-1][5]))
anchored(ims,an,8,scale=6).save(J+'fuhr_goalie_grid.png')
fl=[]
for nm,im in G.items():
    b=im.resize((im.width*16,im.height*16),Image.NEAREST);d=ImageDraw.Draw(b)
    for i in range(0,b.width,16):d.line((i,0,i,b.height),fill=(0,0,0))
    for i in range(0,b.height,16):d.line((0,i,b.width,i),fill=(0,0,0))
    c=Image.new('RGB',(b.width,b.height+16),(30,30,30));c.paste(b,(0,16));ImageDraw.Draw(c).text((2,2),f'{nm} {im.width}x{im.height}',fill='white');fl.append(c)
sheet_aligned(fl,4,10).save(J+'fuhr_flat.png')
