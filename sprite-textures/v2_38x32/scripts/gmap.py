# Goalie gear first pass on a draft goalie companion texture (38x32). usage: python3 gmap.py <part>
import sys,os,json,collections,numpy as np
os.chdir('/workspace/preview_back/root/sprite-textures/out');sys.path.insert(0,'../scripts')
import uv;uv.WRAP_LIMBS=uv.SIDE_FIX=uv.FRONT_SMOOTH=uv.GLOVE_UV=uv.PAD_UV=True;uv.ELEV=40
from lib import ZN,act,D
from PIL import Image,ImageDraw,ImageFont
PART=sys.argv[1];ORDER=['goalie_mask','blocker','pad','catcher']
FRG=[413,416,422,428,449,519,980,1000]
# draft goalie layout (x0,y0,w,h): sizes = measured max capacity (capacity.json: pad 19x21, blocker/catcher 10x10, mask 7x6)
GL={'pad':(0,0,19,21),'blocker':(19,0,10,10),'catcher':(19,10,10,10),'goalie_mask':(29,0,7,6)}
TEAMS=[('HOME.json','tor'),('AWAY.json','nyr'),('HOME.json','chi'),('AWAY.json','chi'),('HOME.json','mtl')]
def spal(f,c):
    t=next(t for t in json.load(open(D+f)) if t['code']==c);p=act.copy().astype(int);p[128:192]=np.array(t['colors'])*4;return p[np.array(t['map'])]
SH=lambda i:next((w for w in ZN.get(str(i),'').split() if w in('light','dark','medium')),'')
fam=lambda i:' '.join(w for w in ZN[str(i)].split() if w not in('light','dark','medium')) if str(i) in ZN else f'idx{i}'
FIDX={(fam(int(k)),SH(int(k))):int(k) for k in ZN}
def lev_idx(f,lv,q):   # palette index for family f at the shade word of the pixel's own index
    if f.startswith('idx'):return int(f[3:])
    return FIDX.get((f,lv),FIDX.get((f,''),FIDX.get((f,'medium'),q)))
S={n:uv.solve(n) for n in FRG}
x0,y0,w,h=GL[PART]
def pix(n):
    p,part,U,V,R=S[n];ys,xs=np.nonzero(R==PART);return [(int(y),int(x)) for y,x in zip(ys,xs)]
from scipy import ndimage as ndi
def comps(n):
    p,part,U,V,R=S[n];lab,k=ndi.label(R==PART,np.ones((3,3)));return lab
# pass 1: naive UV placement -> texel family = majority family (defines the draft texture's families, like FAM2 for skaters)
votes=collections.defaultdict(collections.Counter)
for n in FRG:
    p,part,U,V,R=S[n]
    for (y,x) in pix(n):
        tx=(x0+min(w-1,int(U[y,x]*w)),y0+min(h-1,int(round(V[y,x]*(h-1)))));votes[tx][fam(int(p[y,x]))]+=1
FAMG={t:c.most_common(1)[0][0] for t,c in votes.items()}
# texels never hit keep the nearest same-row family (edge extension)
for yy in range(y0,y0+h):
    row=[t for t in FAMG if t[1]==yy]
    for xx in range(x0,x0+w):
        if (xx,yy) not in FAMG and row:FAMG[(xx,yy)]=FAMG[min(row,key=lambda t:abs(t[0]-xx))]
