# Goalie v15 texture (Abdul pt907u): sock shading built into the pad texture (no separate shading layer).
# The back views (407 428 980 413 425 520) shade the sock beside the stripes: lit 181 -> 182 -> 183 toward the leg edge.
# Texture rows 13, 14, 17 (cylinder rows 4, 5, 8: the two rows above and the row below the stripe pair) of the sock strip
# x10-12 become 181 182 183 (was all plain sock). Votes from the g14 maps: (4,11) 182x6, (4,12) 183x2, (5,12) 183x3.
import sys,os
H15=os.path.dirname(os.path.abspath(__file__));sys.path.insert(0,H15+'/../goalie14')
import numpy as np
SHADE_ROWS=(13,14,17);SHADE=(181,182,183)
def install():
    import g13pad,g12pad
    T=g12pad.OPT['A'][0]
    for r in SHADE_ROWS:
        for i,s in enumerate(SHADE):T[r,10+i]=s;g13pad.CYLT[r-9,10+i]=s
    return T
def save(T,fn):
    from PIL import Image;import g10tex
    im=Image.fromarray(np.where(T==-1,181,T).astype(np.uint8),'P');im.putpalette(g10tex.ACT.flatten().tolist());im.save(fn)
