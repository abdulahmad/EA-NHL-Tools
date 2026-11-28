"""Injection helpers: register extra Genesis frames (95G / 96G, mapped to the 94G index layout) in the final3 pipeline
modules without writing into any final3* directory. np.load calls for injected frame keys are redirected to x95/inj/."""
import os,re,sys,pickle,numpy as np
INJ='/workspace/g94-to-pc-zones/v5/x95/inj/'
_orig=np.load
TAG={'final3c':'f3c','final3g':'f3g','final3j':'f3j','final3k':'f3k','final3':'f3','final3i':'f3i'}
def _load(path,*a,**k):
  if isinstance(path,str):
    m=re.search(r'g94_(9[56]\d{4})_',path)
    if m:
      d=os.path.basename(os.path.dirname(os.path.dirname(path))) if '/npy/' in path else os.path.basename(os.path.dirname(os.path.dirname(path)))
      parts='parts' in path
      path=INJ+TAG.get(d,d)+('_parts_' if parts else '_')+os.path.basename(path)
  return _orig(path,*a,**k)
np.load=_load
def put(tag,name,arr):np.save(INJ+tag+'_'+name,arr)
# 95G / 96G palette line 2 index -> 94G line 2 index (the layout every final3 model was trained on)
M95={1:2,2:13,3:11,4:12,5:6,6:7,7:1,8:1,9:8,10:9,13:10,11:4,12:3,14:14,15:15}
GOALIE95={7:9,8:10}   # goalie gear (pads, blocker, catcher): 95G constant grey/white -> 94G stripe-light 41 / flat 42
def gmap95(img,kind='skater'):
  """95G sprite (pixel = 32+idx) -> 94G-layout array (33..47, 0 background). 94 idx: 2 black, 3/4/5 pants dark/med/light,
  6/7 skin, 8/9 stripe B, 10 stripe C, 11/12/13 jersey med/light/dark, 14 stick, 15 shadow, 1 blade."""
  out=np.zeros(img.shape,np.int64)
  for v in np.unique(img):
    if v==0:continue
    j=int(v)-32
    out[img==v]=32+(GOALIE95.get(j,M95[j]) if kind=='goalie' else M95[j])
  return out
def register(specs):
  import common,arm3e,train3e,seg3d,segsk,run3g
  for s in specs:
    K=s['K'];g=s['g'];kind=s['kind'];pr=s.get('pr')
    common.A['G94'][K]=g
    if pr:common.PR[K]=pr;seg3d.HELD.add(K);segsk.HELD_SK.add(K)
    arm3e.KIND[K]=kind
    run3g.R3C[K]=dict(g94=K,kind=kind,held_out=bool(pr),paired=bool(pr),pc_partner_his=None)
    ex=arm3e.excl(K);tk=arm3e.topk(K,5,ex)
    F,idx,J1,_=arm3e.features(K,tk) if tk else (None,None,None,None)
    train3e.D[K]=dict(tk=[(float(a),int(b),bool(c),int(d),int(e)) for a,b,c,d,e in tk],F=F,idx=idx,J1=J1,y=None,nex=len(ex))
# 96G line-2 index -> 94G line-2 index. 96: 1 outline navy, 2/3/4 jersey ramp, 5 skin, 7 yoke/third colour, 8 & 11 blade,
# 9 helmet, 10 stripe colour, 12/13 pants ramp, 14 stick, 15 shadow (6 unused)
M96={1:2,2:13,3:11,4:12,5:6,6:7,7:10,8:1,9:4,10:9,11:1,12:3,13:4,14:14,15:15}
GOALIE96={8:10,11:9}
def gmap96(img,kind='skater'):
  out=np.zeros(img.shape,np.int64)
  for v in np.unique(img):
    if v==0:continue
    j=int(v)-32;out[img==v]=32+(GOALIE96.get(j,M96[j]) if kind=='goalie' else M96[j])
  return out
