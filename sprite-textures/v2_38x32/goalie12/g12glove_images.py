# LOCAL ONLY renders (game sprite) -> /workspace/preview_v2/goalie12/g12_glove_fix_<team>.png
import sys,os,json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from g12 import *
from g11_images import tex_rgb
from g10c_images import F_
from g12glove import final
H12=os.path.dirname(os.path.abspath(__file__));OUT='/workspace/preview_v2/goalie12/'
BG=(70,70,70)
def crop(n,sp,lab,M,TP,z,err,box):
    p=frame(n);a,b,c_,e=box;im=Image.new('RGB',((e-b)*z,(c_-a)*z),BG);d=ImageDraw.Draw(im)
    for y in range(a,c_):
        for x in range(b,e):
            s=int(p[y,x])
            if s==255:continue
            cc=tuple(sp[s])
            if M is not None and (y,x) in M and lab.get((y,x)) not in ('shade','outzone'):
                t=M[(y,x)];v=int(TP[t]) if t and TP[t]!=TRANS else None
                if v is not None:cc=tuple(sp[s]) if (v==WHITE and s in g10match.WHITESET) else tuple(sp[181 if v==WHITE else v])
            r=[(x-b)*z,(y-a)*z,(x-b)*z+z-1,(y-a)*z+z-1];d.rectangle(r,fill=tuple(int(k) for k in cc))
            if err and M is not None and lab.get((y,x))=='diff':d.rectangle(r,outline=(255,255,255),width=2);d.rectangle([r[0]+2,r[1]+2,r[2]-2,r[3]-2],outline=(0,0,0),width=1)
    return im
def sheet(tag,f,c,nm,o='B'):
    sp=spal(f,c);J=[r for r in json.load(open(H12+'/g12_glove.json')) if final(r,o)!=r[o]['free']]
    z=9;tz=8;tex=tex_rgb(o,sp,tz);LW=tex.width+14;W=1000;colw=(W-LW)//5
    hd=('ORIGINAL\n95 PC\nPALETTE','BEFORE\n(free fit)\nAPPLIED','BEFORE\n(free fit)\nERRORS','AFTER\n(coherent)\nAPPLIED','AFTER\n(coherent)\nERRORS')
    rows=[]
    for r in J:
        n=r['frame'];p=frame(n);q=[tuple(x) for x in catcher_q(n)];TP,_=tpiece(o,r['piece'])
        ys=[y for y,x in q];xs=[x for y,x in q];box=(max(0,min(ys)-2),max(0,min(xs)-2),min(p.shape[0],max(ys)+3),min(p.shape[1],max(xs)+3))
        R0,l0,M0=g10match.evaluate(p,q,TP,r[o]['free']);R1,l1,M1=g10match.evaluate(p,q,TP,r[o]['coh'])
        rows.append((r,[crop(n,sp,{},None,TP,z,0,box),crop(n,sp,l0,M0,TP,z,0,box),crop(n,sp,l0,M0,TP,z,1,box),crop(n,sp,l1,M1,TP,z,0,box),crop(n,sp,l1,M1,TP,z,1,box)]))
    rh=[max(i.height for i in ims)+30 for _,ims in rows];H=70+sum(rh)+(len(rows)//4+1)*80+30
    im=Image.new('RGB',(W,H),(0,0,0));d=ImageDraw.Draw(im)
    d.text((6,6),'%s - Option %s catcher: fixed frames'%(nm,o),font=F_(24),fill=(255,255,255))
    d.text((4,44),'texture %s'%o,font=F_(16),fill=(255,255,0));im.paste(tex,(4,66))
    y=44;cols=((255,255,255),(255,255,0),(255,255,0),(0,220,255),(0,220,255))
    for i,((r,ims),h) in enumerate(zip(rows,rh)):
        if i%4==0:
            for k,t in enumerate(hd):d.text((LW+k*colw+2,y),t,font=F_(19),fill=cols[k],spacing=2)
            y+=80
        d.text((LW+2,y),'%d d%d %s'%(r['frame'],r['d'],r['orient']),font=F_(16),fill=(255,255,255))
        d.text((LW+2*colw+2,y),'%d > %d'%(r[o]['free_s'],r[o]['free_a']),font=F_(16),fill=(255,255,0))
        d.text((LW+4*colw+2,y),'%d > %d'%(r[o]['coh_s'],r[o]['coh_a']),font=F_(16),fill=(0,220,255))
        for k,ii in enumerate(ims):im.paste(ii,(LW+k*colw+2,y+24))
        y+=h
    d.text((LW,H-24),'fixed = free fit was mirrored, squashed (sy<0.6) or started 3+ rows down. numbers = catcher strict > after expand',font=F_(14),fill=(255,255,255))
    fn=OUT+'g12_glove_fix_%s_opt%s.png'%(tag,o);im.save(fn);print(fn,im.size)
if __name__=='__main__':
    for t in TEAMS:sheet(*t)