# pass 2: family-aware, per (component,row,family): centre-contiguous if fewer, stretch-from-centre if more
A={};FB=collections.Counter()
def place(ps,ts,tv,Ukey):
    ps=sorted(ps,key=Ukey);m,nT=len(ps),len(ts)
    if m<=nT:
        o=(nT-m)//2
        for i,p in enumerate(ps):A[n][p]=(ts[o+i],tv)
    else:
        per=[m//nT]*nT
        for k in sorted(range(nT),key=lambda j:abs(j-(nT-1)/2))[:m-sum(per)]:per[k]+=1
        k=0
        for j,c in enumerate(per):
            for _ in range(c):A[n][ps[k]]=(ts[j],tv);k+=1
for n in FRG:
    p,part,U,V,R=S[n];A[n]={};lab=comps(n);grp=collections.defaultdict(list)
    for (y,x) in pix(n):grp[(lab[y,x],y0+min(h-1,int(round(V[y,x]*(h-1)))),fam(int(p[y,x])))].append((y,x))
    for (c,tv,f),ps in grp.items():
        ts=None
        for dv in (0,1,-1,2,-2,3,-3):
            r=tv+dv
            if y0<=r<y0+h:
                tt=[xx for xx in range(x0,x0+w) if FAMG.get((xx,r))==f]
                if tt:ts,rr=tt,r;break
        if ts is None:FB[f]+=len(ps);ts,rr=list(range(x0,x0+w)),tv   # family absent from this part's texels: any texel in row (counted as mismatch)
        elif rr!=tv:FB['row_fallback']+=len(ps)
        place(ps,ts,rr,lambda q:U[q])
# control per team: rendered colour = palette(texel family @ pixel's own shade level)
res={};BAD={}
for t in TEAMS:
    sp=spal(*t);tot=0
    for n in FRG:
        p=S[n][0];b=[]
        for q,tx in A[n].items():
            i=int(p[q]);j=lev_idx(FAMG[tx],SH(i),i)
            if tuple(sp[j])!=tuple(sp[i]):b.append(q)
        BAD.setdefault(n,set()).update(b);tot+=len(b)
    res[' '.join(t)]=tot
st={n:dict(px=len(A[n]),texels=len(set(A[n].values())),shared=sum(1 for c in collections.Counter(A[n].values()).values() if c>1)) for n in FRG}
used=set(tx for n in FRG for tx in A[n].values())
R=dict(part=PART,frames=FRG,layout=GL[PART],control_px_wrong=res,stats=st,texels=w*h,texels_used=len(used),family_fallback_px=dict(FB),texel_families=dict(collections.Counter(FAMG.values())))
json.dump(R,open(f'/workspace/preview_v2/goalie/g_{PART}.json','w'),indent=1,default=str);print(json.dumps(R,default=str)[:1500])
# test texture: draft layout, each part region with luminance-step pattern; current part bright, others dim
tex=np.zeros((32,38,3),int);tex[:]=(252,0,252)
for k,(a,b,ww,hh) in GL.items():
    for yy in range(b,b+hh):
        for xx in range(a,a+ww):tex[yy,xx]=(255,170-12*((xx-a)%8),0) if (xx+yy)%2 else (40+215*(((xx-a)*5+(yy-b)*3)%9)//8,)*3
show=(tex*0.3).astype(np.uint8)
for yy in range(y0,y0+h):
    for xx in range(x0,x0+w):show[yy,xx]=tex[yy,xx]
ti=Image.fromarray(show).resize((38*6,32*6),Image.NEAREST);d=ImageDraw.Draw(ti)
for (xx,yy) in used:d.rectangle([xx*6,yy*6,xx*6+5,yy*6+5],outline=(255,255,255))
F=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',18);BG=(40,40,40);sc=2
fw=max(S[n][0].shape[1] for n in FRG)+4;fh=max(S[n][0].shape[0] for n in FRG)
W=ti.width+16+len(FRG)*fw*sc;H=34+3*(fh*sc+26)+80
Im=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(Im);sp=spal(*TEAMS[2])
d.text((6,6),f"GOALIE {PART.upper()}  control px wrong (5 teams): {sum(res.values())}",fill='white',font=F)
Im.paste(ti,(4,40));d.text((4,240),'goalie test tex',fill='white',font=F);d.text((4,262),'boxed = used',fill='white',font=F)
for r in range(3):
    y=34+r*(fh*sc+26)
    for i,n in enumerate(FRG):
        p=S[n][0];m=p!=255;a=np.zeros(p.shape+(3,),np.uint8);a[:]=BG;a[m]=sp[p[m]]
        if r==1:
            a=(a*0.35).astype(np.uint8)
            for q,(xx,yy) in A[n].items():a[q]=tex[yy,xx]
        if r==2:
            a=(a*0.25).astype(np.uint8)
            for q in BAD[n]:a[q]=(255,255,0)
        x=ti.width+16+i*fw*sc;Im.paste(Image.fromarray(a).resize((p.shape[1]*sc,p.shape[0]*sc),Image.NEAREST),(x,y+24))
        if r==0:d.text((x,y+2),str(n),fill='white',font=F)
for r,s in enumerate(['row 1: in-game (Chicago home)','row 2: part pixels in goalie test-texture colours','row 3: yellow = wrong vs in-game (union of 5 teams)']):d.text((6,H-78+r*24),s,fill='white',font=F)
if W>1000:Im=Im.resize((1000,int(H*1000/W)),Image.NEAREST)
Im.save(f'/workspace/preview_v2/goalie/g_{PART}.png');print('sheet',Im.size)
