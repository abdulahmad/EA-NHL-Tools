# PoC5: test fit of Abdul's 28x32 player texture layout (abdul_layout.png) on the anthem frame 370.
# Layout = front figure (cols 0-13) + virtual back figure (cols 14-27, same silhouette shifted by 14); the front figure is frame 370
# (x 4..17, y 0..31) rendered in the game's Chicago away palette with a recoloured face and blue blades, stick removed and legs filled.
import sys,os,json,collections,numpy as np;sys.path.insert(0,'.');sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from PIL import Image,ImageDraw
from lib import frame,spritepal,D,ZN
OUT=sys.argv[1] if len(sys.argv)>1 else 'playerlayout_fit370';SRC=os.path.join(os.path.dirname(os.path.abspath(__file__)),'abdul_layout_v2.png')   # v2 = Abdul's revision with side-helmet strips
L=np.asarray(Image.open(SRC).convert('RGB')).astype(int);TH,TW=L.shape[:2];MAG=(252,0,252);HAVE=~(L==MAG).all(2)
p=frame(370);OX=4                                                  # texel (u,v) = (x-OX, y) for frame 370 (row by row, identity)
# ---- per-index family + shade (game palette index semantics, zn.json names; skin/helmet/pants pairs added)
def fs(i):
    n=ZN.get(str(i))
    if i in(133,134,140):return 'skin',{133:'light',134:'medium',140:'dark'}[i]
    if n is None:return f'idx{i}','flat'                            # 0 black (gloves/skates), 8/28 blades: fixed colours, unshaded
    if n.startswith('waist 1'):return 'waist 1',{'odd':'light','even':'medium','hidden':'dark'}[n.split()[-1]]
    if n=='pants dark':return 'pants','dark'
    if n=='pants medium':return 'pants','medium'
    if n.startswith('helmet'):return 'helmet',n.split()[-1]
    w=n.rsplit(' ',1)
    if w[-1] in('light','medium','dark'):return w[0],w[-1]
    return n,'flat'                                                 # yoke 1-3, yoke corner, shoulder patch, pants stripes, crest grid
STICK={136};ASG={};NOT=collections.Counter()
for y,x in zip(*np.nonzero(p!=255)):
    i=int(p[y,x]);u,v=x-OX,y
    inl=0<=u<TW and v<TH and HAVE[v,u]
    if i in STICK and not(inl and tuple(L[v,u])==(164,108,72)):NOT['stick (136)']+=1;continue   # 136 is also the neck shadow: kept where he drew neck skin
    if not inl:NOT[f'idx {i} outside layout']+=1;continue
    ASG[(y,x)]=(u,v)
FAM={};SH={}
for (y,x),(u,v) in ASG.items():f,s=fs(int(p[y,x]));FAM[(u,v)]=f;SH[(y,x)]=s
# ---- flatten Abdul's texture: learn each family's ramp from his own pixels, map light/dark -> medium
RAMP=collections.defaultdict(dict)
for (y,x),(u,v) in ASG.items():
    f,s=fs(int(p[y,x]))
    if s!='flat':RAMP[f].setdefault(s,tuple(L[v,u]))
def flat_of(c,f):
    R=RAMP.get(f)
    if R and 'medium' in R and c in (R.get('light'),R.get('dark')):return R['medium']
    return c
# texels not used by 370: back figure -> family of the front texel at u-14; stick-hidden front texels -> nearest used texel whose
# family ramp contains this colour (else nearest used texel)
used=set(FAM)
SIDE={}   # v2 side-helmet strips: cols 2-3 (screen-left of the front head = player's right side) and 9-10 (player's left), rows 0-5
for v in range(6):
    for u in (2,3,9,10):
        if HAVE[v,u] and (u,v) not in FAM:
            c=tuple(L[v,u]);side='R' if u<6 else 'L'
            FAM[(u,v)]='helmet' if c in RAMP['helmet'].values() else ('marker' if c==(64,160,224) else 'skin side');SIDE[(u,v)]=side
