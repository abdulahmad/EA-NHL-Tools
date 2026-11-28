import sys,collections,numpy as np,pickle;sys.path.insert(0,'/workspace/g94-to-pc-zones/v5/x95')
import gdec
R='/workspace/'
b94=gdec.load(R+'NHL94Genesis/Extracted/NHL94');b95=gdec.load(R+'NHL95Genesis/Extracted/NHL95');b96=gdec.load(R+'NHL96Genesis/Extracted/NHL96')
def allf(b,fm,n):
  o={}
  for i in range(1,n+1):
    try:d=gdec.decode(b,i,fm)
    except Exception:continue
    if d is not None:o[i]=d
  return o
F94=allf(b94,'94',846);F95=allf(b95,'v',1057);F96=allf(b96,'v',1859)
pickle.dump((F94,F95,F96),open('frames.pkl','wb'))
def match(Fa,Fb):
  by=collections.defaultdict(list)
  for i,d in Fb.items():
    m=d['img']>0;by[(m.shape,m.tobytes())].append(i);by[(m.shape,m[:,::-1].tobytes(),'m')].append(i)
  pairs=[]
  for i,d in Fa.items():
    m=d['img']>0
    for j in by.get((m.shape,m.tobytes()),[]):pairs.append((i,j,False))
    for j in by.get((m.shape,m.tobytes(),'m'),[]):
      if not (m==m[:,::-1]).all():pairs.append((i,j,True))
  return pairs
for nm,Fb in (('95',F95),('96',F96)):
  pr=match(F94,Fb);print(nm,'pairs',len(pr),len({a for a,_,_ in pr}))
  C=collections.defaultdict(collections.Counter)
  for a,bb,mir in pr:
    ga=F94[a]['img'];gb=Fb[bb]['img']
    if mir:gb=gb[:,::-1]
    for ya,xa in zip(*np.nonzero(ga>0)):C[int(ga[ya,xa])][int(gb[ya,xa])]+=1
  print(nm,'94 idx -> idx')
  for k in sorted(C):
    tot=sum(C[k].values());print(' ',k,tot,[(v,round(c/tot,2)) for v,c in C[k].most_common(3)])
