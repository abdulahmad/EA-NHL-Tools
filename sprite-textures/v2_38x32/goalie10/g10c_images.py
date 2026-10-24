# Goalie v10c images (LOCAL ONLY, they contain game sprite renders) -> /workspace/preview_v2/goalie10/
import sys,os,json
from g10c import *
from PIL import Image,ImageDraw,ImageFont
F_=lambda s:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',s)
OUT='/workspace/preview_v2/goalie10/'
def col(i):return (252,252,252) if i==WHITE else tuple(int(v) for v in g10tex.ACT[i])
def lum(c):return 0.3*c[0]+0.59*c[1]+0.11*c[2]
def grid(A,S,hl=(),title=None,dim=None):
    h,w=A.shape;top=34 if title else 0;im=Image.new('RGB',(w*S,h*S+top),(40,40,40));d=ImageDraw.Draw(im)
    if title:d.text((2,2),title,font=F_(22),fill=(255,255,255))
    for y in range(h):
        for x in range(w):
            v=int(A[y,x])
            if v==TRANS:continue
            c=col(v);
            if dim is not None and not dim[y,x]:c=tuple(int(k*.3+15) for k in c)
            r=[x*S,top+y*S,x*S+S-1,top+y*S+S-1];d.rectangle(r,fill=c)
            t='W' if v==WHITE else str(v);d.text((x*S+S//2,top+y*S+S//2),t,font=F_(max(S//3,9)),fill=(0,0,0) if lum(c)>110 else (255,255,255),anchor='mm')
            if v in hl:d.rectangle(r,outline=(255,255,255),width=3);d.rectangle([r[0]+3,r[1]+3,r[2]-3,r[3]-3],outline=(0,0,0),width=2)
    return im
def crop(n,pad=1):
    p=frame(n);ys,xs=np.nonzero((p>=181)&(p<=189));ys2=[y for y in ys if y>p.shape[0]*0.4] or list(ys)
    y0,y1=max(min(ys2)-pad,0),min(max(ys)+pad+1,p.shape[0]);xs2=xs[ys>=y0];x0,x1=max(min(xs2)-pad,0),min(max(xs2)+pad+1,p.shape[1])
    return p[y0:y1,x0:x1].astype(int),(x0,y0)
def evidence():
    S=26;old=decode()[9:23,10:13];new=T3[9:23,10:13]
    L=Image.new('RGB',(2*3*S+40,14*S+120),(0,0,0));d=ImageDraw.Draw(L);d.text((4,2),'TEXTURE',font=F_(20),fill=(255,255,255))
    L.paste(grid(old,S,hl=(155,),title='A old'),(4,30));L.paste(grid(new,S,hl=(186,),title='B new'),(3*S+30,30))
    d.text((4,14*S+72),'strip row 8: 184 185 155',font=F_(12),fill=(255,255,0));d.text((4,14*S+90),'-> 184 185 186',font=F_(12),fill=(255,255,0))
    J=json.load(open(H10+'/g10c_padback.json'))['frames'];cells=[]
    for n,lab in [(520,'520 dive d0  1/2 + 186'),(539,'539 ready d0  1/2 + 186'),(488,'488 skate d0  2/1 + 186'),(487,'487 skate d0  2/1 + 155'),(471,'471 stick d0  2/1 + 186'),(976,'976 fallstick d7  2/1 + 155')]:
        A,_=crop(n);g=grid(A,20,hl=(186,));c=Image.new('RGB',(max(g.width,200),g.height+30),(0,0,0));ImageDraw.Draw(c).text((2,2),lab,font=F_(15),fill=(255,255,255));c.paste(g,(0,28));cells.append(c)
    W=1000;x=L.width+12;y=60;rowh=0;pos=[]
    for c in cells:
        if x+c.width>W:x=L.width+12;y+=rowh+12;rowh=0
        pos.append((x,y));x+=c.width+12;rowh=max(rowh,c.height)
    H=max(y+rowh+150,L.height+60);im=Image.new('RGB',(W,H),(0,0,0));d=ImageDraw.Draw(im)
    d.text((6,4),'Part 1: socks stripe 1 DARK (186) is a real pad-back zone',font=F_(22),fill=(255,255,255))
    d.text((6,32),'boxed cells = 186 (A/B: the texel changed). 1/2 = stripe 1 above stripe 2, 2/1 = below',font=F_(13),fill=(255,255,0))
    im.paste(L,(0,60))
    for c,(px,py) in zip(cells,pos):im.paste(c,(px,py))
    T=json.load(open(H10+'/g10c_padback.json'))['totals']
    s186=sum(v for k,v in T.items() if k.endswith('|186'));s155=sum(v for k,v in T.items() if k.endswith('|155'))
    tx=['3rd px after 184 185, all 246 goalie frames: 186 = %d runs (26 frames), 155 = %d runs (10 frames)'%(s186,s155),
        '186 on both sides (184 left/right) -> not a mirror artefact; in 80 frames / 15 anims -> not an errant frame',
        'Order 1/2 (ready, swing, dive, poke) and 2/1 (skate, stick, stack) both at d0 -> art variant per anim']
    for i,t in enumerate(tx):d.text((L.width+12,H-140+i*24),t,font=F_(12),fill=(255,255,255))
    im.save(OUT+'g10c_p1_evidence_186.png');print(im.size)
def layout():
    S=34;FR=pc(T3,'catcherF');BK=pc(T3,'catcherB')
    def reg(A,kind):
        R={}
        for (y,x),v in np.ndenumerate(A):
            v=int(v)
            if v==TRANS:continue
            if v in (147,148):R[(y,x)]='O'          # rim / outline (Fuhr red trim)
            elif v in (144,145,146):R[(y,x)]='P' if kind=='F' else 'C'   # palm-pocket (front) / cuff-palm edge (back)
            elif v in (150,151,152):R[(y,x)]='C' if kind=='F' else 'K'   # cuff + web lace (front) / back of hand (back)
            elif v==149:R[(y,x)]='C'
            else:R[(y,x)]='?'
        return R
    out=[]
    for A,k,t in ((FR,'F','FRONT (palm) from 538 d4'),(BK,'B','BACK from 428 d7')):
        g=grid(A,S,title=t);d=ImageDraw.Draw(g);R=reg(A,k)
        for (y,x),r in R.items():d.text((x*S+S-6,34+y*S+4),r,font=F_(11),fill=(0,0,0) if lum(col(int(A[y,x])))>110 else (255,255,255),anchor='mm')
        out.append(g)
    W=1000;H=max(o.height for o in out)+300;im=Image.new('RGB',(W,H),(0,0,0));d=ImageDraw.Draw(im)
    d.text((6,4),'Part 2: unified catcher layout (texture v3 rows 24-30)',font=F_(22),fill=(255,255,255))
    x=6
    for o in out:im.paste(o,(x,44));x+=o.width+30
    L=['Region letter (corner of each cell):  O = rim/outline 147 148 (Fuhr red trim)',
       'P = palm + pocket 144 145 146 (Fuhr white palm, dark 144 at the web/top, light 146 at the heel)',
       'C = cuff / wrist band 149 150 151 152 (Fuhr white cuff with logo), on the arm side',
       'K = back of hand 150 151 152 inside a 147/148 rim (Fuhr back: left white panel with stitching)',
       'Web = top edge 152 row of FRONT (lacing between thumb and fingers)',
       'Palette roles: 147/148 = outline (never fill), 150-152 / 144-146 = base fills with 3-step',
       'shading built in (dark-mid-light); shading layer only 22 30 31 88 109 136.']
    for i,t in enumerate(L):d.text((10,H-250+i*30),t,font=F_(16),fill=(255,255,0) if i==0 else (255,255,255))
    im.save(OUT+'g10c_p2_catcher_layout.png');print(im.size)
def skeleton():
    import math
    sys.path.insert(0,H10+'/../goalie5');cwd=os.getcwd();import skel5;os.chdir(cwd)
    R=json.load(open(H10+'/g10c_match.json'))['catcher'];best={r['frame']:r for r in R}
    cells=[]
    for n in (407,410,413,416,419,422,425,428):
        d_=skel5.GREADY[n];P=skel5.fit(n)
        if n in skel5.ADJ:P={k:(v[0]+.5,v[1]+.5,0) for k,v in skel5.ADJ[n].items()}   # hand-placed joints where available
        p=frame(n);S=7;h,w=p.shape
        im=Image.new('RGB',(w*S,h*S+80),(0,0,0));dr=ImageDraw.Draw(im)
        for (y,x),v in np.ndenumerate(p):
            if v!=255:c=col(int(v));dr.rectangle([x*S,y*S,x*S+S-1,y*S+S-1],fill=tuple(int(k*.45) for k in c))
        for a,b in [('neck','Lsh'),('Lsh','Lelb'),('Lelb','Lhand'),('neck','Rsh'),('Rsh','Relb'),('Relb','Rhand'),('neck','pelvis')]:
            dr.line([P[a][0]*S,P[a][1]*S,P[b][0]*S,P[b][1]*S],fill=(255,255,255),width=2)
        k=skc(d_);hx,hy=P['Lhand'][0]*S,P['Lhand'][1]*S
        cc={'FRONT':(255,255,0),'BACK':(0,200,255),'SIDE':(255,255,255)}[k['orient']]
        dr.ellipse([hx-12,hy-12,hx+12,hy+12],outline=cc,width=4)
        t=math.radians(45*d_);nx=(-0.3*math.cos(t)+1*math.sin(t))   # palm normal screen x
        dr.line([hx,hy,hx+nx*30,hy-k['frontness']*0],fill=cc,width=3)
        ob=best.get(n,{}).get('best','-').replace('catcher','')
        dr.text((2,h*S+2),'%d d%d%s'%(n,d_,' ADJ' if n in skel5.ADJ else ''),font=F_(16),fill=(255,255,255));dr.text((2,h*S+22),'skel: %s'%k['orient'],font=F_(15),fill=cc)
        dr.text((2,h*S+42),'fit: %s'%({'F':'FRONT','B':'BACK'}.get(ob,'<8 catcher px')),font=F_(15),fill=(255,255,255))
        cells.append(im)
    W=1000;x=0;y=50;rh=0;pos=[]
    for c in cells:
        if x+c.width>W:x=0;y+=rh+10;rh=0
        pos.append((x,y));x+=c.width+10;rh=max(rh,c.height)
    sh=Image.new('RGB',(W,y+rh+10),(0,0,0));d=ImageDraw.Draw(sh);d.text((6,4),'Part 2: catcher (left hand) on skel5 pose, ready d0-d7',font=F_(20),fill=(255,255,255))
    d.text((6,28),'ring = catcher, yellow FRONT (palm), blue BACK, white SIDE; line = palm normal (screen x)',font=F_(12),fill=(255,255,0))
    for c,p_ in zip(cells,pos):sh.paste(c,p_)
    sh.save(OUT+'g10c_p2_skeleton_catcher.png');print(sh.size)
def sheets():
    install();G=parts_for({520,488,487,539,976});it=[]
    for n,k in [(520,'padB_L'),(520,'padB_R'),(539,'padB_L'),(488,'padB_L'),(487,'padB_L'),(976,'padB_R')]:it.append((frame(n),G[(n,k)]['q'],'padWrap','%d %s<-wrap'%(n,k),None))
    it.append((frame(416),q6(416,'padB_R'),'padWrap','416 padB_R seg6<-wrap',None));it.append((frame(449),q6(449,'padB_R'),'padWrap','449 padB_R seg6<-wrap',None))
    g10tex.PIECES['padWrap(view)']=(0,9,0,22)
    g10sheet.build(it,'g10c_p1_padback_match.png','Part 1: pad backs <- strip wrapped (155|strip|155 155), 186 in')
    del g10tex.PIECES['padWrap(view)']
    R=json.load(open(H10+'/g10c_match.json'))['catcher'];C={(c['frame']):c for c in candidates() if c['piece']=='catcher_face'};it=[]
    for r in R:
        if r['frame'] in (407,412,418,421,422,424,428,430,519,535,538,545,980,1042):
            n=r['frame'];it.append((frame(n),C[n]['q'],r['best'],'%d d%d %s<-%s'%(n,r['d'],r['skel']['orient'][0],r['best'][-1]),None))
    g10sheet.build(it[:7],'g10c_p2_catcher_match_1.png','Part 2: catcher <- unified layout (best of F/B)')
    g10sheet.build(it[7:],'g10c_p2_catcher_match_2.png','Part 2: catcher <- unified layout (best of F/B)')
if __name__=='__main__':
    for f in (sys.argv[1:] or ['evidence','layout','skeleton','sheets']):globals()[f]()
