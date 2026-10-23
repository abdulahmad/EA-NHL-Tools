# v5 STEP 1 (textures only). Column-aligned role grid on the fixed v4 silhouette + 5 flat team textures.
# Alignment: every column of a body part carries the same stripe sequence at the same rows (the column analogue of stage 1b's straight
# rows): torso cols (front u'=2..10) rows 9-13 jersey/crest, 14 waist1, 15 waist2, 16 waist3, 17+ pants; arms rows 8-11 upper arm,
# 12/13/14 arm stripes 1/2/3, 15-17 forearm, 18-20 glove; legs rows 21-22 pants (outer col = pants stripe), 23-24 socks, 25 socks stripe 1,
# 26 socks stripe 2, 27 socks, 28+ skate. Back figure = same rules at u-14. Side-pants panel kept as drawn (already column-consistent).
# Skin, gloves, skates, blades, stick = green placeholder. No texels added: roles are assigned only where v4 already has a texel.
import sys,os,json,collections,runpy,numpy as np
from PIL import Image,ImageDraw
H=os.path.dirname(os.path.abspath(__file__));OUT=sys.argv[1];os.makedirs(OUT,exist_ok=True)
TPL=next(p for p in (os.environ.get('TPL',''),f'{H}/../../templates/abdul_layout_v4_template.png',f'{H}/abdul_layout_v4.png') if p and os.path.exists(p))   # Abdul's file, byte-for-byte
L=np.asarray(Image.open(TPL).convert('RGB')).astype(int);TH,TW=L.shape[:2];MAG=(252,0,252);HAVE=~(L==MAG).all(2)
def cls(c):
    r,g,b=c
    if r>100 and g>100 and b<60:return 'gold'
    if g>=40 and r>g>b:return 'skin'          # all of Abdul's skin shades (220,148,104 ... 96,56,28); reds have g=0
    if b>r+40:return 'blue'
    if r-g>60:return 'red'
    if max(c)<120:return 'black'
    return 'white'
CREST={(v,u) for v in range(10,14) for u in range(4,9)}       # 5x4 crest grid (game crest indices 192-196,208-212,224-228,240-244)
def role(u,v):
    c=tuple(L[v,u])
    if u>=28:return {'black':'pants','white':'pstripe1','red':'pstripe2'}[cls(c)]
    back=u>=14;w=27-u if back else u    # back figure = front MIRRORED (template: hips/legs/patches sit at 27-u)
    k=cls(c)
    if v<=7:   # head rows: copied texel-for-texel from the template colour (helmet / skin / yoke / patch)
        return {'skin':'skin','black':'helmet','gold':'patch','red':'yoke1' if v==6 else 'yoke2'}[k]
    if k=='skin' and not (10<=v<=13 and 4<=w<=8):return 'skin'     # neck skin below row 7 (crest block excluded: drawn crest)
    if v<=8:
        if k=='gold':return 'patch'
        if v==8 and w in(1,12):return 'upper arm'
        if v==8 and w in(2,11):return 'yoke corner'
        return {6:'yoke1',7:'yoke2',8:'yoke3'}[v]
    arm=w<=1 or w>=11 or (w==2 and v<=15)
    if v<=17 and arm:return 'upper arm' if v<=11 else {12:'arm1',13:'arm2',14:'arm3'}.get(v,'forearm')
    if v<=13:return ('number' if back else 'crest') if (v,w) in CREST else 'jersey'
    if v<=16:return {14:'waist1',15:'waist2',16:'waist3'}[v]
    if v<=20:return 'glove' if arm or w<=1 or w>=11 else 'pants'
    if v<=22:return 'pstripe1' if w in(1,11) else 'pants'
    return {23:'pants',24:'socks',25:'sock1',26:'sock2',27:'socks'}.get(v,'skate')   # row majority in the template: 23 black, 24 red, 25 white, 26 black, 27 red
ROLE={(u,v):role(u,v) for v,u in zip(*np.nonzero(HAVE))}
GRN=(0,220,0);GREENR={'skin','glove','skate'}
# ---- game-palette teams: role colour = that zone's game medium, snapped to the team's one-shade-per-hue set
sys.path.insert(0,'.');sys.path.insert(0,H);from lib import spritepal,D,ZN
ZI={'helmet':190,'yoke1':162,'yoke2':163,'yoke3':161,'yoke corner':159,'patch':160,'jersey':166,'number':166,'upper arm':157,'arm1':154,'arm2':151,
    'arm3':148,'forearm':145,'waist1':169,'waist2':172,'waist3':175,'pants':180,'pstripe1':179,'pstripe2':178,'socks':182,'sock1':185,'sock2':188}
