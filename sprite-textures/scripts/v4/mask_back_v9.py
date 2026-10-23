"""v9 goalie mask BACK (mask_b): Fuhr back-of-helmet ref, tight crop, no forced symmetry,
per-cell material colour with thin-line handling (coverage), snapped to 6-bit VGA. Same 7x6 capacity as the front mask."""
import numpy as np,measure_ref as M
from PIL import Image
REF='fuhr/01M5MRFQ67SC2AWJK05N1EM5SV.jpg'   # 128x128 back view: navy shell, cream rim + T harness + lower strap
BOX=(1,2,125,125)                           # tight to the shell; "by Ovalist" watermark sits outside it (treated as background)
def mask_back(w=7,h=6,thr=.3,mid=.15,bg=(0,0,0)):
    a=np.asarray(Image.open(M.R+REF).convert('RGB').crop(BOX)).astype(float)
    mx,mn=a.max(2),a.min(2);sat=mx-mn;v=a.mean(2)
    back=(v>235)|((sat<45)&(v<130))                         # white page / watermark ink / black outline
    navy=(a[...,2]>a[...,0]+40)&~back
    cream=(v>150)&(a[...,0]>=a[...,2]-10)&~back&~navy      # cream/beige padding (R,G >= B)
    H,W=v.shape;out=np.zeros((h,w,3),np.uint8);cov=np.zeros((h,w))
    for j in range(h):
        for i in range(w):
            s=np.s_[int(j*H/h):int((j+1)*H/h),int(i*W/w):int((i+1)*W/w)];c=a[s];bm,nm,cm=back[s],navy[s],cream[s]
            fg=~bm;cov[j,i]=cm.sum()/max(fg.sum(),1)
            if bm.mean()>.5:out[j,i]=bg                                     # mostly outside the helmet
            elif cov[j,i]>=thr:out[j,i]=M.vga(np.median(c[cm],0))
            elif cov[j,i]>=mid:out[j,i]=M.vga(c[fg].mean(0))               # thin cream strap across navy: true mix
            else:out[j,i]=M.vga(np.median(c[nm] if nm.any() else c[fg],0))
    return out,cov
if __name__=='__main__':
    b,cov=mask_back();np.set_printoptions(precision=2);print(cov);print(b.reshape(-1,3).tolist())
