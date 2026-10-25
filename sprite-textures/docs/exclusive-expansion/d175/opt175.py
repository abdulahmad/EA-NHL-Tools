# D174: fit the 19-bone skeleton jointly with the per-bone warp (coordinate descent on joints, warp re-fitted per move).
# Objective = family errors + 0.5*nudges + plausibility (length vs prior, joint angle, L/R symmetry, bone on own pixels).
import json,pickle,sys,time,numpy as np,collections
import warp173 as W3
import warp172 as W7,skel173 as SKM
W3.PALZ[0]={int(k):(set(v['allowed']) if v['allowed'] is not None else None) for k,v in json.load(open('/workspace/preview_v2/exclusive_samples/v3/palzone174.json')).items()}
from fam import D
V,S,FT=pickle.load(open('tex_G94_d169.pkl','rb'))
# D174 (pt999u): the palette-index texture is the primary key for the fit
_,FI=pickle.load(open('tex175_ctl.pkl','rb'));from tex175ctl import GROUPS;FT=W3.IdxKey(FI,GROUPS,allrows=True);W3.IDX[0]=True
R=pickle.load(open('../v2/map3.pkl','rb'));RT=pickle.load(open('../v2/retry.pkl','rb'))
def frame(s,n):
  for (s2,n2,d),r in R.items():
    if (s2,n2)==(s,n):
      tm,lab=r['tmap'],r['lab']
      if not tm:
        for (s3,n3,d3),r3 in RT.items():
          if (s3,n3)==(s,n) and r3['tmap']:tm,lab=r3['tmap'],r3['lab']
      return r['g'],tm or {},lab
def plaus(J,Jp,bones,g):
  pen=0;body=g>0
  L=lambda S_,a,b:float(np.hypot(*(np.array(S_[a])-np.array(S_[b]))))
  for a,b,k in bones:
    if a not in J or b not in J:continue
    if Jp and a in Jp and b in Jp and 'stick' not in a:
      lp=L(Jp,a,b);l=L(J,a,b)
      if lp>2:r=l/lp;pen+=4*max(0,0.6-r)/0.1+4*max(0,r-1.6)/0.1*0.5
    m=(np.array(J[a])+np.array(J[b]))/2;y,x=int(round(m[1])),int(round(m[0]))
    if not(0<=y<g.shape[0] and 0<=x<g.shape[1] and body[y,x]):pen+=3
  for sd in 'LR':
    for a,b,c in (('shoulder','elbow','wrist'),('hip','knee','ankle')):
      P_=[J.get(f'{sd} {q}') for q in (a,b,c)]
      if None in P_:continue
      u=np.array(P_[0])-P_[1];v=np.array(P_[2])-P_[1];nu,nv=np.hypot(*u),np.hypot(*v)
      if nu>1 and nv>1 and np.degrees(np.arccos(np.clip(u@v/(nu*nv),-1,1)))<25:pen+=5
  for k in ('upperarm','forearm','thigh','shin'):
    ls=[L(J,a,b) for a,b,z in bones if z.endswith(k) and a in J and b in J]
    if len(ls)==2 and min(ls)>2 and max(ls)/min(ls)>2.2:pen+=3
  return pen
def evaluate(key,g,tm,lab,J,bones,Jp):
  W3.SK[key]={'joints':{n:list(map(float,p)) for n,p in J.items()},'bones':bones};W3.CUR['k']=key;W7.EXC.clear()
  out,how,F,OL,_=W3.warp(g,tm,lab,FT)
  e=sum(1 for p,t in out.items() if FT.get(t)!=F[p]);nd=how.get('exception (1-texel nudge)',0)
  pl=plaus(J,Jp,bones,g);return e+0.5*nd+pl,e,nd,pl
