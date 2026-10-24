# Goalie v10e images (LOCAL ONLY, contain game sprite renders) -> /workspace/preview_v2/goalie10/
import json
from g10e import *
from g10c_images import grid,col,lum,F_
OUT='/workspace/preview_v2/goalie10/'
ART=Image.open('/home/box/agent-data/agents/0984e4f2-0f69-4737-84ba-d2d87f94a30b/attachments/6cd97ac5c162dd9e72a3925f97a22d76dd89d76b3efce3d015a5437e8e229882.jpg').convert('RGB')
CROP={'CUFF':(5,5,95,80),'BACK':(100,5,250,120),'PALM':(5,85,100,210),'POCKET':(115,110,250,210),'WEB':(60,55,180,105)}
TEST={'TRIM':(150,0,170),'BACK':(40,100,255),'CUFF':(230,120,0),'WEB':(255,240,0),'PALM':(255,255,255),'POCKET':(110,200,255)}
def paint(o,mode):
    T,_=OPT[o];R=regions(o);Pn={}
    keys=set(R[24:33].flatten())-{''}
    side=lambda x:0 if (o=='A' or x<=11) else 1
    bb={}
    for (y,x),r in np.ndenumerate(R):
        if r and not (o=='B' and x-12>=9):k=(r,side(x));a=bb.get(k,(y,x,y,x));bb[k]=(min(a[0],y),min(a[1],x),max(a[2],y),max(a[3],x))
    for (y,x),r in np.ndenumerate(R):
        if not r:continue
        y0,x0,y1,x1=bb[(r,side(x))]
        fy=(y-y0+.5)/(y1-y0+1);fx=min(max((x-x0+.5)/(x1-x0+1),0),.99);fy=min(max(fy,0),.99)
        if mode=='test':
            c=TEST[r];g=(.7+.3*fx)*(1 if (y-24)%2==0 else .55);Pn[(y,x)]=tuple(int(k*g) for k in c)
        else:
            if r=='TRIM':Pn[(y,x)]=(225,30,40);continue
            a=CROP[r];Pn[(y,x)]=ART.getpixel((int(a[0]+fx*(a[2]-a[0])),int(a[1]+fy*(a[3]-a[1]))))
    return Pn,bb
def tex_panel(o,mode,S=11):
    T,P=OPT[o];Pn,bb=paint(o,mode);y0,y1=24,32;xs=[x for (y,x) in Pn];w=max(xs)+1
    im=Image.new('RGB',(w*S+4,(y1-y0+1)*S+40),(0,0,0));d=ImageDraw.Draw(im)
    for (y,x),c in Pn.items():d.rectangle([x*S,(y-y0)*S,x*S+S-2,(y-y0)*S+S-2],fill=c)
    for (r,s),(a,b,c_,e) in bb.items():
        if r=='TRIM':continue
        d.text(((b+e+1)*S/2,((a+c_+1)/2-y0)*S),r if r!='POCKET' else 'POCK',font=F_(11),fill=(0,0,0),anchor='mm',stroke_width=2,stroke_fill=(255,255,255))
    if o=='B':d.text((2,(y1-y0+1)*S+2),'back rect | front oval',font=F_(13),fill=(255,255,255))
    return im
def cell(o,mode,n,row,S=10):
    p=frame(n);q=catcher_q(n);k=row['piece'];T,P=OPT[o];x0,y0=P[k][0],P[k][1];TP=piece(o,k);prm=tuple(row[o]['params'])
    R_,lab,M=g10match.evaluate(p,q,TP,prm);Pn,_=paint(o,mode);qs=set(map(tuple,q))
    ys=[t[0] for t in q];xs=[t[1] for t in q];a,b=max(min(ys)-3,0),max(min(xs)-3,0);c_,e=min(max(ys)+4,p.shape[0]),min(max(xs)+4,p.shape[1]);h,w=c_-a,e-b
    A=Image.new('RGB',(w*S,h*S),(0,0,0));B=A.copy();da,db=ImageDraw.Draw(A),ImageDraw.Draw(B)
    for y in range(a,c_):
        for x in range(b,e):
            v=int(p[y,x]) if y<p.shape[0] and x<p.shape[1] else 255
            if v==255:continue
            r=[(x-b)*S,(y-a)*S,(x-b)*S+S-1,(y-a)*S+S-1];cc=col(v)
            if (y,x) in qs:
                da.rectangle(r,fill=cc);t=M.get((y,x))
                cb=Pn.get((t[0]+y0,t[1]+x0),(90,90,90)) if t else (90,90,90)
                db.rectangle(r,fill=cb)
                if lab.get((y,x))=='diff':db.rectangle(r,outline=(255,255,255),width=1)
            else:
                dm=tuple(int(k*.3) for k in cc);da.rectangle(r,fill=dm);db.rectangle(r,fill=dm)
    W=A.width*2+8;im=Image.new('RGB',(W,A.height+64),(0,0,0));d=ImageDraw.Draw(im)
    d.text((2,0),'%d d%d %s %s'%(n,row['d'],row['orient'],row['anim'][4:]),font=F_(15),fill=(255,255,255))
    X=row[o];Ab=row['abdul']
    d.text((2,18),'%s %d>%d  Abdul %d>%d'%(o,X['strict_diff'],X['after_expand_diff'],Ab['strict_diff'],Ab['after_expand_diff']),font=F_(14),fill=(255,255,0))
    im.paste(A,(0,40));im.paste(B,(A.width+8,40))
    for xx,tt in ((2,'A'),(A.width+10,'B')):d.text((xx,40),tt,font=F_(24),fill=(255,255,255),stroke_width=3,stroke_fill=(0,0,0))
    return im
