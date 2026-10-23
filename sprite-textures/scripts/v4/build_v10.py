# v10: square pixels everywhere. Every gear texture measured from a photo gets SQUARE cells in the photo:
# keep the sprite-capacity pixel budget A=w*h, but pick w,h from the (trimmed) reference aspect r=W/H.
# Before, the reference was squeezed into the sprite-bbox grid (e.g. blocker cells 22x35 px = 1:1.55).
import numpy as np,build_v4 as BV,build_v7 as B7,measure_ref as M,blocker_v8 as BL,mask_back_v9 as MB
def sq(A,W,H):
    r=W/H;w=max(1,int(round(np.sqrt(A*r))));h=max(1,int(round(w/r)));return w,h
SIZES={};MASK_B=(5,6)
_gm,_gs=M.grid_mode,B7.grid_shaded
def grid_mode(a,fg,w,h,cols,*x,**k):w,h=sq(w*h,a.shape[1],a.shape[0]);return _gm(a,fg,w,h,cols,*x,**k)
def grid_shaded(a,fg,w,h,**k):w,h=sq(w*h,a.shape[1],a.shape[0]);return _gs(a,fg,w,h,**k)
def box_wh(b):return b[2]-b[0],b[3]-b[1]
def build_gear():
    M.grid_mode,B7.grid_shaded=grid_mode,grid_shaded   # gear only; jerseys keep their own sizing
    try:G,P=B7.build_gear()
    finally:M.grid_mode,B7.grid_shaded=_gm,_gs
    c0=G['blocker'][0,0].copy()
    b,_=BL.blocker(*sq(100,*box_wh(BL.BOARD)));b[0,0]=b[0,-1]=b[-1,0]=b[-1,-1]=c0;G['blocker']=b
    f,_,*r=M.GEAR['blocker'];M.GEAR['blocker']=(f,BL.BOARD,*r)
    G['mask_b'],_=MB.mask_back(*MASK_B)   # measured back-facing head extent (head_extent.py): median 5x6 over 77 goalie frames
    for k,v in G.items():
        if not k.startswith('_'):SIZES[k]=f'{v.shape[1]}x{v.shape[0]}'
    return G,P
