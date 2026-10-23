# v10: square pixels everywhere. Every gear texture measured from a photo gets SQUARE cells in the photo:
# keep the sprite-capacity pixel budget A=w*h, but pick w,h from the (trimmed) reference aspect r=W/H.
# Before, the reference was squeezed into the sprite-bbox grid (e.g. blocker cells 22x35 px = 1:1.55).
import numpy as np,build_v4 as BV,build_v7 as B7,measure_ref as M,blocker_v8 as BL,mask_back_v9 as MB
def sq(A,W,H):
    r=W/H;w=max(1,int(round(np.sqrt(A*r))));h=max(1,int(round(w/r)));return w,h
SIZES={};import types;ALPHA=types.SimpleNamespace(a={});MASK_B=(5,6)
_gm,_gs=M.grid_mode,B7.grid_shaded
def grid_mode(a,fg,w,h,cols,*x,**k):w,h=sq(w*h,a.shape[1],a.shape[0]);return _gm(a,fg,w,h,cols,*x,**k)
def grid_shaded(a,fg,w,h,**k):w,h=sq(w*h,a.shape[1],a.shape[0]);return _gs(a,fg,w,h,**k)
def box_wh(b):return b[2]-b[0],b[3]-b[1]
# tight top crops (v11): pad photo rows 0-85 are the knee block above the pad's top roll; catcher rows 0-7 are white page
PAD_TOP,CATCHER_TOP=86,8
def _tight():
    for k,y0 in (('pad',PAD_TOP),('catcher',CATCHER_TOP)):
        f,b,*r=M.GEAR[k]
        if b is None:
            from PIL import Image;W,H=Image.open(M.R+f).size;M.GEAR[k]=(f,(0,y0,W,H),*r)
def build_gear():
    _tight()
    M.grid_mode,B7.grid_shaded=grid_mode,grid_shaded   # gear only; jerseys keep their own sizing
    try:G,P=B7.build_gear()
    finally:M.grid_mode,B7.grid_shaded=_gm,_gs
    c0=G['blocker'][0,0].copy()
    b,_=BL.blocker(*sq(100,*box_wh(BL.BOARD)));b[0,0]=b[0,-1]=b[-1,0]=b[-1,-1]=c0;G['blocker']=b
    f,_,*r=M.GEAR['blocker'];M.GEAR['blocker']=(f,BL.BOARD,*r)
    G['mask_b'],_=MB.mask_back(*MASK_B)   # measured back-facing head extent (head_extent.py): median 5x6 over 77 goalie frames
    m=G['goalie_mask'];H,W=m.shape[:2];org=m[H-1,W//2].copy()
    m[H-1,(W-1)//2]=m[H-1,W//2]=org   # even width: chin is 2 centre pixels, both orange (Fuhr's mask is symmetric)
    import bleed_v12 as BLD;G,ALPHA.__dict__['a']=BLD.apply(G)   # v12: bleed edge colours into background cells, keep alpha
    for k,v in G.items():
        if not k.startswith('_'):SIZES[k]=f'{v.shape[1]}x{v.shape[0]}'
    return G,P
