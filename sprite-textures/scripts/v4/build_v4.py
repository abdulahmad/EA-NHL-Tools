"""v4: flat textures from measured specs (specs/<team>.json, written by measure_ref.py) -> capacity flats, 512 atlases,
on-sprite grids, reference|atlas|flat sheets, metrics. Replaces the hand-typed jerseys.D band table."""
import uv,json,glob,os,numpy as np
import jerseys
from jerseys import *
from lib import H
import measure_ref as M
uv.WRAP_LIMBS=uv.SIDE_FIX=uv.FRONT_SMOOTH=uv.GLOVE_UV=uv.PAD_UV=uv.STICK_UV=True;uv.ELEV=40
CAP={k:tuple(v) for k,v in json.load(open('data/capacity.json')).items()}
O='v4/';os.makedirs(O,exist_ok=True)
def alloc(bands,N):
    """Rows per band with NO overlap: every band >=1 row (if N allows), the rest by largest remainder; extra rows taken
    from the widest bands. Returns per-row band index."""
    L=[(b[1]-b[0])*N for b in bands];r=[max(1,int(np.floor(x))) for x in L]
    while sum(r)>N:
        c=[i for i in range(len(r)) if r[i]>1] or list(range(len(r)));i=max(c,key=lambda i:(r[i]-L[i],r[i]));r[i]-=1
    order=sorted(range(len(L)),key=lambda i:-(L[i]-np.floor(L[i])))
    k=0
    while sum(r)<N:r[order[k%len(r)]]+=1;k+=1
    return [i for i,n in enumerate(r) for _ in range(n)]
def col(spec,n):return tuple(spec['colours'][n]['palette'])
def band_img(spec,bands,w,h):
    rows=alloc(bands,h);a=np.zeros((h,w,3),np.uint8)
    for y,i in enumerate(rows):a[y,:]=col(spec,bands[i][2])
    return a
def diag_img(spec,b0,b1,w,h):
    """diagonal split: band boundaries interpolated across U between the two measured sleeve edges (same colour sequence)."""
    seq0=[b[2] for b in b0];seq1=[b[2] for b in b1]
    if seq0!=seq1:   # keep the longest edge's runs that follow the other edge's colour order; absorb the rest into neighbours
        if len(b0)<len(b1):b0,b1=b1,b0;sw=True
        else:sw=False
        seq=[b[2] for b in b1];keep=[];j=0
        for b in b0:
            if j<len(seq) and b[2]==seq[j]:keep.append(list(b));j+=1
            elif keep:keep[-1][1]=b[1]
        if j==len(seq):
            for i in range(1,len(keep)):keep[i][0]=keep[i-1][1]
            keep[0][0]=0;keep[-1][1]=1;b0=[tuple(k) for k in keep]
        else:b0=b1
        if sw:b0,b1=b1,b0
    a=np.zeros((h,w,3),np.uint8)
    for x in range(w):
        u=(x+.5)/w;bl=[(p[0]*(1-u)+q[0]*u,p[1]*(1-u)+q[1]*u,p[2]) for p,q in zip(b0,b1)];a[:,x]=band_img(spec,bl,1,h)[:,0]
    return a
def nearest(spec,rgb):return min(spec['colours'],key=lambda n:float(M.de(np.array(spec['colours'][n]['measured'],float),np.array(rgb,float))))
def build_team(key,hi=False):
    """hi=False: capacity flats; hi=True: same spec rendered at full 512-atlas size."""
    s=json.load(open(f'specs/{key}.json'));old=jerseys.D[key];F={}
    sz=lambda nm:(ATLAS[nm][2],ATLAS[nm][3]) if hi else CAP[nm]
    for nm in ('torso_front','torso_back'):
        w,h=sz(nm)
        if key=='stars_alt':
            body=M.stars_body(s,w,h) if not hi else M.stars_body(s,40,40);a=np.array([[col(s,c) for c in r] for r in body],np.uint8)
            if hi:a=np.asarray(Image.fromarray(a).resize((w,h),Image.NEAREST))
        else:a=band_img(s,s['front' if nm=='torso_front' else 'back'],w,h)
        if 'vpipe' in s:
            vp=band_img(s,s['vpipe'],1,w)[:,0];y0=int(round(.12*h))
            for x in range(w):
                if tuple(vp[x])!=col(s,'lightblue'):a[y0:,x]=vp[x]
        F[nm]=a
    w,h=sz('sleeve');F['sleeve']=F['sleeve_b']=diag_img(s,s['sleeve_u0'],s['sleeve_u1'],w,h) if 'sleeve_u0' in s else band_img(s,s['sleeve'],w,h)
    w,h=sz('sock');F['sock']=F['sock_b']=band_img(s,s['sock'],w,h)
    w,h=sz('pants');a=np.zeros((h,w,3),np.uint8);a[:]=col(s,nearest(s,old['pants']))
    if old['pstripe']:t=max(1,round(w*.07));a[:,:t]=a[:,w-t:]=col(s,nearest(s,old['pstripe']))
    F['pants']=a
    for nm,src in (('helmet','helmet'),('glove','glove')):w,h=sz(nm);a=np.zeros((h,w,3),np.uint8);a[:]=col(s,nearest(s,old[src]));F[nm]=a
    w,h=sz('skate');F['skate']=np.full((h,w,3),(24,24,24),np.uint8)
    # crest
    cw=CAP['crest'][0]
    if key=='blackhawks_alt':   # simplified CHICAGO wordmark: white letters with red edge on the black band
        R_,W_,K_=col(s,'red'),col(s,'white'),col(s,'black');cr=np.array([[R_]+[W_]*(cw-2)+[R_]],np.uint8)   # 1 texel tall: the black band is only ~3 rows at capacity
    else:cr,_,_=M.crest_measure(key,s,cw)
    F['crest']=cr
    if not hi:  # paste crest on front torso centred on its measured V (on the chest band)
        t=F['torso_front'].copy();h,w=t.shape[:2];ch,cw2=cr.shape[:2];y=int(round(s['crest']['v_centre']*h-ch/2));x=(w-cw2)//2
        y=max(0,min(h-ch,y));t[y:y+ch,x:x+cw2]=cr;F['torso_front_crest']=t
    return s,F
GEARCAP=dict(CAP,glove=(6,7))
def build_gear():
    G={};P={}
    for nm in M.GEAR:a,cols,src=M.gear_measure(nm,GEARCAP);G[nm]=a;P[nm]=cols
    st,cols,info,deg=M.stick_measure2(CAP['stick'][1]);G['stick']=st;P['stick']=cols;G['_stick_deglared']=deg;G['_stick_info']=info
    return G,P
def atlas_from(F,bg=(255,0,255)):
    A=Image.new('RGB',(512,512),bg)
    for nm,(x,y,w,h) in ATLAS.items():
        k='torso_front_crest' if nm=='torso_front' and 'torso_front_crest' in F else nm
        if k in F:A.paste(Image.fromarray(F[k]).resize((w,h),Image.NEAREST),(x,y))
    return A
def as_D(key,s):
    """jerseys.D-compatible entry so render3's thin-band isolines use the measured bands."""
    tb=lambda bl:[(a,b,col(s,n)) for a,b,n in bl]
    return dict(jerseys.D[key],yoke=None,torso=tb(s['front']) if key!='stars_alt' else [],sleeve=tb(s['sleeve']),sock=tb(s['sock']))
