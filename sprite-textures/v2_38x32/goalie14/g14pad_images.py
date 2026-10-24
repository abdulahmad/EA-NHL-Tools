# LOCAL ONLY renders (game sprites) -> /workspace/preview_v2/goalie14/  (BEFORE = g13 maps from g13_pads.json)
#   g14_pads_<team>.png       all pad frames: ORIGINAL 95 PC PALETTE | BEFORE (g13) APPLIED | AFTER APPLIED | AFTER ERRORS MARKED
#   g14_pads_zoom_<team>.png  538 407 425 1044 only, tight crop, bigger pixels
# Error marker (colour-blind safe, Abdul): correct px dimmed to 35%, wrong px solid yellow with a black X.
# Skate px (excluded) dimmed with a white dot.
import sys,os,json,pickle
H14=os.path.dirname(os.path.abspath(__file__));sys.path.insert(0,H14);sys.path.insert(0,H14+'/../goalie12')
from g14seg import *
from g11_images import tex_rgb
from g10c_images import F_
OUT='/workspace/preview_v2/goalie14/';os.makedirs(OUT,exist_ok=True)
BG=(70,70,70);YEL=(255,220,0)
J=json.load(open(H14+'/g14_pads.json'))['frames'];J13=json.load(open(H14+'/../goalie13/g13_pads.json'))['frames']
def after(n):
    m={};sk=set()
    for r in J[str(n)]:
        for k,t in r['map'].items():y,x=map(int,k.split(','));m[(y,x)]=tuple(t) if t else None
        sk|={tuple(c) for c in r['skate_px']}
    return m,sk
def panel(n,sp,kind,box,z):
    p=frame(n);a,b,c_,e=box;im=Image.new('RGB',((e-b)*z,(c_-a)*z),BG);d=ImageDraw.Draw(im);m,sk=after(n);bad=0
    bm={tuple(map(int,k.split(','))):(tuple(t) if t else None) for r in J13[str(n)] for k,t in r['map'].items()}
    for y in range(a,c_):
        for x in range(b,e):
            if not(0<=y<p.shape[0] and 0<=x<p.shape[1]):continue
            s=int(p[y,x])
            if s==255:continue
            cc=tuple(int(k) for k in sp[s]);err=False
            if kind=='before' and (y,x) in bm:
                t=bm[(y,x)]
                if t:cc=tuple(int(k) for k in sp[tv(int(CYLT[t]))])
            if kind in('after','err') and (y,x) in m:
                t=m[(y,x)]
                if t:cc=tuple(int(k) for k in sp[tv(int(CYLT[t]))])
                err=not(t and eqs(s,CYLT[t]))
            r=[(x-b)*z,(y-a)*z,(x-b)*z+z-1,(y-a)*z+z-1]
            if kind=='err':
                if err:bad+=1;d.rectangle(r,fill=YEL);d.line([r[0]+1,r[1]+1,r[2]-1,r[3]-1],fill=(0,0,0),width=2);d.line([r[0]+1,r[3]-1,r[2]-1,r[1]+1],fill=(0,0,0),width=2)
                else:
                    d.rectangle(r,fill=tuple(int(k*.35+20) for k in cc))
                    if (y,x) in sk:cx,cy=(r[0]+r[2])//2,(r[1]+r[3])//2;d.ellipse([cx-2,cy-2,cx+2,cy+2],fill=(255,255,255))
            else:d.rectangle(r,fill=cc)
    return im,bad
def box_of(n,tight):
    m,sk=after(n);P=set(m)|sk
    if not tight:P|={tuple(map(int,k.split(','))) for r in J13[str(n)] for k in r['map']}
    ys=[y for y,x in P];xs=[x for y,x in P];return (min(ys)-1,min(xs)-1,max(ys)+2,max(xs)+2)
def sheet(tag,f,c,nm,frames,tight,fn):
    sp=spal(f,c);tex=tex_rgb('A',sp,8).crop((0,9*8,13*8,23*8));LW=tex.width+16;W=1000;colw=(W-LW)//4
    hd=('ORIGINAL\n95 PC PALETTE','BEFORE (g13)\nAPPLIED','AFTER (g14)\nAPPLIED','AFTER (g14)\nERRORS MARKED')
    cols=((255,255,255),(255,255,255),(255,255,0),(255,255,0))
    rows=[];tot=0
    for n in frames:
        bx=box_of(n,tight);z=max(4,min(24 if tight else 10,(colw-8)//(bx[3]-bx[1])))
        ims=[panel(n,sp,k,bx,z)[0] for k in ('orig','before','after')];ei,bad=panel(n,sp,'err',bx,z);ims.append(ei);rows.append((n,bad,ims));tot+=bad
    rh=[max(i.height for i in ims)+34 for _,_,ims in rows];per=2 if tight else 4
    H=70+sum(rh)+((len(rows)+per-1)//per)*62+60
    im=Image.new('RGB',(W,H),(0,0,0));d=ImageDraw.Draw(im)
    d.text((6,6),'%s pads%s - g14 strict errors %d'%(nm,' ZOOM 538/407/425/1044' if tight else '',tot),font=F_(24),fill=(255,255,255))
    d.text((4,48),'pad texture\nfront | sock',font=F_(14),fill=(255,255,0));im.paste(tex,(4,88))
    y=46
    for i,((n,bad,ims),h) in enumerate(zip(rows,rh)):
        if i%per==0:
            for k,t in enumerate(hd):d.text((LW+k*colw+2,y),t,font=F_(18),fill=cols[k],spacing=2)
            y+=62
        legs_=' | '.join('%s: %s'%(r['leg'],r['mode'].split(' orders')[0]) for r in J[str(n)])
        d.text((LW+2,y),'%d d%d %s'%(n,GF[n][0][1],orient(n)),font=F_(17),fill=(255,255,255))
        d.text((LW+3*colw+2,y),'errors %d'%bad,font=F_(17),fill=YEL)
        for k,ii in enumerate(ims):im.paste(ii,(LW+k*colw+2,y+26))
        y+=h
    d.text((LW,H-52),'ERRORS: yellow square with black X = applied index differs from original (strict, every px).\nDimmed = correct. White dot = skate, not mapped.',font=F_(15),fill=(255,255,255))
    im.save(fn);print(fn,im.size,tot,flush=True)
if __name__=='__main__':
    for t in TEAMS:
        sheet(*t,FRAMES13,False,OUT+'g14_pads_%s.png'%t[0])
        sheet(*t,[538,407,425,1044],True,OUT+'g14_pads_zoom_%s.png'%t[0])
