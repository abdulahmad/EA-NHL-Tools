import sys,pickle,numpy as np
from multiprocessing import Pool
sys.path.insert(0,'/workspace/g94-to-pc-zones/v5/x95')
A,_=pickle.load(open('/workspace/preview_v2/platform_unique/v2/all.pkl','rb'))
PCm={k:(v!=255) for k,v in A['PC'].items()}
PCinfo={k:(m.shape,int(m.sum())) for k,m in PCm.items()}
F94,F95,F96=pickle.load(open('frames.pkl','rb'))
def iou(a,pm,dy,dx):
  # pm shifted by (dy,dx) onto a's grid; area outside counted as union
  H,W=a.shape;h,w=pm.shape
  y0,y1=max(0,dy),min(H,h+dy);x0,x1=max(0,dx),min(W,w+dx)
  if y1<=y0 or x1<=x0:return 0
  sub=pm[y0-dy:y1-dy,x0-dx:x1-dx]
  inter=(a[y0:y1,x0:x1]&sub).sum()
  return inter/(a.sum()+pm.sum()-inter)
def best(task):
  key,img=task;a=img>0;na=int(a.sum())
  if na<20:return key,None
  H,W=a.shape;res=(0,None)
  gy,gx=np.nonzero(a)
  for k,(sh,n) in PCinfo.items():
    if abs(n-na)>0.2*na or abs(sh[0]-H)>6 or abs(sh[1]-W)>8:continue
    pm0=PCm[k]
    for mir in (False,True):
      pm=pm0[:,::-1] if mir else pm0;ys,xs=np.nonzero(pm)
      cy,cx=int(round(gy.mean()-ys.mean())),int(round(gx.mean()-xs.mean()))
      for dy in range(cy-2,cy+3):
        for dx in range(cx-2,cx+3):
          s=iou(a,pm,dy,dx)
          if s>res[0]:res=(s,dict(pc=k,mir=mir,dy=dy,dx=dx,iou=float(s)))
  return key,res[1]
if __name__=='__main__':
  which=sys.argv[1];F={'95':F95,'96':F96}[which]
  tasks=[((which,i),d['img']) for i,d in F.items()]
  with Pool(8) as P:out=dict(P.map(best,tasks,chunksize=8))
  pickle.dump(out,open(f'match{which}.pkl','wb'))
  v=[o['iou'] for o in out.values() if o];print(len(out),len(v),sum(x>=0.97 for x in v),sum(x>=0.9 for x in v))
