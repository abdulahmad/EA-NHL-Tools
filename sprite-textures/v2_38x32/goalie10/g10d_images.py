# Goalie v10d images (LOCAL ONLY, contain game sprite renders) -> /workspace/preview_v2/goalie10/
import sys,os,json
import g10d
from g10d import *
from g10c_images import grid,col,lum,F_
import g10sheet
OUT='/workspace/preview_v2/goalie10/'
def pad_texture():
    S=24;old=decode();PF=T4[9:23,0:10];ST=T4[9:23,10:13];WR=wrap(T4)
    g1=grid(np.concatenate([PF,np.full((14,1),TRANS,int),ST],axis=1),S,title='pad front + strip (v3/v4)')
    d=ImageDraw.Draw(g1)
    r=[13*S,34+7*S,14*S-1,34+8*S-1];d.rectangle([r[0]-3,r[1]-3,r[2]+3,r[3]+3],outline=(255,255,0),width=4)
    g2=grid(WR,S,title='wrap view');d2=ImageDraw.Draw(g2);r=[3*S,34+7*S,4*S-1,34+8*S-1];d2.rectangle([r[0]-3,r[1]-3,r[2]+3,r[3]+3],outline=(255,255,0),width=4)
    install();G=parts_for({520,539,487});items=[]
    for n,k in [(520,'padB_L'),(520,'padB_R'),(539,'padB_L'),(487,'padB_L')]:items.append((frame(n),G[(n,k)]['q'],'padWrap','%d %s'%(n,k)))
    cells=[]
    for p,q,t,l in items:
        TP=pc(T4,t);prm=g10match.fit(p,q,TP);R,lab,M=g10match.evaluate(p,q,TP,prm);A,B=g10sheet.render(p,q,lab,M,T4,TP)
        c=Image.new('RGB',(A.width+B.width+12,A.height+60),(0,0,0));dc=ImageDraw.Draw(c);dc.text((2,0),l,font=F_(16),fill=(255,255,255))
        dc.text((2,20),'diff %d>%d out %d'%(R['strict_diff'],R['after_expand_diff'],R.get('outzone',0)),font=F_(14),fill=(255,255,0))
        c.paste(A,(0,42));c.paste(B,(A.width+12,42))
        for xx,tt in ((4,'A'),(A.width+16,'B')):dc.text((xx,44),tt,font=F_(28),fill=(255,255,255),stroke_width=3,stroke_fill=(0,0,0))
        cells.append(c)
    W=1000;H=max(g1.height+60,60+sum(c.height+8 for c in cells[:2]))+40;im=Image.new("RGB",(W,H+500),(0,0,0));d=ImageDraw.Draw(im)
    d.text((6,4),'Pad texture v3/v4: 186 in the strip (yellow box), wrap view, pad backs mapped',font=F_(20),fill=(255,255,255))
    im.paste(g1,(0,40));im.paste(g2,(0,40+g1.height+10))
    x0=g1.width+14;x=x0;y=40;rh=0
    for c in cells:
        if x+c.width>W:x=x0;y+=rh+8;rh=0
        im.paste(c,(x,y));x+=c.width+8;rh=max(rh,c.height)
    yy=y+rh+16
    for i,t in enumerate(['Yellow box = the one changed texel: strip row 8, 155 -> 186 (socks stripe 1 dark)',
        'wrap = pad-front right trim 155 | strip | pad-front left trim 155 155 (pad back)',
        'A = in-game, B = from texture; white box = diff after expand, dot = fixed by expand','W = white family (socks plain 181-183)']):
        d.text((x0,yy+i*22),t,font=F_(13),fill=(255,255,255))
    im=im.crop((0,0,W,max(yy+100,40+g1.height+10+g2.height+10)));im.save(OUT+'g10d_pad_texture.png');print('pad',im.size)
