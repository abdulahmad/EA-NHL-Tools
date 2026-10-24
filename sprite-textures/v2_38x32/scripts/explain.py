import json,pickle,numpy as np
from PIL import Image,ImageDraw,ImageFont
F=lambda z:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',z)
Y=(255,230,0);WH=(255,255,255);BL=(60,140,255);BK=(0,0,0)
L=lambda p:np.asarray(Image.open(p).convert('RGB'))
DW=L('/workspace/preview_wide/raw/stripe_diagnostic_wide.png');D2=L('raw/stripe_diagnostic_v2.png')
C2=L('raw/chicago_home_top_v2.png');C54=L('/workspace/out/zones/v2/poc5/v5/textures/chicago_home_top.png')
M2={int(n):{tuple(map(int,k.split(','))):tuple(v) for k,v in m.items()} for n,m in json.load(open('mapped/v2_mapping.json'))['maps'].items()}
M54={int(n):{tuple(map(int,k.split(','))):tuple(v) for k,v in m.items()} for n,m in json.load(open('/workspace/preview_back/back_preview.json'))['maps'].items()}
FA=json.load(open('mapped/facts.json'));FB=json.load(open('mapped/facts2.json'))
def tex(a,c0,c1,r0,r1,S):return Image.fromarray(a[r0:r1,c0:c1]).resize(((c1-c0)*S,(r1-r0)*S),Image.NEAREST)
def box(d,x0,y0,S,c0,r0,cs,rs,col,w=4):
    d.rectangle([x0+(cs[0]-c0)*S,y0+(rs[0]-r0)*S,x0+(cs[1]-c0+1)*S-1,y0+(rs[1]-r0+1)*S-1],outline=BK,width=w+4)
    d.rectangle([x0+(cs[0]-c0)*S+2,y0+(rs[0]-r0)*S+2,x0+(cs[1]-c0+1)*S-3,y0+(rs[1]-r0+1)*S-3],outline=col,width=w)
def frame(m,T,S,pad=2,keys=None):
    xs=[k[0] for k in m];ys=[k[1] for k in m];x0,y0=min(xs)-pad,min(ys)-pad;w,h=max(xs)-x0+pad+1,max(ys)-y0+pad+1
    a=np.zeros((h,w,3),np.uint8);a[:]=(70,70,70)
    for (x,y),(u,v) in m.items():a[y-y0,x-x0]=T[v,u]
    return Image.fromarray(a).resize((w*S,h*S),Image.NEAREST),x0,y0
def ring(d,X,Y,S):d.rectangle([X-3,Y-3,X+S+2,Y+S+2],outline=BK,width=2);d.rectangle([X-1,Y-1,X+S,Y+S],outline=Y,width=2)
def lines(d,x,y,ts,z=22,col=WH):
    for t in ts:d.text((x,y),t,font=F(z),fill=col);y+=z+8
    return y
# ================= HEM =================
S=14;W=1000;I=Image.new('RGB',(W,1560),BK);d=ImageDraw.Draw(I)
d.text((14,8),"What 'the old hem row is gone' means",font=F(34),fill=Y)
# A old side panel rows 16-24 cols 50-74
r0,r1=16,25;A=tex(DW,50,75,r0,r1,S);ax,ay=14,110;I.paste(A,(ax,ay))
d.text((ax,62),'A  OLD 75x32 panel',font=F(22),fill=WH)
box(d,ax,ay,S,50,r0,(50,74),(17,22),BL);box(d,ax,ay,S,50,r0,(50,74),(23,23),Y)
d.text((ax,ay+A.height+6),'blue: rows 17-22',font=F(15),fill=WH);d.text((ax,ay+A.height+26),'yellow: row 23 hem (12 texels)',font=F(15),fill=WH)
# B new rows 16-24 all cols
B=tex(D2,0,38,r0,r1,S);bx,by=ax+A.width+40,110;I.paste(B,(bx,by))
d.text((bx,62),'B  NEW 38x32',font=F(22),fill=WH)
for cs in ((3,15),(24,34)):box(d,bx,by,S,0,r0,cs,(17,22),BL)
for cs in ((11,14),(33,34)):box(d,bx,by,S,0,r0,cs,(23,23),Y)
d.text((bx,by+B.height+6),'blue = panel folded into figure pants 17-22',font=F(15),fill=WH)
d.text((bx,by+B.height+26),'yellow = pants row 23 texels the 7 px use now',font=F(15),fill=WH)
y=by+B.height+70
y=lines(d,14,y,['The old panel had 7 rows (17-23). In v2 the panel became the figure pants rows 17-22,',
 'but there is no row for its row 23 (hem) - rows 23+ belong to the figures\' own legs.',
 'Only 7 frame pixels (in 897, 889, 42) used those hem texels. They now map to the',
 'figure\'s own pants row 23 texels (same row, same zone).'],z=20)
