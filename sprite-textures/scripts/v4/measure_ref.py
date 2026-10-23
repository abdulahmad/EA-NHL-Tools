"""Measure per-team stripe specs + colours from local reference photos -> specs/<team>.json.
Reference photos stay local (jerseys/ref/, gitignored); only measured numbers are written.
Method: sample pixels along hand-placed lines (template geometry, per-team dy), classify each pixel to the
nearest seed colour in Lab (>DE_NOISE = outline/shading noise, ignored), refine colours = median of members,
majority-vote across parallel lines, run-length encode along the normalised line, merge sub-pixel runs."""
import json,sys,numpy as np
from PIL import Image
from scipy import ndimage as ndi
R='jerseys/ref/';DE_NOISE=28
def lab(rgb):
    c=np.asarray(rgb,float)/255;c=np.where(c>.04045,((c+.055)/1.055)**2.4,c/12.92)
    M=np.array([[.4124,.3576,.1805],[.2126,.7152,.0722],[.0193,.1192,.9505]]);x=c@M.T/np.array([.9505,1,1.089])
    f=np.where(x>.008856,np.cbrt(x),7.787*x+16/116);return np.stack([116*f[...,1]-16,500*(f[...,0]-f[...,1]),200*(f[...,1]-f[...,2])],-1)
def de(a,b):return np.linalg.norm(lab(a)-lab(b),axis=-1)
def vga(c):return [int(round(round(v/255*63)*255/63)) for v in c]   # NHL95 PC palette = 6-bit VGA DAC
SEEDS={'blackhawks_alt':dict(red=(200,40,30),black=(20,20,20),white=(245,245,240)),
 'canadiens_babyblue':dict(babyblue=(90,133,215),navy=(20,40,140),white=(245,245,240)),
 'wild_home':dict(green=(20,80,55),wheat=(235,225,190),red=(175,30,40)),
 'panthers_home':dict(red=(200,30,45),white=(245,245,240),gold=(190,150,80),navy=(25,35,90)),
 'stars_alt':dict(green=(30,145,95),black=(20,20,20),white=(245,245,240)),
 'thrashers_home':dict(lightblue=(105,145,205),navy=(25,35,90),red=(180,40,40),white=(245,245,240))}
# template geometry (blackhawks/canadiens layout); dy shifts the whole template for the other refs
T=dict(front=dict(cols=[112,118,124,135,145,155,163],y0=8),back=dict(cols=[250,256,262,334,340,346],y0=46),
       sleeve=dict(a=(343,62),b=(417,110),off=[-5,0,5]),sock=dict(cols=[70,77,84],y0=86,y1=192),
       crest={'canadiens_babyblue':(136,40,188,80),'wild_home':(135,58,200,98),'panthers_home':(146,58,190,108),'stars_alt':(135,40,200,82),'blackhawks_alt':(126,42,202,60)})
DY={'blackhawks_alt':0,'canadiens_babyblue':0,'wild_home':24,'panthers_home':24,'stars_alt':12}
TH=dict(front=dict(cols=[50,51,73,74],y0=36,y1=86),vpipe=dict(y=74,x0=45,x1=81),sleeve=dict(a=(40,37),b=(40,83),off=[-2,0,2]),
        sock=dict(cols=[52,53,54],y0=118,y1=162),crest=(50,46,72,70))
def fgmask(a):
    bg=np.abs(a-a[:,:1]).sum(2)<25;return ndi.binary_opening(~bg,iterations=1)
def classify(px,names,cols):
    d=np.stack([de(px,c) for c in cols],-1);i=d.argmin(-1);i[d.min(-1)>DE_NOISE]=-1;return i
