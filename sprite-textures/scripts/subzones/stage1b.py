# Stage 1b: FRONT TORSO sub-zone texture, rectangular rows, strict 1 sub-zone : 1 pixel per frame, texture expanded where needed.
# Base = anthem 370. Rows are (group, j): group Y1/Y2/Y3/J/W1/W2/W3, j = band row counted UP inside the pixel's vertical run of its band.
# Waist rows are straight full-width rows (370's right column, whose waist sits one row higher, is shifted down; its empty top
# jersey texel under the armpit is a reserve texel). Frames are processed in order; a target pixel that cannot be matched 1:1 to an
# existing sub-zone of its band row (order-preserving across the row) gets a NEW texel (expansion) instead of sharing.
import sys,os,json,collections,colorsys,numpy as np;sys.path.insert(0,'.');sys.path.insert(0,os.path.join(os.path.dirname(os.path.abspath(__file__)),'../perpixel/v3'))
from PIL import Image,ImageDraw
from ppmap import fam,direction,facing_of,CREST
from lib import frame,spritepal,toimg,D,ZN
from jerseys import R0,D as JD,crest_px
OUT=sys.argv[1] if len(sys.argv)>1 else 'subzones_stage1b'
BASE=370;FR=[370,889,897,42,47,52,57,62,67,72,77];ORDER=[370,897,62,57,67,52,72]   # expansion order: base, straight fronts, 3/4, sides
TIDX=set(range(159,177))|set(CREST);P=0.30          # P = cost of an unmatched pixel (=> new texel) vs |delta s| of a match
GRP={'yoke 1':'Y1','yoke 2':'Y2','shoulder patch':'Y2','yoke 3':'Y3','yoke corner':'Y3','jersey':'J','waist 1':'W1','waist 2':'W2','waist 3':'W3'}
GORD=['Y1','Y2','Y3','J','W1','W2','W3']
def band_of(i):return 'jersey' if i in CREST else fam(i)[0]
def features(n):
    p=frame(n);d,_=direction(n);f=facing_of(d);T=np.isin(p,list(TIDX))
    if f=='back':return p,{},dict(dir=d,facing=f)
    if f=='side':
        ys,xs=np.nonzero(T);mid=(xs.min()+xs.max())/2;keep=(xs>=mid) if d==2 else (xs<=mid);M=np.zeros_like(T);M[ys[keep],xs[keep]]=True;T=M
    B={(y,x):band_of(int(p[y,x])) for y,x in zip(*np.nonzero(T))};F={}
    for (y,x),b in B.items():
        j=0;k=1                                                          # j = rows down to the band's lowest pixel in this column; occluded /
        while y+k<p.shape[0] and B.get((y+k,x)) in (b,None):              # non-torso gaps (stick, glove) are walked through, another torso
            if B.get((y+k,x))==b:j=k                                      # band stops the walk (so a repeated band gets its own j=0 row)
            k+=1
        r=np.nonzero(T[y])[0];L,R=r.min(),r.max()
        if f=='side':E=R if d==2 else L;q=(abs(x-E)+.5)/(R-L+1);th=np.arccos(np.clip(1-q,-1,1));s=.5-.5*np.sin(th) if d==2 else .5+.5*np.sin(th)
        else:s=(x-L+.5)/(R-L+1)
        F[(y,x)]=dict(i=int(p[y,x]),b=b,j=j,s=float(s))
    return p,F,dict(dir=d,facing=f)
A={n:features(n) for n in FR}
# ---- texels: id -> dict(b,j,s,col,crest,src)
TX=[];pB,FB,_=A[BASE];X0=min(x for y,x in FB)
for (y,x),v in sorted(FB.items()):TX.append(dict(b=v['b'],j=v['j'],s=v['s'],col=x-X0,crest=v['i'] if v['i'] in CREST else None,src=f'370 ({y},{x})'))
EXP=[]
def match(tg,tx):   # order-preserving DP: tg,tx sorted by s; returns list of (target k, texel m or None)
    n,m=len(tg),len(tx);INF=1e9;C=np.full((n+1,m+1),INF);C[0,:]=0;bk={}
    for a in range(1,n+1):
        for b in range(0,m+1):
            best=(C[a-1,b]+P,('new',b))
            if b>0:
                best=min(best,(C[a-1,b-1]+abs(tg[a-1][1]-tx[b-1][1]),('m',b-1)),(C[a,b-1],('skip',b-1)))
            C[a,b],bk[a,b]=best
    out=[];a,b=n,m
    while a>0:
        t,bb=bk[a,b]
        if t=='new':out.append((a-1,None));a-=1
        elif t=='m':out.append((a-1,bb));a-=1;b=bb
        else:b=bb
    return out
