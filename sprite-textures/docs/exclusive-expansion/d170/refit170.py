# D170: re-fit exclusive texel maps against the frozen D169 texture (answer key).
# Family constraint inside the fit, column kept (vertical straight), row snapped to the nearest band row of the pixel's
# family, skeleton/part split sleeve vs torso, and no-texel pixels seeded from the nearest mapped pixel of the same part.
import numpy as np,collections
from tex import GFAM
SLEEVE_COLS=set(range(0,3))|set(range(16,24))|set(range(34,38))   # RD.REG sleeve strips
def tzone(u,v):
  if v<6:return 'head'
  if u in SLEEVE_COLS:return 'sleeve' if v<21 else 'legs'
  return 'torso' if v<17 else 'legs'
PART2Z={7:'sleeve',8:'sleeve',6:'sleeve',4:'torso',5:'torso',2:'head',3:'head',9:'legs',10:'legs',11:'legs',12:'legs'}
def refit(g,tm,lab,FT):
  H,W=g.shape;out={};how=collections.Counter()
  byz=collections.defaultdict(list)
  for (u,v),f in FT.items():byz[(tzone(u,v),f)].append((u,v));byz[('any',f)].append((u,v))
  src={(y,x):tuple(t) for k,t in tm.items() for y,x in [map(int,k.split(','))]}
  for y,x in zip(*np.nonzero(g)):
    gi=int(g[y,x])
    if gi not in GFAM:continue
    f=GFAM[gi];z=PART2Z.get(int(lab[y,x]),'any');t0=src.get((y,x))
    if t0 is None:   # seed from the nearest mapped pixel with the same part label
      best=None
      for (yy,xx),t in src.items():
        d=abs(yy-y)+abs(xx-x)+(0 if lab[yy,xx]==lab[y,x] else 6)
        if best is None or d<best[0]:best=(d,t)
      t0=best[1] if best else (9,12);how['seeded']+=1
    if FT.get(t0)==f and (z=='any' or tzone(*t0)==z):out[(y,x)]=t0;how['kept']+=1;continue
    cand=byz[(z,f)] or byz[('any',f)]
    if not byz[(z,f)]:how['zone widened']+=1
    u0,v0=t0;t=min(cand,key=lambda c:(4*abs(c[0]-u0)+abs(c[1]-v0)));out[(y,x)]=t
    how['column kept, row snapped' if t[0]==u0 else 'column moved']+=1
  return out,how
