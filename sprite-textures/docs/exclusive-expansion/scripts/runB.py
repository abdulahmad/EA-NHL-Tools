import sys,json,pickle,numpy as np;sys.path.insert(0,'/workspace/preview_v2/exclusive_samples')
import expand as E
SAM=[('G93',360,2,'93G fhigh (fight punch)'),('G93',374,7,'93G finjury (bloody injury)'),('G94',742,2,'94G boardfront (board check)')]
R,err=E.run([s[:3] for s in SAM]);pickle.dump(R,open('skaterR.pkl','wb'))
import render as RD
M={}
for src,n,d,t in SAM:
  r=R[(src,n,d)];lc=(r['conf'][r['g']!=0]<0.5).sum()
  c,nb=RD.sheet(f'{src} {n} {t}  -> 95PC zones','',r,f'B_{src}_{n}.png',f'dir {d}; px {int((r["q"]!=255).sum())}; mapped {len(r["tmap"] or {})}; translator conf<0.5: {lc} px')
  M[f'{src}_{n}']=dict(title=t,dir=d,px=int((r['q']!=255).sum()),mapped=len(r['tmap'] or {}),lowconf=int(lc),errors_leafs=nb,parts=c)
json.dump(dict(M=M,autofit=err),open('B_skaters.json','w'),indent=1);print(json.dumps(M,indent=0)[:3000])
