"""Edge bleed for curved gear: cells that are background in the reference (outside the gear silhouette) take the colour of the
nearest gear texel, so the sprite mapper can pull extra pixels at curved silhouette edges without sampling background.
The original gear shape is kept as a separate alpha (255 = gear, 0 = bled background)."""
import numpy as np,measure_ref as M,blocker_v8 as BL,mask_back_v9 as MB
from PIL import Image
from scipy import ndimage as ndi
def outside(a,is_bg):
    """background = is_bg pixels connected to the image border (holes inside the gear, e.g. mask eyes/mouth, stay gear)"""
    lab,_=ndi.label(is_bg);edge=set(np.unique(np.r_[lab[0],lab[-1],lab[:,0],lab[:,-1]]))-{0};return np.isin(lab,list(edge))
def src(nm):
    if nm=='mask_b':return np.asarray(Image.open(M.R+MB.REF).convert('RGB').crop(MB.BOX)).astype(float)
    if nm=='blocker':return np.asarray(Image.open(M.R+M.GEAR['blocker'][0]).convert('RGB').crop(BL.BOARD)).astype(float)
    f,box,*_=M.GEAR[nm];im=Image.open(M.R+f).convert('RGB')
    if box:im=im.crop(box)
    if nm.startswith('glove'):im.thumbnail((240,240))
    return np.asarray(im).astype(float)
def bg_mask(nm,a):
    sat=a.max(2)-a.min(2);v=a.mean(2)
    if nm=='goalie_mask':return outside(a,v<40)                                   # black page around the mask
    if nm=='mask_b':return outside(a,(v>235)|((sat<45)&(v<130)))                   # white page + watermark ink
    if nm=='blocker':return outside(a,(a[...,2]>a[...,0]+40)&(v<120))              # navy page at the rounded corners
    if nm=='catcher':return outside(a,(v>240)&(sat<12))                            # white page
    if nm.startswith('glove'):return outside(a,(sat<14)&(v>45)&(v<200))            # grey studio backdrop (as gear_measure)
def alpha(nm,a,w,h,thr=.5):
    bg=bg_mask(nm,a)
    if nm.startswith('glove'):                                                      # gear_measure trims to the fg bbox first
        ys,xs=np.nonzero(~bg);bg=bg[ys.min():ys.max()+1,xs.min():xs.max()+1]
    H,W=bg.shape;A=np.zeros((h,w),np.uint8)
    for j in range(h):
        for i in range(w):A[j,i]=255 if 1-bg[int(j*H/h):max(int((j+1)*H/h),int(j*H/h)+1),int(i*W/w):max(int((i+1)*W/w),int(i*W/w)+1)].mean()>=thr else 0
    return A
def bleed(t,A):
    o=t.copy();G=np.argwhere(A>0)
    for j,i in np.argwhere(A==0):
        d=np.abs(G[:,0]-j)*1.01+np.abs(G[:,1]-i)*1.0+np.hypot(G[:,0]-j,G[:,1]-i)   # nearest gear texel; ties -> same row
        y,x=G[d.argmin()];o[j,i]=t[y,x]
    return o
CURVED=('goalie_mask','mask_b','blocker','catcher','glove_ottawa','glove_redblack','glove_edmonton')
def apply(G):
    AL={}
    for nm in CURVED:
        t=G[nm];h,w=t.shape[:2];A=alpha(nm,src(nm),w,h)
        if nm=='blocker':A[0,0]=A[0,-1]=A[-1,0]=A[-1,-1]=0                        # rounded corners (v8: navy) are outside the board
        if nm in('goalie_mask','mask_b'):A[outside(t,t.astype(int).sum(2)==0)]=0                 # black page texels touching the border are background too (eyes/mouth holes are not)
        if nm=='goalie_mask':H_,W_=A.shape;A[H_-1,(W_-1)//2]=A[H_-1,W_//2]=255     # orange chin is gear
        G[nm]=bleed(t,A);AL[nm]=A
    return G,AL
