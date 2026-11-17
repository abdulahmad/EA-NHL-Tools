"""NHL 96 PC: one pose -> carved, colour-refined model, compared with the game sprites at the game's own angles."""
import numpy as np,sys,pickle
from PIL import Image
from hull96 import *
from pc96 import refine
import align96
def halfalign(V,phi,G):
    V=[dict(v) for v in V]
    for d in range(8):
        best=None
        for dx in (-.5,0,.5):
            for dy in (-.5,0,.5):
                W=[dict(v) for v in V];W[d]['xo']+=dx;W[d]['yo']+=dy;s=carve(W,phi,1,G,need=8).sum()
                if best is None or s>best[0]:best=(s,dx,dy)
        V[d]['xo']+=best[1];V[d]['yo']+=best[2]
    return V
def model(i0,phi,step=0.5,pal=None):
    G1=grid(1.0);V=halfalign(align96.align(views(i0),phi,G1),phi,G1);G=grid(step);occ=carve(V,phi,1,G,need=7)
    lab,n=ndimage.label(occ);sz=ndimage.sum(occ,lab,range(1,n+1));occ=lab==(1+int(np.argmax(sz)));occ=refine(V,G,occ,phi,pal)
    return V,G,occ
def compare(V,pts,col,pal,phi,fn,sc=4):
    p2=pal.copy();p2[255]=(40,90,60);top=[];bot=[]
    for d,v in enumerate(V):
        a=np.full((80,80),255,np.uint8);y0=int(70-v['yo']);x0=int(40-v['xo']);a[y0:y0+v['h'],x0:x0+v['w']]=v['p']
        top.append(np.kron(p2[FL[a]],np.ones((sc,sc,1),np.uint8)));bot.append(render(pts,col,pal,45*d,phi,sc=sc))
    Image.fromarray(np.concatenate([np.concatenate(top,1),np.concatenate(bot,1)],0)).save(fn)
if __name__=='__main__':
    i0=int(sys.argv[1]);phi=float(sys.argv[2]);out=sys.argv[3];pal=pals()['!bfh'];V,G,occ=model(i0,phi,pal=pal)
    pts,col,votes=colour(V,G,occ,phi);colv=votes.argmax(1);colv[votes.sum(1)==0]=col[votes.sum(1)==0]
    pickle.dump(dict(V=V,occ=occ,pts=pts,col=col,colv=colv,phi=phi,i0=i0),open(out+'.pkl','wb'))
    compare(V,pts,col,pal,phi,out+'_cmp_best.png');compare(V,pts,colv,pal,phi,out+'_cmp_vote.png')
