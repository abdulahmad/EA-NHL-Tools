# v4: map test frames into the FIXED v4 layout (no added texels). Per frame, per zone family, one pixel per texel via min-cost
# assignment (scipy Hungarian) on position: frame bbox is scaled onto 370's bbox; each texel has a canonical 370-space position and a
# figure tag (F front, B back, S side seam). Pixels with more than the family's texels left -> nearest texel shared (documented exception).
# Gear/fixed indices (<133 except skin, 136 stick) are green placeholders: not mapped, counted.
import sys,os,runpy,json,collections,numpy as np
from scipy.optimize import linear_sum_assignment
OUT=sys.argv[1];os.makedirs(OUT,exist_ok=True)
sys.argv=['fit370.py',OUT];G=runpy.run_path(os.path.join(os.path.dirname(os.path.abspath(__file__)),'fit370.py'))
FAM,fs,frame,spritepal,D,ZN,HAVE,TW,shade,LR,GREY=[G[k] for k in 'FAM fs frame spritepal D ZN HAVE TW shade LR GREY'.split()]
from PIL import Image,ImageDraw
_fs=fs
def fs(i):return ('skin','shadow') if i==135 else _fs(i)     # 135 = 4th skin shade (between medium and dark): skin texel + 'shadow' shading level
GREY['shadow']=96;GREY['neck']=80
def tpos(u,v):
    if u<14:return u+4,v,'F'
    if u<28:return u-10,v,'B'
    if 31<=u<=39:return u-25,v,'F'
    if 43<=u<=51:return u-37,v,'B'
    return {29:(4,v,'S'),30:(5,v,'F'),40:(15,v,'F'),41:(16,v,'S'),42:(5,v,'B'),52:(15,v,'B'),53:(16,v,'S')}[u]
def key(f):return 'jersey' if f=='back number' else f
FIXED=lambda i:(i<133 or i==136)
TEX=collections.defaultdict(list)
for (u,v),f in FAM.items():
    if f in('marker',) or f.startswith('idx') and FIXED(int(f[3:])):continue
    TEX[key(f) if not f.startswith('idx') else f].append((u,v))
SPLIT=dict(front=(897,57,62,67,52,72,370),back=(889,42,47,77))
TEAMS={'leafs home':('HOME.json','tor'),'rangers away':('AWAY.json','nyr')}
PAL={t:spritepal(next(q for q in json.load(open(D+fn)) if q['code']==c)).astype(int) for t,(fn,c) in TEAMS.items()}
def team_tex(sp):
    lr=collections.defaultdict(dict)
    for k in list(ZN)+['133','134','135','140']:
        f,s=fs(int(k))
        if s!='flat':lr[f][s]=tuple(sp[int(k)])
    lr['skin']['neck']=tuple(sp[136])
    T={}
    for (u,v),f in FAM.items():
        if f.startswith('idx'):T[(u,v)]=tuple(sp[int(f[3:])]);continue
        ff='skin' if f=='skin side' else key(f)
        T[(u,v)]=lr[ff]['medium'] if 'medium' in lr.get(ff,{}) else tuple(sp[next(int(k) for k in ZN if ZN[k]==ff)])
    return T,lr
HEADI={133,134,135,140,190,191}
def neck136(q):
    # index 136 is the stick colour but the game also uses it as neck / face-side shadow: 136 pixels 8-connected to skin/helmet
    # (through other 136 pixels) in the top 12 rows = neck -> skin texel with a 'neck' shading level (= palette 136)
    ys,xs=np.nonzero(q!=255);y0=ys.min();N=set();grow=True
    while grow:
        grow=False
        for y,x in zip(*np.nonzero(q==136)):
            if (y,x) in N or y>y0+11:continue
            nb=[(y+a,x+b) for a in(-1,0,1) for b in(-1,0,1) if 0<=y+a<q.shape[0] and 0<=x+b<q.shape[1]]
            if any(q[t] in HEADI or t in N for t in nb):N.add((y,x));grow=True
    return N
