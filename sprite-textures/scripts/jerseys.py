# Hand-authored jersey atlases (reference layout from uv.ATLAS) + render via per-pixel UV + shade.
from uv import *
from PIL import Image,ImageDraw,ImageFont
import numpy as np,json
J='jerseys/';R0=J+'ref/'
def shade_of(p):
    s=np.ones(p.shape)
    for i,nm in ZN.items():
        i=int(i); s[p==i]=1.05 if 'light' in nm else 0.62 if 'dark' in nm else 0.85
    return s
W=(245,245,240);NV=(25,35,90)
# crest crops (x0,y0,x1,y1) in the ref crops, chosen by eye
D={
 'canadiens_babyblue':dict(name='Canadiens baby blue',ref='canadiens_babyblue.png',crest=(133,38,190,82),num='11',numc=W,
   base=(125,165,230),yoke=None,
   torso=[(.34,.37,W),(.37,.52,(20,40,140)),(.52,.55,W),(.84,.88,(20,40,140))],
   sleeve=[(.45,.50,W),(.50,.58,(20,40,140)),(.58,.62,W),(.62,.70,(20,40,140)),(.70,.75,W)],
   sock=[(.45,.52,(20,40,140)),(.52,.58,W),(.58,.65,(20,40,140))],sockbase=(125,165,230),
   pants=(20,40,140),pstripe=None,helmet=(20,40,140),glove=(20,40,140)),
 'wild_home':dict(name='Wild home',ref='wild_home.png',crest=(135,58,200,98),num='46',numc=(235,225,190),
   base=(20,80,55),yoke=[(0,.10,(20,80,55)),(.10,.13,(175,30,40)),(.13,.16,(235,225,190))],
   torso=[(.32,.50,(235,225,190)),(.50,.52,(175,30,40)),(.84,.87,(235,225,190)),(.87,.89,(175,30,40)),(.89,.94,(235,225,190))],
   sleeve=[(.48,.56,(235,225,190)),(.56,.60,(175,30,40)),(.60,.68,(235,225,190))],
   sock=[(.45,.52,(235,225,190)),(.52,.56,(175,30,40)),(.56,.63,(235,225,190))],sockbase=(20,80,55),
   pants=(20,80,55),pstripe=None,helmet=(20,80,55),glove=(20,80,55)),
 'blackhawks_alt':dict(name='Blackhawks alt CHICAGO',ref='blackhawks_alt.png',crest=(118,36,212,62),num='88',numc=W,
   base=(20,20,20),yoke=[(0,.16,(200,40,30))],
   torso=[(.16,.30,(200,40,30)),(.30,.33,(20,20,20)),(.33,.48,(20,20,20)),(.62,.66,W),(.66,.74,(200,40,30)),(.74,.78,W),(.86,.90,(200,40,30))],
   sleeve=[(0,.35,(200,40,30)),(.42,.48,W),(.48,.58,(200,40,30)),(.58,.64,W)],
   sock=[(.40,.47,W),(.47,.55,(20,20,20)),(.55,.62,W)],sockbase=(200,40,30),
   pants=(20,20,20),pstripe=None,helmet=(20,20,20),glove=(20,20,20)),
 'panthers_home':dict(name='Panthers home',ref='panthers_home.png',crest=(143,55,192,110),num='5',numc=W,
   base=(200,30,45),yoke=[(0,.12,(200,30,45)),(.12,.14,(190,150,80)),(.14,.30,W),(.30,.32,(190,150,80))],
   torso=[(.88,.91,(190,150,80)),(.91,.95,NV)],
   sleeve=[(.12,.30,W),(.40,.43,(190,150,80)),(.43,.62,W),(.62,.65,(190,150,80))],
   sock=[(.58,.62,(190,150,80)),(.62,.80,W)],sockbase=(200,30,45),
   pants=NV,pstripe=None,helmet=NV,glove=NV),
 'stars_alt':dict(name='Stars alt star',ref='stars_alt.png',crest=(130,35,205,85),num='14',numc=W,
   base=(30,145,95),yoke=[(0,.10,(20,20,20))],star=True,torso=[],
   sleeve=[(0,.25,(20,20,20)),(.25,.28,W)],
   sock=[(.50,.60,W),(.60,.66,(30,145,95))],sockbase=(20,20,20),
   pants=(20,20,20),pstripe=(30,145,95),helmet=(20,20,20),glove=(20,20,20)),
 'thrashers_home':dict(name='Thrashers home',ref='thrashers_home.png',crest=(50,48,78,74),num='',numc=NV,
   base=(105,145,205),yoke=[(0,.08,NV)],torso=[(.92,1,NV)],vpipe=[(.06,.09,NV),(.09,.11,(180,40,40))],
   sleeve=[(.92,1,NV)],svpipe=True,
   sock=[(.30,.36,NV),(.36,.40,(180,40,40)),(.40,.46,NV)],sockbase=(105,145,205),
   pants=NV,pstripe=(180,40,40),helmet=NV,glove=NV),
}
def bands(d,w,h,base,bl,vertical=False):
    # non-overlapping largest-remainder allocation over gap-filled bands: every band keeps >=1 row (fixes P1 drops)
    if not bl:return
    from build_v4 import alloc
    full=[];t=0.
    for v0,v1,c in sorted(bl):
        v0=max(v0,t)
        if v0>t+1e-6:full.append((t,v0,base))
        if v1>v0:full.append((v0,v1,c));t=v1
    if t<1-1e-6:full.append((t,1.,base))
    n=w if vertical else h
    for r,i in enumerate(alloc(full,n)):
        d.rectangle((r,0,r,h-1) if vertical else (0,r,w-1,r),fill=full[i][2])
