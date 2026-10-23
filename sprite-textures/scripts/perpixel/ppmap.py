# Per-pixel texture map (v2 PoC2). Every sprite pixel -> exactly one whole texel; no resampling.
# Texel address = (part, side, half, band, row, col):
#   part  torso | sleeve | pants | sock | helmet | crest      side  R/L for limbs (player's own side; swapped in back views)
#   half  front/back (side views: split at the part's mid column, leading half=front)
#   band  the game's colour zone family (yoke 1, arm stripe 2, pants stripe 1, ...) from the palette index
#   row   8-conn geodesic distance inside the band from its proximal edge (the edge touching the previous band / parent)
#   col   rank of the pixel by screen x (by y for horizontal limbs) among band pixels with the same row; mirrored in back views
# Crest: indices 192..244 are the game's crest grid -> texel (crest row, crest col) directly.
import sys,json,collections,numpy as np;sys.path.insert(0,'.')
from scipy import ndimage as ndi
from lib import frame,ZN,H
from parts import segment,P,GOALIE
DT=json.load(open('poc/dirtable.json'))
K8=np.ones((3,3),bool)
CREST=[i for r in (192,208,224,240) for i in range(r,r+5)]
def fam(i):
    nm=ZN.get(str(i),'')
    for s in (' light',' medium',' dark'):
        if nm.endswith(s):return nm[:-len(s)],s.strip()
    if nm=='pants dark':return 'pants','dark'
    if nm=='helmet dark':return 'helmet','dark'
    return (nm or ('crest' if i in CREST else str(i))),'flat'
CHAIN={'torso':['yoke corner','shoulder patch','yoke 1','yoke 2','yoke 3','jersey','waist 1 odd','waist 1 even','waist 1 hidden','waist 2','waist 3'],
       'sleeve':['upper arm','arm stripe 1','arm stripe 2','arm stripe 3','forearm'],
       'pants':['pants','pants stripe 1','pants stripe 2'],'sock':['socks','socks stripe 1','socks stripe 2'],'helmet':['helmet']}
PART_OF={b:k for k,v in CHAIN.items() for b in v}
PARENT={'torso':'helmet','sleeve':'torso','pants':'torso','sock':'pants','helmet':None}
def direction(n):
    ent=DT['table'].get(str(n),[]);ds=sorted({e[1] for e in ent})
    if not ent:return None,ds
    if len(ds)==8:return 4,ds
    return collections.Counter(e[1] for e in ent).most_common(1)[0][0],ds
def facing_of(d):return 'front' if d in (3,4,5) else 'back' if d in (0,1,7) else 'side'
def player_frames():
    out=[]
    for n in range(1,len(H)+1):
        if n in GOALIE or n not in {int(k) for k in DT['table']}:continue
        if any(a.startswith('SPAref') or a.startswith('SPAg') and a not in('SPAglide','SPAglideback') for a,*_ in DT['table'][str(n)]):continue
        p=frame(n)
        if np.isin(p,list(range(159,177))).sum()<10:continue
        out.append(n)
    return out
def geod(mask,seed):
    d=np.full(mask.shape,-1);cur=seed&mask;d[cur]=0;k=0
    while cur.any():
        k+=1;cur=ndi.binary_dilation(cur,K8)&mask&(d<0);d[cur]=k
    return d
def address(n):
    """returns dict (y,x)->key, plus info. key=(part,side,half,band,row,col) or ('crest',r,c)"""
    p=frame(n);part,_=segment(n,p);d,ds=direction(n);f=facing_of(d) if d is not None else 'front'
    band=np.full(p.shape,'',object)
    for i in np.unique(p):
        b=fam(int(i))[0]
        if b in PART_OF:band[p==i]=b
    body=np.isin(part,[P['torso'],P['crest'],P['shoulder_patch'],P['sleeve'],P['pants'],P['sock'],P['helmet']])
    band[~body]=''
    pk=np.vectorize(lambda b:PART_OF.get(b,''))(band) if (band!='').any() else band
    T=(pk=='torso')|np.isin(p,CREST);tx=np.nonzero(T)[1].mean() if T.any() else p.shape[1]/2
    keys={}
    for pn in CHAIN:
        PM=pk==pn
        if not PM.any():continue
        lab,k=ndi.label(PM,K8) if pn in('sleeve','sock') else (PM.astype(int),1)
        for c in range(1,k+1):
            cm=lab==c
            if pn in('sleeve','sock'):
                left=np.nonzero(cm)[1].mean()<tx;side='R' if (left if f!='back' else not left) else 'L'
            else:side='-'
            ys,xs=np.nonzero(cm);vert=np.ptp(ys)>=np.ptp(xs)
            mid=(xs.min()+xs.max())/2
            par=(pk==PARENT[pn]) if PARENT[pn] else np.zeros_like(cm)
            if pn=='torso':par=par|(part==P['skin'])
            prev=par
            for b in CHAIN[pn]:
                bm=cm&(band==b)
                if not bm.any():continue
                seed=bm&ndi.binary_dilation(prev|(cm&~bm&np.isin(band,CHAIN[pn][:CHAIN[pn].index(b)])),K8)
                if not seed.any():
                    by=np.nonzero(bm)[0];seed=bm.copy();seed[by.max()+1:]=False;seed[:by.min()]=False
                    seed=bm&(np.arange(p.shape[0])[:,None]==by.min())
                g=geod(bm,seed);lab2,k2=ndi.label(bm&(g<0),K8)
                while (g<0).any()&bm.any():   # disconnected pieces of the band: seed each at its top row
                    r=bm&(g<0)
                    if not r.any():break
                    ry=np.nonzero(r)[0].min();s2=r&(np.arange(p.shape[0])[:,None]==ry);g2=geod(r,s2);g[g2>=0]=g2[g2>=0]
                for y,x in zip(*np.nonzero(bm)):
                    half=f if f!='side' else None
                    if half is None:half='front' if ((x<mid)==(d==6)) else 'back'
                    keys[(y,x)]=[pn,side,half,b,int(g[y,x]),x if vert else y]
                prev=prev|bm
    # col = rank among same (pn,side,half,b,row), ordered by screen coord; mirrored for back views
    grp=collections.defaultdict(list)
    for yx,k in keys.items():grp[tuple(k[:5])].append((k[5],yx))
    out={}
    for g,l in grp.items():
        l.sort(reverse=(g[2]=='back'))
        for r,(_,yx) in enumerate(l):out[yx]=g+(r,)
    for y,x in zip(*np.nonzero(np.isin(p,CREST))):
        i=int(p[y,x]);out[(y,x)]=('crest',(i-192)//16,(i-192)%16)
    return p,out,dict(dir=d,dirs=ds,facing=f)
