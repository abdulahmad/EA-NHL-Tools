import os,sys;sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)));import paths
import pandas as pd,numpy as np,pickle,json
A,S=paths.frames()
D=pd.read_pickle(paths.WORK+'cand.pkl')
# PC frame numbers in notes are the game's own 0-based numbers (pc() below); the census pickles key PC 1-based.
def pc(n):return int(n)-1
# NHLPA 93 bloody injury1 633-644: same poses exist in 94G 641-652 and 95 PC 632-643 but without blood (both redrawn)
add=[dict(set='G93',frame=f,label='injury1 blood (93)',cat='injury',h=A['G93'][f].shape[0],w=A['G93'][f].shape[1]) for f in range(633,645) if not ((D.set=='G93')&(D.frame==f)).any()]
D=pd.concat([D,pd.DataFrame(add)],ignore_index=True)
intra=json.load(open(os.path.join(paths.CENSUS,'intra.json')))
unused={'G94':set(range(714,738))|set(range(838,846))}
def cls(r):
  if r.set=='G93' and r.frame>=633: return 'exclusive','blood variant: pose also in 94G %d and 95 PC %d (both redrawn without blood); bloody version only in 93'%(r.frame+8,pc(r.frame))
  if r.set=='G93': return 'exclusive','fight/blood set; nearest 94G and PC frames visually different (reviewed)'
  n=r.frame
  if n in (381,382,383): return 'uncertain','PC slot %d is the same animation slot (wallleft) but a different pose'%pc(n)
  if 539<=n<=562: return 'uncertain','PC has its own redrawn gready set (PC 538-553, 2 frames per facing vs 3 in 94G)'
  if n==648: return 'matched','same pose redrawn in PC 639 (visual review)'
  if 838<=n<=845: return 'matched','unused duplicate of arrow/star frame %d (same shape as PC %d)'%(n-454,pc(n-454))
  if n<=538: return 'matched','PC %d (94G slot - 1) is this animation frame redrawn/recoloured (visual review)'%pc(n)
  if 563<=n<=657: return 'matched','PC %d (94G slot - 9) is this frame redrawn/recoloured (visual review)'%pc(n-8)
  if r.PC_class=='none': return 'exclusive','animation not in PC; best PC score %.2f'%r.PC_score
  return 'uncertain','animation not in PC, but PC %d has a similar pose (score %.2f)'%(pc(r.PC_best),r.PC_score)
D[['status','note']]=D.apply(lambda r:pd.Series(cls(r)),axis=1)
print(D.groupby(['set','status']).size())
print(type(intra),list(intra)[:5] if isinstance(intra,dict) else '')
D.to_pickle(paths.WORK+'cls.pkl')
from collections import Counter
for st in ['exclusive','uncertain']:
  s=D[D.status==st];c=Counter()
  for r in s.itertuples():
    for v in np.unique(A[r.set][r.frame]):
      if v and v//16!=2:c[(r.set,int(v))]+=1
  print(st,sorted(c.items()))