# frames: chicago, old vs new, rings
y+=10;d.line([(0,y),(W,y)],fill=(150,150,150),width=2);y+=10
TS=Image.fromarray(D2).resize((38*3,32*3),Image.NEAREST)
for n in (897,889,42):
    hs=[h for h in FA['hem'] if h['frame']==n];S2=12
    # crop to pants area
    ys=[h['xy'][1] for h in hs];sel=lambda m:{k:v for k,v in m.items() if min(ys)-6<=k[1]<=max(ys)+5}
    o,x0o,y0o=frame(sel(M54[n]),C54,S2);nimg,x0n,y0n=frame(sel(M2[n]),C2,S2)
    d.text((14,y),f'FRAME {n}',font=F(26),fill=WH);y+=36
    I.paste(TS,(14,y+34))
    px=150;d.text((px,y+4),'before (54x32)',font=F(18),fill=WH);I.paste(o,(px,y+34))
    px2=px+o.width+30;d.text((px2,y+4),'now (v2)',font=F(18),fill=WH);I.paste(nimg,(px2,y+34))
    dd=ImageDraw.Draw(I)
    for h in hs:
        x,yy=h['xy'];ring(dd,px+(x-x0o)*S2,y+34+(yy-y0o)*S2,S2);ring(dd,px2+(x-x0n)*S2,y+34+(yy-y0n)*S2,S2)
    tx=px2+nimg.width+24;ty=y+34
    for h in hs:
        d.text((tx,ty),f"texel ({h['old'][0]},{h['old'][1]}) -> v2 ({h['new'][0]},{h['new'][1]})",font=F(15),fill=WH);ty+=20
        d.text((tx+20,ty),f"Chicago {tuple(h['old_col'])} -> same",font=F(15),fill=Y);ty+=24
    y+=34+max(o.height,ty-y-34,TS.height)+20
y=lines(d,14,y,['Chicago home: all 7 px were pants black (44,44,44) and still are.',
 'NO visible change. Only a design with a stripe on the old panel hem row would differ.'],z=20,col=Y)
I.crop((0,0,W,y+10)).save('explain_hem.png')
# ================= CREST =================
I=Image.new('RGB',(W,1500),BK);d=ImageDraw.Draw(I)
d.text((14,8),'Is the crest part of the jersey? Yes.',font=F(34),fill=Y)
S=16;r0,r1=8,17;c0,c1=2,18
for i,(lab,T) in enumerate((('A  stripe test v2',D2),('B  Chicago home v2',C2))):
    t=tex(T,c0,c1,r0,r1,S);x=14+i*(t.width+90);I.paste(t,(x,100));d.text((x,62),lab,font=F(22),fill=WH)
    box(d,x,100,S,c0,r0,(7,11),(10,13),Y)
    for v in range(r0,r1):d.text((x-0,100+(v-r0)*S),'',font=F(10))
y=100+(r1-r0)*S+10
y=lines(d,14,y,['Yellow box = the 20 CREST texels: front torso cols 7-11, rows 10-13 (v2)',
 '(old 54x32: cols 4-8, rows 10-13). 5x4 grid = the game\'s crest palette indices',
 '192-196, 208-212, 224-228, 240-244: the front chest logo, inside the jersey rows.'],z=20)
y+=6;d.line([(0,y),(W,y)],fill=(150,150,150),width=2);y+=10
pk=pickle.load(open('/tmp/first370.pkl','rb'))[370]
badp=[(b[0],b[1]) for b in FB['370']['px']]
sel=lambda m:{k:v for k,v in m.items() if 6<=k[1]<=17}
S2=14
imgs=[('C  old 54x32',frame(sel(M54[370]),C54,S2)),('D  my first v2 pass (BUG)',frame(sel(pk),C2,S2)),('E  v2 final (fixed)',frame(sel(M2[370]),C2,S2))]
x=14
d.text((14,y),'FRAME 370 front, Chicago home, torso rows',font=F(24),fill=WH);y+=36
I.paste(Image.fromarray(D2).resize((38*3,32*3),Image.NEAREST),(14,y+30));x=150
for lab,(im,x0,y0) in imgs:
    d.text((x,y),lab,font=F(17),fill=WH);I.paste(im,(x,y+30));dd=ImageDraw.Draw(I)
    for (px_,py_) in badp:ring(dd,x+(px_-x0)*S2,y+30+(py_-y0)*S2,S2)
    x+=im.width+20
y+=30+imgs[0][1][0].height+14
tot=sum(v['noncrest_on_crest_firstpass'] for v in FB.values())
PF=FA['per_frame']
y=lines(d,14,y,['Yellow boxes: 11 ordinary jersey (stripe/body) pixels of 370.',
 'D: my first pass packed them onto crest texels -> they showed logo colours (bug).',
 'C and E: they sit on plain jersey texels; the crest itself is unchanged.',
 f'First pass: {tot} such pixels in 5 frames (370:11, 897:7, 57:2, 62:3, 67:14). ',
 'Final v2: 0. Old 54x32: 0.',
 'Rule: crest pixels -> crest texels (all 48 crest px land on their own texel:',
 '370:20, 897:15, 57:9, 52:4). Non-crest torso px are never packed onto crest texels.'],z=19)
I.crop((0,0,W,y+10)).save('explain_crest.png')
