# Goalie v10b: labelled stripe-order diagram (Abdul pt870u q1) + texture before/after. Local output (diagram has a game sprite crop).
import sys,os;sys.path.insert(0,os.path.dirname(os.path.abspath(__file__))+'/../../scripts')
from lib import frame,ZN
from g10tex import decode,piece,ACT,WHITE,TRANS
from PIL import Image,ImageDraw,ImageFont
import numpy as np
F=lambda s:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',s)
OUT='/workspace/preview_v2/goalie10/'
def col(v):return (252,252,252) if v==WHITE else tuple(int(c) for c in ACT[v])
def txt(d,xy,s,size,anchor='mm'):d.text(xy,s,font=F(size),fill=(255,255,255),stroke_width=4,stroke_fill=(0,0,0),anchor=anchor)
def grid(d,A,x0,y0,S,lab):
    for y in range(A.shape[0]):
        for x in range(A.shape[1]):
            v=int(A[y,x])
            if v==TRANS:continue
            d.rectangle([x0+x*S,y0+y*S,x0+x*S+S-1,y0+y*S+S-1],fill=col(v),outline=(0,0,0),width=2)
            txt(d,(x0+x*S+S//2,y0+y*S+S//2),'W' if v==WHITE else str(v),S//3)
def diagram():
    p=frame(520);A=p[24:28,6:12].astype(int)          # 520 left pad back, rows 24-27 (the socks stripe block)
    T=decode();B=piece(T,'padStrip')[5:9]              # strip rows 14-17 of the texture: W / 187 188 189 / 184 185 155 / W
    S=64;im=Image.new('RGB',(1000,620),(0,0,0));d=ImageDraw.Draw(im)
    txt(d,(500,24),'Q1: pad-back stripe order, game vs your strip',30)
    txt(d,(200,70),'A  GAME 520 left pad back',24);txt(d,(790,70),'B  YOUR STRIP (x10-12)',24)
    ax,ay=20,110;bx,by=700,110;grid(d,A,ax,ay,S,1);grid(d,B,bx,by,S,1)
    names={0:'181-183 socks (plain)',1:'184-186 socks stripe 1',2:'187-189 socks stripe 2',3:'182 183 socks (plain)'}
    bnames={0:'W white (plain?)',1:'187 188 189 stripe 2',2:'184 185 + 155',3:'W white (plain?)'}
    for r in range(4):
        y=ay+r*S+S//2;txt(d,(ax+6*S+8,y),'row %d'%(24+r),18,'lm');txt(d,(bx+3*S+8,y),'',18,'lm')
    # arrows: game row -> strip row with the same zone
    link={0:[0,3],1:[2],2:[1]}
    for a,bs in link.items():
        for b in bs:
            y1=ay+a*S+S//2;y2=by+b*S+S//2;x1=ax+6*S+90;x2=bx-10
            d.line([x1,y1,x2,y2],fill=(255,255,0),width=5);d.polygon([(x2,y2),(x2-16,y2-9),(x2-16,y2+9)],fill=(255,255,0))
    y=ay+4*S+30
    for r in range(3):txt(d,(20,y+r*34),'GAME row %d = %s'%(24+r,names[r]),22,'lm')
    for r in range(4):txt(d,(560,y+r*34),'STRIP row %d = %s'%(r+1,bnames[r]),22,'lm')
    txt(d,(500,y+150),'Game top->bottom: plain, stripe 1 (184-186), stripe 2 (187-189).',22)
    txt(d,(500,y+184),'Your strip: stripe 2 ABOVE stripe 1 (rows swapped), 186 -> 155.',22)
    im.save(OUT+'g10b_q1_stripe_order.png');print(im.size)
def before_after():
    import g10b;T2,P2=g10b.texture_v2();T=decode();S=14
    im=Image.new('RGB',(1000,34*S+120),(0,0,0));d=ImageDraw.Draw(im)
    txt(d,(500,22),'Texture before / after (x14)',28)
    for k,(TT,x0,l) in enumerate([(T,30,'A  BEFORE 23x23'),(T2,520,'B  AFTER 23x34')]):
        txt(d,(x0+160,60),l,24)
        for y in range(TT.shape[0]):
            for x in range(TT.shape[1]):
                if TT[y,x]!=TRANS:d.rectangle([x0+x*S,90+y*S,x0+x*S+S-1,90+y*S+S-1],fill=col(int(TT[y,x])))
    for k,(x0,y0,x1,y1) in P2.items():
        d.rectangle([520+x0*S-2,90+y0*S-2,520+(x1+1)*S+1,90+(y1+1)*S+1],outline=(255,255,255),width=2)
        if k in('padBack','catcherH'):txt(d,(520+(x0+x1+1)*S//2,90+(y1+1)*S+18),{'padBack':'NEW pad back (520 L)','catcherH':'NEW catcher (538)'}[k],16)
    im.save(OUT+'g10b_texture_before_after.png');print(im.size)
diagram();before_after()
