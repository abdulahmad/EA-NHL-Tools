import uv,json
from jerseys import *
from lib import H
uv.WRAP_LIMBS=uv.SIDE_FIX=uv.FRONT_SMOOTH=uv.GLOVE_UV=True;uv.ELEV=40
CAP={k:tuple(v) for k,v in json.load(open('data/capacity.json')).items()};GC=(6,7)
FR=[13,17,33,221,265,339,343,630];sp=spritepal(team('tor'))
PAIR={'ottawa':'blackhawks_alt','redblack':'panthers_home','edmonton':'thrashers_home'}
rows=[];an=[];flats=[]
for g,jk in PAIR.items():
    caps=dict(CAP);cr=Image.open(R0+D[jk]['ref']).convert('RGB').crop(D[jk]['crest']);caps['crest']=(CAP['crest'][0],max(1,round(CAP['crest'][0]*cr.height/cr.width)))
    A,crest=build(jk,caps);gt=glove_tex(GLOVES[g],*GC);x,y,w,h=ATLAS['glove'];A.paste(gt.resize((w,h),Image.NEAREST),(x,y));gt.save(J+f'glove_{g}_flat_{GC[0]}x{GC[1]}.png')
    big=gt.resize((GC[0]*16,GC[1]*16),Image.NEAREST);d=ImageDraw.Draw(big)
    for i in range(0,big.width,16):d.line((i,0,i,big.height),fill=(0,0,0))
    for i in range(0,big.height,16):d.line((0,i,big.width,i),fill=(0,0,0))
    ref=Image.open(sorted(__import__('glob').glob(J+'ref/gloves/*.webp'))[list(PAIR).index(g)]).convert('RGB').resize((200,200))
    c=Image.new('RGB',(420,230),(30,30,30));c.paste(ref,(0,0));c.paste(big,(220,0));ImageDraw.Draw(c).text((220,big.height+4),f"{g} {GC[0]}x{GC[1]}: cuff / back / fingers; palm=left cols",fill=(240,240,240));flats.append(c)
    for n in FR:
        im,_=render3(n,A,crest,sp,jk,scale=6,pixcrest='cap');rows.append(im);an.append((H[n-1][4],H[n-1][5]))
anchored(rows,an,len(FR),scale=6).save(J+'gloves_demo_grid.png');sheet_aligned(flats,1).save(J+'gloves_flat.png')
