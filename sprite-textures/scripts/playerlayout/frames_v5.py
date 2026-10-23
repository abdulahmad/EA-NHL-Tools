# v5 frames: apply the 5 flat v5 textures to the 11 test frames. Output per frame: flat render, shading layer, combined render;
# comparison sheets (each sprite centred in its column, game frame alongside); round-trip check in the game's own colours.
# Mapping (v5, supersedes v4's family assignment):
#  * texel family = the v5 ROLE of the texel (textures_v5.ROLE) -> game zone family. v4 assigned pixels by the v4 FAM tags, which
#    disagree with the column-aligned v5 roles on 70+ texels (e.g. waist-2 pixels landing on a forearm texel) -> colour bleed.
#    Now a pixel of game family F only lands on texels whose v5 role is F, so stripes/crest/arms/pants keep their zone.
#  * per frame and family: one pixel per texel, min-cost assignment (Hungarian). Position: body bbox (stick, blades, ice excluded)
#    scaled onto the 14x32 figure. Direction table: d3-5 (57,370,897,62,67) front figure, d0/1/7 (42,47,77,889) back figure,
#    d2/d6 (52,72) side: leading (chest) half -> front figure, trailing half -> back figure, near flank -> outer columns, helmet
#    -> that side's helmet strip (d2 = player's right = cols 2-3, d6 = left = cols 9-10). Pants -> side-pants panel first.
#    Wrong figure +40, wrong side of the centre line +12, side-helmet strip outside its side view +30.
#  * gear (gloves/skates/blades idx 0,1,8,28,31) -> glove/skate texels (green); stick (136 not neck) and ice shadow (82/88) have no texel
#    by design: stick = green, ice shadow = green too (Abdul pt780u); round-trip check still uses game colours.
import sys,os,json,collections,runpy,numpy as np
from scipy.optimize import linear_sum_assignment
from PIL import Image,ImageDraw
H=os.path.dirname(os.path.abspath(__file__));OUT=sys.argv[1];os.makedirs(OUT,exist_ok=True)
TEXDIR=sys.argv[2] if len(sys.argv)>2 else os.path.join(os.path.dirname(OUT),'textures')
sys.argv=['x','/tmp/_v5_t5'];os.makedirs('/tmp/_v5_t5',exist_ok=True);T5=runpy.run_path(f'{H}/textures_v5.py')
ROLE,TW,TH,HAVE=T5['ROLE'],T5['TW'],T5['TH'],T5['HAVE']
sys.path.insert(0,H);from lib import frame,spritepal,D,ZN
import seg_v5 as SEG;SEGS={}
GRN=(0,220,0);MAG=(252,0,252)
DIRS={370:4,897:4,62:4,57:3,67:5,42:0,47:1,52:2,72:6,77:7,889:0}
# ---------- families
R2F={'helmet':'helmet','skin':'skin','yoke1':'yoke 1','yoke2':'yoke 2','yoke3':'yoke 3','yoke corner':'yoke corner','patch':'shoulder patch',
     'jersey':'jersey','number':'jersey','upper arm':'upper arm','arm1':'arm stripe 1','arm2':'arm stripe 2','arm3':'arm stripe 3','forearm':'forearm',
     'waist1':'waist 1','waist2':'waist 2','waist3':'waist 3','pants':'pants','pstripe1':'pants stripe 1','pstripe2':'pants stripe 2',
     'socks':'socks','sock1':'socks stripe 1','sock2':'socks stripe 2','glove':'gear','skate':'gear'}
CRI=[[192,193,194,195,196],[208,209,210,211,212],[224,225,226,227,228],[240,241,242,243,244]]
def tfam(u,v):
    r=ROLE[(u,v)]
    return f'idx{CRI[v-10][u-4]}' if r=='crest' else R2F[r]