def runs(lbl,minlen):
    """lbl: per-sample label (-1 noise). -> [(t0,t1,label)] merging noise + runs shorter than minlen into neighbours."""
    n=len(lbl);l=lbl.copy()
    for i in range(n):            # forward-fill noise
        if l[i]<0:l[i]=l[i-1] if i else -1
    for i in range(n-1,-1,-1):
        if l[i]<0:l[i]=l[i+1] if i<n-1 else 0
    R=[];s=0
    for i in range(1,n+1):
        if i==n or l[i]!=l[s]:R.append([s/n,i/n,int(l[s])]);s=i
    changed=True
    while changed and len(R)>1:
        changed=False;k=min(range(len(R)),key=lambda j:R[j][1]-R[j][0])
        if R[k][1]-R[k][0]<minlen:
            nb=[j for j in (k-1,k+1) if 0<=j<len(R)];j=max(nb,key=lambda j:R[j][1]-R[j][0])
            if j<k:R[j][1]=R[k][1]
            else:R[j][0]=R[k][0]
            del R[k];changed=True
            M=[R[0]]
            for r in R[1:]:
                if r[2]==M[-1][2]:M[-1][1]=r[1]
                else:M.append(r)
            R=M
    return [(round(a,4),round(b,4),c) for a,b,c in R]
def column_profile(a,fg,x,y0,y1=None,n=240,excl=None):
    ys=np.nonzero(fg[:,x])[0];ys=ys[ys>=y0]
    if y1 is None:  # hem = end of the first contiguous fg run below y0
        y1=ys[0];
        while y1+1<a.shape[0] and fg[y1+1,x]:y1+=1
    t=(np.arange(n)+.5)/n;yy=np.clip((y0+t*(y1-y0+1)).astype(int),0,a.shape[0]-1)
    px=a[yy,x].astype(float);ok=np.ones(n,bool)
    if excl is not None:x0,ey0,x1,ey1=excl;ok=~((x>=x0)&(x<=x1)&(yy>=ey0)&(yy<=ey1))
    return px,ok,(y0,y1)
def line_profile(a,p0,p1,n=240):
    t=(np.arange(n)+.5)/n;xs=np.clip((p0[0]+t*(p1[0]-p0[0])).astype(int),0,a.shape[1]-1);ys=np.clip((p0[1]+t*(p1[1]-p0[1])).astype(int),0,a.shape[0]-1)
    return a[ys,xs].astype(float)
def vote(lbls,oks,k):
    L=np.stack(lbls);O=np.stack(oks)&(L>=0);out=np.full(L.shape[1],-1)
    for i in range(L.shape[1]):
        v=L[O[:,i],i]
        if len(v):out[i]=np.bincount(v,minlength=k).argmax()
    return out
