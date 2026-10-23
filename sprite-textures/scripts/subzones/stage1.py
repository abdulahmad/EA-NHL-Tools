# Stage 1: FRONT TORSO sub-zone map. Base = anthem frame 370: every front-torso pixel (yoke, shoulder patch, jersey, crest,
# waist 1/2/3) becomes its own sub-zone = one texel at its own position (texture looks like the 370 torso).
# Other front-facing frames: each torso pixel -> one base sub-zone, row by row going up the torso, inside the same game zone band.
import sys,os,json,collections,numpy as np;sys.path.insert(0,'.');sys.path.insert(0,os.path.join(os.path.dirname(os.path.abspath(__file__)),'../perpixel/v3'))
from PIL import Image,ImageDraw
from ppmap import fam,direction,facing_of,CREST
from lib import frame,spritepal,toimg,D,ZN
OUT=sys.argv[1] if len(sys.argv)>1 else 'subzones_stage1'
BASE=370;TEST=[370,897,57,62,67,52,72]
TIDX=set(range(159,177))|set(CREST)
def band_of(i):return 'jersey' if i in CREST else fam(i)[0]     # crest pixels share the jersey band geometrically; identity by crest index
def features(n):
    p=frame(n);d,_=direction(n);f=facing_of(d);T=np.isin(p,list(TIDX))
    if f=='side':   # keep the front (leading) half only; leading edge from the game direction (d2 faces screen-right, d6 screen-left)
        ys,xs=np.nonzero(T);mid=(xs.min()+xs.max())/2;keep=(xs>=mid) if d==2 else (xs<=mid);M=np.zeros_like(T);M[ys[keep],xs[keep]]=True;T=M
    B=np.full(p.shape,'',object)
    for y,x in zip(*np.nonzero(T)):B[y,x]=band_of(int(p[y,x]))
    F={}
    for y,x in zip(*np.nonzero(T)):
        b=B[y,x];col=np.nonzero(B[:,x]==b)[0];j=int(col.max()-y)       # band-local row, counted UP from the band's bottom pixel in this column
        r=np.nonzero(T[y])[0];L,R=r.min(),r.max()
        if f=='side':   # cylinder: leading edge = chest centre line, half width = depth to the flank; theta=acos(1-q); s=.5 -/+ .5 sin(theta)
            E=R if d==2 else L;q=(abs(x-E)+.5)/(R-L+1);th=np.arccos(np.clip(1-q,-1,1));s=.5-.5*np.sin(th) if d==2 else .5+.5*np.sin(th)
        else:s=(x-L+.5)/(R-L+1)                                         # position across the torso row: 0 = screen-left edge (player's right)
        F[(y,x)]=dict(i=int(p[y,x]),b=b,j=j,s=float(s))
    return p,F,dict(dir=d,facing=f)
pB,FB,_=features(BASE);ys,xs=zip(*FB);X0,Y0=min(xs),min(ys);TW,TH=max(xs)-X0+1,max(ys)-Y0+1
SZ={yx:k for k,yx in enumerate(sorted(FB))}                            # sub-zone id = base pixel, numbered row-major
CRB={v['i']:yx for yx,v in FB.items() if v['i'] in CREST}
def assign(F):
    out={};rule=collections.Counter()
    byb=collections.defaultdict(list)
    for yx,v in FB.items():
        if v['i'] not in CREST:byb[v['b']].append((yx,v))   # crest sub-zones are reached only by crest index; plain jersey never lands on them
    for yx,v in F.items():
        if v['i'] in CREST and v['i'] in CRB:out[yx]=CRB[v['i']];rule['crest by index']+=1;continue
        c=byb.get(v['b'])
        if not c:rule['NO BASE BAND '+v['b']]+=1;continue
        mj=max(w['j'] for _,w in c);j=min(v['j'],mj);rule['row clamped to band top' if v['j']>mj else 'same band row']+=1
        out[yx]=min(c,key=lambda t:(10*abs(t[1]['j']-j)+abs(t[1]['s']-v['s']),t[0]))[0]   # same band, nearest band row, then nearest s; ties -> lower id
    return out,rule
