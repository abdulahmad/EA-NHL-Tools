import sys,pickle,json;sys.path[:0]=['/workspace/g94-to-pc-zones/v5/final3g/work','/workspace/g94-to-pc-zones/v5/x95','/workspace/g94-to-pc-zones/v5/final2/work']
game=sys.argv[1]
import inj
from run3g import *
import specs,joblib
from padxfer import padxfer
M4s=joblib.load('/workspace/g94-to-pc-zones/v4/work/final_skater.joblib')
sel=specs.SEL95 if game=='95' else specs.SEL96
import gdec_maps
S=specs.build(game,sel,gdec_maps.IMAP[game])
if len(sys.argv)>2:S=[S[int(i)] for i in sys.argv[2].split(',')]
inj.register(S)
res={}
for s in S:
  K=s['K'];g=s['g'].astype(int);goal=s['kind']=='goalie'
  if goal:
    o=PR.get(K);ex={o['pc']-1,o['pc'],o['pc']+1} if o else set()
    base=plain(g);base=padxfer(g,base,ex,0.8,False,[])
    inj.put('f3','g94_%d_copyonly.npy'%K,base.astype(np.int16))
  else:
    base=predict(M4s,g,ALLOW,ramp=True)
    inj.put('f3c','g94_%d_base.npy'%K,base.astype(np.int16))
  out,bands,grown,info,eyes,reg=apply_c(g,base,goal)
  inj.put('f3c','g94_%d_bands.npy'%K,reg)
  out,P,J,how,log,eyes,ne=build(K,'M')
  inj.put('f3g','g94_%d_pcidx.npy'%K,out.astype(np.int16))
  res[K]=dict(stacks=log,how=how)
  print(K,s['label'],how,flush=True)
pickle.dump(res,open(inj.INJ+f'g3_{game}_'+(sys.argv[2].replace(',','-') if len(sys.argv)>2 else 'all')+'.pkl','wb'))
