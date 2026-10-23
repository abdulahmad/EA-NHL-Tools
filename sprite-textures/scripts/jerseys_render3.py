# v3: capacity-limited flat textures + fixed UV (limb wrap, side fix, front smoothing, ELEV 40) + trim isolines
import uv,json
from jerseys import *
from lib import H
uv.WRAP_LIMBS=uv.SIDE_FIX=uv.FRONT_SMOOTH=uv.GLOVE_UV=uv.PAD_UV=True;uv.ELEV=40
CAP={k:tuple(v) for k,v in json.load(open('data/capacity.json')).items()}
FR=[1,9,17,25,33,41,49,57,100,200,300,889,897,1080,409,980];SUM=[1,17,33,100,889,409]
sp=spritepal(team('tor'));anc={n:(H[n-1][4],H[n-1][5]) for n in FR}
ORDER=['torso_front','torso_back','crest','sleeve','sleeve_b','pants','sock','sock_b','helmet','glove','skate','goalie_mask','pad','blocker','catcher']
def flat_sheet(flat,S=12):
    ims=[]
    for nm in ORDER:
        im=flat[nm].resize((flat[nm].width*S,flat[nm].height*S),Image.NEAREST);d=ImageDraw.Draw(im)
        for x in range(0,im.width,S):d.line((x,0,x,im.height),fill=(0,0,0))
        for y in range(0,im.height,S):d.line((0,y,im.width,y),fill=(0,0,0))
        c=Image.new('RGB',(max(im.width,90),im.height+16),(30,30,30));c.paste(im,(0,16));ImageDraw.Draw(c).text((2,2),f'{nm} {flat[nm].width}x{flat[nm].height}',fill=(240,240,240));ims.append(c)
    return sheet_aligned(ims,8,8)
cache={};flats={}
for k in D:
    caps=dict(CAP);cr=Image.open(R0+D[k]['ref']).convert('RGB').crop(D[k]['crest'])
    caps['crest']=(CAP['crest'][0],max(1,round(CAP['crest'][0]*cr.height/cr.width)))
    A,crest=build(k,caps);flats[k]=dict(build.flat);A.save(J+f'{k}_cap_atlas.png')
    fs=flat_sheet(flats[k]);fs.save(J+f'{k}_flat.png')
    ims=[]
    for n in FR:im,_=render3(n,A,crest,sp,k,pixcrest='cap');ims.append(im);cache[(k,n)]=im
    anchored(ims,[anc[n] for n in FR],8).save(J+f'{k}_grid_v3.png')
th=[Image.open(R0+D[k]['ref']).convert('RGB') for k in D];th=[t.resize((int(t.width*200/t.height),200)) if t.height>t.width*1.5 else t.resize((300,int(300*t.height/t.width))) for t in th]
imgs=[cache[(k,n)] for n in SUM for k in D];an=[anc[n] for n in SUM for k in D]
g=anchored(imgs,an,6);sc=5
gcw=[max(an[i][0] for i in range(c,len(imgs),6))*sc+max(imgs[i].width-an[i][0]*sc for i in range(c,len(imgs),6))+6 for c in range(6)]
cw=[max(gcw[c],th[c].width+8) for c in range(6)];TH=max(t.height for t in th)+30
S=Image.new('RGB',(sum(cw),TH+g.height),(20,20,20));d=ImageDraw.Draw(S);x=gx=0
for c,k in enumerate(D):
    S.paste(th[c],(x+(cw[c]-th[c].width)//2,4));d.text((x+4,TH-22),D[k]['name'],fill=(230,230,230))
    S.paste(g.crop((gx,0,gx+gcw[c],g.height)),(x+(cw[c]-gcw[c])//2,TH));x+=cw[c];gx+=gcw[c]
S.save(J+'00_summary_all6_v3.png')