for u in (4,8):
    if HAVE[0,u] and (u,0) not in FAM:FAM[(u,0)]='helmet';SIDE[(u,0)]='top'
for v,u in zip(*np.nonzero(HAVE)):
    if (u,v) in FAM:continue
    if u>=14 and (u-14,v) in FAM:
        f=FAM[(u-14,v)];c=tuple(L[v,u])
        if f.startswith('crest'):f='back number'                     # back has no crest: that area holds his number (kept as drawn)
        elif f=='skin' and c in RAMP['helmet'].values():f='helmet'    # back of the head = helmet, not face
        FAM[(u,v)]=f;continue
    c=tuple(L[v,u]);cand=sorted(used,key=lambda t:abs(t[0]-(u%14))+abs(t[1]-v))
    FAM[(u,v)]=next((FAM[t] for t in cand if c in RAMP.get(FAM[t],{}).values()),FAM[cand[0]])
for v,u in zip(*np.nonzero(HAVE)):
    if (u,v) not in FAM and u>=14:pass
FL=L.copy()
for (u,v),f in FAM.items():FL[v,u]=flat_of(tuple(L[v,u]),f)
# ---- shading: medium = texel colour; light/dark from a ramp lookup (Abdul's own ramps here; team palette for Leafs); fallback +-28
def shade(c,f,s,R):
    if s in('medium','flat'):return np.array(c)
    r=R.get(f,{})
    if r.get('medium')==tuple(c) and s in r:return np.array(r[s])
    return np.clip(np.array(c)+(28 if s=='light' else -28),0,255)
GREY={'light':200,'medium':128,'dark':64,'flat':128}
def renders(T,R):
    flat=np.zeros(p.shape+(3,));shd=np.zeros(p.shape+(3,));comb=np.zeros(p.shape+(3,));m=np.zeros(p.shape,bool)
    for (y,x),(u,v) in ASG.items():
        m[y,x]=True;c=tuple(T[v,u]);s=SH[(y,x)];flat[y,x]=c;shd[y,x]=GREY[s];comb[y,x]=shade(c,FAM[(u,v)],s,R)
        if s=='flat':shd[y,x]=(128,128,150)                        # unshaded zones: neutral with a slight blue tint
    return flat,shd,comb,m
# Abdul design
fA,sA,cA,M=renders(FL,RAMP)
dA=sum(1 for (y,x),(u,v) in ASG.items() if tuple(cA[y,x].astype(int))!=tuple(L[v,u]))
# Leafs home: texel = Leafs palette medium of the texel's family (crest/flat zones: own index); ramp = Leafs palette
sp=spritepal(next(q for q in json.load(open(D+'HOME.json')) if q['code']=='tor')).astype(int)
MEDI={};LR=collections.defaultdict(dict)
for k in list(ZN)+['133','134','140']:
    i=int(k);f,s=fs(i)
    if s!='flat':LR[f][s]=tuple(sp[i])
TL=np.zeros_like(L);TL[:]=MAG
for (y,x),(u,v) in ASG.items():
    i=int(p[y,x]);f,s=fs(i);TL[v,u]=LR[f]['medium'] if s!='flat' else sp[i]
for (u,v),f in FAM.items():
    if not (TL[v,u]!=MAG).any() or tuple(TL[v,u])==MAG:
        TL[v,u]=LR['skin']['medium'] if f=='skin side' else LR['jersey']['medium'] if f=='back number' else L[v,u] if f=='marker' else LR[f]['medium'] if 'medium' in LR.get(f,{}) else (sp[int(f[3:])] if f.startswith('idx') else sp[next(int(k) for k in ZN if ZN[k]==f)])
fL,sL,cL,_=renders(TL,LR)
G=sp[p];dL=int(sum(1 for yx in ASG if tuple(cL[yx].astype(int))!=tuple(G[yx])))
# ---- images
def up(a,m,S,bg=(40,70,50)):
    o=np.zeros(a.shape[:2]+(3,),np.uint8);o[:]=bg;o[m]=np.clip(a[m],0,255);return Image.fromarray(o).resize((a.shape[1]*S,a.shape[0]*S),Image.NEAREST)
