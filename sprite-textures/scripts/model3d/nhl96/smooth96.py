"""Regularised version: smooth shape (closing + median) and neighbourhood-majority colours, then re-score at the game angles."""
import numpy as np,sys,pickle
from PIL import Image
from scipy import ndimage
from scipy.spatial import cKDTree
import carve96 as C,err96
from hull96 import FL,pals,render,surface
def smooth(D,G,r=1.01,geo=True):
    X,Y,Z=G;occ=D['occ']
    if geo:occ=ndimage.median_filter(ndimage.binary_closing(occ,iterations=2)|occ,size=3)
    s=surface(occ);pts=np.stack([X[s],Y[s],Z[s]],1);T=cKDTree(D['pts']);nb=T.query_ball_point(pts,r);near=T.query(pts)[1];col=np.empty(len(pts),int)
    for i,l in enumerate(nb):
        col[i]=np.bincount(D['col'][l]).argmax() if len(l)>2 else D['col'][near[i]]
    return occ,pts,col
if __name__=='__main__':
    D=pickle.load(open(sys.argv[1],'rb'));V,phi=D['V'],D['phi'];G=C.grid(0.5);pal=pals()['!bfh']
    for d in range(8):C.YAW[d]=D['P'][d][2]
    for r in (0.8,1.3):
        occ,pts,col=smooth(D,G,r);print('radius',r);E=err96.sheet(V,phi,pts,col,pal,'%s_r%.1f.png'%(sys.argv[2],r));err96.report(E)
        Image.fromarray(np.concatenate([np.concatenate([render(pts,col,pal,y,p,sc=5,size=(64,76),anchor=(32,68)) for y in (22.5,67.5,112.5,157.5,202.5,247.5,292.5,337.5)],1) for p in (phi,40)],0)).save('%s_r%.1f_novel.png'%(sys.argv[2],r))
        pickle.dump(dict(D,occ=occ,pts=pts,col=col),open('%s_r%.1f.pkl'%(sys.argv[2],r),'wb'))
