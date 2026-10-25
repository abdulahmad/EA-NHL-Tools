# D174 (pt999u): straight-band 94G PALETTE-INDEX texture (same method as D169, votes on index not family) from all IoU>=0.97 aligned pairs + full gap fill.
import json,pickle,collections,numpy as np
from tex import *
FAMS=('white','navy','skin','black')
# Zones come from the texture layout: front view = cols 0-18, back view = cols 19-37. The PC Leafs magenta
# separators (cols 4 and 15, rows 9-16) give the sleeve/torso split. Rows 0-5 are helmet/head, kept per texel
# because the face is real vertical structure. Rows 6-20 are split into sleeve and torso; rows 21-31 are legs/socks.
def zone(u,v):
  if v<6:return None
  if v>=21:return 'legs'
  return 'torso' if (5<=u<=14 or 24<=u<=33) else 'sleeve'
# D174 (pt1002u): head rows 0-5 - helmet (white) shading indices collapse to one helmet index, skin shading to one skin index;
# the face/helmet boundary stays per texel. Shading inside helmet or skin counts as a match.
HEADC={43:44,45:44,38:39}
HEADOK={44:{43,44,45},39:{38,39}}
def build(min_col=0.6):
  V=collections.defaultdict(collections.Counter);np_=0
  for n,pn,mir,dy,dx in pairs('G94'):
    f=D['frames'][str(pn)];tm=f.get('tmap')
    if not tm:continue
    np_+=1;px=np.array(f['px']);g=A['G94'][n]
    for gy,gx,py,qx in corr(g,px,mir,dy,dx):
      gi=int(g[gy,gx]);t=tm.get(f'{py},{qx}')
      if t is not None and gi in GFAM:V[tuple(t)][HEADC.get(gi,gi) if t[1]<6 else gi]+=1
  used=~MAG;FT0={}
  # 1) row-band majority per (row, zone): the votes of every texel in the band are pooled
  B=collections.defaultdict(collections.Counter)
  for (u,v),c in V.items():
    z=zone(u,v)
    if z:B[(v,z)].update(c)
  FT={};how={};chg=[]
  for v,u in zip(*np.nonzero(used)):
    u,v=int(u),int(v);z=zone(u,v)
    if z is None:
      if (u,v) in V:FT[(u,v)]=V[(u,v)].most_common(1)[0][0];how[(u,v)]='own votes'
    elif B[(v,z)]:FT[(u,v)]=B[(v,z)].most_common(1)[0][0];how[(u,v)]='row band'
  # 2) vertical structure: a column inside a zone keeps its own family only if its own votes disagree with the row band in >=60% of that column's rows, consistently
  cols=[]
  for z in ('sleeve','torso','legs'):
    for u in range(38):
      rs=[v for v in range(32) if used[v,u] and zone(u,v)==z and (u,v) in V]
      if len(rs)<3:continue
      own={v:V[(u,v)].most_common(1)[0][0] for v in rs}
      dis=[v for v in rs if own[v]!=FT[(u,v)] and V[(u,v)].most_common(1)[0][1]/sum(V[(u,v)].values())>=0.7]
      if len(dis)/len(rs)>=min_col and len({own[v] for v in dis})==1:
        for v in dis:FT[(u,v)]=own[v];how[(u,v)]='column'
        cols.append((z,u,own[dis[0]],len(dis),len(rs)))
  # 3) gaps: same band evidence was step 1; next, head rows use unanimous voted neighbours; last, the PC Leafs family at that texel
  gap={t:None for t in zip(*np.nonzero(used.T)) if tuple(map(int,t)) not in V}
  for it in range(6):
    for v,u in zip(*np.nonzero(used)):
      u,v=int(u),int(v)
      if (u,v) in FT:continue
      nb={FT[(u+a,v+b)] for a,b in((1,0),(-1,0),(0,1),(0,-1)) if (u+a,v+b) in FT}
      if len(nb)==1:FT[(u,v)]=nb.pop();how[(u,v)]='neighbour'
  for v,u in zip(*np.nonzero(used)):
    u,v=int(u),int(v)
    if (u,v) not in FT:
      f=fam(T[v,u]);f=f if f in FAMS else 'white'
      # most-voted 94G index of that PC family in the same row band, else overall
      cand=collections.Counter({i:c for i,c in (B[(v,zone(u,v))] if zone(u,v) else collections.Counter()).items() if GFAM[i]==f}) or collections.Counter({i:c for cc in V.values() for i,c in cc.items() if GFAM[i]==f})
      FT[(u,v)]=cand.most_common(1)[0][0];how[(u,v)]='PC Leafs family -> commonest 94G index'
  gaps={(int(u),int(v)):how[(int(u),int(v))] for u,v in gap}
  for t,fm in FT.items():
    if t in FT0 and FT0[t]!=fm:chg.append((t,FT0[t],fm,how[t]))
  tot=sum(sum(c.values()) for c in V.values());ok=sum(c[FT[t]] for t,c in V.items())
  return V,FT,how,gaps,chg,cols,np_,round(ok/tot,3)
if __name__=='__main__':
  V,FT,how,gaps,chg,cols,np_,agr=build()
  pickle.dump((V,FT),open('tex174_idx.pkl','wb'))
  _,_,FF=pickle.load(open('tex_G94_d169.pkl','rb'))
  out=dict(pairs_used=np_,texels_voted=len(V),agreement_votes_vs_final=agr,gaps=len(gaps),gaps_by_method=dict(collections.Counter(gaps.values())),
    columns_kept=[list(map(str,c)) for c in cols],index_counts=dict(collections.Counter(map(str,FT.values()))),
    family_disagree_with_D169=sorted([list(t) for t in FT if GFAM[FT[t]]!=FF.get(t)]))
  json.dump(out,open('tex174_idx.json','w'),indent=1);print(json.dumps({k:v for k,v in out.items()},indent=0)[:1500])
