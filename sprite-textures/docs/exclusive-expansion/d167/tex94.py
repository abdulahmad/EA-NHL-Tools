# D167 step 1-2: Genesis Leafs texture (texel -> Genesis index) from console frames pixel-matched to 0-error PC frames.
import sys,json,pickle,collections,numpy as np
sys.path[:0]=['/workspace/preview_v2/exclusive_samples','/workspace/preview_v2/platform_unique/v2']
import render as RD
sys.path.insert(0,'/workspace/preview_v2/exclusive_samples/v2');from gpal import col
from cooc import A,rows
D=json.load(open('/tmp/sk_d163.json'));T=np.array(D['textures']['Leafs home']);MAG=np.all(T==(252,0,252),2)
def pcerr(f):
  px=np.array(f['px']);lab=np.array(f['lab']);tm=f['tmap'];e=0
  for y,x in zip(*np.nonzero(px!=255)):
    t=tm.get(f'{y},{x}')
    if t is None:e+=int(lab[y,x]) in RD.TEXD;continue
    if MAG[t[1],t[0]] or RD.pf2(int(px[y,x])) not in RD.FAM2.get(tuple(t),set()):e+=1
  return e
ZERO={int(k) for k,f in D['frames'].items() if f.get('tmap') and pcerr(f)==0}
def bb(a,tr):ys,xs=np.nonzero(a!=tr);return ys.min(),xs.min(),ys.max()+1,xs.max()+1
def pairs(src):
  P=[]
  for (t,n),r in rows.items():
    if t!=src or r['empty']:continue
    m=r['PC']
    if m['best'] not in ZERO or m['score']<0.7 or m['scale']!=1.0:continue
    g=A[src][n];p=A['PC'][m['best']];a=bb(g,0);b=bb(p,255)
    if (a[2]-a[0],a[3]-a[1])!=(b[2]-b[0],b[3]-b[1]):continue
    P.append((n,m['best'],bool(m['mirror']),a,b))
  return P
def corr(pr):
  """yield (gy,gx,py,px) aligned pixel pairs"""
  n,pn,mir,a,b=pr;h=a[2]-a[0];w=a[3]-a[1]
  for y in range(h):
    for x in range(w):yield a[0]+y,a[1]+x,b[0]+y,b[1]+(w-1-x if mir else x)
def votes(src):
  V=collections.defaultdict(collections.Counter);P=pairs(src)
  for pr in P:
    tm=D['frames'][str(pr[1])]['tmap'];g=A[src][pr[0]]
    for gy,gx,py,px in corr(pr):
      t=tm.get(f'{py},{px}');gv=col(int(g[gy,gx]))
      if t is None or gv==0:continue
      V[(t[0],t[1])][gv]+=1
  return V,P
REG={'arm R':(0,0,3,21),'front torso':(3,0,13,17),'arm L':(16,0,4,21),'back arm L':(20,0,4,21),'back torso':(24,0,10,17),'back arm R':(34,0,4,21),'pants':(0,17,38,6),'legs':(0,23,38,9)}
def zone(u,v):
  for k,(x,y,w,h) in REG.items():
    if x<=u<x+w and y<=v<y+h:return k
def build(V):
  G=np.zeros((32,38),int);st=collections.Counter();agree=[]
  for (u,v),c in V.items():
    (i,k),tot=c.most_common(1)[0],sum(c.values());G[v,u]=i;agree.append(k/tot);st['filled']+=1
    if len(c)>1:st['conflict texels']+=1
  used=~MAG;st['used texels']=int(used.sum());st['unfilled']=int((used&(G==0)).sum())
  for it in range(6):   # gap fill: unanimous filled 4-neighbours in the same zone
    add=[]
    for v,u in zip(*np.nonzero(used&(G==0))):
      nb={G[v+dv,u+du] for dv,du in((0,1),(0,-1),(1,0),(-1,0)) if 0<=v+dv<32 and 0<=u+du<38 and G[v+dv,u+du] and used[v+dv,u+du] and zone(u+du,v+dv)==zone(u,v)}
      if len(nb)==1:add.append((v,u,nb.pop()))
    for v,u,i in add:G[v,u]=i
    st['gap filled']+=len(add)
  st['still unfilled']=int((used&(G==0)).sum());st['mean agreement']=round(float(np.mean(agree)),3);st['texels agreement<0.9']=int(sum(a<0.9 for a in agree))
  return G,dict(st)
if __name__=='__main__':
  OUT={'zero_error_pc_frames':len(ZERO)}
  for src in ('G94','G93'):
    V,P=votes(src);G,st=build(V);OUT[src]=dict(pairs=len(P),**st);np.save(f'tex_{src}.npy',G);pickle.dump((V,P),open(f'votes_{src}.pkl','wb'))
  a=np.load('tex_G94.npy');b=np.load('tex_G93.npy');m=(a>0)&(b>0);OUT['G93_vs_G94 texels both']=int(m.sum());OUT['G93_vs_G94 differ']=int((a[m]!=b[m]).sum())
  # validation: render matched frames with the texture through their PC maps
  for src in ('G94','G93'):
    G=np.load(f'tex_{src}.npy');_,P=pickle.load(open(f'votes_{src}.pkl','rb'));c=collections.Counter()
    for pr in P:
      tm=D['frames'][str(pr[1])]['tmap'];g=A[src][pr[0]]
      for gy,gx,py,px in corr(pr):
        gv=col(int(g[gy,gx]))
        if gv==0:continue
        t=tm.get(f'{py},{px}')
        if t is None:c['no texel (stick/shadow/ice etc.)']+=1;continue
        c['px']+=1;c['match' if G[t[1],t[0]]==gv else 'mismatch']+=1
    OUT[src+' validation']=dict(c)
  json.dump(OUT,open('build.json','w'),indent=1);print(json.dumps(OUT,indent=1))
