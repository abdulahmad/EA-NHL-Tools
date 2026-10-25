# Diagnostic textures for the part editors (D149, Abdul pt953u). Generated from a base RGB texture + its used-texel mask, so they
# hold no game data. Colours: Okabe-Ito based, alternating dark/light so neighbouring texels always differ strongly in luminance
# (no red/green pairs) -- the same list goalie27 tp.py used for the H/V/CUFF pad tests.
import numpy as np
CB=[(0,0,0),(240,228,66),(0,114,178),(255,255,255),(213,94,0),(86,180,233),(80,80,80),(230,159,0),(0,40,110),(204,121,167)]
MAG=(252,0,252)
def make(base,used,regions=None,pads=None):
    """base: HxWx3 int, used: HxW bool. regions: {name:(x,y,w,h)} for 'part colours'. pads: (x,y,w,h) for the solid-cuff test."""
    H,W=used.shape;out={}
    def f(fn):
        T=np.array(base).copy();T[~used]=MAG
        for y in range(H):
            for x in range(W):
                if used[y,x]:T[y,x]=fn(y,x)
        return T.astype(int).tolist()
    out['Horizontal lines (row colours)']=f(lambda y,x:CB[y%10])
    out['Vertical lines (column colours)']=f(lambda y,x:CB[x%10])
    out['Checker (1 texel)']=f(lambda y,x:(255,255,255) if (x+y)%2 else (0,0,0))
    out['Grid 2x2 blocks']=f(lambda y,x:CB[((y//2)*3+(x//2))%10])
    if regions:
        def pid(y,x):
            for i,(n,(a,b,w,h)) in enumerate(regions.items()):
                if a<=x<a+w and b<=y<b+h:return CB[(i*3+1)%10] if i%2 else CB[(i*3+2)%10]
            return (128,128,128)
        out['Part regions (solid)']=f(pid)
    if pads:
        a,b,w,h=pads
        def cuff(y,x):
            if a<=x<a+w and b<=y<b+h:return (230,159,0) if x-a in (w-3,w-2) else ((0,114,178) if y-b<=3 else (255,255,255))
            return tuple(base[y][x])
        out['Solid cuff (pads)']=f(cuff)
    return out