def measure(key):
    a=np.asarray(Image.open(R+key+'.png').convert('RGB')).astype(float);fg=fgmask(a.astype(int))
    names=list(SEEDS[key]);seeds=[np.array(SEEDS[key][n],float) for n in names];k=len(names)
    prof={};samples=[];lines={}
    if key=='thrashers_home':
        g=TH;cr=g['crest']
        fr=[column_profile(a,fg,x,g['front']['y0'],g['front']['y1'],excl=cr) for x in g['front']['cols']]
        lines['front']=[(x,fr[i][2]) for i,x in enumerate(g['front']['cols'])]
        bk=fr  # front-only reference: back = front minus crest (documented)
        xs=np.arange(g['vpipe']['x0'],g['vpipe']['x1']+1);vp=a[g['vpipe']['y'],xs].astype(float)
        sl=[line_profile(a,(g['sleeve']['a'][0]+o,g['sleeve']['a'][1]),(g['sleeve']['b'][0]+o,g['sleeve']['b'][1])) for o in g['sleeve']['off']]
        so=[column_profile(a,fg,x,g['sock']['y0'],g['sock']['y1']) for x in g['sock']['cols']]
    else:
        dy=DY[key];g=T;cr=list(g['crest'][key])
        fr=[column_profile(a,fg,x,g['front']['y0']+dy,excl=cr) for x in g['front']['cols']]
        bk=[column_profile(a,fg,x,g['back']['y0']+dy) for x in g['back']['cols']]
        A0=np.array(g['sleeve']['a'])+[0,dy];B0=np.array(g['sleeve']['b'])+[0,dy];d=(B0-A0)/np.linalg.norm(B0-A0);nrm=np.array([-d[1],d[0]])
        sl=[line_profile(a,A0+o*nrm,B0+o*nrm) for o in g['sleeve']['off']]
        so=[column_profile(a,fg,x,g['sock']['y0']+dy,g['sock']['y1']+dy) for x in g['sock']['cols']]
        vp=None
    allpx=np.concatenate([p[0][p[1]] for p in fr+bk]+[p for p in sl]+[p[0] for p in so])
    lb=classify(allpx,names,seeds)
    meas={n:(np.median(allpx[lb==i],0) if (lb==i).sum()>5 else seeds[i]) for i,n in enumerate(names)}
    cols=[meas[n] for n in names]
    def bands(profs,minlen=.012):
        L=[classify(p[0],names,cols) for p in profs];O=[p[1] for p in profs];return [(t0,t1,names[c]) for t0,t1,c in runs(vote(L,O,k),minlen)]
    def lbands(ps,minlen=.012):
        L=[classify(p,names,cols) for p in ps];return [(t0,t1,names[c]) for t0,t1,c in runs(vote(L,[np.ones(len(p),bool) for p in ps],k),minlen)]
    spec=dict(key=key,colours={n:dict(measured=[int(v) for v in meas[n]],palette=vga(meas[n]),seed=list(SEEDS[key][n]),
              de_seed=round(float(de(np.array(SEEDS[key][n],float),meas[n])),1),de_palette=round(float(de(np.array(vga(meas[n]),float),meas[n])),2)) for n in names},
              front=bands(fr),back=bands(bk),sleeve=lbands(sl),sock=bands(so,.02))
    if key=='stars_alt':  # diagonal split: measure the two sleeve edges separately
        spec['sleeve_u0']=lbands([sl[0]],.05);spec['sleeve_u1']=lbands([sl[2]],.05)
    if vp is not None:spec['vpipe']=lbands([vp],.02)
    # crest: centre V on front (centre column hem), tight box
    cx=(cr[0]+cr[2])//2;y0=fr[0][2][0];hem=max(p[2][1] for p in fr)
    spec['crest']=dict(box=cr,v_centre=round(((cr[1]+cr[3])/2-y0)/(hem-y0),3))
    spec['lines']=dict(front=[(int(x),*map(int,p[2])) for x,p in zip(g['front']['cols'],fr)],sock=[(int(x),*map(int,p[2])) for x,p in zip(g['sock']['cols'],so)])
    if key!='thrashers_home':spec['lines']['back']=[(int(x),*map(int,p[2])) for x,p in zip(g['back']['cols'],bk)];spec['lines']['sleeve']=[list(map(float,A0)),list(map(float,B0))]
    spec['crest']['v_centre']=float(spec['crest']['v_centre']);spec['crest']['box']=[int(v) for v in cr]
    return spec
if __name__=='__main__':
    for k in (sys.argv[1:] or SEEDS):
        s=measure(k);json.dump(s,open(f'specs/{k}.json','w'),indent=1)
        print(k,{n:c['palette'] for n,c in s['colours'].items()});[print(' ',r,s[r]) for r in ('front','back','sleeve','sock','vpipe','sleeve_u0','sleeve_u1') if r in s];print(' crest',s['crest'])

# ---------------- 2D measurement (Stars star body, crests, goalie gear, gloves, stick) ----------------
from scipy.cluster.vq import kmeans2
def border_bg(a,cols,thr=18):
    """background = pixels near any of cols (Lab DE<thr) and 8-connected to the crop border."""
    near=np.min(np.stack([de(a,np.array(c,float)) for c in cols]),0)<thr
    lab_,n=ndi.label(near,np.ones((3,3)));edge=set(np.unique(np.r_[lab_[0],lab_[-1],lab_[:,0],lab_[:,-1]]))-{0}
    return np.isin(lab_,list(edge))