TF={uv:tfam(*uv) for uv in ROLE}
GEAR={0,1,8,28,31};ICE={82,88};HEADI={133,134,135,140,190,191}
def pfam(i):
    n=ZN.get(str(i))
    if i in(133,134,140):return 'skin',{133:'light',134:'medium',140:'dark'}[i]
    if i==135:return 'skin','shadow'
    if i in GEAR:return 'gear','flat'
    if i>=192:return f'idx{i}','flat'
    if n.startswith('waist 1'):return 'waist 1',{'odd':'light','even':'medium','hidden':'dark'}[n.split()[-1]]
    if n=='pants dark':return 'pants','dark'
    if n=='pants medium':return 'pants','medium'
    if n.startswith('helmet'):return 'helmet',n.split()[-1]
    w=n.rsplit(' ',1)
    if w[-1] in('light','medium','dark'):return w[0],w[-1]
    return n,'flat'
def neck136(q):
    ys,xs=np.nonzero(q!=255);y0=ys.min();N=set();grow=True
    while grow:
        grow=False
        for y,x in zip(*np.nonzero(q==136)):
            if (y,x) in N or y>y0+11:continue
            nb=[(y+a,x+b) for a in(-1,0,1) for b in(-1,0,1) if 0<=y+a<q.shape[0] and 0<=x+b<q.shape[1]]
            if any(q[t] in HEADI or t in N for t in nb):N.add((y,x));grow=True
    return N
# side-helmet strips = texels outside 370's own head (fit370 SIDE)
sys.argv=['x','/tmp/_v5_f370'];os.makedirs('/tmp/_v5_f370',exist_ok=True);F370=runpy.run_path(f'{H}/fit370.py');SIDEH={uv:s for uv,s in F370['SIDE'].items() if s in('R','L')}
def tpos(u,v):
    """canonical (x,y,figure,side) of a texel in front-figure-like coordinates (x 4..17)."""
    if u<14:x,fig=u+4,'F'
    elif u<28:x,fig=u-10,'B'
    elif u in(29,41,53):x,fig={29:4,41:17,53:4}[u],'S'
    elif u<=40:x,fig=u-26+0.0,'F'
    else:x,fig=u-38+0.0,'B'
    return x,v,fig
