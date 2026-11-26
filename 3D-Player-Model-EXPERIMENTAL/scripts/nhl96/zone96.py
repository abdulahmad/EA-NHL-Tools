"""Zone-consistent carving: use the fine palette zones (36 four-shade zones, 36 crest texels, 35 number texels) as surface labels instead of visible colour.
A voxel survives only if the views that see it can agree on a zone within 1 pixel; colours are then voted per zone and scored with the real palette."""
import numpy as np,sys,pickle
from PIL import Image
from scipy import ndimage
import carve96 as C,err96
from hull96 import FL,pals,render,surface,colour
from pc96 import refine
from num96 import with_number
def zonepal():
    rng=np.random.default_rng(5);z=rng.integers(0,255,(256,3)).astype(np.uint8)   # unique colour per flattened index
    return z
if __name__=='__main__':
    D=pickle.load(open(sys.argv[1],'rb'));V,phi,P=D['V'],D['phi'],D['P'];out=sys.argv[2];iters=int(sys.argv[3]) if len(sys.argv)>3 else 30
    for d in range(8):C.YAW[d]=P[d][2]
    G=C.grid(0.5);occ=C.carve(V,phi,1,G,need=8);lab,n=ndimage.label(occ);sz=ndimage.sum(occ,lab,range(1,n+1));occ=lab==(1+int(np.argmax(sz)))
    zp=zonepal();pal=with_number(pals()['!bfh'],88,fg=np.array([12,0,174]))
    for nm,o in (('hull',occ),('zone',refine(V,G,occ,phi,zp,iters=iters,tol=1.0))):
        pts,col,votes=colour(V,G,o,phi);colv=votes.argmax(1);z=votes.sum(1)==0;colv[z]=col[z]
        print(nm,int(o.sum()));E=err96.sheet(V,phi,pts,colv,pal,'%s_%s.png'%(out,nm));err96.report(E)
        Image.fromarray(np.concatenate([np.concatenate([render(pts,colv,pal,y,p,sc=5,size=(64,76),anchor=(32,68)) for y in (22.5,67.5,112.5,157.5,202.5,247.5,292.5,337.5)],1) for p in (phi,40)],0)).save('%s_%s_novel.png'%(out,nm))
        pickle.dump(dict(D,occ=o,pts=pts,col=colv),open('%s_%s.pkl'%(out,nm),'wb'))
