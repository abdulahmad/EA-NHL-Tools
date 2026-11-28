import sys,pickle,numpy as np
from multiprocessing import Pool
from match import iou
F94,F95,F96=pickle.load(open('frames.pkl','rb'))
M94={k:(d['img']>0) for k,d in F94.items() if (d['img']>0).sum()>=100}
def best(task):
  key,img=task;a=img>0;na=int(a.sum())
  if na<100:return key,None
  H,W=a.shape;res=(0,None);gy,gx=np.nonzero(a)
  for k,pm0 in M94.items():
    n=int(pm0.sum())
    if abs(n-na)>0.25*na or abs(pm0.shape[0]-H)>6 or abs(pm0.shape[1]-W)>8:continue
    for mir in (False,True):
      pm=pm0[:,::-1] if mir else pm0;ys,xs=np.nonzero(pm)
      cy,cx=int(round(gy.mean()-ys.mean())),int(round(gx.mean()-xs.mean()))
      for dy in range(cy-2,cy+3):
        for dx in range(cx-2,cx+3):
          s=iou(a,pm,dy,dx)
          if s>res[0]:res=(s,dict(g94=k,mir=mir,dy=dy,dx=dx,iou=float(s)))
  return key,res[1]
if __name__=='__main__':
  w=sys.argv[1];F={'95':F95,'96':F96}[w]
  with Pool(8) as P:out=dict(P.map(best,[((w,i),d['img']) for i,d in F.items()],chunksize=8))
  pickle.dump(out,open(f'match94_{w}.pkl','wb'))
  v=[o['iou'] for o in out.values() if o];print(len(v),[sum(x>=t for x in v) for t in (0.95,0.9,0.8,0.7,0.6)])
