from diag import *
from broken4 import AR
from scipy import ndimage as ndi
dp=diagpal()
def vis(n):
    p=frame(n);rgb=dp[p].astype(float)*0.45;r=AR[p];bad=np.zeros(p.shape,bool)
    for dy,dx in ((0,1),(1,0),(0,-1),(-1,0)):
        nb=np.roll(np.roll(r,dy,0),dx,1);bad|=(r>=0)&(nb>=0)&(abs(r-nb)>1)
    rgb[bad]=[255,0,0];return toimg(rgb,p!=255,6)
sheet([vis(n) for n in [1,9,17,25,33,41,49,57]],8).save('progress/14_arm_band_order_violations_94_skaters.png')
sheet([vis(n) for n in range(889,905)],8).save('progress/15_arm_band_order_violations_95_crosscheck.png')
sheet([vis(n) for n in [1075,1080,1086,1090,1100,1109,940,950]],8).save('progress/16_arm_band_order_violations_95_shotblock_boards.png')