def optimise(key,g,tm,lab,J,bones,Jp,passes=2):
  W3.SWEEPS[0]=2;body=set(map(tuple,np.argwhere(g>0)[:,::-1].tolist()))
  best=evaluate(key,g,tm,lab,J,bones,Jp)
  for ps in range(passes):
    improved=False
    for n in [n for n in J if not n.startswith('stick')]:
      for dx,dy in ((1,0),(-1,0),(0,1),(0,-1),(2,0),(-2,0),(0,2),(0,-2)):
        q=(J[n][0]+dx,J[n][1]+dy)
        if (int(round(q[0])),int(round(q[1]))) not in body:continue   # joints stay on sprite pixels
        J2=dict(J);J2[n]=q;sc=evaluate(key,g,tm,lab,J2,bones,Jp)
        if sc[0]<best[0]:best,J,improved=sc,J2,True
    if not improved:break
  W3.SWEEPS[0]=6;final=evaluate(key,g,tm,lab,J,bones,Jp)
  return J,final
if __name__=='__main__':
  SK0=json.load(open('skel174.json'));OUT={};t0=time.time()
  for key in sorted(SK0,key=lambda k:(k[:3]!='G93',int(k[4:]))):
    s,n=key.split('_');n=int(n);g,tm,lab=frame(s,n);sk=SK0[key];bones=[tuple(b) for b in sk['bones']]
    Jp=None
    if sk['prior'] is not None:
      k=str(sk['prior']);_,mir,dy,dx=SKM.best_align((g>0).astype(np.uint8),SKM.PCM[k].astype(np.uint8));Jp={a:list(b) for a,b in SKM.transfer(k,mir,dy,dx,SKM.PCM[k].shape[1]).items()}
    inits=[('D174',{a:tuple(b) for a,b in sk['joints'].items()},Jp,sk['prior'])]
    flagged=any('IoU' not in f for f in sk['flags'])
    if False:   # D175: init from D174 joints only   # alternative inits: next-best PC poses
      m=(g>0).astype(np.uint8);h,w=np.ptp(np.nonzero(m)[0])+1,np.ptp(np.nonzero(m)[1])+1;A_=m.sum()
      q=lambda k:abs(np.ptp(np.nonzero(SKM.PCM[k])[0])+1-h)+abs(np.ptp(np.nonzero(SKM.PCM[k])[1])+1-w)+abs(SKM.PCM[k].sum()-A_)/10
      sc=[(SKM.best_align(m,SKM.PCM[k].astype(np.uint8)),k) for k in sorted(SKM.PCK,key=q)[:60]]
      sc=sorted(sc,key=lambda c:-c[0][0])
      for (iou,mir,dy,dx),k in [c for c in sc if c[1]!=str(sk['prior'])][:2]:
        Jp2={a:list(b) for a,b in SKM.transfer(k,mir,dy,dx,SKM.PCM[k].shape[1]).items()};J2,_=SKM.snap({a:np.array(b) for a,b in Jp2.items()},g,lab)
        inits.append((f'PC {k}',{a:tuple(b) for a,b in J2.items()},Jp2,int(k)))
    res=[]
    for name,J,Jp_,pr in inits:
      Jo,sc=optimise(key,g,tm,lab,J,bones,Jp_);res.append((sc,name,Jo,Jp_,pr))
    sc,name,Jo,Jp_,pr=min(res,key=lambda r:r[0][0])
    why=SKM.sanity({a:np.array(b,float) for a,b in Jo.items()},{a:np.array(b,float) for a,b in Jp_.items()}) if Jp_ else ['no body: loose-equipment skeleton']
    OUT[key]=dict(init=name,prior=pr,joints={a:[round(float(c),2) for c in b] for a,b in Jo.items()},bones=[list(b) for b in bones],
      errors=sc[1],nudges=sc[2],plaus=round(sc[3],1),tried=[(r[1],r[0][1],r[0][2]) for r in res],flags=why,iou=sk['iou'])
    print(key,name,sc,why,round(time.time()-t0),flush=True)
  json.dump(OUT,open('skel175.json','w'),indent=1)
