# Goalie v11 images (LOCAL ONLY, game sprite renders) -> /workspace/preview_v2/goalie11/
from g11 import *
from g10c_images import F_
OUT='/workspace/preview_v2/goalie11/';os.makedirs(OUT,exist_ok=True)
BG=(70,70,70)
def tex_rgb(o,sp,z):
    T,_=OPT[o];im=Image.new('RGB',(T.shape[1]*z,T.shape[0]*z),(30,30,30));d=ImageDraw.Draw(im)
    for (y,x),v in np.ndenumerate(T):
        if v==TRANS:continue
        d.rectangle([x*z,y*z,x*z+z-1,y*z+z-1],fill=tuple(int(k) for k in sp[181 if v==WHITE else v]))
    return im
def textures():
    z=10;W=1000;cw=245;im=Image.new('RGB',(W,60+2*(33*z+60)+150),(0,0,0));d=ImageDraw.Draw(im)
    d.text((6,6),'Goalie texture per team: Option A (v4 catcher) / Option B (v5 oval catcher)',font=F_(22),fill=(255,255,255))
    for i,(tag,f,c,nm) in enumerate(TEAMS):
        sp=spal(f,c)
        for j,o in enumerate('AB'):
            x=i*cw+4;y=44+j*(33*z+60);d.text((x,y),'%s  %s'%(nm,o),font=F_(19),fill=(255,255,0) if o=='A' else (0,220,255))
            t=tex_rgb(o,sp,z);im.paste(t,(x,y+26))
            for k,(lbl,yy) in enumerate((('blocker',0),('mask',0),('pad front | strip',9),('catcher',24))):
                pass
        # zone swatches
        y=44+2*(33*z+60)+4;x=i*cw+4
        for k,(a,b,l) in enumerate(((144,146,'144-146 palm'),(147,149,'147-149'),(150,152,'150-152'),(181,183,'181-183'),(184,186,'184-186'),(187,189,'187-189'))):
            for m in range(a,b+1):d.rectangle([x+(m-a)*18,y+k*22,x+(m-a)*18+16,y+k*22+18],fill=tuple(int(v) for v in sp[m]),outline=(255,255,255))
            d.text((x+60,y+k*22+1),l,font=F_(13),fill=(255,255,255))
    d.text((6,im.height-18),'Top: blocker + mask | middle: pad front + strip (left), Abdul 8x12 catcher (right) | bottom rows 24-32: A 22x9 rect / B back rect + oval',font=F_(12),fill=(220,220,220))
    im.save(OUT+'g11_textures.png');print('tex',im.size)
def spr(n,sp,o,z,err):
    p=frame(n);ys,xs=np.nonzero(p!=255);a,b,c_,e=min(ys),min(xs),max(ys)+1,max(xs)+1
    im=Image.new('RGB',((e-b)*z,(c_-a)*z),BG);d=ImageDraw.Draw(im);m=map_frame(n,o)[0] if o else {}
    for y in range(a,c_):
        for x in range(b,e):
            s=int(p[y,x])
            if s==255:continue
            v,l=m.get((y,x),(None,'none'));cc=color_of(sp,s,v,l) if o else tuple(sp[s])
            r=[(x-b)*z,(y-a)*z,(x-b)*z+z-1,(y-a)*z+z-1];d.rectangle(r,fill=tuple(int(k) for k in cc))
            if err and l=='diff':d.rectangle(r,outline=(255,255,255),width=2);d.rectangle([r[0]+2,r[1]+2,r[2]-2,r[3]-2],outline=(0,0,0),width=1)
    return im
def sheet(tag,f,c,nm,err):
    sp=spal(f,c);z=6;tz=6;W=1000
    tA=tex_rgb('A',sp,tz);tB=tex_rgb('B',sp,tz);LW=tA.width+12
    rows=[]
    for n in FRAMES:
        ims=[spr(n,sp,o,z,err) for o in (None,'A','B')];rows.append((n,ims))
    colw=max(i.width for _,r in rows for i in r)+16;rh=[max(i.height for i in r)+(46) for _,r in rows]
    H=90+sum(rh);im=Image.new('RGB',(W,H),(0,0,0));d=ImageDraw.Draw(im)
    d.text((6,6),'%s - %s'%(nm,'errors marked' if err else 'clean'),font=F_(24),fill=(255,255,255))
    for k,t in enumerate(('ORIGINAL','OPTION A','OPTION B')):d.text((LW+k*colw+4,50),t,font=F_(20),fill=((255,255,255),(255,255,0),(0,220,255))[k])
    d.text((4,40),'tex A',font=F_(16),fill=(255,255,0));im.paste(tA,(4,62));d.text((4,62+tA.height+8),'tex B',font=F_(16),fill=(0,220,255));im.paste(tB,(4,62+tA.height+30))
    y=80;J=json.load(open(H11+'/g11_teams.json'))['frames']
    for (n,ims),h in zip(rows,rh):
        d.text((LW+4,y),'%d d%d %s'%(n,GF[n][0][1],orient(n)),font=F_(15),fill=(255,255,255))
        for k,i in enumerate(ims):
            im.paste(i,(LW+k*colw+4,y+22))
            if err and k:r=J['%d%s'%(n,'AB'[k-1])];d.text((LW+k*colw+4+150,y),'%d>%d'%(r['strict'],r['after']),font=F_(15),fill=(255,255,0))
        y+=h
    if err:d.text((LW,H-20),'white box = wrong after expand; numbers = whole goalie strict>after; body/stick keep game colours',font=F_(12),fill=(255,255,255))
    fn=OUT+'g11_%s_%s.png'%(tag,'errors' if err else 'clean');im.save(fn);print(fn,im.size)
H11=H
if __name__=='__main__':
    textures()
    for t in TEAMS:
        for e in (0,1):sheet(*t,e)