def skeleton():
    import math
    C={c['frame']:c for c in candidates() if c['piece']=='catcher_face'}
    cells=[]
    for n,d_ in skel10.READY.items():
        A=skel10.ADJ[n];p=frame(n);S=8;h,w=p.shape;im=Image.new('RGB',(w*S,h*S+96),(0,0,0));dr=ImageDraw.Draw(im)
        for (y,x),v in np.ndenumerate(p):
            if v!=255:dr.rectangle([x*S,y*S,x*S+S-1,y*S+S-1],fill=tuple(int(k*.35) for k in col(int(v))))
        P=lambda k:(A[k][0]*S+S/2,A[k][1]*S+S/2)
        R_,L_=(255,255,0),(0,200,255)   # right side yellow, left side cyan (no red/green)
        for a,b,c in [('head','neck',(255,255,255)),('neck','pelvis',(255,255,255)),('neck','Rsh',R_),('Rsh','Relb',R_),('Relb','Rhand',R_),('neck','Lsh',L_),('Lsh','Lelb',L_),('Lelb','Lhand',L_),
                      ('pelvis','Rhip',R_),('Rhip','Rknee',R_),('Rknee','Rank',R_),('pelvis','Lhip',L_),('Lhip','Lknee',L_),('Lknee','Lank',L_)]:dr.line([P(a),P(b)],fill=c,width=3)
        st=skel10.STICK[n];dr.line([(x*S+S/2,y*S+S/2) for x,y in st],fill=(255,140,255),width=3)
        o=skel10.catcher(d_)['orient']
        for k,t,c in (('Rhand','RH',R_),('Lhand','LH',L_),('Rank','RL',R_),('Lank','LL',L_)):
            x,y=P(k);dr.ellipse([x-5,y-5,x+5,y+5],fill=c);dr.text((x+6,y-8),t,font=F_(15),fill=c,stroke_width=2,stroke_fill=(0,0,0))
        x,y=P('Lhand');dr.ellipse([x-14,y-14,x+14,y+14],outline=L_,width=2)
        dr.text((2,h*S+2),'%d d%d'%(n,d_),font=F_(17),fill=(255,255,255));dr.text((2,h*S+22),skel10.FACE[d_],font=F_(11),fill=(255,255,255))
        dr.text((2,h*S+40),'catcher %s'%o,font=F_(15),fill=L_);dr.text((2,h*S+60),'stick',font=F_(13),fill=(255,140,255))
        cells.append(im)
    W=1000;x=0;y=56;rh=0;pos=[]
    for c in cells:
        if x+c.width>W:x=0;y+=rh+10;rh=0
        pos.append((x,y));x+=c.width+10;rh=max(rh,c.height)
    sh=Image.new('RGB',(W,y+rh+10),(0,0,0));d=ImageDraw.Draw(sh)
    d.text((6,4),'Ready 407-428: one 3D goalie rotated per facing + per-frame joints',font=F_(20),fill=(255,255,255))
    d.text((6,30),'yellow = goalie RIGHT (RH blocker+stick, RL pad)   cyan = goalie LEFT (LH catcher, LL pad)   pink = stick',font=F_(13),fill=(255,255,0))
    for c,p_ in zip(cells,pos):sh.paste(c,p_)
    sh.save(OUT+'g10d_skeleton_ready.png');print('skel',sh.size)
def layout():
    S=40;C=fuhr_catcher();g=grid(C,S,title=None);d=ImageDraw.Draw(g)
    W=1000;im=Image.new('RGB',(W,g.height+420),(0,0,0));D=ImageDraw.Draw(im);D.text((6,4),'Fuhr-style unified catcher (texture v4 rows 24-32, 22x9)',font=F_(22),fill=(255,255,255))
    from PIL import Image as I
    fu=I.open('/home/box/agent-data/agents/0984e4f2-0f69-4737-84ba-d2d87f94a30b/attachments/6cd97ac5c162dd9e72a3925f97a22d76dd89d76b3efce3d015a5437e8e229882.jpg').convert('RGB')
    im.paste(g,(60,90))
    for k,(a,b) in REG.items():
        x0=60+a*S;x1=60+(b+1)*S;D.rectangle([x0,84,x1-1,90+g.height+6],outline=(255,255,0),width=3);D.text((x0+4,56),k,font=F_(18),fill=(255,255,0))
    D.text((4,90+S//2-10),'trim',font=F_(14),fill=(255,255,255));D.text((4,90+8*S+S//2-10),'trim',font=F_(14),fill=(255,255,255))
    D.text((60,90+g.height+14),'catBack = x0-11 (back panel + cuff), catFront = x6-21 (cuff + palm + pocket/web)',font=F_(15),fill=(255,255,255))
    L=['147 = outline/trim top, left and separators; 148 = bottom/right rim (Fuhr red trim). Never a fill.',
       'BACK panel 150-152 (Fuhr white back with stitching): 152 top, 151 body, 150 bottom.',
       'CUFF 151/152 with a 2x3 LOGO area in 150 (Fuhr cuff logo); 149 = wrist band next to the palm.',
       'PALM 144 (web end) -> 145 -> 146 (heel); POCKET/WEB = 152 lacing row + 144/145 mesh.']
    for i,t in enumerate(L):D.text((10,90+g.height+44+i*26),t,font=F_(14),fill=(255,255,255))
    fu=fu.resize((200,int(200*fu.height/fu.width)));im.paste(fu,(W-fu.width-10,90+g.height+150));D.text((W-fu.width-10,90+g.height+126),'Fuhr art (ref)',font=F_(16),fill=(255,255,255))
    im=im.crop((0,0,W,90+g.height+150+fu.height+10));im.save(OUT+'g10d_catcher_layout.png');print('layout',im.size)
def match():
    install();R=json.load(open(H10+'/g10d_catcher.json'));C={c['frame']:c for c in candidates() if c['piece']=='catcher_face'}
    sel=[r for r in R if r['frame'] in (407,409,419,421,428,436,519,538,543,546,554,980,1042)]
    it=[]
    for r in sel:
        n=r['frame']
        it.append((frame(n),C[n]['q'],r['layout'],'%d d%d %s<-%s'%(n,r['d'],r['orient'][0],'F' if r['layout']=='catFront' else 'B'),None))
        it.append((frame(n),C[n]['q'],'catcher','%d <-Abdul 8x12'%n,None))
    g10sheet.build(it[:10],'g10d_catcher_match_1.png','Catcher: Fuhr layout (by facing) vs Abdul 8x12')
    g10sheet.build(it[10:18],'g10d_catcher_match_2.png','Catcher: Fuhr layout (by facing) vs Abdul 8x12')
    g10sheet.build(it[18:],'g10d_catcher_match_3.png','Catcher: Fuhr layout (by facing) vs Abdul 8x12')
if __name__=='__main__':
    for f in (sys.argv[1:] or ['pad_texture','skeleton','layout','match']):globals()[f]()