def rowcols(g,j):return {t['col'] for t in TX if GRP[t['b']]==g and t['j']==j}
ASG={};STAT={}
for n in ORDER:
    p,F,inf=A[n];asg={};rule=collections.Counter()
    for yx,v in F.items():
        if v['i'] in CREST:
            k=next((i for i,t in enumerate(TX) if t['crest']==v['i']),None)
            if k is None:TX.append(dict(b='jersey',j=v['j'],s=v['s'],col=None,crest=v['i'],src=f'{n} {yx}'));k=len(TX)-1;EXP.append((n,'crest',v['i']))
            asg[yx]=k;rule['crest by index']+=1
    for (b,j) in sorted({(v['b'],v['j']) for v in F.values() if v['i'] not in CREST}):
        tg=sorted([(yx,v['s']) for yx,v in F.items() if v['b']==b and v['j']==j and v['i'] not in CREST],key=lambda t:(t[1],t[0][1]))
        tx=sorted([(i,t['s']) for i,t in enumerate(TX) if t['b']==b and t['j']==j and t['crest'] is None],key=lambda t:t[1])
        mm=match(tg,tx)
        for k,m in sorted(mm):
            if m is not None:asg[tg[k][0]]=tx[m][0];rule['matched']+=1;continue
            # new texel: column next to its matched neighbour in the row order, first free column in that texture row
            nb=[asg[tg[q][0]] for q in range(k-1,-1,-1) if tg[q][0] in asg][:1];na=[m2 for q,m2 in sorted(mm) if q>k and m2 is not None][:1]
            g=GRP[b];used=rowcols(g,j);cols=[t['col'] for t in TX if t['b']==b and t['col'] is not None] or [0]
            if nb:want=TX[nb[0]]['col']+1;step=1
            elif na:want=TX[tx[na[0]][0]]['col']-1;step=-1
            else:want=int(round(np.interp(tg[k][1],[0,1],[min(cols),max(cols)])));step=1 if tg[k][1]>=.5 else -1
            c=want
            while c in used:c+=step
            TX.append(dict(b=b,j=j,s=tg[k][1],col=c,crest=None,src=f'{n} {tg[k][0]}'));asg[tg[k][0]]=len(TX)-1;rule['NEW texel']+=1
            EXP.append((n,f'{b} j{j}',c))
    ASG[n]=asg;STAT[n]=rule
for n in FR:
    if n not in ASG:ASG[n]={};STAT[n]=collections.Counter()
# crest texels without a column (none expected) / layout
for t in TX:
    if t['col'] is None:raise SystemExit('crest texel without base position')
MJ={g:max([t['j'] for t in TX if GRP[t['b']]==g]) for g in GORD}
ROW={};r=0
for g in GORD:
    for j in range(MJ[g],-1,-1):ROW[(g,j)]=r;r+=1
cmin=min(t['col'] for t in TX);TW=max(t['col'] for t in TX)-cmin+1;TH=r
POS={}
for i,t in enumerate(TX):
    xy=(t['col']-cmin,ROW[(GRP[t['b']],t['j'])]);assert xy not in POS.values(),('texel collision',t);POS[i]=xy
# ---- team textures
def tm(src,code):return spritepal(next(q for q in json.load(open(D+src+'.json')) if q['code']==code))
MED={fam(int(k))[0]:int(k) for k in ZN if fam(int(k))[1]=='medium'}
def game_tex(sp):
    T=np.zeros((TH,TW,3),np.uint8);T[:]=(255,0,255)
    for i,t in enumerate(TX):x,y=POS[i];T[y,x]=sp[t['crest']] if t['crest'] else sp[MED[t['b']]] if t['b'] in MED else sp[[int(k) for k in ZN if fam(int(k))[0]==t['b']][0]]
    return T
