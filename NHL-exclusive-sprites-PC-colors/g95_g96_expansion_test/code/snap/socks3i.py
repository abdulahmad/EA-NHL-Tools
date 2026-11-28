"""final3i socks: three candidate rows per sock + a learned chooser (training pairs only).
 G0 = stripe 1 on the Genesis light sock-band row (final3g-like anchor)   G1 = one row above it (final3h)
 P  = PC-position model: a regressor predicts the real-PC stripe-1 row from the sock's top, height, width and Genesis band rows
Each draws stripe 1 and stripe 2 (row below) across the sock's full width."""
import sys,pickle;sys.path.insert(0,'/workspace/g94-to-pc-zones/v5/final3j/work')
from stripes3d import *
SOCKF3=('socks','socks stripe 1','socks stripe 2');SS=('socks stripe 1','socks stripe 2')
def comps(out,g):
  fam=famof(out);m=np.isin(fam,SOCKF3);lb,nl=ndi.label(m,np.ones((3,3)));res=[]
  for i in range(1,nl+1):
    c=lb==i
    if c.sum()<4:continue
    light=c&np.isin(g,[40,41]);dark=c&(g==42)
    if not (light.any() or dark.any()):continue
    ys,xs=np.nonzero(c);top=int(ys.min());h=int(ys.max()-top+1);w=int(xs.max()-xs.min()+1)
    if light.any():
      cnt={r:int(light[r].sum()) for r in set(np.nonzero(light)[0].tolist())};rG=min(cnt,key=lambda r:(-cnt[r],r))
    else:
      cnt={r:int(dark[r].sum()) for r in set(np.nonzero(dark)[0].tolist())};rG=min(cnt,key=lambda r:(-cnt[r],r))-1
    rd=int(np.nonzero(dark)[0].mean()) if dark.any() else rG+1
    f=dict(top=top,h=h,w=w,n=int(c.sum()),gl=rG-top,gd=rd-top,haslight=int(light.any()),nlight=int(light.sum()),ndark=int(dark.sum()),
           cx=float(xs.mean()),rows_below=int(ys.max()-rG))
    res.append((c,rG,f))
  return res
SF_=['top','h','w','n','gl','gd','haslight','nlight','ndark','rows_below']
def draw(out,g,c,r1):
  H,W=out.shape;fam=famof(out)
  for y,x in zip(*np.nonzero(c&np.isin(fam,SS))):out[y,x]=at('socks',shade_of(out[y,x]))
  for r0 in (r1,r1+1,r1-1,r1+2,r1-2):
    if 0<=r0 and r0+1<H and c[r0].any() and c[r0+1].any():
      for r,f in ((r0,'socks stripe 1'),(r0+1,'socks stripe 2')):
        for x in np.nonzero(c[r])[0]:out[r,x]=at(f,LV.get(int(g[r,x])) or shade_of(out[r,x]))
      return r0
  return None
SM=None;KPRED=[None];FORCE_SOCK=[None]
def sock_choose(out,g,log=None):
  global SM
  if SM is None:SM=pickle.load(open('/workspace/g94-to-pc-zones/v5/final3j/work/sockmodel.pkl','rb'))
  recs=[]
  for c,rG,f in comps(out,g):
    rP=f['top']+int(round(SM['reg'].predict([[f[k] for k in SM['RF']]])[0]))
    cands={'G0':rG,'G1':rG-1,'P':rP}
    x=[f[k] for k in SM['RF']]+[rP-rG]
    ch=SM['CN'][int(SM['clf'].predict([x])[0])]
    if FORCE_SOCK[0] in cands:
      ch=FORCE_SOCK[0]
    elif KPRED[0] is not None:
      kp,km=KPRED[0];cd=ndi.binary_dilation(c,np.ones((3,3)));best=None
      for k in ('P','G1','G0'):
        o=out.copy();draw(o,g,c,cands[k]);fo=famof(o);sc=int(((fo==kp)&km&cd).sum())
        if best is None or sc>best[0]:best=(sc,k)
      ch=best[1]
    r=draw(out,g,c,cands[ch]);recs.append(dict(part='sock3i',choice=ch,row1=r,cands=cands))
  if log is not None:log+=recs
  return recs
