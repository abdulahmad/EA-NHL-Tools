# D168: per-texel colour-family texture for 94G from aligned (IoU>=0.97) pairs to 0-error PC frames.
import sys,json,pickle,collections,numpy as np
from fam import *
sys.path.insert(0,'/workspace/preview_v2/exclusive_samples');import render as RD
MAG=np.all(T==(252,0,252),2)
def pcerr(f):
  px=np.array(f['px']);lab=np.array(f['lab']);tm=f['tmap'];e=0
  for y,x in zip(*np.nonzero(px!=255)):
    t=tm.get(f'{y},{x}')
    if t is None:e+=int(lab[y,x]) in RD.TEXD;continue
    if MAG[t[1],t[0]] or RD.pf2(int(px[y,x])) not in RD.FAM2.get(tuple(t),set()):e+=1
  return e
ZERO={int(k) for k,f in D['frames'].items() if f.get('tmap') and pcerr(f)==0}
# Genesis colour family by RGB of TORh (shade ignored): black 33/34, navy 35/36/37/40/41/42 (40 = darkest navy shade), skin 38/39, white 43/44/45
GFAM={33:'black',34:'black',40:'navy',35:'navy',36:'navy',37:'navy',41:'navy',42:'navy',38:'skin',39:'skin',43:'white',44:'white',45:'white'}
NOTEX={46:'stick',47:'shadow'}
SHADE={33:1,34:0,40:0,35:1,41:1,36:2,42:2,37:3,38:1,39:0,43:1,44:2,45:0}   # 0=dark..2=light within family (by luminance)
def collect(src):
  V=collections.defaultdict(collections.Counter);S=collections.defaultdict(collections.Counter);np_=0;W=collections.defaultdict(lambda:collections.defaultdict(collections.Counter))
  for n,pn,mir,dy,dx in pairs(src,zero=ZERO):
    np_+=1;f=D['frames'][str(pn)];px=np.array(f['px']);tm=f['tmap'];g=A[src][n]
    for gy,gx,py,qx in corr(g,px,mir,dy,dx):
      gi=int(g[gy,gx]);t=tm.get(f'{py},{qx}')
      if t is None or gi not in GFAM:continue
      V[tuple(t)][GFAM[gi]]+=1;W[n][tuple(t)][GFAM[gi]]+=1
      S[(GFAM[gi],int(px[py,qx]))][gi]+=1   # PC index -> Genesis shade index within family
  return V,S,W,np_
if __name__=='__main__':
  out={'zero_error_pc_frames':len(ZERO)}
  for src in ('G94','G93'):
    V,S,W,np_=collect(src);tot=sum(sum(c.values()) for c in V.values());ok=sum(c.most_common(1)[0][1] for c in V.values())
    wt=sum(sum(c.values()) for w in W.values() for c in w.values());wo=sum(c.most_common(1)[0][1] for w in W.values() for c in w.values())
    FT={t:c.most_common(1)[0][0] for t,c in V.items()}
    used=~MAG;fill=0
    for it in range(6):
      add={}
      for v,u in zip(*np.nonzero(used)):
        if (u,v) in FT:continue
        nb={FT[(u+a,v+b)] for a,b in((1,0),(-1,0),(0,1),(0,-1)) if (u+a,v+b) in FT}
        if len(nb)==1:add[(u,v)]=nb.pop()
      FT.update(add);fill+=len(add)
    out[src]=dict(pairs=np_,texels_voted=len(V),used=int(used.sum()),gap_filled=fill,unfilled=int(used.sum())-len([t for t in FT if used[t[1],t[0]]]),
      pixel_agreement=round(ok/tot,3),within_frame=round(wo/wt,3),texels_lt_0_9=sum(1 for c in V.values() if c.most_common(1)[0][1]/sum(c.values())<0.9))
    pickle.dump((V,S,FT),open(f'tex_{src}.pkl','wb'))
  json.dump(out,open('tex.json','w'),indent=1);print(json.dumps(out,indent=1))
