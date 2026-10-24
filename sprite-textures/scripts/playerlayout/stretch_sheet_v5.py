# v5.6 sheet (Abdul pt807u): stripe_diagnostic texture (6x, row numbers, forearm rows 15-17 boxed) beside every test frame row,
# then game / flat / combined renders through the real v5 mapping. Frames with the approved forearm stretch (72 L, 77 R) are labelled.
# Usage (from sprite-textures/out): PYTHONPATH=../scripts python3 ../scripts/playerlayout/stretch_sheet_v5.py <out frames dir> [textures dir]
import sys,os,runpy,numpy as np;from PIL import Image,ImageDraw
H=os.path.dirname(os.path.abspath(__file__));OUT=sys.argv[1];TEX=sys.argv[2] if len(sys.argv)>2 else os.path.join(os.path.dirname(OUT),'textures')
sys.argv=['x','/tmp/_v5_sheet',TEX];G=runpy.run_path(f'{H}/frames_v5.py')
FR,DIRS,REN,up,gameimg,AS=G['FRAMES'],G['DIRS'],G['RENDERS'],G['up'],G['gameimg'],G['ARM_STRETCH']
T=Image.open(f'{TEX}/stripe_diagnostic.png').convert('RGB');TS=6;tim=T.resize((T.width*TS,T.height*TS),Image.NEAREST)
def texpanel():
    W=Image.new('RGB',(tim.width+28,tim.height),(255,255,255));W.paste(tim,(28,0));d=ImageDraw.Draw(W)
    for v in [v for v in range(0,T.height,2) if v not in(14,16,18)]:d.text((2,v*TS-2),str(v),fill=(0,0,0))
    y0,y1=15*TS,18*TS;d.rectangle([27,y0-1,W.width-1,y1],outline=(0,0,0),width=3);d.rectangle([29,y0+1,W.width-3,y1-2],outline=(255,255,0),width=1)
    d.text((2,15*TS-3),'15',fill=(0,0,0));d.text((2,17*TS-1),'17',fill=(0,0,0))
    return W
TP=texpanel();S=6
CW=max(G['MAPS'][n][0].shape[1] for n in FR)*S+16;RH=max(max(G['MAPS'][n][0].shape[0] for n in FR)*S+22,TP.height+10)
cols=[('game (chi home)',lambda n:gameimg(n,'stripe_diagnostic')),('flat',lambda n:REN[('stripe_diagnostic',n)][0]),('combined',lambda n:REN[('stripe_diagnostic',n)][2])]
LW=150;W=Image.new('RGB',(TP.width+10+LW+CW*len(cols),40+RH*len(FR)),(24,24,24));dr=ImageDraw.Draw(W)
dr.rectangle([0,0,W.width,16],fill=(255,255,0));dr.text((6,3),'v5.6 APPLIED forearm stretch (approved pt807u): 72 L forearm + 77 R forearm only, rows 15-17 spread evenly over the drawn forearm; all other arms factor 1.0',fill=(0,0,0))
dr.text((6,22),'texture (6x) | forearm rows 15-17 boxed',fill=(255,255,255))
X0=TP.width+10+LW
for j,(lab,_) in enumerate(cols):tw=dr.textlength(lab);dr.text((X0+j*CW+(CW-tw)//2,24),lab,fill=(255,255,0))
for i,n in enumerate(FR):
    y=40+i*RH;W.paste(TP,(0,y+(RH-TP.height)//2))
    st=[s for (m,s) in AS if m==n];lab=f"{n} d{DIRS[n]} "+('front' if DIRS[n] in(3,4,5) else 'back' if DIRS[n] in(0,1,7) else 'side')
    dr.text((TP.width+14,y+RH//2-14),lab,fill=(220,220,220))
    if st:
        t=f"STRETCHED: {st[0]} forearm";tw=dr.textlength(t);dr.rectangle([TP.width+12,y+RH//2+2,TP.width+16+tw,y+RH//2+16],fill=(255,255,0));dr.text((TP.width+14,y+RH//2+3),t,fill=(0,0,0))
    for j,(_,f) in enumerate(cols):
        im=up(f(n),S);W.paste(im,(X0+j*CW+(CW-im.width)//2,y+(RH-im.height)//2))
    dr.line([(0,y+RH-1),(W.width,y+RH-1)],fill=(90,90,90))
W.save(f'{OUT}/stripe_diagnostic_with_texture_sheet.png')
# close-up: 72 and 77 only, before/after not available here -> zoomed renders at 12x
Z=12;ims=[]
for n in (72,77):
    ims+= [up(REN[('stripe_diagnostic',n)][0],Z)]
C=Image.new('RGB',(TP.width+20+sum(i.width+20 for i in ims),max(TP.height,max(i.height for i in ims))+30),(24,24,24));d=ImageDraw.Draw(C);C.paste(TP,(0,30));x=TP.width+20
for n,im in zip((72,77),ims):C.paste(im,(x,30));d.text((x,8),f"{n} flat 12x ({'L' if n==72 else 'R'} forearm stretched)",fill=(255,255,0));x+=im.width+20
C.save(f'{OUT}/stretch_72_77_closeup.png');print('ok')