pal={k:spritepal(next(q for q in json.load(open(D+s+'.json')) if q['code']==c)) for k,(s,c) in dict(leafs_home=('HOME','tor'),rangers_away=('AWAY','nyr')).items()}
MED={fam(int(k))[0]:int(k) for k in ZN if fam(int(k))[1]=='medium'}
def zone_lut(sp):   # per-zone shade lookup straight from the team palette: (band, medium RGB, shade) -> RGB
    L={}
    for k in ZN:
        i=int(k);b,c=fam(i)
        if c in('light','dark') and b in MED:L[(b,tuple(sp[MED[b]]),c)]=tuple(sp[i])
    return L
rep={};TEX={};ren={}
A={n:features(n) for n in TEST};ASG={n:assign(A[n][1]) for n in TEST}
for team,sp in pal.items():
    T=np.zeros((TH,TW,3),np.uint8);T[:]=(255,0,255);LUT=zone_lut(sp)
    for (y,x),v in FB.items():b,c=fam(v['i']);T[y-Y0,x-X0]=sp[MED[b]] if (c in('light','dark') and v['i'] not in CREST) else sp[v['i']]
    TEX[team]=T
    for n in TEST:
        p,F,info=A[n];asg,rule=ASG[n];G=sp[p].copy();Rr=G.copy();M=np.zeros(p.shape,bool)
        for (y,x),(by,bx) in asg.items():
            t=tuple(T[by-Y0,bx-X0]);b,c=fam(F[(y,x)]['i']);M[y,x]=True
            Rr[y,x]=LUT.get((b,t,c),t) if c in('light','dark') and F[(y,x)]['i'] not in CREST else t
        dif=(np.abs(G.astype(int)-Rr.astype(int)).sum(2)>0)&M
        used=set(asg.values());cnt=collections.Counter(asg.values())
        rep[f'{team}_{n}']=dict(diff=int(dif.sum()),stage1_px=int(M.sum()),subzones_used=len(used),of=len(FB),shared_subzones=sum(1 for v in cnt.values() if v>1),rules=dict(rule),**info)
        ren[(team,n)]=(G,Rr,dif,p!=255,M)
# ---- synthetic textures: unique colour per sub-zone, and a structured row/column one
rng=np.random.default_rng(1);U=np.zeros((TH,TW,3),np.uint8);U[:]=(40,40,40);S2=U.copy()
import colorsys
rows=sorted({y for y,_ in FB})
for (y,x),k in SZ.items():
    U[y-Y0,x-X0]=(rng.integers(40,256,3));v=FB[(y,x)]
    h=(v['j']*0.13+{'waist 3':0,'waist 2':.33,'waist 1':.66}.get(v['b'],.5 if v['b']=='jersey' else .85))%1;S2[y-Y0,x-X0]=[int(255*c) for c in colorsys.hsv_to_rgb(h,.9,.55+.45*v['s'])]
assert len({tuple(U[y-Y0,x-X0]) for y,x in FB})==len(FB),'synthetic colours not unique'
def render_tex(Tx,n):
    p,F,_=A[n];asg,_=ASG[n];o=np.zeros(p.shape+(3,));o[:]=(25,25,25);m=p!=255
    o[m]=spritepal(next(q for q in json.load(open(D+'HOME.json')) if q['code']=='tor'))[p][m]*0.35   # non-stage-1 pixels dimmed
    for (y,x),(by,bx) in asg.items():o[y,x]=Tx[by-Y0,bx-X0]
    return o,m