def star(d,cx,cy,r,c):
    import math;pts=[(cx+(r if k%2==0 else r*.45)*math.sin(k*math.pi/5),cy-(r if k%2==0 else r*.45)*math.cos(k*math.pi/5)) for k in range(10)];d.polygon(pts,fill=c)
def font(sz):
    try:return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',sz)
    except:return ImageFont.load_default()
def build(key,caps=None):
    s=D[key];A=Image.new('RGB',(512,512),(255,0,255));dr=ImageDraw.Draw(A)
    crest=Image.open(R0+s['ref']).convert('RGB').crop(s['crest'])
    flat={}
    for nm,(x,y,fw,fh) in ATLAS.items():
        w,h=(caps or {}).get(nm,(fw,fh));im=Image.new('RGB',(w,h),s['base']);d=ImageDraw.Draw(im)
        if nm.startswith('torso'):
            if s.get('star'): # black body with big star, green sides/hem
                d.rectangle((0,0,w,h),fill=s['base']);d.polygon([(w*.2,0),(w*.8,0),(w*.85,h*.55),(w*.5,h*.95),(w*.15,h*.55)],fill=(20,20,20))
                star(d,w/2,h*.45,w*.42,(20,20,20));star(d,w/2,h*.45,w*.42-4,(20,20,20))
            bands(d,w,h,s['base'],s.get('yoke'));bands(d,w,h,s['base'],s['torso'])
            for u0,u1,c in s.get('vpipe',[]):
                a=int(round(u0*w));b=max(int(round(u1*w)),a+1)
                d.rectangle((a,int(.1*h),b-1,h),fill=c);d.rectangle((w-b,int(.1*h),w-a-1,h),fill=c)
            if nm=='torso_front':
                cw=max(int(round(w*.42)),1);ch=max(int(round(cw*crest.height/crest.width)),1)
                ci=crest_px(crest,cw,ch) if caps else crest.resize((cw,ch),Image.LANCZOS);im.paste(ci,((w-cw)//2,int(h*.42)-ch//2))
            # back: colours/stripes only (no name/number, per Abdul)
        elif nm.startswith('sleeve'):
            bands(d,w,h,s['base'],s['sleeve'])
            if s.get('svpipe'):c0=w//2;d.rectangle((c0-1,0,c0-1,h),fill=NV);d.rectangle((c0,0,c0,h),fill=(180,40,40))
        elif nm.startswith('sock'):
            d.rectangle((0,0,w,h),fill=s['sockbase']);bands(d,w,h,None,s['sock'])
        elif nm=='pants':
            d.rectangle((0,0,w,h),fill=s['pants'])
            if s['pstripe']:t=max(1,round(w*.04));d.rectangle((0,0,t-1,h),fill=s['pstripe']);d.rectangle((w-t,0,w,h),fill=s['pstripe'])
        elif nm in('helmet','goalie_mask'):d.rectangle((0,0,w,h),fill=s['helmet'])
        elif nm in('glove','blocker','catcher'):d.rectangle((0,0,w,h),fill=s['glove']);d.rectangle((0,int(h*.75),w,h),fill=W if nm!='glove' else s['glove'])
        elif nm=='pad':d.rectangle((0,0,w,h),fill=W);[d.rectangle((0,int(h*v),w,int(h*v)+8),fill=s['glove']) for v in(.2,.5,.8)]
        elif nm=='skate':d.rectangle((0,0,w,h),fill=(25,25,25))
        flat[nm]=im;A.paste(im.resize((fw,fh),Image.NEAREST) if caps else im,(x,y))
    if caps and 'crest' in caps: crest=crest_px(crest,*caps['crest']);flat['crest']=crest
    build.flat=flat
    return A,crest
def render(n,A,crest,sp,scale=5):
    p,part,U,V,Rg=solve(n);m=p!=255;has=Rg!='';o=sp[p].astype(float);sh=shade_of(p)[...,None]
    s=sample(A,p,U,V,Rg);o[has]=(s*sh)[has]
    seg,_=segment(n,p);cm=seg==PN.index('crest') if isinstance(seg,np.ndarray) and seg.dtype!=object else None
    cm=np.isin(p,[*range(192,197),*range(208,213),*range(224,229),*range(240,245)])
    if cm.sum()>=2 and pixcrest!='none':
        ys,xs=np.nonzero(cm);y0,y1,x0,x1=ys.min(),ys.max(),xs.min(),xs.max()
        C=np.asarray(crest.resize((x1-x0+1,y1-y0+1),Image.LANCZOS)).astype(float)
        o[cm]=(C[ys-y0,xs-x0]*sh[cm])
    return toimg(np.clip(o,0,255),m,scale),cm.sum()
def anchored(imgs,anc,cols,pad=6,bg=(20,20,20),scale=5):
    """column width from max left/right extent about the game's draw anchor (-minX,-minY); rows share anchor y (feet)."""
    rows=[list(range(i,min(i+cols,len(imgs)))) for i in range(0,len(imgs),cols)]
    L=[max([anc[i][0]*scale for r in rows if c<len(r) for i in [r[c]]],default=0) for c in range(cols)]
    Rr=[max([imgs[i].width-anc[i][0]*scale for r in rows if c<len(r) for i in [r[c]]],default=0) for c in range(cols)]
    T=[max(anc[i][1]*scale for i in r) for r in rows];B=[max(imgs[i].height-anc[i][1]*scale for i in r) for r in rows]
    cw=[L[c]+Rr[c]+pad for c in range(cols)];rh=[T[k]+B[k]+pad for k in range(len(rows))]
    S=Image.new('RGB',(sum(cw),sum(rh)),bg);y=0
    for k,r in enumerate(rows):
        x=0
        for c,i in enumerate(r):S.paste(imgs[i],(x+pad//2+L[c]-anc[i][0]*scale,y+pad//2+T[k]-anc[i][1]*scale));x+=cw[c]
        y+=rh[k]
    return S

# ---- v3 fixes: trim isolines + pixel-art crest ----
def iso_line(V,mask,v0):
    Vv=np.where(mask,V,np.nan);o=np.zeros(V.shape,bool)
    for dy,dx in ((0,1),(1,0),(0,-1),(-1,0)):
        nb=np.roll(np.roll(Vv,dy,0),dx,1);o|=mask&(Vv<v0)&(nb>=v0)
    return o
def crest_px(crest,w,h,k=5):
    c=crest.resize((w*4,h*4),Image.LANCZOS).resize((w,h),Image.BOX)
    return c.quantize(k,method=Image.Quantize.MEDIANCUT).convert('RGB')
def render3(n,A,crest,sp,key,scale=5,trim=True,pixcrest=True):
    s=D[key];p,part,U,V,Rg=solve(n);m=p!=255;has=Rg!='';o=sp[p].astype(float);sh=shade_of(p)[...,None]
    smp=sample(A,p,U,V,Rg);o[has]=(smp*sh)[has];drawn=0
    if trim:
        T=(('torso_back',) if s.get('direct') else ('torso_front','torso_back'))   # v5: front/sock resampled directly -> no isolines there
        for regs,bl in ((T,(s.get('yoke') or [])+s['torso']),(('sleeve','sleeve_b'),s['sleeve']),(('sock','sock_b'),[] if s.get('direct') else s['sock'])):
            lab,k=ndi.label(np.isin(Rg,regs),np.ones((3,3)))
            for c in range(1,k+1):
                mm=lab==c;ys,xs=np.nonzero(mm);L=max(np.ptp(ys),np.ptp(xs))+1
                for v0,v1,col in bl:
                    if v0<=0.001 or (v1-v0)*L>=1.2: continue
                    vis=mm&(V>=v0)&(V<v1)
                    if vis.sum()>=max(2,0.5*(np.ptp(xs)+1)): continue
                    l=iso_line(V,mm,(v0+v1)/2);o[l]=np.array(col)*sh[l];drawn+=int(l.sum())
    cm=np.isin(p,[*range(192,197),*range(208,213),*range(224,229),*range(240,245)])
    if cm.sum()>=2 and pixcrest!='none':
        ys,xs=np.nonzero(cm);y0,y1,x0,x1=ys.min(),ys.max(),xs.min(),xs.max()
        ci=crest.resize((x1-x0+1,y1-y0+1),Image.NEAREST) if pixcrest=='cap' else crest_px(crest,x1-x0+1,y1-y0+1) if pixcrest else crest.resize((x1-x0+1,y1-y0+1),Image.LANCZOS)
        C=np.asarray(ci).astype(float);o[cm]=C[ys-y0,xs-x0]*sh[cm]
    return toimg(np.clip(o,0,255),m,scale),drawn

# ---- gloves: cuff (V 0-.3), back of hand (.3-.72), fingers (.72-1); thumb/palm = U<.3 band in hand/fingers ----
TAN=(205,185,150)
GLOVES={'ottawa':dict(name='Ottawa (black/red cuff, red palm)',back=(25,25,25),cuff=(200,20,40),fingers=(25,25,25),palm=(200,20,40)),
        'redblack':dict(name='Red/black (red cuff, red fingers, tan palm)',back=(25,25,25),cuff=(215,35,35),fingers=(215,35,35),palm=TAN),
        'edmonton':dict(name='Edmonton (navy, orange cuff+fingers, tan palm)',back=(20,35,85),cuff=(245,110,20),fingers=(245,110,20),palm=TAN)}
def glove_tex(g,w,h):
    im=Image.new('RGB',(w,h),g['back']);d=ImageDraw.Draw(im)
    cu=max(1,round(.3*h));fi=max(cu+1,round(.72*h));th=max(1,round(.3*w))
    d.rectangle((0,0,w-1,cu-1),fill=g['cuff']);d.rectangle((0,fi,w-1,h-1),fill=g['fingers'])
    d.rectangle((0,cu+1,th-1,h-1),fill=g['palm'])
    return im