def palette_k(px,k,seed=0,merge=14):
    L=lab(px);np.random.seed(seed);c,l=kmeans2(L,k,minit='++',seed=seed)
    grp=[[i] for i in range(k) if (l==i).sum()>=max(3,.01*len(px))]
    while True:   # merge clusters closer than `merge` DE (shading of one material, not two colours)
        C=[np.median(px[np.isin(l,g)],0) for g in grp];best=None
        for a in range(len(C)):
            for b in range(a+1,len(C)):
                d=float(de(C[a],C[b]))
                if d<merge and (best is None or d<best[0]):best=(d,a,b)
        if best is None:return C
        _,a,b=best;grp[a]+=grp[b];del grp[b]
def grid_mode(a,fg,w,h,cols,bgcol=None,minfg=.4):
    """cell = most frequent palette colour among fg pixels (no averaging -> no invented colours)."""
    H,W=fg.shape;miss=[];lb=np.stack([de(a,np.array(c,float)) for c in cols],-1).argmin(-1);out=np.zeros((h,w,3),np.uint8)
    for j in range(h):
        for i in range(w):
            y0,y1=int(j*H/h),max(int((j+1)*H/h),int(j*H/h)+1);x0,x1=int(i*W/w),max(int((i+1)*W/w),int(i*W/w)+1)
            f=fg[y0:y1,x0:x1];l=lb[y0:y1,x0:x1][f]
            if bgcol is not None and (f.mean()<minfg or len(l)==0):out[j,i]=vga(bgcol)
            elif len(l)==0:out[j,i]=0;miss.append((j,i))
            else:out[j,i]=vga(cols[np.bincount(l).argmax()])
    for j,i in miss:   # empty cell (outside the gear silhouette): copy nearest filled cell
        d=[(abs(j-y)+abs(i-x),y,x) for y in range(h) for x in range(w) if (y,x) not in miss];_,y,x=min(d);out[j,i]=out[y,x]
    return out
def crest_measure(key,spec,w):
    a=np.asarray(Image.open(R+key+'.png').convert('RGB')).astype(float);x0,y0,x1,y1=spec['crest']['box'];c=a[y0:y1,x0:x1]
    # background = jersey band colours under the crest box (by measured V range), border-connected, tight DE
    hy0=spec['lines']['front'][0][1];hem=max(l[2] for l in spec['lines']['front']);v0=(y0-hy0)/(hem-hy0);v1=(y1-hy0)/(hem-hy0)
    under=[spec['colours'][n]['measured'] for t0,t1,n in spec['front'] if t1>v0 and t0<v1]
    bg=border_bg(c,under,10);fg=~bg
    cols=palette_k(c[fg],4)
    ys,xs=np.nonzero(fg);c=c[ys.min():ys.max()+1,xs.min():xs.max()+1];fg=fg[ys.min():ys.max()+1,xs.min():xs.max()+1]   # tight crop
    h=int(np.clip(round(w*c.shape[0]/c.shape[1]),2,6))
    band=band_at(spec['front'],spec['crest']['v_centre']);bgc=spec['colours'][band]['measured']
    return grid_mode(c,fg,w,h,cols,bgc,minfg=.3),cols,fg.mean()
def band_at(bands,v):
    for t0,t1,n in bands:
        if t0<=v<t1:return n
    return bands[-1][2]
