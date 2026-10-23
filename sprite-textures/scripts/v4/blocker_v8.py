"""v8 blocker: tight crop on the board only, no mirroring, coverage-based white design (thin white graphics would lose a per-cell mode)."""
import numpy as np,measure_ref as M
from PIL import Image
BOARD=(10,6,234,353)   # the blocker board inside the Fuhr blocker+glove sheet (512x368); excludes navy bg and the glove
def blocker(w=10,h=10,thr=.3,mid=.15):
    f=M.GEAR['blocker'][0];a=np.asarray(Image.open(M.R+f).convert('RGB').crop(BOARD)).astype(float)
    sat=a.max(2)-a.min(2);v=a.mean(2);white=(v>165)&(sat<60);red=(a[...,0]>150)&(a[...,1]<120)
    H,W=v.shape;out=np.zeros((h,w,3),np.uint8);cov=np.zeros((h,w))
    for j in range(h):
        for i in range(w):
            y0,y1=int(j*H/h),int((j+1)*H/h);x0,x1=int(i*W/w),int((i+1)*W/w)
            c=a[y0:y1,x0:x1];wm=white[y0:y1,x0:x1];rm=red[y0:y1,x0:x1];cov[j,i]=wm.mean()
            ring=j in (0,h-1) or i in (0,w-1)   # the board's real white rolled edge runs all the way round
            if ring or wm.mean()>=thr:out[j,i]=M.vga(np.median(c[wm],0))      # white graphic dominates: its own shade
            elif wm.mean()>=mid:out[j,i]=M.vga(c.reshape(-1,3).mean(0))        # thin lines/text partly covering: true area mix
            else:out[j,i]=M.vga(np.median(c[rm] if rm.any() else c.reshape(-1,3),0))   # red board, own shading
    return out,cov
if __name__=='__main__':
    b,cov=blocker();np.set_printoptions(precision=2,suppress=True,linewidth=150);print(cov)
    print('\n'.join(' '.join('W' if p.mean()>165 else 'R' for p in r) for r in b))
