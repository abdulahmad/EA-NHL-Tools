"""v7 (review of v6).
Jerseys: for teams whose front and back carry the same stripe set (Chicago, Montreal) the front stripe rows ARE the back's
measured rows; only crest-only cells (mostly non-stripe colour) are overlaid at the crest's true photo position.
Gear: no palette reduction. Fine k-means (k=10, merge dE<6) is used only to pick each cell's dominant material; the cell
colour is the median of that material's own photo pixels in the cell (VGA 6-bit) -> photo shading kept, small-area colours (catcher blue) kept."""
import json,numpy as np,measure_ref as M,build_v4 as BV,build_v5 as B5,build_v6 as B6
from scipy import ndimage as ndi
from PIL import Image
CAP=BV.CAP;SAME_STRIPES=('blackhawks_alt','canadiens_babyblue')
def crest_overlay(key,s,a,thr=.5):
    """cells inside the crest box whose photo pixels are >=thr non-stripe colour (dE>20 from every team colour) -> their median."""
    if key=='blackhawks_alt':return a,[]   # CHICAGO is 1-px lettering on the black band: nothing survives 12x15
    h,w=a.shape[:2];ref=B5.ref(key);fl=s['lines']['front'];y0=min(l[1] for l in fl);hem=max(l[2] for l in fl)
    x0,_,x1,_=B5.FRONT[key]['box'];cx0,cy0,cx1,cy1=s['crest']['box'];band=[np.array(c['measured'],float) for c in s['colours'].values()];hit=[]
    # register the crest to the BACK stripe frame: the stripe the crest sits on in the photo (front spec) is matched to the
    # same-colour stripe in the back spec, and the crest is shifted by the difference of their centres
    vc=s['crest']['v_centre'];fb=[b for b in s['front'] if b[0]<=vc<b[1]][0]
    bb=min([b for b in s['back'] if b[2]==fb[2]],key=lambda b:abs((b[0]+b[1])/2-(fb[0]+fb[1])/2));dv=(bb[0]+bb[1])/2-(fb[0]+fb[1])/2
    for j in range(h):
        ya,yb=y0+(hem-y0)*(j/h-dv),y0+(hem-y0)*((j+1)/h-dv)
        for i in range(w):
            xa,xb=x0+(x1-x0)*i/w,x0+(x1-x0)*(i+1)/w
            if yb<=cy0 or ya>=cy1 or xb<=cx0 or xa>=cx1:continue
            px=ref[int(max(ya,cy0)):int(np.ceil(min(yb,cy1))),int(max(xa,cx0)):int(np.ceil(min(xb,cx1)))].reshape(-1,3)
            if len(px)<2:continue
            off=px[np.stack([M.de(px,b) for b in band],-1).min(-1)>20]
            if len(off)>=thr*len(px):a[j,i]=M.vga(np.median(off,0));hit.append((j,i))
    print(key,'crest dv',round(dv,3),'cells',hit);return a,hit
def build_team(key):
    s,F=B6.build_team(key)
    if key in SAME_STRIPES:
        w,h=CAP['torso_front'];a=BV.band_img(s,B5.strip_collar(s['back']),w,h)   # exactly the back's rows
        a,_=crest_overlay(key,s,a);F['torso_front']=F['torso_front_crest']=a
    return s,F
def grid_shaded(a,fg,w,h,k=10,merge=6):
    cols=M.palette_k(a[fg],k,merge=merge);lb=np.stack([M.de(a,np.array(c,float)) for c in cols],-1).argmin(-1)
    H,W=fg.shape;out=np.zeros((h,w,3),np.uint8);miss=[]
    for j in range(h):
        for i in range(w):
            y0,y1=int(j*H/h),max(int((j+1)*H/h),int(j*H/h)+1);x0,x1=int(i*W/w),max(int((i+1)*W/w),int(i*W/w)+1)
            f=fg[y0:y1,x0:x1];l=lb[y0:y1,x0:x1][f];p=a[y0:y1,x0:x1][f]
            if len(l)==0:miss.append((j,i));continue
            m=np.bincount(l).argmax();out[j,i]=M.vga(np.median(p[l==m],0))
    for j,i in miss:
        d=[(abs(j-y)+abs(i-x),y,x) for y in range(h) for x in range(w) if (y,x) not in miss];_,y,x=min(d);out[j,i]=out[y,x]
    return out,cols
def gear_measure(nm,cap):
    f,box,ck,k,bgm=M.GEAR[nm];im=Image.open(M.R+f).convert('RGB')
    if box:im=im.crop(box)
    im.thumbnail((240,240));a=np.asarray(im).astype(float)
    if bgm=='grey':
        sat=a.max(2)-a.min(2);v=a.mean(2);g=(sat<14)&(v>45)&(v<200);lab_,n=ndi.label(g)
        edge=set(np.unique(np.r_[lab_[0],lab_[-1],lab_[:,0],lab_[:,-1]]))-{0};fg=~np.isin(lab_,list(edge))
        ys,xs=np.nonzero(fg);a=a[ys.min():ys.max()+1,xs.min():xs.max()+1];fg=fg[ys.min():ys.max()+1,xs.min():xs.max()+1]
    else:fg=np.ones(a.shape[:2],bool)
    w,h=cap[ck];return grid_shaded(a,fg,w,h)
def pad_back(cap):
    f,box=B6.PAD_BACK;a=np.asarray(Image.open(M.R+f).convert('RGB').crop(box).transpose(Image.ROTATE_270)).astype(float)
    w,h=cap['pad'];return grid_shaded(a,np.ones(a.shape[:2],bool),w,h)[0]
def build_gear():
    G,P=BV.build_gear()
    for nm in M.GEAR:
        if nm.startswith('glove'):continue          # gloves approved as-is
        G[nm],P[nm]=gear_measure(nm,BV.GEARCAP)
    raw=G['blocker'].copy();G=B5.sym_gear(G)
    # blocker outline = the photo's white rolled edge (the navy outside it is background, not the blocker)
    lt=[c for c in raw.reshape(-1,3).astype(int) if c.mean()>170 and c.max()-c.min()<40]
    if lt:
        b=G['blocker'];wc=np.median(lt,0).astype(np.uint8);c0=b[0,0].copy();b[0,:]=b[-1,:]=wc;b[:,0]=b[:,-1]=wc;b[0,0]=b[0,-1]=b[-1,0]=b[-1,-1]=c0
    m=G['goalie_mask'];H,W=m.shape[:2]
    org=[tuple(c) for c in m.reshape(-1,3) if c[0]>180 and c[1]<120 and c[2]<80];m[H-1,W//2]=org[0] if org else (239,49,12)
    G['pad_b']=pad_back(BV.GEARCAP);return G,P
