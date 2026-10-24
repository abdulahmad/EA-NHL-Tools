# Goalie v10 sheets (local only: contain game sprite renders). Texture down the left; per part A = in-game (Abdul's zone palette),
# B = the part drawn from Abdul's texture through the zone-first fit. B marks: white box with black core = diff left after
# expansion, black dot = accepted by expansion (r1/r2). Non-part px dimmed. Usage: g10sheet.py main|wall
import sys
from g10match import *
from g10tex import ACT
from PIL import Image,ImageDraw,ImageFont
F_=lambda s:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',s)
OUT='/workspace/preview_v2/goalie10/';os.makedirs(OUT,exist_ok=True)
S=8
def col(i):return tuple(int(v) for v in ACT[i]) if i>=0 else (252,252,252)
def render(p,q,lab,M,T_,TP):
    qs=set(q);ys=[a for a,_ in q];xs=[b for _,b in q];Y0=max(min(ys)-2,0);X0=max(min(xs)-2,0);Y1=min(max(ys)+3,p.shape[0]);X1=min(max(xs)+3,p.shape[1])
    h,w=Y1-Y0,X1-X0;im=Image.new('RGB',(w*S,h*S),(30,30,30));A=im.copy();d=ImageDraw.Draw(A);dB=ImageDraw.Draw(im)
    for yy in range(h):
        for xx in range(w):
            y,x=yy+Y0,xx+X0
            v=int(p[y,x])
            if v==255:continue
            c=col(v)
            if (y,x) not in qs:c=tuple(int(k*0.25+20) for k in c)
            d.rectangle([xx*S,yy*S,xx*S+S-1,yy*S+S-1],fill=c)
            if lab.get((y,x))=='outzone':d.rectangle([xx*S,yy*S,xx*S+S-1,yy*S+S-1],outline=(255,255,255),width=2)
            cb=c
            if (y,x) in qs and lab.get((y,x)) not in ('shade',None):
                t=M[(y,x)];cb=col(int(TP[t])) if t and TP[t]!=TRANS else (30,30,30)
            dB.rectangle([xx*S,yy*S,xx*S+S-1,yy*S+S-1],fill=cb)
            L_=lab.get((y,x))
            if L_=='diff':dB.rectangle([xx*S,yy*S,xx*S+S-1,yy*S+S-1],outline=(255,255,255),width=2);dB.rectangle([xx*S+3,yy*S+3,xx*S+4,yy*S+4],fill=(0,0,0))
            elif L_ in('exp1','exp2'):dB.rectangle([xx*S+3,yy*S+3,xx*S+4,yy*S+4],fill=(0,0,0))
    return A,im
def texcol(T):
    h,w=T.shape;s=8;im=Image.new('RGB',(w*s+20,h*s+60),(0,0,0));d=ImageDraw.Draw(im)
    d.text((4,4),'TEXTURE',font=F_(18),fill=(255,255,255))
    for y in range(h):
        for x in range(w):
            if T[y,x]!=TRANS:d.rectangle([10+x*s,40+y*s,10+x*s+s-1,40+y*s+s-1],fill=col(int(T[y,x])))
    from g10tex import PIECES
    for k,(x0,y0,x1,y1) in PIECES.items():d.rectangle([10+x0*s-1,40+y0*s-1,10+(x1+1)*s,40+(y1+1)*s],outline=(255,255,255))
    return im
def build(items,name,title):
    T=decode();tc=texcol(T);cells=[]
    for (p,q,tk,lbl,R) in items:
        TP=piece(T,tk);prm=fit(p,q,TP);R,lab,M=evaluate(p,q,TP,prm);A,B=render(p,q,lab,M,T,TP)
        cw=A.width+B.width+12;c=Image.new('RGB',(max(cw,150),A.height+64),(0,0,0));d=ImageDraw.Draw(c)
        d.text((2,0),lbl,font=F_(15),fill=(255,255,255));d.text((2,18),'diff %d>%d out %d'%(R['strict_diff'],R['after_expand_diff'],R.get('outzone',0)),font=F_(13),fill=(255,255,0))
        c.paste(A,(0,40));c.paste(B,(A.width+12,40))
        d.text((4,42),'A',font=F_(26),fill=(255,255,255),stroke_width=3,stroke_fill=(0,0,0));d.text((A.width+16,42),'B',font=F_(26),fill=(255,255,255),stroke_width=3,stroke_fill=(0,0,0))
        cells.append(c)
    W=1000;x0=tc.width+10;rows=[];cur=[];cw=0
    for c in cells:
        if cur and x0+cw+c.width>W:rows.append(cur);cur=[];cw=0
        cur.append(c);cw+=c.width+10
    rows.append(cur);Hh=48+sum(max(c.height for c in r)+10 for r in rows)
    sh=Image.new('RGB',(W,max(Hh,tc.height+50)),(0,0,0));d=ImageDraw.Draw(sh);d.text((6,4),title,font=F_(18),fill=(255,255,255));d.text((6,26),'A in-game (white box = zone not in texture piece)   B from texture (white box = diff after expand, dot = fixed by expand)',font=F_(11),fill=(255,255,0))
    sh.paste(tc,(0,44));y=44
    for r in rows:
        x=x0
        for c in r:sh.paste(c,(x,y));x+=c.width+10
        y+=max(c.height for c in r)+10
    sh.save(OUT+name);print(OUT+name,sh.size)
if __name__=='__main__':
    mode=sys.argv[1]
    if mode=='wall':
        items=[]
        for n in WALL:
            p,lg=wall_pads(n)
            for k,q in lg.items():items.append((p,q,'padF','%d %s%s'%(n,k,' ERROR' if n!=373 else ''),None))
        P=parts_for({987});p=frame(987)
        for k in ('padF_L','padF_R'):items.append((p,P[(987,k)]['q'],'padF','987 %s ok'%k,None))
        build(items,'g10_wall_373_376.png','Wall frames 373-376 vs 987: pad top stripe zones')
    else:
        sel=[t for t in TARGETS if not (t[0]==1044 and t[2]=='padStrip')] if mode=='main' else TARGETS
        P=parts_for({t[0] for t in sel});items=[]
        for n,pc,tk in sel:items.append((frame(n),P[(n,pc)]['q'],tk,'%d %s<-%s'%(n,pc,tk),None))
        half=len(items)//2+3
        build(items[:half],'g10_match_1.png','Goalie v10: Abdul texture -> sprites (zones first, then expand)')
        build(items[half:],'g10_match_2.png','Goalie v10: facing-truth frames + masks')
