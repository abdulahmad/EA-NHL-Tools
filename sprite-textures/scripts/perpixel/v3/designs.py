# Chicago (blackhawks_alt) and Montreal (canadiens_babyblue) in the per-pixel layout, from the v3 hand-authored designs (jerseys.py D:
# stripe colour lists + crest crop of the reference photo). Each game colour zone block gets the design colour of the matching stripe
# (yoke, waist 1/2/3, arm stripes 1-3, sock stripes 1-2 ...); the crest block is the reference crest pixelated to the game's 5x4 crest grid.
# (A first attempt that voted old-atlas colours through the old fractional UV smeared stripes diagonally across zone blocks - rejected.)
# Rendering: 1 texel = 1 sprite pixel, colour x shade (light 1.05 / medium .85 / dark .62) from the pixel's palette index.
import sys,os,json,collections,numpy as np;sys.path.insert(0,'.');sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from PIL import Image,ImageDraw
import uv
uv.WRAP_LIMBS=uv.SIDE_FIX=uv.FRONT_SMOOTH=uv.GLOVE_UV=uv.PAD_UV=True;uv.ELEV=40
from jerseys import D as JD,R0,crest_px
from ppmap import *
from lib import spritepal,team,toimg,D as DD
L=json.load(open('poc3/layout.json'));TW,TH=L['size'];LAY=L['layout'];WMIN=L['wmin']
def tpos(k):
    if k[0]=='crest':x0,y0,_,_=LAY['crest'];return x0+k[2],y0+k[1]
    x0,y0,w,h=LAY['|'.join(k[:4])];c=k[5]-WMIN[k[2]] if k[3] in ('waist 1','waist 2','waist 3') else k[5];assert c<w and k[4]<h;return x0+c,y0+k[4]
SRC=[370,889,43,58];TEST=[370,889,897,42,47,52,57,62,67,72,77];FR=sorted(set(SRC+TEST))
OLD={'torso':{'front':'torso_front','back':'torso_back'}}
W=(245,245,240);BK=(20,20,20);RD=(200,40,30);BB=(125,165,230);NV=(20,40,140)
Z0=['yoke corner','shoulder patch','yoke 1','yoke 2','yoke 3','jersey','waist 1','waist 2','waist 3','upper arm','arm stripe 1','arm stripe 2','arm stripe 3','forearm','pants','pants stripe 1','pants stripe 2','socks','socks stripe 1','socks stripe 2','helmet']
ZONES={'chicago':dict(zip(Z0,[RD,RD,RD,RD,RD,BK,W,RD,W,RD,W,RD,W,BK,BK,BK,BK,RD,W,W,BK])),
       'montreal':dict(zip(Z0,[BB,BB,BB,BB,BB,BB,BB,NV,BB,BB,W,NV,W,BB,NV,NV,NV,BB,NV,NV,NV]))}
SH={'light':1.05,'medium':.85,'dark':.62,'flat':.85}
A_={n:address(n) for n in FR}
TEAMS={'chicago':'blackhawks_alt','montreal':'canadiens_babyblue'};OUT={}
for tk,jk in TEAMS.items():
    cr=Image.open(R0+JD[jk]['ref']).convert('RGB').crop(JD[jk]['crest']);C=np.asarray(crest_px(cr,5,4))
    T=np.zeros((TH,TW,3),np.uint8);T[...,0]=255;T[...,2]=255;have=np.zeros((TH,TW),bool)
    Z_=ZONES[tk]
    for k,(bx,by,w,h) in LAY.items():
        if k=='crest':continue
        band=k.split('|')[3];T[by:by+h,bx:bx+w]=Z_[band];have[by:by+h,bx:bx+w]=True
    x0,y0,_,_=LAY['crest'];T[y0:y0+4,x0:x0+5]=C;have[y0:y0+4,x0:x0+5]=True
    F=T.copy()   # fill unseen texels inside each block from the nearest seen texel of the same block (authoring, for viewing / other frames)
    from scipy import ndimage as ndi
    for k,(bx,by,w,h) in LAY.items():
        hb=have[by:by+h,bx:bx+w]
        if hb.any() and not hb.all():_,(iy,ix)=ndi.distance_transform_edt(~hb,return_indices=True);F[by:by+h,bx:bx+w]=T[by:by+h,bx:bx+w][iy,ix]
    Image.fromarray(T).save(f'poc3/tex_{tk}_raw.png');Image.fromarray(F).save(f'poc3/tex_{tk}_filled.png')
    Z=12
    for nm,img in (('raw',T),('filled',F)):
        I=Image.fromarray(img).resize((TW*Z,TH*Z),Image.NEAREST);d=ImageDraw.Draw(I)
        for k,(bx,by,w,h) in LAY.items():d.rectangle([bx*Z,by*Z,(bx+w)*Z-1,(by+h)*Z-1],outline=(255,255,0))
        I.save(f'poc3/tex_{tk}_{nm}_x{Z}.png')
    sp=spritepal(team('tor'));OUT[tk]={}
    for n in TEST:
        p,a,_=A_[n];o=sp[p].astype(float)
        for (y,x),k in a.items():
            u,v=tpos(k);i=int(p[y,x]);o[y,x]=F[v,u]*(1 if k[0]=='crest' else SH[fam(i)[1]])
        OUT[tk][n]=(np.clip(o,0,255),p!=255)
# Leafs/Rangers: re-rendered from the per-pixel extraction (== game render, 0 diff)
for tk,(src,code) in (('leafs','HOME','tor'),('rangers','AWAY','nyr')) and {'leafs':('HOME','tor'),'rangers':('AWAY','nyr')}.items():
    t=next(q for q in json.load(open(DD+src+'.json')) if q['code']==code);sp=spritepal(t);OUT[tk]={n:(sp[frame(n)].astype(float),frame(n)!=255) for n in TEST}
S=8;ORDER=['leafs','rangers','chicago','montreal']
def grid(rows,head,path):
    cw=max(i.width for _,r in rows for i in r)+24;rh=max(i.height for _,r in rows for i in r)+30
    O=Image.new('RGB',(cw*len(head),rh*len(rows)+22),(20,20,20));d=ImageDraw.Draw(O)
    for j,h in enumerate(head):d.text((j*cw+cw//2-len(h)*3,5),h,fill=(255,255,0))
    for k,(t_,r) in enumerate(rows):
        y=22+k*rh;d.text((6,y+2),t_,fill=(255,255,255))
        for j,i in enumerate(r):O.paste(i,(j*cw+(cw-i.width)//2,y+22+(rh-30-i.height)//2))
    O.save(path)
lab={n:f"{n} d{A_[n][2]['dir']} {A_[n][2]['facing']}" for n in TEST}
grid([(lab[n],[toimg(*OUT[t][n],S) for t in ORDER]) for n in TEST],['Leafs home','Rangers away','Chicago (blackhawks_alt)','Montreal (canadiens_babyblue)'],'poc3/combined_4teams.png')
for tk in ('chicago','montreal'):
    rows=[(lab[n],[toimg(*OUT['leafs'][n],S),toimg(*OUT[tk][n],S)]) for n in TEST]
    grid(rows,['game render (Leafs, reference pose)',f'{tk} per-pixel texture -> frame'],f'poc3/compare_{tk}.png')
print('ok')
