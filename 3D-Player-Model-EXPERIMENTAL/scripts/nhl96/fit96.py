import numpy as np,sys,pickle
from hull96 import *
from pc96 import refine
import align96,err96
from make96 import halfalign
if __name__=='__main__':
    i0=int(sys.argv[1]);phi=float(sys.argv[2]);out=sys.argv[3];need=int(sys.argv[4]) if len(sys.argv)>4 else 8;pal=pals()['!bfh']
    G1=grid(1.0);V=halfalign(align96.align(views(i0),phi,G1,rounds=2),phi,G1);G=grid(0.5);occ=carve(V,phi,1,G,need=need)
    lab,n=ndimage.label(occ);sz=ndimage.sum(occ,lab,range(1,n+1));occ=lab==(1+int(np.argmax(sz)))
    for nm,o in (('hull',occ),('refined',refine(V,G,occ,phi,pal))):
        pts,col,votes=colour(V,G,o,phi);colv=votes.argmax(1);z=votes.sum(1)==0;colv[z]=col[z]
        for cn,c in (('best',col),('vote',colv)):
            print(nm,cn);E=err96.sheet(V,phi,pts,c,pal,'%s_%s_%s.png'%(out,nm,cn));err96.report(E)
    pickle.dump(dict(V=V,occ=o,pts=pts,col=col,colv=colv,phi=phi),open(out+'.pkl','wb'))