CRI=[[192,193,194,195,196],[208,209,210,211,212],[224,225,226,227,228],[240,241,242,243,244]]
def gameteam(fn,code,SET):
    sp=spritepal(next(q for q in json.load(open(D+fn)) if q['code']==code)).astype(int)
    snap=lambda c:min(SET,key=lambda s:sum(abs(a-b) for a,b in zip(s,c)))
    T={r:snap(sp[i]) for r,i in ZI.items()};T['_crest']=[[snap(sp[i]) for i in row] for row in CRI];return T,sp
B,W=(0,0,140),(224,224,224)
TEAMS={}
TEAMS['Leafs home'],spL=gameteam('HOME.json','tor',[B,W])
TEAMS['Rangers away'],spR=gameteam('AWAY.json','nyr',[(0,0,128),(192,0,0),(220,220,220)])
for _t in ('Leafs home','Rangers away'):TEAMS[_t]['patch']=TEAMS[_t]['yoke2']   # no shoulder patch on these designs -> yoke/body colour
# shoulder patch = its own role (template gold 168,132,0 at front cols 2,11 / back 16,25 row 7). Chicago home keeps gold (template design);
# teams with no shoulder patch (Leafs, Rangers, Chicago alt, Montreal) use the yoke/body colour there.
# ---- reference-sheet designs (bottom/top jerseys of out/ref_jerseys/*.png), one shade per hue
R_,K_,W_=(132,0,0),(44,44,44),(232,232,232)
abd=[[tuple(L[v,u]) for u in range(4,9)] for v in range(10,14)]     # Abdul's drawn Indian-head crest
def design(**k):
    d=dict(helmet=K_,yoke1=R_,yoke2=R_,yoke3=R_,**{'yoke corner':R_},patch=R_,jersey=R_,number=R_,**{'upper arm':R_},arm1=K_,arm2=W_,arm3=K_,
           forearm=R_,waist1=K_,waist2=W_,waist3=K_,pants=K_,pstripe1=W_,pstripe2=R_,socks=R_,sock1=K_,sock2=W_);d.update(k);return d
TEAMS['Chicago home (top)']=design(_crest=abd,patch=(168,132,0),arm1=W_,arm2=K_,arm3=W_,waist1=W_,waist2=K_,waist3=W_,sock1=W_,sock2=K_)   # = Abdul's template colours
TEAMS['Chicago alt (bottom)']=design(jersey=K_,number=K_,arm1=K_,arm2=W_,arm3=K_,waist1=R_,waist2=W_,waist3=R_,
    # Abdul pt775u, bottom-up. Torso rows 16..9 (waist3,waist2,waist1, jersey/crest/number rows 13..9) = K,W,K,R,W,K,W,R.
    # Arms rows 17..10 (forearm 17-15, arm3-1 14-12, upper arm 11-10) = R,K,W,R,W,K,W,R (Abdul pt776u: one leading red cut); upper-arm rows 9-8 keep upper-arm red.
    _rows={'torso':dict(zip(range(16,8,-1),[K_,W_,K_,R_,W_,K_,W_,R_])),'arm':dict(zip(range(17,9,-1),[R_,K_,W_,R_,W_,K_,W_,R_]))})
LB,RB,MR=(96,144,224),(0,40,160),(200,0,30)
TEAMS['Montreal baby blue (bottom)']=design(helmet=RB,yoke1=LB,yoke2=LB,yoke3=LB,**{'yoke corner':LB},patch=LB,jersey=LB,number=LB,**{'upper arm':LB},
    arm1=W_,arm2=RB,arm3=W_,forearm=LB,waist1=LB,waist2=W_,waist3=RB,   # Abdul pt775u: waist top=baby blue, middle=white, bottom=royal
    pants=RB,pstripe1=W_,pstripe2=MR,socks=LB,sock1=RB,sock2=W_,
    _band={10:[W_]*8,11:[RB]*8,12:[RB]*8,13:[W_]*8},_backband={10:[W_]*8,11:[RB]*8,12:[RB]*8,13:[W_]*8},
    _crest=[[W_,MR,MR,MR,W_],[MR,W_,RB,W_,MR],[MR,W_,RB,W_,MR],[W_,MR,MR,MR,W_]])