W=(245,245,240);BK=(20,20,20);RD=(200,40,30);BB=(125,165,230);NV=(20,40,140)
DES={'chicago':dict(ref='blackhawks_alt',y=RD,top=W,chest=BK,body=RD,w=[RD,BK,W]),     # photo: red yoke, white line, black CHICAGO band, hem red/black/white
     'montreal':dict(ref='canadiens_babyblue',y=BB,top=W,chest=NV,body=BB,w=[W,NV,BB])} # photo: blue yoke, white line, navy CH band, hem white/navy/blue
def design_tex(k):
    d=DES[k];cr=np.asarray(crest_px(Image.open(R0+JD[d['ref']]['ref']).convert('RGB').crop(JD[d['ref']]['crest']),5,4))
    T=np.zeros((TH,TW,3),np.uint8);T[:]=(255,0,255)
    for i,t in enumerate(TX):
        x,y=POS[i];g=GRP[t['b']]
        if t['crest']:c=cr[(t['crest']-192)//16,(t['crest']-192)%16]
        elif g in('Y1','Y2','Y3'):c=d['y']
        elif g=='J':c=d['chest'] if t['j']<=3 else d['top'] if t['j']==4 else d['body']   # chest band = crest rows j0-3, j4 = edge line, j>=5 body
        else:c=d['w'][int(g[1])-1]
        T[y,x]=c
    return T
TEAMS={'leafs_home':game_tex(tm('HOME','tor')),'rangers_away':game_tex(tm('AWAY','nyr')),'chicago':design_tex('chicago'),'montreal':design_tex('montreal')}
PAL={'leafs_home':tm('HOME','tor'),'rangers_away':tm('AWAY','nyr')}
def lut(sp):
    L={}
    for k in ZN:
        i=int(k);b,c=fam(i)
        if c in('light','dark') and b in MED:L[(b,tuple(sp[MED[b]]),c)]=tuple(sp[i])
    return L
def render(team,n,Tx=None):
    p,F,_=A[n];sp=PAL.get(team,PAL['leafs_home']);o=sp[p].astype(float);Tx=TEAMS[team] if Tx is None else Tx;L=lut(sp) if team in PAL else {}
    for (y,x),k in ASG[n].items():
        u,v=POS[k];t=tuple(int(c) for c in Tx[v,u]);i=F[(y,x)]['i'];b,c=fam(i)
        if i in CREST or c not in('light','dark'):o[y,x]=t
        elif team in PAL:o[y,x]=L.get((b,t,c),t)
        else:o[y,x]=np.clip(np.array(t)*(1.125 if c=='light' else .875),0,255)
    return o,p!=255
rep={}
for team in PAL:
    for n in FR:
        G=PAL[team][A[n][0]].astype(float);R,_=render(team,n);M=np.zeros(G.shape[:2],bool)
        for yx in ASG[n]:M[yx]=True
        cnt=collections.Counter(ASG[n].values())
        rep[f'{team}_{n}']=dict(diff=int(((np.abs(G-R).sum(2)>0)&M).sum()),front_torso_px=len(ASG[n]),duplicates=sum(v-1 for v in cnt.values() if v>1),**STAT[n],dir=A[n][2]['dir'],facing=A[n][2]['facing'])
# ---- images
def grid(rows,head,path):
    cw=max(i.width for _,r in rows for i in r)+24;rh=max(i.height for _,r in rows for i in r)+30
    O=Image.new('RGB',(cw*len(head),rh*len(rows)+22),(20,20,20));d=ImageDraw.Draw(O)
    for j,h in enumerate(head):d.text((j*cw+max(4,cw//2-len(h)*3),5),h,fill=(255,255,0))
    for k,(t_,r) in enumerate(rows):
        y=22+k*rh;d.text((6,y+2),t_,fill=(255,255,255))
        for j,i in enumerate(r):O.paste(i,(j*cw+(cw-i.width)//2,y+22+(rh-30-i.height)//2))
    O.save(path)
def lab(n):f=A[n][2];return f"{n} d{f['dir']} {f['facing']}"+(' (base)' if n==BASE else '')+(' - back view: no front-torso px' if f['facing']=='back' else f" {len(ASG[n])} px")
S=8
for team in TEAMS:
    rows=[]
    for n in FR:
        G=(PAL[team] if team in PAL else PAL['leafs_home'])[A[n][0]].astype(float);R,vis=render(team,n);dm=np.zeros(G.shape);dm[vis]=(60,60,60)
        for yx in ASG[n]:dm[yx]=(0,110,0)
        if team in PAL:dm[(np.abs(G-R).sum(2)>0)]=(255,0,0)
        rows.append((lab(n)+(f" diff={rep[f'{team}_{n}']['diff']}" if team in PAL else ''),[toimg(G,vis,S),toimg(R,vis,S),toimg(dm,vis,S)]))
    grid(rows,['game render'+('' if team in PAL else ' (Leafs, reference)'),f'{team} sub-zone texture -> frame','front-torso px (green) / diff (red)'],f'{OUT}/compare_{team}.png')
grid([(lab(n),[toimg(*render(t,n),S) for t in TEAMS]) for n in FR],['Leafs home','Rangers away','Chicago (blackhawks_alt)','Montreal (canadiens_babyblue)'],f'{OUT}/combined_4teams.png')
rng=np.random.default_rng(1);U=np.zeros((TH,TW,3),np.uint8);U[:]=(255,0,255);S2=U.copy()
for i,t in enumerate(TX):
    x,y=POS[i];U[y,x]=rng.integers(30,256,3)
    S2[y,x]=[int(255*c) for c in colorsys.hsv_to_rgb((y*0.137)%1,.9,.45+.55*x/max(TW-1,1))]
assert len({tuple(U[POS[i][1],POS[i][0]]) for i in POS})==len(TX)
def syn(Tx,n):
    p,F,_=A[n];o=PAL['leafs_home'][p].astype(float)*.35
    for yx,k in ASG[n].items():u,v=POS[k];o[yx]=Tx[v,u]
    return o,p!=255
grid([(lab(n),[toimg(*syn(U,n),10),toimg(*syn(S2,n),10)]) for n in FR],['unique colour per sub-zone','hue = texture row, brightness = texture column'],f'{OUT}/synthetic_compare.png')
Z=16
def labelled(Tx,path,title):
    I=Image.fromarray(Tx).resize((TW*Z,TH*Z),Image.NEAREST);d=ImageDraw.Draw(I)
    for x in range(TW+1):d.line((x*Z,0,x*Z,TH*Z),fill=(0,0,0))
    for y in range(TH+1):d.line((0,y*Z,TW*Z,y*Z),fill=(0,0,0))
    ab={'yoke 1':'y1','yoke 2':'y2','yoke 3':'y3','yoke corner':'yc','shoulder patch':'sp','jersey':'j','waist 1':'w1','waist 2':'w2','waist 3':'w3'}
    for i,t in enumerate(TX):
        x,y=POS[i];d.text((x*Z+2,y*Z+2),'c' if t['crest'] else ab[t['b']],fill=(255,255,0),stroke_width=1,stroke_fill=(0,0,0))
        if not t['src'].startswith('370'):d.rectangle([x*Z+1,y*Z+1,x*Z+Z-2,y*Z+Z-2],outline=(0,255,255))
    C=Image.new('RGB',(I.width+120,I.height+34),(20,20,20));C.paste(I,(0,34));dd=ImageDraw.Draw(C);dd.text((2,3),title,fill=(255,255,255));dd.text((2,17),'cyan box = expansion texel, magenta = reserve',fill=(0,255,255))
    for (g,j),r in ROW.items():dd.text((I.width+4,34+r*Z+2),f'{g} j{j}',fill=(200,200,200))
    C.save(path)
for team,T in list(TEAMS.items())+[('synthetic_unique',U),('synthetic_rows',S2)]:
    Image.fromarray(T).save(f'{OUT}/tex_{team}.png');labelled(T,f'{OUT}/tex_{team}_x{Z}.png',f'{team}: front torso {TW}x{TH}')
json.dump(dict(base=BASE,size=[TW,TH],texels=len(TX),rows={f'{g} j{j}':r for (g,j),r in ROW.items()},expansions=EXP,report=rep,
  texel_table={i:dict(xy=POS[i],**t) for i,t in enumerate(TX)},submap={str(n):{f'{y},{x}':k for (y,x),k in a.items()} for n,a in ASG.items()}),open(f'{OUT}/stage1b.json','w'),indent=0,default=int)
print('texture',TW,'x',TH,'texels',len(TX),'(370:',len(FB),')');print('expansions',collections.Counter((e[0],e[1]) for e in EXP))
for k,v in rep.items():print(k,v)