# ---------- mapping
def fit(n):
    q=frame(n);d=DIRS[n];NK=neck136(q)
    body=[(y,x) for y,x in zip(*np.nonzero(q!=255)) if not(int(q[y,x]) in ICE or int(q[y,x]) in(8,28) or (q[y,x]==136 and (y,x) not in NK))]
    ys=[p[0] for p in body];xs=[p[1] for p in body];x0,x1,y0,y1=min(xs),max(xs),min(ys),max(ys)
    P=collections.defaultdict(list);LEV={};fixed={}
    for y,x in zip(*np.nonzero(q!=255)):
        i=int(q[y,x])
        if i in ICE:fixed[(y,x)]='ice';continue
        if i==136 and (y,x) not in NK:fixed[(y,x)]='stick';continue
        f,s=('skin','neck') if i==136 else pfam(i);P[f].append((y,x));LEV[(y,x)]=s
    TX=collections.defaultdict(list)
    for uv,f in TF.items():TX[f].append(uv)
    # v5.1 (Abdul pt784u): stripe rows and arm texels come from the SKELETON GEOMETRY, not from the game zones. The game zone is only a
    # validity filter (a pixel may only take a texel of its own family, which keeps the game-colour round trip exact).
    #  torso: one straight stripe direction per frame (least-squares fit of the waist-1/2/3 bands), sheared line index
    #    k = y - round(s*(x-xc)) -> every column steps one texel row per pixel, lines are digital straight lines (no kink, no 2-px rows).
    #  arms: per arm (segmentation), upper arm counted from the arm-stripe-1 line along the shoulder->elbow axis, forearm from the
    #    arm-stripe-3 line along the elbow->glove axis; across-arm position picks the arm column; L/R arm -> that arm's template columns.
    FOF={(y,x):f for f,px in P.items() for (y,x) in px}
    def torso_rows(tor):
        W=[(y-o,x) for (y,x) in tor for o in [{'waist 1':0,'waist 2':1,'waist 3':2}.get(FOF[(y,x)])] if o is not None]
        xs=np.array([p[1] for p in W],float);ys=np.array([p[0] for p in W],float)
        s=float(np.clip(np.polyfit(xs,ys,1)[0],-1,1)) if len(W)>=3 and np.ptp(xs)>0 else 0.0
        xc=float(xs.mean()) if len(W) else 0.0;k=lambda y,x:y-int(round(s*(x-xc)))
        kw=int(np.median([k(y,x) for (y,x) in W])) if W else max(p[0] for p in tor)-2
        GEO['torso']=dict(slope=s,xc=xc,k_waist1=kw);return {p:14+k(*p)-kw for p in tor}
    GEO={};NKS=set(NK)
    seg=SEG.segment(q,FOF,d,NKS,{p for p,t in fixed.items() if t=='stick'},torso_rows)
    PART,JOINTS,EDGES,ARMS,TROW=seg
    ROWT={};COLT={}
    for p,r in TROW.items():
        if FOF[p]=='jersey':ROWT[p]=min(13,max(9,r))
    for sname,c in ARMS.items():
        cs=set(c);g=lambda fs:[p for p in c if FOF[p] in fs]
        def axis_rows(pts,a0,a1,anchor,base,sign,lo,hi,key):
            if not pts or a0 is None or a1 is None:return
            ax,ay=a1[0]-a0[0],a1[1]-a0[1]
            if abs(ax)<1e-6 and abs(ay)<1e-6:ax=1
            GEO[key]=dict(axis=[float(ax),float(ay)],scan='rows' if abs(ax)>=abs(ay) else 'columns')
            if abs(ax)>=abs(ay):sl=-ay/ax;kk=lambda y,x:(x-int(round(sl*(y-a0[1]))))*np.sign(ax)
            else:sl=-ax/ay;kk=lambda y,x:(y-int(round(sl*(x-a0[0]))))*np.sign(ay)
            ka=int(np.median([kk(*p) for p in anchor])) if anchor else int(np.median([kk(*p) for p in pts]))
            raw=[int(base+sign*(kk(*p)-ka)) for p in pts];GEO[key]['raw_rows']=[min(raw),max(raw)];GEO[key]['template_rows']=[lo,hi]
            for p,r in zip(pts,raw):ROWT[p]=int(min(hi,max(lo,r)))
        cen=lambda px:(float(np.mean([p[1] for p in px])),float(np.mean([p[0] for p in px]))) if px else None
        ua,a1,a3,fa=g({'upper arm'}),g({'arm stripe 1'}),g({'arm stripe 3'}),g({'forearm'})
        el=cen(g({'arm stripe 1','arm stripe 2','arm stripe 3'}));sh=JOINTS.get(sname+' shoulder') or cen(ua);gl=JOINTS.get(sname+' glove') or cen(fa)
        axis_rows(ua,sh,el or cen(fa),a1,12,1,8,11,sname+' upper arm')          # row 12 = arm stripe 1 line, rows 11..8 towards the shoulder
        axis_rows(fa,el or cen(ua),gl,a3,14,1,15,17,sname+' lower arm')         # row 14 = arm stripe 3 line, rows 15..17 towards the glove
        # across-arm column: rank of the perpendicular coordinate, inner column = nearer the torso centre
        tc=JOINTS.get('chest') or (x0,y0)
        for part in (ua,g({'arm stripe 1','arm stripe 2','arm stripe 3'})+fa):
            if not part:continue
            a0,a1_=(sh,el) if part is ua else (el or cen(ua),gl)
            if a0 is None or a1_ is None:a0,a1_=cen(part),(cen(part)[0]+1,cen(part)[1])
            ax,ay=a1_[0]-a0[0],a1_[1]-a0[1];nn=max(1e-6,(ax*ax+ay*ay)**.5);px_,py_=-ay/nn,ax/nn
            if (tc[0]-a0[0])*px_+(tc[1]-a0[1])*py_<0:px_,py_=-px_,-py_     # +perp = towards torso
            for p in part:
                a=(p[1]-a0[0])*px_+(p[0]-a0[1])*py_;ci=0 if a<-0.75 else 2 if a>0.75 else 1      # 0 outer,1 mid,2 inner
                COLT[p]=(sname,ci)
    A={};shared=[];side=d in(2,6)
    for f,px in P.items():
        tx=TX.get(f,[])
        if not tx:raise SystemExit(f'{n}: no texel for family {f}')
        C=np.zeros((len(px),len(tx)))
        for a,(y,x) in enumerate(px):
            nx=4+(x-x0)*13/max(1,x1-x0);ny=(y-y0)*31/max(1,y1-y0);wy=1
            if (y,x) in ROWT:ny=ROWT[(y,x)];wy=50
            if side:   # depth from the leading (chest) edge, 0..1
                qd=(x1-x)/max(1,x1-x0) if d==2 else (x-x0)/max(1,x1-x0)
                want='F' if qd<0.5 else 'B';t=min(1,qd/0.5) if qd<0.5 else min(1,(qd-0.5)/0.5)
                # d2 shows the player's right: front figure right half = screen-left (x 4..10.5), back figure right = screen-right
                if d==2:cxp=10.5-6.5*t if want=='F' else 17-6.5*(1-t)
                else:cxp=10.5+6.5*t if want=='F' else 4+6.5*(1-t)
            else:want='B' if d in(0,1,7) else 'F';cxp=nx
            if (y,x) in COLT:   # arm pixel: its own arm's template columns, both figures carry the arm (back = mirror)
                sname,ci=COLT[(y,x)];wt=(0,1,2)[ci] if sname=='R' else (13,12,11)[ci];want='B' if d in(0,1,7) else 'F' if d in(3,4,5) else want
            for b,(u,v) in enumerate(tx):
                cx,cy,fig=tpos(u,v);c=abs(cxp-cx)+wy*abs(ny-cy)
                if (y,x) in COLT and u<28:
                    w=27-u if u>=14 else u;c=abs(w-wt)+(200 if (w<=2)!=(sname=='R') else 0)+(wy*abs(ny-cy) if (y,x) in ROWT else 0)
                if fig!='S' and fig!=want:c+=40
                if not side and (cxp-10.5)*(cx-10.5)<0 and abs(cxp-10.5)>1.5 and abs(cx-10.5)>1.5:c+=12
                if (u,v) in SIDEH:c+=0 if side and SIDEH[(u,v)]==('R' if d==2 else 'L') else 30
                if side and f in('pants','pants stripe 1','pants stripe 2') and u<28:c+=10      # side view: pants on the side panel
                C[a,b]=c
        K=max(1,-(-len(px)//len(tx))+2);C=np.concatenate([C+0.6*j for j in range(K)],1);tx=tx*K   # each texel usable K times, reuse costs 0.6
        r,c=linear_sum_assignment(C)
        for a,b in zip(r,c):A[px[a]]=tx[b]
        for a in set(range(len(px)))-set(r):
            b=int(C[a].argmin());A[px[a]]=tx[b];shared.append(dict(x=int(px[a][1]),y=int(px[a][0]),family=f,texel=list(map(int,tx[b])),
                family_pixels=len(px),family_texels=len(tx)))
    SEGS[n]=dict(part=PART,joints=JOINTS,edges=EDGES,geo=GEO,rowt=ROWT,fam=FOF,trow=TROW)
    return q,A,LEV,fixed,shared,(x0,x1,y0,y1)
# ---------- palettes & ramps
def pal(fn,c):return spritepal(next(t for t in json.load(open(D+fn)) if t['code']==c)).astype(int)
def ramps(sp):
    R=collections.defaultdict(dict)
    for k in list(ZN)+['133','134','135','140']:
        f,s=pfam(int(k));R[f][s]=tuple(int(t) for t in sp[int(k)])
    R['skin']['neck']=tuple(int(t) for t in sp[136]);return R
ALLP={(fn,c):pal(fn,c) for fn in('HOME.json','AWAY.json') for c in [t['code'] for t in json.load(open(D+fn))]}
COLRAMP={}                                   # per-colour lookup: any game zone whose medium is exactly this colour
for (fn,c),sp in ALLP.items():
    for f,r in ramps(sp).items():
        if 'medium' in r and 'light' in r and 'dark' in r:COLRAMP.setdefault(r['medium'],r)
TEXS={'leafs_home':('HOME.json','tor'),'rangers_away':('AWAY.json','nyr'),'chicago_home_top':('HOME.json','chi'),
      'chicago_alt_bottom':('AWAY.json','chi'),'montreal_baby_blue_bottom':('HOME.json','mtl'),'stripe_diagnostic':('HOME.json','chi')}
def shade(c,f,s,R):
    c=tuple(int(t) for t in c)
    if s in('medium','flat'):return c
    r=R.get(f,{})
    if r.get('medium')==c and s in r:return r[s]                  # per-zone: this team's own game ramp
    if c in COLRAMP and s in COLRAMP[c]:return COLRAMP[c][s]        # per-colour: a game zone with exactly this medium
    if s in r and 'medium' in r:return tuple(int(np.clip(a+(b-m),0,255)) for a,b,m in zip(c,r[s],r['medium']))   # zone delta
    return c
GREY={'light':200,'medium':128,'dark':64,'shadow':96,'neck':80}
FRAMES=[370,897,57,62,67,52,72,889,42,47,77]
RES={};MAPS={}
for n in FRAMES:
    q,A,LEV,fixed,shared,bb=fit(n);MAPS[n]=(q,A,LEV,fixed)
    inv=collections.Counter(A.values())
    # sense checks (automated part of the audit)
    chk=collections.Counter()
    for (y,x),(u,v) in A.items():
        fig=tpos(u,v)[2];d=DIRS[n]
        if d in(0,1,7) and fig=='F':chk['front texel on back view']+=1
        if d in(3,4,5) and fig=='B':chk['back texel on front view']+=1
        if (u,v) in SIDEH and not(d in(2,6) and SIDEH[(u,v)]==('R' if d==2 else 'L')):chk['side-helmet texel outside its side view']+=1
        if d in(2,6) and u<28 and TF[(u,v)].startswith('pants'):chk['pants off the side panel (side view)']+=1
    RES[n]=dict(dir=DIRS[n],sprite_px=int((q!=255).sum()),texture_mapped=len(A),stick_px=sum(1 for t in fixed.values() if t=='stick'),
                ice_px=sum(1 for t in fixed.values() if t=='ice'),unmapped=int((q!=255).sum())-len(A)-len(fixed),
                shared_px=len(shared),texels_with_2plus=sum(1 for k,c in inv.items() if c>1),shared=shared,checks=dict(chk))
# ---------- renders
def up(a,S):
    o=np.zeros(a.shape[:2]+(3,),np.uint8);o[:]=(40,70,50);m=(a>=0).all(2);o[m]=a[m];return Image.fromarray(o).resize((a.shape[1]*S,a.shape[0]*S),Image.NEAREST)
def render(n,TEX,R,gamecol=None):
    q,A,LEV,fixed=MAPS[n];fl=-np.ones(q.shape+(3,),int);sh=fl.copy();cb=fl.copy();bad=0
    for (y,x),t in fixed.items():
        g=ALLP[('HOME.json','tor')][q[y,x]] if gamecol is None else gamecol[q[y,x]]
        if t=='ice':fl[y,x]=cb[y,x]=(GRN if gamecol is None else g);sh[y,x]=(128,128,150)
        else:fl[y,x]=cb[y,x]=(GRN if gamecol is None else g);sh[y,x]=(128,128,150)
    for (y,x),(u,v) in A.items():
        c=tuple(int(t) for t in TEX[v,u]);s=LEV[(y,x)];f=TF[(u,v)]
        if c==MAG:bad+=1
        fl[y,x]=c;sh[y,x]=(GREY[s],)*3 if s in GREY else (128,128,150)
        if f=='gear' and gamecol is not None:cb[y,x]=gamecol[q[y,x]];continue   # fixed-colour gear: own index in the game render
        cb[y,x]=GRN if (c==GRN and gamecol is None) else shade(c,f,s,R)
    return fl,sh,cb,bad
TEXI={k:np.asarray(Image.open(f'{TEXDIR}/{k}.png').convert('RGB')).astype(int) for k in TEXS}
ROUND={}
for (fn,c) in [('HOME.json','tor'),('AWAY.json','nyr'),('HOME.json','chi'),('AWAY.json','chi'),('HOME.json','mtl')]:
    sp=ALLP[(fn,c)];R=ramps(sp);G=np.zeros((TH,TW,3),int);G[:]=MAG
    for uv,f in TF.items():
        G[uv[1],uv[0]]=(0,0,0) if f=='gear' else sp[int(f[3:])] if f.startswith('idx') else R[f]['medium'] if 'medium' in R[f] else R[f]['flat']
    for n in FRAMES:
        q=MAPS[n][0];_,_,cb,_=render(n,G,R,gamecol=sp);m=q!=255
        dif=int(sum(1 for y,x in zip(*np.nonzero(m)) if tuple(cb[y,x])!=tuple(sp[q[y,x]])));occ=int(((cb>=0).all(2)!=m).sum())
        ROUND.setdefault(f'{c} {fn[:-5].lower()}',{})[n]=dict(diff=dif,occupancy_diff=occ)
TEAMERR={}
RENDERS={}
for k,(fn,c) in TEXS.items():
    R=ramps(ALLP[(fn,c)]);os.makedirs(f'{OUT}/{k}',exist_ok=True)
    for n in FRAMES:
        q=MAPS[n][0];fl,sh,cb,bad=render(n,TEXI[k],R);m=q!=255;RENDERS[(k,n)]=(fl,sh,cb)
        occ=int(((cb>=0).all(2)!=m).sum())
        # green check: skin/gear/stick pixels must be green, nothing else green
        gq=sum(1 for (y,x),uv in MAPS[n][1].items() if (TF[uv] in('skin','gear'))!=(tuple(cb[y,x])==GRN))
        TEAMERR.setdefault(k,{})[n]=dict(magenta_texel_hits=bad,occupancy_diff=occ,green_mismatch=gq,unmapped=RES[n]['unmapped'])
        for t,a in (('flat',fl),('shading',sh),('combined',cb)):up(a,1).save(f'{OUT}/{k}/{n}_{t}.png');up(a,8).save(f'{OUT}/{k}/{n}_{t}_x8.png')
# ---------- sheets (each sprite centred in its own column)
S=6;CW=max(MAPS[n][0].shape[1] for n in FRAMES)*S+16;RH=max(MAPS[n][0].shape[0] for n in FRAMES)*S+22
def gameimg(n,k):
    q=MAPS[n][0];sp=ALLP[TEXS[k]];g=-np.ones(q.shape+(3,),int);m=q!=255;g[m]=sp[q[m]];return g
def sheet(cols,title,path):
    W=Image.new('RGB',(130+CW*len(cols),40+RH*len(FRAMES)),(24,24,24));dr=ImageDraw.Draw(W);dr.text((6,6),title,fill=(255,255,255))
    for j,(lab,_) in enumerate(cols):tw=dr.textlength(lab);dr.text((130+j*CW+(CW-tw)//2,24),lab,fill=(255,255,0))
    for i,n in enumerate(FRAMES):
        y=40+i*RH;dr.text((6,y+RH//2-6),f'{n} d{DIRS[n]} '+('front' if DIRS[n] in(3,4,5) else 'back' if DIRS[n] in(0,1,7) else 'side'),fill=(200,200,200))
        for j,(_,fn_) in enumerate(cols):
            a=fn_(n);im=up(a,S);W.paste(im,(130+j*CW+(CW-im.width)//2,y+(RH-im.height)//2))
        dr.line([(0,y+RH-1),(W.width,y+RH-1)],fill=(60,60,60))
    W.save(path)
for k in TEXS:
    sheet([('flat',lambda n:RENDERS[(k,n)][0]),('shading layer',lambda n:RENDERS[(k,n)][1]),('combined',lambda n:RENDERS[(k,n)][2]),(f'game ({TEXS[k][1]} {TEXS[k][0][:4].lower()})',lambda n:gameimg(n,k))],
          f'{k}: v5 texture on 11 frames (green = skin/gloves/skates/stick/ice shadow placeholder)',f'{OUT}/{k}_sheet.png')
sheet([('game tor home',lambda n:gameimg(n,'leafs_home'))]+[(k,(lambda k:lambda n:RENDERS[(k,n)][2])(k)) for k in TEXS],
      'v5: all 5 textures (combined = flat x shading) on all 11 frames, game frame at left',f'{OUT}/all_teams_all_frames_sheet.png')
sheet([('game tor home',lambda n:gameimg(n,'leafs_home'))]+[(k,(lambda k:lambda n:RENDERS[(k,n)][0])(k)) for k in TEXS],
      'v5: all 5 textures, FLAT render (no shading) on all 11 frames',f'{OUT}/all_teams_flat_sheet.png')
# texel overlay: hue by figure (front blue, back orange, side-panel magenta, helmet strip cyan), brightness by u; shared red
def ov(n):
    q,A,LEV,fixed=MAPS[n];o=-np.ones(q.shape+(3,),int)
    for (y,x),t in fixed.items():o[y,x]=(60,60,60)
    for (y,x),(u,v) in A.items():
        fig=tpos(u,v)[2];b=int(80+(u%14)*12)
        o[y,x]=(0,255,255) if (u,v) in SIDEH else (b,0,b) if u>=28 else (40,90,b) if fig=='F' else (b,120,30)
    for s in RES[n]['shared']:o[s['y'],s['x']]=(255,0,0)
    return o
sheet([('game',lambda n:gameimg(n,'leafs_home')),('texel figure (blue F, orange B, purple panel, cyan helmet strip; brightness=col)',ov)],
      'v5 mapping overlay',f'{OUT}/mapping_overlay_sheet.png')
json.dump(dict(frames=RES,roundtrip_game_colours=ROUND,team_render_errors=TEAMERR,
               maps={n:{f'{x},{y}':list(map(int,uv)) for (y,x),uv in MAPS[n][1].items()} for n in FRAMES}),open(f'{OUT}/frames_v5.json','w'),indent=1,default=int)
for n in FRAMES:print(n,{k:v for k,v in RES[n].items() if k!='shared'})
for t,r in ROUND.items():print('roundtrip',t,{n:(v['diff'],v['occupancy_diff']) for n,v in r.items()})
for t,r in TEAMERR.items():print('team',t,{n:tuple(v.values()) for n,v in r.items()})
sheet([('game (chi home)',lambda n:gameimg(n,'stripe_diagnostic')),('flat',lambda n:RENDERS[('stripe_diagnostic',n)][0]),('combined',lambda n:RENDERS[('stripe_diagnostic',n)][2])],
      'stripe_diagnostic on 11 frames: one colour per torso row / arm row (see stripe_diagnostic_legend.png)',f'{OUT}/stripe_diagnostic_frames_sheet.png')
