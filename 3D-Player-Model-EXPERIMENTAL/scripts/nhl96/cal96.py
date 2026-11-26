import numpy as np,sys,pickle
import carve96 as C, align96
def score(V,phi,G,need=8):
    occ=C.carve(V,phi,1,G,need=need);r=C.iou(V,occ,phi,1,G);return r,occ
if __name__=='__main__':
    i0=int(sys.argv[1]);G1=C.grid(1.0,R=26,H=64);G=C.grid(0.5,R=26,H=64)
    for phi in (8,11,14):
        V=align96.align(C.views(i0),phi,G1,rounds=2)
        for need in (8,7):
            r,occ=score(V,phi,G,need);miss=[];extra=[]
            print(phi,need,round(r.mean(),4),np.round(r,3))
