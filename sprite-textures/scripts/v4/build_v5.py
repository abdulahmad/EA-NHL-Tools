"""v5: per Abdul's v4 review. Fronts, socks (all teams), Stars back and Thrashers sleeves are resampled DIRECTLY from the
reference photo (k-means palette snapped to the team palette, per-cell mode, no crest cut/paste, no stripe re-layout).
Backs and sleeves keep the v4 measured specs (approved) minus mis-measured collar slivers. Gear: blocker/mask symmetrised."""
import json,numpy as np,measure_ref as M,build_v4 as BV
from PIL import Image
CAP=BV.CAP
FRONT=dict(  # torso box from the photo, cx = crest centre; right half mirrored from left outside the crest (back jersey overlaps it)
 canadiens_babyblue=dict(box=(110,12,214,121)),wild_home=dict(box=(115,34,219,145)),blackhawks_alt=dict(box=(112,10,216,118)),
 panthers_home=dict(box=(116,34,220,145)),stars_alt=dict(box=(115,22,219,136)),thrashers_home=dict(box=(43,37,81,86)))
SOCK=dict(canadiens_babyblue=(63,90,89,186),wild_home=(64,114,90,211),blackhawks_alt=(63,90,90,186),panthers_home=(63,114,89,212),
 stars_alt=(63,102,89,200),thrashers_home=(48,120,57,160))
STARS_BACK=dict(box=(250,62,355,183),num=(268,76,337,143))
THR_SLEEVE=dict(sleeve=(82,38,88,83),sleeve_b=(36,38,42,83))   # player's left arm = viewer's right
def ref(key):return np.asarray(Image.open(M.R+key+'.png').convert('RGB')).astype(float)
def snap_pal(s,cols,thr=12):
    out=[]
    for c in cols:
        n=BV.nearest(s,c);d=float(M.de(np.array(s['colours'][n]['measured'],float),np.array(c,float)))
        out.append(list(BV.col(s,n)) if d<thr else M.vga(c))
    return out
def resample(s,crop,w,h,k=7):
    px=crop.reshape(-1,3);cols=snap_pal(s,M.palette_k(px,k));fg=np.ones(crop.shape[:2],bool)
    return M.grid_mode(crop,fg,w,h,cols)
def mirror_lr(c,keep=None):
    """copy left half onto right half (symmetric body), except pixels inside `keep`=(x0,y0,x1,y1) in crop coords."""
    c=c.copy();W=c.shape[1];m=np.ones(c.shape[:2],bool)
    if keep:x0,y0,x1,y1=keep;m[max(0,y0):y1,max(0,x0):x1]=False
    for x in range((W+1)//2,W):sel=m[:,x];c[sel,x]=c[sel,W-1-x]
    return c
def front(key,s,w,h):
    a=ref(key);x0,y0,x1,y1=FRONT[key]['box'];c=a[y0:y1,x0:x1]
    cx0,cy0,cx1,cy1=s['crest']['box'];c=mirror_lr(c,(cx0-x0,cy0-y0,cx1-x0,cy1-y0))
    return resample(s,c,w,h)
def thr_back(s,w,h):
    a=ref('thrashers_home');x0,y0,x1,y1=FRONT['thrashers_home']['box'];c=a[y0:y1,x0:x1].copy()
    cx0,cy0,cx1,cy1=s['crest']['box'];c[cy0-y0:cy1-y0,cx0-x0:cx1-x0]=s['colours']['lightblue']['measured'];c=mirror_lr(c)
    return resample(s,c,w,h)
def stars_back(s,w,h):
    a=ref('stars_alt');x0,y0,x1,y1=STARS_BACK['box'];c=a[y0:y1,x0:x1].copy();n0,n1,n2,n3=STARS_BACK['num']
    c[n1-y0:n3-y0,n0-x0:n2-x0]=s['colours']['black']['measured']   # drop name/number (player-specific)
    return resample(s,mirror_lr(c),w,h)
def strip_collar(bands,maxv=.06):
    """drop a thin band at the very top of the back (collar/yoke edge mis-read as a stripe)."""
    b=[list(x) for x in bands]
    if len(b)>1 and b[0][1]<=maxv:b[1][0]=0.;b=b[1:]
    return b
def build_team(key,hi=False):
    s,F=BV.build_team(key,hi=False)
    w,h=CAP['torso_front'];F['torso_front']=F['torso_front_crest']=front(key,s,w,h)
    if key=='stars_alt':F['torso_back']=stars_back(s,w,h)
    elif key=='thrashers_home':F['torso_back']=thr_back(s,w,h)
    else:F['torso_back']=BV.band_img(s,strip_collar(s['back']),w,h)
    a=ref(key);w,h=CAP['sock'];x0,y0,x1,y1=SOCK[key]
    sk=resample(s,a[y0:y1,x0:x1],w,h,k=6)   # socks wrap the leg: one colour per row (row mode) -> no garter-tab/seam specks
    for j in range(h):
        r=[tuple(c) for c in sk[j]];sk[j,:]=max(set(r),key=r.count)
    F['sock']=F['sock_b']=sk
    if key=='thrashers_home':
        w,h=CAP['sleeve']
        for nm,(x0,y0,x1,y1) in THR_SLEEVE.items():F[nm]=resample(s,a[y0:y1,x0:x1],w,h,k=6)
    return s,F
def sym_gear(G):
    m=G['goalie_mask'].copy();W=m.shape[1]
    for x in range((W+1)//2,W):m[:,x]=m[:,W-1-x]
    G['goalie_mask']=m
    b=G['blocker'].copy();H,W=b.shape[:2]
    for x in range((W+1)//2,W):b[:,x]=b[:,W-1-x]
    ring=b[1:-1,0].copy();corner=b[0,0].copy()            # left edge outline colour -> all four sides
    out=np.array([tuple(c) for c in ring]);oc=max(set(map(tuple,out)),key=list(map(tuple,out)).count)
    b[0,:]=b[-1,:]=oc;b[:,0]=b[:,-1]=oc;b[0,0]=b[0,-1]=b[-1,0]=b[-1,-1]=corner
    G['blocker']=b;return G
