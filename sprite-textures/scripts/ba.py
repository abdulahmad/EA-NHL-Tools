import uv
from uv import *
from lib import H
from atlas import base
import numpy as np
src=open('uv_proofs.py').read();exec(src[src.index('def shade_of'):src.index('FR=')])
sp=spritepal(team('tor'));A=base('checker')
out=[]
for n in (200,1,409):
  for w in (False,True):
    uv.WRAP=w;p,part,U,V,R=solve(n);m=p!=255;o=sp[p].astype(float);sh=shade_of(p)[...,None]
    for v0 in (.35,.5,.65):
        l=thin_stripe(V,R,v0,['torso_front','torso_back'],1);o[l]=np.array([230,30,30])*sh[l]
    out.append(toimg(o,m,6))
sheet(out,2).save('jerseys/fix_wrap_before_after_200_1_409.png')