def tex_img(T,S=16,grid=True):
    I=Image.fromarray(T.astype(np.uint8)).resize((TW*S,TH*S),Image.NEAREST);d=ImageDraw.Draw(I)
    if grid:
        for x in range(TW+1):d.line((x*S,0,x*S,TH*S),fill=(0,0,0))
        for y in range(TH+1):d.line((0,y*S,TW*S,y*S),fill=(0,0,0))
    return I
S=10
for nm,T in (('abdul_layout',L),('abdul_flat',FL),('leafs_flat',TL)):
    Image.fromarray(T.astype(np.uint8)).save(f'{OUT}/{nm}.png') if nm!='abdul_layout' else None;tex_img(T).save(f'{OUT}/{nm}_x16.png')
# texel-assignment overlay
I=tex_img(L,20);d=ImageDraw.Draw(I);AB={'marker':'?','back number':'#','skin side':'ss','upper arm':'ua','forearm':'fa','arm stripe 1':'a1','arm stripe 2':'a2','arm stripe 3':'a3','yoke 1':'y1','yoke 2':'y2','yoke 3':'y3','yoke corner':'yc','shoulder patch':'sp','jersey':'j','waist 1':'w1','waist 2':'w2','waist 3':'w3','pants':'p','pants stripe 1':'ps','socks':'so','socks stripe 1':'s1','socks stripe 2':'s2','helmet':'h','skin':'sk'}
for (u,v),f in FAM.items():
    lab='c' if f.startswith('crest') else AB.get(f,f[3:] if f.startswith('idx') else f[:2])
    col=(0,255,0) if (u,v) in used else (255,128,0) if (u,v) in SIDE else (0,200,255)
    d.rectangle([u*20+1,v*20+1,u*20+18,v*20+18],outline=col);d.text((u*20+3,v*20+5),lab,fill=(255,255,0),stroke_width=1,stroke_fill=(0,0,0))
