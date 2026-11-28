import sys,pickle,json,os
sys.path[:0]=['/workspace/g94-to-pc-zones/v5/x95/snap','/workspace/g94-to-pc-zones/v5/final3k/work','/workspace/g94-to-pc-zones/v5/final3j/work','/workspace/g94-to-pc-zones/v5/final3c/work',
 '/workspace/g94-to-pc-zones/v4/work','/workspace/wt-exclusive/NHL-exclusive-sprites-PC-colors/tools','/workspace/g94-to-pc-zones/v5/x95']
game=sys.argv[1];part=sys.argv[2]
import armmodels,socks3i
import inj
import eval_and_build as E
from eval_and_build import *
import run3g,armmodels,socks3i,specs,gdec_maps
from percolor import kfeats,aligned_arrays,A,PR
sel=specs.SEL95 if game=='95' else specs.SEL96
S=specs.build(game,sel,gdec_maps.IMAP[game])
S=[S[int(i)] for i in part.split(',')]
inj.register(S)
import glob
G3={}
for fn in sorted(glob.glob(inj.INJ+f'g3_{game}*.pkl'),key=os.path.getmtime):G3.update(pickle.load(open(fn,'rb')))
M=armmodels._load()
for K,r in G3.items():M['g3'][K]=dict(stacks=r['stacks'])
E.init_valid();VALID=E.VALID
OUTD=f'/workspace/g94-to-pc-zones/v5/x95/out/{game}/';os.makedirs(OUTD,exist_ok=True)
rows=[]
for s in S:
  K=s['K'];g0=s['g'].astype(int);goal=s['kind']=='goalie'
  outJ,P,J,how,log,eyes,ne=run3g.build(K,'M');outJ=np.asarray(outJ).astype(int)
  if goal:
    out=outJ.copy();nch=0;kp=km=None
  else:
    Xk,g=kfeats(K,P=P,J=J,base=outJ);X=unified(g,Xk,is_abdul=0)
    H,W=g.shape;pr=np.full(H*W,'',object);gr=g.ravel()
    for c in ZONEC:
      if c not in MODELS:continue
      i=np.nonzero(gr==c)[0]
      if len(i)==0:continue
      kind,m=MODELS[c];pr[i]=m if kind=='const' else m.predict(X[i])
    pr=pr.reshape(H,W);km=(pr!='')&(pr!='other');kp=pr
    armmodels.KPRED[0]=(kp,km);socks3i.KPRED[0]=(kp,km)
    try:
      out,P2,J2,how2,log2,eyes2,ne2=run3g.build(K,'M')
    finally:
      armmodels.KPRED[0]=None;socks3i.KPRED[0]=None
    out,nch=apply_nonline(np.asarray(out).astype(int),g,kp,km)
  extra=int(((g0==0)&(out!=255)).sum())
  out=np.where(g0>0,out,255).astype(np.int16)
  np.save(OUTD+f'g{game}_{s["f"]}_pcidx.npy',out)
  np.save(OUTD+f'g{game}_{s["f"]}_J_pcidx.npy',outJ.astype(np.int16))
  sp=spit_rt(out);pn=png_rt(out,OUTD+f'g{game}_{s["f"]}_idx.png')
  bad=sorted(set(int(v) for v in np.unique(out) if v!=255 and v not in VALID))
  hole=int(((g0>0)&(out==255)).sum())
  rec=dict(game=game,frame=s['f'],K=K,label=s['label'],kind=s['kind'],shape=list(out.shape),px=int((g0>0).sum()),how=how,spit_rt=bool(sp),png_palette_rt=bool(pn),invalid=bad,
           holes=hole,extra=extra,nonline_changed=int(nch),partner=s['pr'],near=s['near'])
  # score vs PC where a partner (IoU>=0.85) exists
  if s['pr']:
    g_,p=aligned_arrays(K,s['pr']);p=p.astype(int)
    for nm,c in (('final3k',out),('J_only',outJ)):
      v=vs_pc_row(np.where(g0>0,c,255).astype(int),p,g0)
      rec['score_'+nm]=dict(vs_pc=round(100*v[0]/v[3],1),zone_vs_pc=round(100*v[1]/v[3],1),vs_genesis=round(100*v[2]/v[3],1),px=int(v[3]))
  else:
    v=vs_pc_row(out,-np.ones(out.shape,int)+0*out,g0) if False else None
  # colour-class agreement with the Genesis pixel (no PC reference needed)
  from stripes3d import gclass,eclass,Z
  ys,xs=np.nonzero((g0>0)&(out!=255))
  rec['vs_genesis_all']=round(100*np.mean([gclass(g0[y,x])==eclass(out[y,x],Z) for y,x in zip(ys,xs)]),1)
  rows.append(rec);print(rec['frame'],rec['label'],'spit',sp,'png',pn,'invalid',bad,'holes',hole,'extra',extra,rec.get('score_final3k'),rec['vs_genesis_all'],flush=True)
json.dump(rows,open(OUTD+f'results_{game}_{part.replace(",","-")}.json','w'),indent=1,default=lambda o:o.item() if hasattr(o,'item') else str(o))