def fs2(i,yx,N):return ('skin','neck') if (i==136 and yx in N) else fs(i)
def fit(n,back):
    q=frame(n);ys,xs=np.nonzero(q!=255);x0,x1,y0,y1=xs.min(),xs.max(),ys.min(),ys.max();NK=neck136(q)
    P=collections.defaultdict(list);gear=0
    for y,x in zip(ys,xs):
        i=int(q[y,x])
        if FIXED(i) and i not in(133,134,140) and (y,x) not in NK:gear+=1;continue
        f,s=fs2(i,(y,x),NK);P[f if s!='flat' or not f.startswith('idx') else f].append((y,x))
    A={};shared=[];missing=collections.Counter();want='B' if back else 'F'
    for f,px in P.items():
        tx=TEX.get(f,[])
        if not tx:missing[f]+=len(px);continue
        C=np.zeros((len(px),len(tx)))
        for a,(y,x) in enumerate(px):
            nx=4+(x-x0)*13/max(1,x1-x0);ny=(y-y0)*31/max(1,y1-y0)
            for b,(u,v) in enumerate(tx):
                cx,cy,tag=tpos(u,v);C[a,b]=abs(nx-cx)+abs(ny-cy)+(0 if tag in(want,'S') else 8)
        r,c=linear_sum_assignment(C)
        for a,b in zip(r,c):A[px[a]]=tx[b]
        for a in set(range(len(px)))-set(r):A[px[a]]=tx[int(C[a].argmin())];shared.append([int(px[a][1]),int(px[a][0]),f,list(map(int,tx[int(C[a].argmin())]))])
    return q,A,gear,shared,missing
RES={}
for side,ns in SPLIT.items():
    for n in ns:
        q,A,gear,shared,missing=fit(n,side=='back');row=dict(view=side,px=int((q!=255).sum()),mapped=len(A),gear_green=gear,shared=shared,no_texel=dict(missing))
        for t,sp in PAL.items():
            T,lr=team_tex(sp);d=0
            NK=neck136(q)
            for (y,x),uv in A.items():
                f,s=fs2(int(q[y,x]),(y,x),NK);ff=key(FAM[uv]);ff='skin' if ff=='skin side' else ff
                c=shade(np.array(T[uv]),ff,s,lr)
                if tuple(int(k) for k in c)!=tuple(sp[q[y,x]]):d+=1
            row[t]=d
        RES[n]=row;RES[n]['_A']={f'{x},{y}':list(map(int,uv)) for (y,x),uv in A.items()}
        print(n,{k:(len(v) if k=='shared' else v) for k,v in row.items() if k!='_A'})
json.dump(RES,open(f'{OUT}/frames_v4.json','w'),indent=1,default=int)
# ---- images + team jerseys in the v4 texture style (texel = team medium of its family, crest = team crest indices as drawn,
#      gear = green placeholder), applied with the shading layer to every test frame
TEAMS2={'leafs_home':('HOME.json','tor'),'rangers_away':('AWAY.json','nyr'),'chicago_away':('AWAY.json','chi'),'montreal_home':('HOME.json','mtl'),
        'leafs_home_gamecolours':('HOME.json','tor'),'rangers_away_gamecolours':('AWAY.json','nyr')}   # unstyled = exact round-trip check
GRN=(0,220,0);MAG=(252,0,252);TH=HAVE.shape[0]
def up(a,S=8,bg=(40,70,50)):
    o=np.zeros(a.shape[:2]+(3,),np.uint8);o[:]=bg;m=(a>=0).all(2);o[m]=a[m];return Image.fromarray(o).resize((a.shape[1]*S,a.shape[0]*S),Image.NEAREST)