C=Image.new('RGB',(I.width,I.height+30),(20,20,20));C.paste(I,(0,30));ImageDraw.Draw(C).text((4,8),'green = texel used by frame 370 pixel, orange = new side-helmet texel, cyan = texel not on 370 (back figure / behind stick); label = game zone family',fill=(255,255,255));C.save(f'{OUT}/texel_assignment_x20.png')
vis=p!=255
def sheet(cols,path,title):
    h=max(i.height for _,i in cols)+50;w=sum(i.width+30 for _,i in cols)+10;O=Image.new('RGB',(w,h),(20,20,20));d=ImageDraw.Draw(O);d.text((8,4),title,fill=(255,255,255));x=10
    for t,i in cols:d.text((x,22),t,fill=(255,255,0));O.paste(i,(x,40+(h-50-i.height)//2));x+=i.width+30
    O.save(path)
for nm,(f_,s_,c_) in (('abdul',(fA,sA,cA)),('leafs',(fL,sL,cL))):
    up(f_,M,S).save(f'{OUT}/370_{nm}_flat_x{S}.png');up(s_,M,S).save(f'{OUT}/370_shading_x{S}.png');up(c_,M,S).save(f'{OUT}/370_{nm}_combined_x{S}.png')
gm=np.zeros(p.shape+(3,));gm[vis]=G[vis];dm=np.zeros(p.shape+(3,));dm[vis]=(60,60,60);dm[M]=(0,120,0)
for (y,x) in ASG:
    if tuple(cL[y,x].astype(int))!=tuple(G[y,x]):dm[y,x]=(255,0,0)
sheet([('1 his texture (as drawn)',tex_img(L,10,False)),('2 flattened',tex_img(FL,10,False)),('3 flat on 370 (no shading)',up(fA,M,S)),('4 shading layer 370',up(sA,M,S)),('5 combined = flat x shading',up(cA,M,S))],f'{OUT}/abdul_fit370_sheet.png',f'Abdul layout test fit on frame 370: combined vs his drawing differs on {dA} of {len(ASG)} texels')
sheet([('Leafs in his layout (flat)',tex_img(TL,10,False)),('flat on 370',up(fL,M,S)),('shading layer',up(sL,M,S)),('combined',up(cL,M,S)),('game render 370',up(gm,vis,S)),(f'diff: green=covered red=differs ({dL})',up(dm,vis,S))],f'{OUT}/leafs_fit370_sheet.png',f'Leafs home sanity: combined vs game, {dL} differing of {len(ASG)} covered pixels')
rep=dict(side_helmet_texels={f'{u},{v}':[FAM[(u,v)],SIDE[(u,v)]] for (u,v) in SIDE},layout=[TW,TH],covered_370_px=len(ASG),uncovered_370=dict(NOT),texels_drawn=int(HAVE.sum()),texels_used_by_370=len(used),
  ramps_from_his_drawing={f:{s:list(c) for s,c in r.items()} for f,r in RAMP.items()},abdul_combined_vs_drawn_diff=dA,leafs_combined_vs_game_diff=dL,
  unused_texels=sorted([[int(u),int(v),FAM[(u,v)]] for (u,v) in FAM if (u,v) not in used]))
json.dump(rep,open(f'{OUT}/fit370.json','w'),indent=1,default=int)
print({k:v for k,v in rep.items() if k not in('unused_texels','ramps_from_his_drawing')})
print('unused front texels',[t for t in rep['unused_texels'] if t[0]<14])

# ---- side-view helmet demo (52 d2 faces screen-right, 72 d6 faces screen-left): per row, helmet pixels ordered from the face side;
# first pixel -> front head edge texel, last pixel -> back head edge texel, the middle ones -> that side's strip (cols 2-3 = player's
# right side, seen when facing screen-right; 9-10 = player's left). One pixel per texel; leftovers counted.
HEL={190,191};demo={}
for n,d in ((52,2),(72,6)):
    q=frame(n);rows=sorted({y for y,x in zip(*np.nonzero(np.isin(q,list(HEL))))});a={};left=0
    strip=[3,2] if d==2 else [9,10]
    for k,y in enumerate(rows[:6]):
        xs=sorted(x for x in range(q.shape[1]) if q[y,x] in HEL);xs=xs[::-1] if d==2 else xs   # face side first
        fr=[u for u in range(14) if FAM.get((u,k))=='helmet' and (u,k) not in SIDE];bk=[u for u in range(14,28) if FAM.get((u,k))=='helmet']
        fe=(min(fr) if d==2 else max(fr)) if fr else None;be=(max(bk) if d==2 else min(bk)) if bk else None
        tg=[(fe,k)]+[(u,k) for u in strip if HAVE[k,u] and FAM.get((u,k))=='helmet']+[(be,k)]
        tg=[t for t in tg if t[0] is not None]
        order=[xs[0]]+xs[2:]+[xs[1]] if len(xs)>2 else xs
        for x,t in zip(xs,[tg[0]]+tg[1:-1]+[tg[-1]] if len(xs)>=len(tg) else tg[:len(xs)]):a[(y,x)]=t
        left+=max(0,len(xs)-len(tg))
    demo[n]=dict(mapped=len(a),unmapped=left,texels=sorted({t for t in a.values()}))
    o=np.zeros(q.shape+(3,));o[q!=255]=(70,70,70)
    rng=np.random.default_rng(3);col={t:rng.integers(60,256,3) for t in set(a.values())}
    for yx,t in a.items():o[yx]=col[t]
    up(o,q!=255,S).save(f'{OUT}/side_helmet_demo_{n}_x{S}.png')
json.dump(demo,open(f'{OUT}/side_helmet_demo.json','w'),default=str,indent=1);print('side helmet demo',{n:(v['mapped'],v['unmapped']) for n,v in demo.items()})
