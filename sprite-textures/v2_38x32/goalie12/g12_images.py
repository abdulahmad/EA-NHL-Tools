# Goalie v12 images (LOCAL ONLY, game sprite renders) -> /workspace/preview_v2/goalie12/
from g12 import *
import g11_images as GI
from g11_images import tex_rgb,spr,F_
OUT='/workspace/preview_v2/goalie12/';os.makedirs(OUT,exist_ok=True)
def textures():
    z=11;W=1000;cw=245;th=32*z;im=Image.new('RGB',(W,50+2*(th+40)+170),(0,0,0));d=ImageDraw.Draw(im)
    d.text((6,6),'Goalie textures v12 (old 8x12 catcher removed, 23x32): A / B',font=F_(22),fill=(255,255,255))
    for i,(tag,f,c,nm) in enumerate(TEAMS):
        sp=spal(f,c)
        for j,o in enumerate('AB'):
            x=i*cw+4;y=40+j*(th+40);d.text((x,y),'%s  %s'%(nm,o),font=F_(19),fill=(255,255,0) if o=='A' else (0,220,255));im.paste(tex_rgb(o,sp,z),(x,y+24))
        y=40+2*(th+40)+4;x=i*cw+4
        for k,(a,b,l) in enumerate(((144,146,'144-146'),(147,149,'147-149'),(150,152,'150-152'),(181,183,'181-183'),(184,186,'184-186'),(187,189,'187-189'))):
            for m in range(a,b+1):d.rectangle([x+(m-a)*18,y+k*22,x+(m-a)*18+16,y+k*22+18],fill=tuple(int(v) for v in sp[m]),outline=(255,255,255))
            d.text((x+60,y+k*22+1),l,font=F_(13),fill=(255,255,255))
    d.text((6,im.height-20),'Rows 0-8 blocker + mask | 9-22 pad front + strip | 23-31 catcher (A: 22x9 rect; B: back rect + front oval)',font=F_(13),fill=(220,220,220))
    im.save(OUT+'g12_textures.png');print('tex',im.size)
LBL=['ORIGINAL\n95 PC PALETTE','OPTION %s\nTEXTURE APPLIED','OPTION %s\nERRORS MARKED']
def sheet(tag,f,c,nm,o,frames=FRAMES,J=None,fn=None,title=None):
    sp=spal(f,c);z=7;tA=tex_rgb(o,sp,6);LW=tA.width+14;W=1000
    rows=[(n,[spr(n,sp,None,z,0),spr(n,sp,o,z,0),spr(n,sp,o,z,1)]) for n in frames]
    colw=(W-LW)//3;hdr=56;y=48;pos=[]
    for i,(n,ims) in enumerate(rows):
        if i%4==0:pos.append(('H',y));y+=hdr
        pos.append((i,y));y+=max(i_.height for i_ in ims)+30
    im=Image.new('RGB',(W,y+30),(0,0,0));d=ImageDraw.Draw(im)
    d.text((6,6),title or '%s - Option %s'%(nm,o),font=F_(26),fill=(255,255,255))
    d.text((4,48),'texture %s'%o,font=F_(16),fill=(255,255,0));im.paste(tA,(4,70))
    for k,(a,b) in enumerate([(144,152),(181,189)]):pass
    for kind,yy in pos:
        if kind=='H':
            for k,t in enumerate(LBL):
                col=((255,255,255),(255,255,0),(0,220,255))[k];d.text((LW+k*colw+2,yy+2),t%o if '%s' in t else t,font=F_(19),fill=col,spacing=2)
            continue
        n,ims=rows[kind];r=J['%d%s'%(n,o)]
        d.text((LW+2,yy),'%d d%d %s'%(n,GF[n][0][1],orient(n)),font=F_(15),fill=(255,255,255))
        d.text((LW+2*colw+2,yy),'strict %d > after expand %d'%(r['strict'],r['after']),font=F_(15),fill=(255,255,0))
        for k,i_ in enumerate(ims):
            if i_.width>colw-6:i_=i_.resize((colw-6,int(i_.height*(colw-6)/i_.width)),Image.NEAREST)
            im.paste(i_,(LW+k*colw+2,yy+20))
    d.text((LW,im.height-24),'white box = wrong after expand (zones first, then r1/r2 expand); body and stick keep game colours',font=F_(13),fill=(255,255,255))
    fn=fn or OUT+'g12_%s_opt%s.png'%(tag,o);im.save(fn);print(fn,im.size)
if __name__=='__main__':
    J=json.load(open(H12+'/g12_teams.json'))['frames'];textures()
    for t in TEAMS:
        for o in 'AB':sheet(*t,o,J=J)