TEAMREP={}
for tn,(fn,c) in TEAMS2.items():
    sp=spritepal(next(q for q in json.load(open(D+fn)) if q['code']==c)).astype(int);T,lr=team_tex(sp)
    img=np.zeros((TH,TW,3),int);img[:]=MAG
    for (u,v),f in FAM.items():
        img[v,u]=GRN if (f.startswith('idx') and FIXED(int(f[3:]))) else (T[(u,v)] if f!='marker' else MAG)
    # style flatten: greedily merge uniform colours within L1 distance 80 into the most-used one (one shade per hue, Abdul-style);
    # skin/helmet/crest/gear untouched. Ramps: the canonical colour's own family ramp from the team palette.
    UNI=lambda f:not(f.startswith('idx') or f in('skin','skin side','helmet','marker'))
    cnt=collections.Counter(tuple(map(int,img[v,u])) for (u,v),f in FAM.items() if UNI(f));canon={};reps=[]
    for col,_ in ([] if tn.endswith('gamecolours') else cnt.most_common()):
        r=next((r for r in reps if sum(abs(a-b) for a,b in zip(r,col))<=80),None)
        if r is None:reps.append(col);r=col
        canon[col]=r
    CR={}
    for (u,v),f in FAM.items():
        if UNI(f):
            c0=tuple(map(int,img[v,u]));canon.setdefault(c0,c0);img[v,u]=canon[c0]
            if c0==canon[c0] and key(f) in lr and 'light' in lr[key(f)]:CR.setdefault(canon[c0],lr[key(f)])
    T={uv:(tuple(map(int,img[uv[1],uv[0]])) if UNI(FAM[uv]) else T[uv]) for uv in T}
    Image.fromarray(img.astype(np.uint8)).save(f'{OUT}/{tn}_texture.png');up(img,16).save(f'{OUT}/{tn}_texture_x16.png')
    cols=collections.Counter(tuple(map(int,img[v,u])) for (u,v),f in FAM.items() if not(f.startswith('idx') and int(f[3:])>=192) and f!='marker')
    TEAMREP[tn]={'texture_unique_colours_excl_crest':len(cols),'colours':{str(k):n for k,n in cols.most_common()},'frames':{}}
    tiles=[]
    for n,row in RES.items():
        q=frame(n);A={(int(k.split(',')[1]),int(k.split(',')[0])):tuple(v) for k,v in row['_A'].items()}
        NK=neck136(q);fl=-np.ones(q.shape+(3,),int);sh=fl.copy();cb=fl.copy();gm=fl.copy();d=0
        for y,x in zip(*np.nonzero(q!=255)):
            gm[y,x]=sp[q[y,x]]
            if (y,x) not in A:
                if q[y,x]==88:fl[y,x]=cb[y,x]=sh[y,x]=-1;continue          # ice: not part of the player texture
                fl[y,x]=cb[y,x]=GRN;sh[y,x]=(128,128,150);continue
            uv=A[(y,x)];f,s=fs2(int(q[y,x]),(y,x),NK);ff=key(FAM[uv]);ff='skin' if ff=='skin side' else ff
            fl[y,x]=T[uv];sh[y,x]=(GREY[s],)*3 if s!='flat' else (128,128,150);c0=tuple(T[uv]);r=lr.get(ff,{})
            if r.get('medium')==c0 or s in('medium','flat'):cb[y,x]=shade(np.array(c0),ff,s,lr)
            elif c0 in CR and s in CR[c0]:cb[y,x]=CR[c0][s]
            else:cb[y,x]=np.clip(np.array(c0)+(28 if s=='light' else -28 if s in('dark','shadow') else 0),0,255)
            d+=tuple(map(int,cb[y,x]))!=tuple(map(int,sp[q[y,x]]))
        TEAMREP[tn]['frames'][n]=dict(styled_vs_game_diff=d,non_gear_px=len(A))
        W=Image.new('RGB',(q.shape[1]*8*4+40,q.shape[0]*8+20),(20,20,20));dr=ImageDraw.Draw(W)
        for k,(t,a) in enumerate((('flat',fl),('shading',sh),('combined',cb),('game',gm))):W.paste(up(a),(k*(q.shape[1]*8+10),20));dr.text((k*(q.shape[1]*8+10)+2,4),f'{n} {t}',fill=(255,255,0))
        tiles.append(W)
        if tn=='leafs_home':
            ov=np.zeros(q.shape+(3,),int)-1;rng=np.random.default_rng(n)
            for (y,x),uv in A.items():ov[y,x]=(np.array(tpos(*uv)[:2])*[14,7]+[40,40])%256 if False else 0
            # texel-coordinate overlay: hue by u, brightness by v; shared texels red
            for (y,x),(u,v) in A.items():ov[y,x]=(int(40+u*4),int(40+v*6),200 if tpos(u,v)[2]=='B' else 60)
            for sx,sy,_,_ in row['shared']:ov[sy,sx]=(255,0,0)
            up(ov,10).save(f'{OUT}/{n}_texel_overlay_x10.png')
    H=sum(t.height+6 for t in tiles);Wd=max(t.width for t in tiles);S=Image.new('RGB',(Wd,H+24),(20,20,20));ImageDraw.Draw(S).text((4,4),f'{tn}: v4 texture + shading layer on all test frames (green = gear placeholder)',fill=(255,255,255));y=24
    for t in tiles:S.paste(t,(0,y));y+=t.height+6
    S.save(f'{OUT}/{tn}_all_frames_sheet.png')
json.dump(TEAMREP,open(f'{OUT}/teams_v4.json','w'),indent=1,default=int)
for t,r in TEAMREP.items():print(t,r['texture_unique_colours_excl_crest'],r['frames'])
