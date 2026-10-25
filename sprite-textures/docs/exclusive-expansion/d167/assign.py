import collections,numpy as np
from gpal import col
from tex94 import zone
TEX=np.load('/workspace/preview_v2/exclusive_samples/v2/tex_G94.npy');NOTEX={46,47}
CAND=collections.defaultdict(list)
for v,u in zip(*np.nonzero(TEX)):CAND[int(TEX[v,u])].append((int(u),int(v)))
BLOOD={1,2,28,29}
def assign(g,tm):
  tm=tm or {};M={};c=collections.Counter();moves=[];E=[]
  for y,x in zip(*np.nonzero(g)):
    cv=col(int(g[y,x]))
    if cv in NOTEX:c['stick/shadow (game colour)']+=1;continue
    c['px']+=1;t0=tm.get(f'{y},{x}')
    if t0 and TEX[t0[1],t0[0]]==cv:M[(y,x)]=tuple(t0);c['kept pipeline texel']+=1;continue
    if not CAND[cv]:c['ERROR colour not in texture: '+('blood (palette rows 0/1)' if cv in BLOOD else f'index {cv}')]+=1;E.append((y,x));continue
    if t0 is None:
      nb=[tm.get(f'{y+a},{x+b}') for a in(-1,0,1) for b in(-1,0,1)];nb=[t for t in nb if t]
      t0=tuple(np.median(nb,0).astype(int)) if nb else None
    if t0 is None:c['ERROR no start texel (pipeline fit failed)']+=1;E.append((y,x));continue
    z=zone(*t0);best=min(CAND[cv],key=lambda t:((zone(*t)!=z)*100+abs(t[0]-t0[0])*2+abs(t[1]-t0[1])))
    M[(y,x)]=best;moves.append(abs(best[0]-t0[0])+abs(best[1]-t0[1]));c['moved to colour-valid texel']+=1
    if zone(*best)!=z:c['moved out of zone']+=1
  return M,c,E,(round(float(np.mean(moves)),2) if moves else 0)
