import numpy as np,copy,sys
from carve96 import *
def align(V,phi,G,rounds=3,need=8):
    V=[dict(v) for v in V]
    for r in range(rounds):
        for d in range(8):
            best=None
            for dx in (-1,0,1):
                for dy in (-1,0,1):
                    W=[dict(v) for v in V];W[d]['xo']+=dx;W[d]['yo']+=dy
                    s=carve(W,phi,1,G,need=need).sum()      # bigger consistent hull = better aligned
                    if best is None or s>best[0]:best=(s,dx,dy)
            V[d]['xo']+=best[1];V[d]['yo']+=best[2]
    return V
if __name__=='__main__':
    G=grid(1.0);i0=int(sys.argv[1])
    for phi in (8,11,14,17,20,24):
        V=align(views(i0),phi,G);occ=carve(V,phi,1,G);r=iou(V,occ,phi,1,G)
        print(phi,occ.sum(),round(r.mean(),3),np.round(r,2),[(v['xo']-w['xo'],v['yo']-w['yo']) for v,w in zip(V,views(i0))])
