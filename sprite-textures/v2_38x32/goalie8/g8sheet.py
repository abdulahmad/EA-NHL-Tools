# Sheets for goalie v8 (local, they contain game sprite renders): source cutouts, big texture, mapped A/B/C per frame.
import sys,os;sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from g8cut import *
from PIL import Image,ImageDraw,ImageFont
B=lambda s:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',s)
Y=(255,221,0);BG=(55,55,55);CY=(0,200,255)
TEAMS2={'chi_home':('HOME.json','chi'),'tor_home':('HOME.json','tor')}
def sprite(n,sp,bg=BG):
    p=frame(n);m=p!=255;a=np.full(p.shape+(3,),bg,np.uint8);a[m]=sp[p[m]];return a
def up(a,z):return Image.fromarray(a).resize((a.shape[1]*z,a.shape[0]*z),Image.NEAREST)
def tex_img(t,z,bg=(90,90,90)):
    i=Image.new('RGB',(t.shape[1]*z,t.shape[0]*z),bg);i.paste(up(t[...,:3],z),(0,0),up(t[...,3],z));return i
for tag,(tf,code) in TEAMS2.items():
    sp=spal(tf,code);TB=texture(sp,0);TS=texture(sp,1)
    # 1 source cutouts
    zf,zp=6,9;cw,ch=330,300;I=Image.new('RGB',(3*cw,80+3*ch),(30,30,30));d=ImageDraw.Draw(I)
    d.text((8,6),f'Source cutouts: default goalie gear, {code.upper()} {tf[:4]}',fill='white',font=B(26))
    d.text((8,42),'frame x6 (dimmed), lifted pixels outlined yellow  ->  piece: base | shaded',fill=Y,font=B(17))
    for i,c in enumerate(cut):
        n=c['frame'];a=sprite(n,sp).astype(float);p=frame(n);L=SEG[n][1]
        ins=np.zeros(p.shape,bool)
        for v in c['px'].values():ins[v['q']]=True
        a[~ins]=a[~ins]*0.45+20;F=up(a.astype(np.uint8),zf);dd=ImageDraw.Draw(F)
        for (y,x) in zip(*np.nonzero(ins)):
            for dy,dx,seg_ in ((-1,0,[(x*zf,y*zf),((x+1)*zf-1,y*zf)]),(1,0,[(x*zf,(y+1)*zf-1),((x+1)*zf-1,(y+1)*zf-1)]),(0,-1,[(x*zf,y*zf),(x*zf,(y+1)*zf-1)]),(0,1,[((x+1)*zf-1,y*zf),((x+1)*zf-1,(y+1)*zf-1)])):
                yy,xx=y+dy,x+dx
                if not(0<=yy<p.shape[0] and 0<=xx<p.shape[1] and ins[yy,xx]):dd.line(seg_,fill=Y,width=2)
        cx,cy=(i%3)*cw,80+(i//3)*ch
        d.text((cx+6,cy),f"{c['part']} {c['view']}",fill='white',font=B(20));d.text((cx+6,cy+24),f"from frame {n}",fill=Y,font=B(17))
        if F.height>ch-60:F=F.resize((int(F.width*(ch-60)/F.height),ch-60),Image.NEAREST)
        I.paste(F,(cx+6,cy+50))
        x0,y0,w,h=c['bbox'];ax,ay=c['at']
        for j,T in enumerate((TB,TS)):
            P=tex_img(T[ay:ay+h,ax:ax+w],zp);px_=cx+F.width+16;py=cy+50+j*(h*zp+22)
            if j==0 and px_+P.width>cx+cw-4: pass
            I.paste(P,(px_,py+18));d.text((px_,py),'base' if j==0 else 'shaded',fill=CY if j==0 else Y,font=B(14))
    I.save(OUT+f'g8_source_cutouts_{tag}.png');print(I.size)
    # 2 big texture
    z=24
    for nm,T in (('base',TB),('shaded',TS)):
        P=tex_img(T,z);I=Image.new("RGB",(P.width+16,P.height+130),(30,30,30));I.paste(P,(8,72));d=ImageDraw.Draw(I)
        d.text((8,6),f'Default goalie texture v8 ({code.upper()} {tf[:4]}): '+('BASE colours' if nm=='base' else 'SHADED (in-game look)'),fill='white',font=B(24))
        d.text((8,40),'each piece lifted from real sprite pixels; label = part / view / source frame',fill=Y,font=B(17))
        for c in cut:
            ax,ay=c['at'];w,h=c['bbox'][2:];d.rectangle([8+ax*z-2,72+ay*z-2,8+(ax+w)*z+1,72+(ay+h)*z+1],outline=Y,width=3)
            lbl=f"{c['part'].replace('mask','MASK')}\n{c['view']} {c['frame']}"
            d.multiline_text((8+ax*z+3,72+(ay+h)*z+4) if ay>0 else (8+ax*z+3,72+(ay+h)*z+4),lbl,fill=Y,font=B(15),stroke_width=2,stroke_fill=(0,0,0))
        I.save(OUT+f'g8_texture_big_{tag}_{nm}.png');print(I.size)
    # 3 mapped
    sc=4;fw=44*sc;fh=max(frame(n).shape[0] for n in FRG)*sc;Hb=3*(fh+6)+34
    I=Image.new('RGB',(64+4*fw+40,92+2*Hb),(30,30,30));d=ImageDraw.Draw(I);tot=0
    for i,n in enumerate(FRG):
        A_,B_,w=render(n,sp);tot+=len(w);C=(A_.astype(float)*0.35+30).astype(np.uint8)
        for x in w:C[x['q']]=Y
        x=64+(i%4)*fw;y=92+(i//4)*Hb;d.text((x,y),f'{n}  diff {len(w)}',fill='white',font=B(20))
        for j,im in enumerate((A_,B_,C)):I.paste(up(im,sc),(x,y+30+j*(fh+6)))
    for bx in range(2):
        for j,L in enumerate('ABC'):d.text((10,92+bx*Hb+30+j*(fh+6)+fh//2-26),L,fill=Y,font=B(44))
    d.text((8,6),f'Default goalie v8 mapped, {code.upper()}: diff {tot} /  {sum(len(MAP[n]) for n in FRG)} gear px',fill='white',font=B(21))
    d.text((8,36),'A in-game   B texture x shading layer   C mismatched px (yellow)',fill=Y,font=B(18))
    d.text((8,62),'source frames 413,416,422,519 reproduce their own lifted parts exactly',fill=CY,font=B(16))
    if I.width>1000:I=I.resize((1000,int(I.height*1000/I.width)),Image.LANCZOS)
    I.save(OUT+f'g8_mapped_{tag}.png');print(I.size,tot)