def stars_body(spec,w=12,h=15):
    a=np.asarray(Image.open(R+'stars_alt.png').convert('RGB')).astype(float);dy=DY['stars_alt']
    x0,x1=108,218;y0=T['front']['y0']+dy;y1=max(l[2] for l in spec['lines']['front'])
    c=a[y0:y1+1,x0:x1+1];names=list(spec['colours']);cols=[np.array(spec['colours'][n]['measured'],float) for n in names]
    lb=classify(c,names,cols);bi=names.index('black');gi=names.index('green');wi=names.index('white')
    lb[lb<0]=bi                                                 # grey STARS wordmark/outlines -> black body
    cx0,cy0,cx1,cy1=spec['crest']['box'];lb[cy0-y0:cy1-y0,cx0-x0:cx1-x0]=bi   # crest area is on the black body
    out=np.zeros((h,w),int)
    for j in range(h):
        for i in range(w):
            blk=lb[int(j*c.shape[0]/h):int((j+1)*c.shape[0]/h),int(i*c.shape[1]/w):int((i+1)*c.shape[1]/w)]
            out[j,i]=gi if (blk==gi).sum()>=(blk==bi).sum() else bi   # white outline is <1 texel: re-added below
    o2=out.copy()
    for j in range(h):
        for i in range(w):
            if out[j,i]==gi and any(0<=j+dj<h and 0<=i+di<w and out[j+dj,i+di]==bi for dj,di in ((-1,0),(0,-1),(0,1))):o2[j,i]=wi
    return [[names[v] for v in row] for row in o2]
GEAR={  # (file, box, capacity key, k colours, bg mode)
 'pad':('fuhr/01M5MRFHEP7ZE9AEVGX9BZT8FR.jpg',None,'pad',5,None),
 'catcher':('fuhr/01M5MRFJX02B6RT3TM0527C7EN.jpg',None,'catcher',4,None),
 'goalie_mask':('fuhr/01M5MRFKW36F0J1BEBW2JQERHV.jpg',(40,0,472,470),'goalie_mask',5,None),
 'blocker':('fuhr/01M5MRFNWDGJWSDNAVSNM3MBM1.jpg',(0,0,250,368),'blocker',4,None),
 'glove_ottawa':('gloves/01M5MRDPFTKJ1TMF3BHZ6CFBNF.webp',(515,190,870,810),'glove',4,'grey'),
 'glove_redblack':('gloves/01M5MRDQNEDAKG7W2NDEFM1MBP.webp',(515,190,870,810),'glove',4,'grey'),
 'glove_edmonton':('gloves/01M5MRDRSA0AGAYM9ZGBEP24A8.webp',(515,190,870,810),'glove',4,'grey')}
def gear_measure(nm,cap):
    f,box,ck,k,bgm=GEAR[nm];im=Image.open(R+f).convert('RGB')
    if box:im=im.crop(box)
    im.thumbnail((240,240));a=np.asarray(im).astype(float)
    if bgm=='grey':
        sat=a.max(2)-a.min(2);v=a.mean(2);g=(sat<14)&(v>45)&(v<200);lab_,n=ndi.label(g)
        edge=set(np.unique(np.r_[lab_[0],lab_[-1],lab_[:,0],lab_[:,-1]]))-{0};fg=~np.isin(lab_,list(edge))
        ys,xs=np.nonzero(fg);a=a[ys.min():ys.max()+1,xs.min():xs.max()+1];fg=fg[ys.min():ys.max()+1,xs.min():xs.max()+1]
    else:fg=np.ones(a.shape[:2],bool)
    cols=palette_k(a[fg],k);w,h=cap[ck]
    return grid_mode(a,fg,w,h,cols),cols,(f,box)
def stick_measure(L):
    im=Image.open(R+'stick_mcdavid.png').convert('RGB');a=np.asarray(im).astype(float)
    P=[(952,615),(1003,1950),(1232,2228)]   # knob -> heel -> toe along the stick (hand-placed on the photo)
    seg=[np.linalg.norm(np.subtract(P[i+1],P[i])) for i in range(2)];tot=sum(seg);px=[]
    for t in (np.arange(L*8)+.5)/(L*8):
        s=t*tot;i=0 if s<seg[0] else 1;u=(s-(0 if i==0 else seg[0]))/seg[i];p=np.add(P[i],u*np.subtract(P[i+1],P[i]))
        d=np.subtract(P[i+1],P[i])/seg[i];n=np.array([-d[1],d[0]])
        px.append([a[int(q[1]),int(q[0])] for q in (p+o*n for o in (-4,-2,0,2,4))])
    px=np.array(px);cols=palette_k(px.reshape(-1,3),4);lb=np.stack([de(px,np.array(c,float)) for c in cols],-1).argmin(-1)
    out=np.zeros((L,1,3),np.uint8)
    for j in range(L):out[j,0]=vga(cols[np.bincount(lb[j*8:(j+1)*8].ravel()).argmax()])
    return out,cols
