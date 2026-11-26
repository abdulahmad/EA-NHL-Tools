"""Whole NHL 96 pipeline for one pose: calibrate -> carve -> hill-climb on wrong pixels -> error sheet."""
import numpy as np,sys,pickle
from scipy import ndimage
import carve96 as C,cal2,err96,climb96
from hull96 import FL,pals
def run(i0,phi,out,iters=400,team='!bfh',P=None):
    G=C.grid(0.5);V=[dict(v) for v in C.views(i0)]
    if P is None:P,b=cal2.calibrate(V,phi,G)
    for d,v in enumerate(V):v['xo'],v['yo']=P[d][0],P[d][1];C.YAW[d]=P[d][2]
    pal=pals()[team];occ=C.carve(V,phi,1,G,need=8);lab,n=ndimage.label(occ);sz=ndimage.sum(occ,lab,range(1,n+1));occ=lab==(1+int(np.argmax(sz)))
    ev=climb96.Ev(V,phi,G,occ,pal);alive,best,votes,tot=climb96.climb(ev,iters);seen=alive&(tot>0);pts=ev.xyz[seen];col=ev.rep[votes[seen].argmax(1)]
    E=err96.sheet(V,phi,pts,col,pal,out+'.png');err96.report(E);o2=np.zeros(occ.shape,bool);o2.ravel()[ev.idx[alive]]=True
    pickle.dump(dict(V=V,phi=phi,P=P,occ=o2,pts=pts,col=col,i0=i0),open(out+'.pkl','wb'));return E
if __name__=='__main__':run(int(sys.argv[1]),float(sys.argv[2]),sys.argv[3],int(sys.argv[4]) if len(sys.argv)>4 else 400)
