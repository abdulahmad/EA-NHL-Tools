import os,sys;sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)));import paths
# Genesis zone -> PC index co-occurrence from 94G/93G frames aligned to their 95 PC redraws (silhouette IoU>=0.97, D168 align.pkl)
import pickle,numpy as np,json,collections
A,S=paths.frames()
AL=pickle.load(open(paths.ALIGN,'rb'))
C=collections.defaultdict(collections.Counter);npairs=0
for (s,n),(pn,iou,mir,dy,dx,_) in AL.items():
  if iou<0.97 or s not in('G94','G93'):continue
  g=A[s][n];p=A['PC'][pn];W=p.shape[1];npairs+=1
  for py,px in zip(*np.nonzero(p!=255)):
    x=W-1-px if mir else px;gy,gx=py+dy,x+dx
    if 0<=gy<g.shape[0] and 0<=gx<g.shape[1] and g[gy,gx]:C[int(g[gy,gx])][int(p[py,px])]+=1
out={g:{pc:n for pc,n in c.most_common()} for g,c in C.items()}
json.dump(dict(pairs=npairs,cooc=out),open(paths.STATUS+'answerkey_cooc.json','w'))
print(npairs)
for g in sorted(C):
  t=sum(C[g].values());print(g,t,[(pc,round(n/t,3)) for pc,n in C[g].most_common(10)])