def grid(rows,head,path,S=10):
    cw=max(i.width for _,r in rows for i in r)+24;rh=max(i.height for _,r in rows for i in r)+30
    O=Image.new('RGB',(cw*len(head),rh*len(rows)+22),(20,20,20));d=ImageDraw.Draw(O)
    for j,h in enumerate(head):d.text((j*cw+8,5),h,fill=(255,255,0))
    for k,(t_,r) in enumerate(rows):
        y=22+k*rh;d.text((6,y+2),t_,fill=(255,255,255))
        for j,i in enumerate(r):O.paste(i,(j*cw+(cw-i.width)//2,y+22+(rh-30-i.height)//2))
    O.save(path)
lab=lambda n:f"{n} d{A[n][2]['dir']} {A[n][2]['facing']}{' (base)' if n==BASE else ''}"
for team in pal:
    rows=[]
    for n in TEST:
        G,Rr,dif,vis,M=ren[(team,n)];dm=np.zeros(G.shape);dm[vis]=(60,60,60);dm[M]=(0,110,0);dm[dif]=(255,0,0)
        rows.append((lab(n)+f" diff={rep[f'{team}_{n}']['diff']}/{rep[f'{team}_{n}']['stage1_px']}",[toimg(G.astype(float),vis,10),toimg(Rr.astype(float),vis,10),toimg(dm,vis,10)]))
    grid(rows,['game render','front-torso sub-zone texture -> frame','diff (green = stage-1 px, red = differs)'],f'{OUT}/compare_{team}.png')
rows=[(lab(n),[toimg(*render_tex(U,n),10),toimg(*render_tex(S2,n),10)]) for n in TEST]
grid(rows,['unique colour per sub-zone','hue = band + band row (going up), brightness = across (left->right)'],f'{OUT}/synthetic_compare.png')
Z=16
def labelled(Tx,path,title):
    I=Image.fromarray(Tx).resize((TW*Z,TH*Z),Image.NEAREST);d=ImageDraw.Draw(I)
    for x in range(TW+1):d.line((x*Z,0,x*Z,TH*Z),fill=(0,0,0))
    for y in range(TH+1):d.line((0,y*Z,TW*Z,y*Z),fill=(0,0,0))
    for (y,x),v in FB.items():
        d.text(((x-X0)*Z+2,(y-Y0)*Z+2),f"{v['b'][0] if v['b']!='jersey' else 'j'}{v['b'][-1] if v['b'][-1].isdigit() else ''}{'c' if v['i'] in CREST else ''}",fill=(255,255,0),stroke_width=1,stroke_fill=(0,0,0))
    C=Image.new('RGB',(I.width+150,I.height+20),(20,20,20));C.paste(I,(0,20));dd=ImageDraw.Draw(C);dd.text((2,3),title,fill=(255,255,255))
    for y in range(TH):dd.text((I.width+4,20+y*Z+2),f"y{y+Y0}: "+",".join(sorted({FB[(yy,xx)]['b'] for yy,xx in FB if yy==y+Y0})),fill=(200,200,200))
    C.save(path)
for team,T in TEX.items():
    Image.fromarray(T).save(f'{OUT}/tex_front_torso_{team}.png');labelled(T,f'{OUT}/tex_front_torso_{team}_x{Z}.png',f'{team} front torso sub-zone texture {TW}x{TH} (base 370), labels: band')
Image.fromarray(U).save(f'{OUT}/tex_front_torso_synthetic_unique.png');labelled(U,f'{OUT}/tex_front_torso_synthetic_unique_x{Z}.png','synthetic: unique colour per sub-zone')
Image.fromarray(S2).save(f'{OUT}/tex_front_torso_synthetic_rows.png')
json.dump(dict(base=BASE,size=[TW,TH],origin=[int(X0),int(Y0)],subzones=len(FB),report=rep,
  submap={str(n):{f'{y},{x}':SZ[v] for (y,x),v in ASG[n][0].items()} for n in TEST},
  base_subzones={SZ[yx]:dict(texel=[int(yx[1]-X0),int(yx[0]-Y0)],**FB[yx]) for yx in FB}),open(f'{OUT}/stage1.json','w'),indent=0,default=int)
print('texture',TW,'x',TH,'subzones',len(FB))
for k,v in rep.items():print(k,v)
if os.environ.get('DBG'):
    for n in TEST:
        G,Rr,dif,vis,M=ren[('leafs_home',n)];p,F,_=A[n];asg,_=ASG[n]
        for y,x in zip(*np.nonzero(dif)):print(n,(y,x),F[(y,x)],'->',asg[(y,x)],FB[asg[(y,x)]],tuple(G[y,x]),tuple(Rr[y,x]))
