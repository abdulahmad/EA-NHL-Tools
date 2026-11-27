import os,sys;sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)));import paths
import pickle,pandas as pd,numpy as np
A,S=paths.frames()
AL=pickle.load(open(paths.ALIGN,'rb'))
d=pd.read_csv(os.path.join(paths.CENSUS,'frames_matrix.csv'))
rows=[]
for st,cond in [('G94',lambda r:r.PC_class!='match'),('G93',lambda r:r.G94_class!='match' and r.PC_class!='match')]:
  for _,r in d[(d.set==st)&(d['empty']==False)].iterrows():
    if not cond(r):continue
    al=AL.get((st,r.frame))
    a=A[st][r.frame];lines=sorted(set(int(v)//16 for v in np.unique(a) if v))
    rows.append(dict(set=st,frame=r.frame,label=r.label,cat=r.category,spa=r.spa,h=a.shape[0],w=a.shape[1],lines=lines,
      PC_best=r.PC_best,PC_score=r.PC_score,PC_class=r.PC_class,PC_mirror=r.PC_mirror,G94_best=r.G94_best,G94_score=r.G94_score,G94_class=r.G94_class,
      al_pc=al[0] if al else None,al_iou=round(al[1],3) if al else None))
D=pd.DataFrame(rows);D.to_pickle(paths.WORK+'cand.pkl')
pd.set_option('display.width',250)
print(D[['set','frame','label','cat','h','w','lines','PC_best','PC_score','PC_class','al_pc','al_iou','G94_best','G94_score']].to_string())
