# McDavid-style stick (own redraw at stick capacity 1x26) on an Oilers-ish jersey with Edmonton gloves
import uv,json,glob
from jerseys import *
from lib import H
uv.WRAP_LIMBS=uv.SIDE_FIX=uv.FRONT_SMOOTH=uv.GLOVE_UV=uv.PAD_UV=uv.STICK_UV=True;uv.ELEV=40
CAP={k:tuple(v) for k,v in json.load(open('data/capacity.json')).items()}
OB=(25,65,160);OO=(240,110,30)
D['oilers_home']=dict(name='Oilers-ish home',ref='../ref/gloves/'+sorted(glob.glob(J+'ref/gloves/*.webp'))[2].split('/')[-1],crest=(300,568,392,660),num='',numc=W,
   base=OB,yoke=[(0,.08,OO)],torso=[(.82,.86,OO),(.86,.88,W),(.88,.92,OO)],sleeve=[(0,.1,OO),(.5,.56,OO),(.56,.59,W),(.59,.65,OO)],
   sock=[(.45,.52,OO),(.52,.56,W),(.56,.63,OO)],sockbase=OB,pants=OB,pstripe=OO,helmet=OB,glove=OB)
def stick_tex(L):
    im=Image.new('RGB',(1,L),(225,225,225));d=ImageDraw.Draw(im)
    d.rectangle((0,0,0,max(1,round(.08*L))-1),fill=(40,90,200))              # knob tape
    for v in (.45,.52,.6):d.point((0,round(v*L)),fill=(120,120,120))         # CCM lettering hint
    d.rectangle((0,round(.84*L),0,L-1),fill=(250,250,250))                     # blade tape
    return im
ST=stick_tex(CAP['stick'][1]);ST.save(J+f'stick_mcdavid_flat_1x{ST.height}.png')
caps=dict(CAP);caps['crest']=(CAP['crest'][0],CAP['crest'][0])
A,crest=build('oilers_home',caps)
x,y,w,h=ATLAS['stick'];A.paste(ST.resize((w,h),Image.NEAREST),(x,y))
x,y,w,h=ATLAS['glove'];A.paste(glove_tex(GLOVES['edmonton'],6,7).resize((w,h),Image.NEAREST),(x,y))
sp=spritepal(team('edm'))
FR=[1,9,17,25,33,41,49,57,100,200,300,13,221,343,889,897]
ims=[];an=[]
for n in FR:im,_=render3(n,A,crest,sp,'oilers_home',scale=6,pixcrest='cap');ims.append(im);an.append((H[n-1][4],H[n-1][5]))
anchored(ims,an,8,scale=6).save(J+'stick_oilers_demo_grid.png')
b=ST.resize((24,ST.height*16),Image.NEAREST);d=ImageDraw.Draw(b)
for i in range(0,b.height,16):d.line((0,i,24,i),fill=(0,0,0))
ref=Image.open(J+'ref/stick_mcdavid.png').convert('RGB');ref=ref.resize((ref.width*b.height//ref.height,b.height))
c=Image.new('RGB',(ref.width+60,b.height+20),(30,30,30));c.paste(ref,(0,20));c.paste(b,(ref.width+20,20));ImageDraw.Draw(c).text((2,2),f'stick 1x{ST.height}: knob tape / shaft (CCM hint) / blade tape',fill='white');c.save(J+'stick_flat.png')