def sheet(o,mode,rows):
    tp=tex_panel(o,mode);LW=max(tp.width,250)+10;cells=[cell(o,mode,r['frame'],r) for r in rows]
    W=1000;x=LW;y=50;rh=0;pos=[]
    for c in cells:
        if x+c.width>W:x=LW;y+=rh+10;rh=0
        pos.append((x,y));x+=c.width+10;rh=max(rh,c.height)
    H=max(y+rh,50+tp.height+260)+10;im=Image.new('RGB',(W,H),(0,0,0));d=ImageDraw.Draw(im)
    nm={'A':'Option A: v4 Fuhr-style 22x9 rectangle','B':'Option B: back rect + rimmed front oval (v5 cand.)'}[o]
    d.text((6,6),'%s - %s'%(nm,'TEST PATTERN' if mode=='test' else 'GRANT FUHR design'),font=F_(22),fill=(255,255,255))
    im.paste(tp,(0,50));yy=50+tp.height+8
    if mode=='test':
        for i,(r,c) in enumerate(TEST.items()):d.rectangle([4,yy+i*24,24,yy+i*24+18],fill=c);d.text((30,yy+i*24),r,font=F_(15),fill=(255,255,255))
        yy+=len(TEST)*24+4;tx=['dark rows = odd texel rows','brighter to the right (u)']
    else:tx=['red trim, art crops resized','to each region (Fuhr art)']
    tx+=['A in-game, B mapped','white box = diff after expand','numbers: strict>after expand','grey = not mapped']
    for i,t in enumerate(tx):d.text((4,yy+i*19),t,font=F_(13),fill=(255,255,255))
    for c,p in zip(cells,pos):im.paste(c,p)
    f=OUT+'g10e_opt%s_%s.png'%(o,mode);im.save(f);print(f,im.size)
def textures():
    S=26;out=[]
    for o in 'AB':
        T,P=OPT[o];C=T[24:33,0:23];g=grid(C,S,title='Option %s'%o+(' (v4 rectangle)' if o=='A' else ' (v5 candidate: back rect + front oval)'))
        d=ImageDraw.Draw(g);R=regions(o);_,bb=paint(o,'test')
        for (r,s),(a,b,c_,e) in bb.items():
            if r=='TRIM':continue
            col_=(255,255,0) if s==0 else (0,220,255)
            d.rectangle([b*S-1,34+(a-24)*S-1,(e+1)*S,34+(c_-23)*S],outline=col_,width=3)
            d.text((b*S+3,34+(c_-23)*S-14),r,font=F_(12),fill=col_,stroke_width=2,stroke_fill=(0,0,0))
        out.append(g)
    W=1000;H=sum(g.height+20 for g in out)+90;im=Image.new('RGB',(W,H),(0,0,0));d=ImageDraw.Draw(im);y=10
    for g in out:im.paste(g,(0,y));y+=g.height+20
    for i,t in enumerate(['Texture rows 24-32, cells = palette index. Boxes = regions (TRIM = 147/148 cells).',
        'Pieces: A catBack x0-11, catFront x6-21; B catBack x0-11, catFront x12-22 (oval).',
        'Abdul palette: 145 shows red and 146 green - read the index numbers.']):d.text((6,y+i*22),t,font=F_(15),fill=(255,255,255))
    im.save(OUT+'g10e_textures.png');print('tex',im.size)
if __name__=='__main__':
    R={r['frame']:r for r in json.load(open(H10+'/g10e_catcher.json'))};rows=[R[n] for n in SAMPLE]
    textures()
    for o in 'AB':
        for m in ('test','fuhr'):sheet(o,m,rows)