rep={}
def tex(T):
    img=np.zeros((TH,TW,3),int);img[:]=MAG
    for (u,v),r in ROLE.items():
        back=14<=u<28;w=27-u if back else u
        c=GRN if r in GREENR else T[r] if r in T else None
        band=T.get('_backband' if back else '_band') if u<28 else None
        if band and v in band and 3<=w<=10:c=band[v][w-3]
        if r=='crest' and '_crest' in T:c=T['_crest'][v-10][u-4]
        RG={'jersey':'torso','crest':'torso','number':'torso','waist1':'torso','waist2':'torso','waist3':'torso','upper arm':'arm','arm1':'arm','arm2':'arm','arm3':'arm','forearm':'arm'}
        if '_rows' in T and r in RG and v in T['_rows'][RG[r]]:c=T['_rows'][RG[r]][v]
        img[v,u]=c
    return img
imgs={}
for n,T in TEAMS.items():
    img=tex(T);fn=n.split(' (')[0].lower().replace(' ','_')+('_'+n.split('(')[1][:-1] if '(' in n else '')
    Image.fromarray(img.astype(np.uint8)).save(f'{OUT}/{fn}.png');Image.fromarray(img.astype(np.uint8)).resize((TW*16,TH*16),Image.NEAREST).save(f'{OUT}/{fn}_x16.png')
    C=collections.Counter(tuple(map(int,img[v,u])) for (u,v) in ROLE)
    rep[n]=dict(file=f'{fn}.png',all={str(k):c for k,c in C.most_common()},
      excl_crest={str(k):c for k,c in collections.Counter(tuple(map(int,img[v,u])) for (u,v),r in ROLE.items() if r!='crest').most_common()})
    imgs[n]=img
# role grid image (alignment proof)
S=20;I=Image.fromarray(np.where(HAVE[...,None],128,0).astype(np.uint8).repeat(3,2)).resize((TW*S,TH*S),Image.NEAREST);d=ImageDraw.Draw(I)
AB={'helmet':'h','skin':'sk','yoke1':'y1','yoke2':'y2','yoke3':'y3','yoke corner':'yc','patch':'sp','jersey':'j','crest':'c','number':'#','upper arm':'ua','arm1':'a1','arm2':'a2','arm3':'a3','forearm':'fa','glove':'gl','waist1':'w1','waist2':'w2','waist3':'w3','pants':'p','pstripe1':'p1','pstripe2':'p2','socks':'so','sock1':'s1','sock2':'s2','skate':'sk8'}
img=imgs['Chicago home (top)']
for (u,v),r in ROLE.items():d.rectangle([u*S,v*S,u*S+S-1,v*S+S-1],fill=tuple(int(t) for t in img[v,u]),outline=(0,0,0));d.text((u*S+2,v*S+5),AB[r],fill=(255,255,0),stroke_width=1,stroke_fill=(0,0,0))
I.save(f'{OUT}/role_grid_aligned_x20.png')
# combined sheet: 5 textures side by side, each centred in its own equal-width column, labelled, column ruler
S=10;cw=TW*S+40;Wd=cw*len(imgs);O=Image.new('RGB',(Wd,TH*S+110),(30,30,30));d=ImageDraw.Draw(O)
d.text((8,6),'v5 flat textures (54x32, v4 silhouette, column-aligned roles). green = placeholder (skin, gloves, skates, stick). magenta = no texel',fill=(255,255,255))
for k,(n,img) in enumerate(imgs.items()):
    x0=k*cw+(cw-TW*S)//2;cnt=len(rep[n]['excl_crest'])-(1 if str(GRN) in rep[n]['excl_crest'] else 0)
    for t,yy in ((n,30),(f'{cnt} colours excl. crest/green',46)):tw=d.textlength(t);d.text((k*cw+(cw-tw)//2,yy),t,fill=(255,255,0))
    O.paste(Image.fromarray(img.astype(np.uint8)).resize((TW*S,TH*S),Image.NEAREST),(x0,70))
    for u in range(0,TW,2):d.text((x0+u*S,70+TH*S+4),str(u%10),fill=(150,150,150))
O.save(f'{OUT}/all_textures_sheet.png')
json.dump(rep,open(f'{OUT}/texture_colours.json','w'),indent=1)
for n,r in rep.items():print(n,'| excl crest:',r['excl_crest'])
