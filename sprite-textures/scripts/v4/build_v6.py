"""v6 (review of v5): band-team fronts are built exactly like the backs (measured column-profile band spec -> straight rows),
and the photo's crest pixels are dropped in at their TRUE position (no crop/re-centre, no mirroring). Pad back added; mask chin orange."""
import json,numpy as np,measure_ref as M,build_v4 as BV,build_v5 as B5
from PIL import Image
CAP=BV.CAP;BAND_TEAMS=('canadiens_babyblue','wild_home','blackhawks_alt','panthers_home')
def front(key,s,w,h):
    a=BV.band_img(s,s['front'],w,h)          # identical method to torso_back -> straight horizontal stripes
    if key=='blackhawks_alt':return a          # CHICAGO wordmark: 1 px letters do not survive 12x15 -> plain black band (as on the back)
    ref=B5.ref(key);fl=s['lines']['front'];y0=min(l[1] for l in fl);hem=max(l[2] for l in fl)
    x0,_,x1,_=B5.FRONT[key]['box'];cx0,cy0,cx1,cy1=s['crest']['box']
    # crest cells: where the photo cell's mode colour is a non-band colour (ΔE>20 from every band colour) -> photo colour
    band=[np.array(s['colours'][n]['measured'],float) for n in s['colours']]
    for j in range(h):
        ya,yb=y0+(hem-y0)*j/h,y0+(hem-y0)*(j+1)/h
        if yb<cy0 or ya>cy1:continue
        for i in range(w):
            xa,xb=x0+(x1-x0)*i/w,x0+(x1-x0)*(i+1)/w
            if xb<cx0 or xa>cx1:continue
            px=ref[int(max(ya,cy0)):int(np.ceil(min(yb,cy1))),int(max(xa,cx0)):int(np.ceil(min(xb,cx1)))].reshape(-1,3)
            if len(px)<2:continue
            d=np.stack([M.de(px,b) for b in band],-1).min(-1);off=px[d>20]
            if len(off)>=.5*len(px):a[j,i]=M.vga(np.median(off,0))
            elif len(px):   # band-coloured crest pixels (e.g. CH white/red on blue) -> majority band colour of the cell
                lb=np.stack([M.de(px,b) for b in band],-1).argmin(-1);n=list(s['colours'])[np.bincount(lb).argmax()];a[j,i]=BV.col(s,n)
    return a
def build_team(key):
    s,F=B5.build_team(key)
    if key in BAND_TEAMS:
        w,h=CAP['torso_front'];F['torso_front']=F['torso_front_crest']=front(key,s,w,h)
    return s,F
PAD_BACK=('fuhr/01M5MRFR9CQNVZJBX1ATJ6QVAE.jpg',(0,0,156,112))
def pad_back(cap):
    f,box=PAD_BACK;im=Image.open(M.R+f).convert('RGB').crop(box).transpose(Image.ROTATE_270)   # strap side, knee end up
    a=np.asarray(im).astype(float);w,h=cap['pad'];cols=M.palette_k(a.reshape(-1,3),6,merge=30)
    return M.grid_mode(a,np.ones(a.shape[:2],bool),w,h,cols)
def gear_fix(G):
    G=B5.sym_gear(G);m=G['goalie_mask'];H,W=m.shape[:2]
    org=[tuple(c) for c in m.reshape(-1,3) if c[0]>180 and c[1]<120 and c[2]<80]   # mask's own orange
    m[H-1,W//2]=org[0] if org else (240,100,20);G['goalie_mask']=m
    G['pad_b']=pad_back(BV.GEARCAP);return G