# ---------------- stick v2 (new McDavid photo): de-glare then measure ----------------
STICK2=dict(file='stick_mcdavid2.jpg',P=[(395,64),(357,100),(248,200),(140,300),(100,333),(85,338),(12,334)],heel=5,half=5)  # traced from darkest-pixel row centres
def _axis(P,n):
    seg=[np.linalg.norm(np.subtract(P[i+1],P[i])) for i in range(len(P)-1)];tot=sum(seg);out=[]
    for t in (np.arange(n)+.5)/n:
        s=t*tot;i=0
        while i<len(seg)-1 and s>seg[i]:s-=seg[i];i+=1
        d=np.subtract(P[i+1],P[i])/seg[i];out.append((np.add(P[i],s*d),np.array([-d[1],d[0]]),i))
    return out,seg
def deglare_stick(hi=95,nb_dark=55,r=2):
    """Specular glare on the black shaft: bright (v>hi), low-saturation pixels with NO dark pixel within r px.
    Printed CCM/JETSPEED strokes are thin and always border black shaft, so they survive; glare is a smooth blob.
    Glare pixels -> local shaft base colour (median of dark shaft pixels within +-15 px along the axis). Knob tape skipped."""
    im=np.asarray(Image.open(R+STICK2['file']).convert('RGB')).astype(float);out=im.copy();P=STICK2['P']
    ax,_=_axis(P[:STICK2['heel']+1],420);hw=STICK2['half']
    sat=im.max(2)-im.min(2);v=im.mean(2);mn=ndi.minimum_filter(v,size=2*r+1)
    glare=(v>hi)&(sat<70)&(mn>nb_dark);n=0;t0=int(.07*len(ax))
    for k,(p,nv,_) in enumerate(ax):
        if k<t0:continue
        c=[(int(round(p[1]+o*nv[1])),int(round(p[0]+o*nv[0]))) for o in range(-3,4)]   # stay inside the ~11 px shaft (no background)
        g=[(y,x) for y,x in c if glare[y,x]]
        if not g:continue
        loc=[im[int(round(q[1]+o*m[1])),int(round(q[0]+o*m[0]))] for q,m,_ in ax[max(0,k-15):k+16] for o in range(-2,3)]
        loc=[x for x in loc if x.mean()<60];base=np.median(loc,0) if loc else np.array([22,22,24.])
        for y,x in g:out[y,x]=base;n+=1
    return out.astype(np.uint8),dict(replaced_px=n)
def stick_measure2(L,k=7):
    a,info=deglare_stick();a=a.astype(float);ax,_=_axis(STICK2['P'],L*8)
    px=np.array([[a[int(round(p[1]+o*n[1])),int(round(p[0]+o*n[0]))] for o in (-3,-1,0,1,3)] for p,n,_ in ax])
    cols=palette_k(px.reshape(-1,3),k);lb=np.stack([de(px,np.array(c,float)) for c in cols],-1).argmin(-1)
    out=np.zeros((L,1,3),np.uint8)
    w=np.array([2.5 if np.mean(c)>150 else 1 for c in cols])   # thin printed graphics (CCM/JETSPEED) up-weighted vs black shaft
    for j in range(L):out[j,0]=vga(cols[(np.bincount(lb[j*8:(j+1)*8].ravel(),minlength=len(cols))*(w if j>0 else 1)).argmax()])   # no graphics weighting on the knob tape cell
    return out,cols,info,a.astype(np.uint8)
