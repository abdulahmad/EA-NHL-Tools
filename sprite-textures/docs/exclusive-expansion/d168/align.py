# D168/D169: offset + mirror search for Genesis<->PC skater pairs (writes align.pkl).
# Rewritten after D168 because the original was run inline. --verify re-scores align.pkl entries.
import sys,pickle,numpy as np
from fam import A,D
def iou(g,p,mir,dy,dx):
  pm=p[:,::-1] if mir else p;b=np.zeros(g.shape,bool);ys,xs=np.nonzero(pm);gy,gx=ys+dy,xs+dx
  k=(gy>=0)&(gy<g.shape[0])&(gx>=0)&(gx<g.shape[1]);b[gy[k],gx[k]]=1;a=g>0
  lost=(~k).sum();return (a&b).sum()/((a|b).sum()+lost)
def best_align(g,p,R=4):
  best=(0,False,0,0)
  for mir in (False,True):
    pm=p[:,::-1] if mir else p;ys,xs=np.nonzero(pm);gys,gxs=np.nonzero(g)
    cy,cx=int(round(gys.mean()-ys.mean())),int(round(gxs.mean()-xs.mean()))
    for dy in range(cy-R,cy+R+1):
      for dx in range(cx-R,cx+R+1):
        s=iou(g,p,mir,dy,dx)
        if s>best[0]:best=(s,mir,dy,dx)
  return best
def pcmask(pn):return np.array(D['frames'][str(pn)]['px'])!=255
if __name__=='__main__':
  AL=pickle.load(open('align.pkl','rb'));ok=n_=0
  if '--verify' in sys.argv:
    for (s,n),(pn,io,mir,dy,dx,_) in list(AL.items())[::60]:
      if str(pn) not in D['frames']:continue
      b=best_align(A[s][n],pcmask(pn));n_+=1;ok+=abs(b[0]-io)<1e-6 and b[1]==mir
      print(s,n,pn,round(io,3),mir,dy,dx,'->',round(b[0],3),b[1],b[2],b[3])
    print(f'{ok}/{n_} reproduced')
