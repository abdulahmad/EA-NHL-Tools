"""D187 (Abdul pt1039u): every frame's skeleton is one connected tree.
  spine  head-neck-chest-belly-pelvis
  arms   chest-shoulder-elbow-wrist-hand (L and R)
  legs   pelvis-hip-knee-ankle-foot (L and R)
  stick  butt-heel-toe, attached to the hand nearest the shaft (unless the frame is flagged no-stick)
connect(f) keeps every existing joint, infers the missing ones (interpolate between known chain neighbours, else extend
the chain by its last step, else a default step), snaps each inferred joint to the nearest sprite px, and replaces
f['bones'] with the canonical tree using the frame's own joint names. Inferred joint names go to f['inferred']."""
import numpy as np
SLOT={'head':['head'],'neck':['neck'],'chest':['chest'],'belly':['belly'],'pelvis':['pelvis'],
 'BT':['stick butt'],'HL':['stick heel'],'TO':['stick toe']}
for s,S in (('L','L'),('R','R')):
  SLOT.update({s+'S':[S+' shoulder',S+'sh'],s+'E':[S+' elbow',S+'elb'],s+'W':[S+' wrist'],s+'H':[S+' glove',S+'hand'],
               s+'P':[S+' hip',S+'hip'],s+'K':[S+' knee',S+'knee'],s+'A':[S+' ankle'],s+'F':[S+' skate',S+'ank']})
SPINE=['head','neck','chest','belly','pelvis']
CHAINS=[(SPINE,(0,3))]+[(['chest',s+'S',s+'E',s+'W',s+'H'],(d*2,2)) for s,d in (('L',-1),('R',1))]+[(['pelvis',s+'P',s+'K',s+'A',s+'F'],(d,3)) for s,d in (('L',-1),('R',1))]
STICK=['BT','HL','TO']
def names(J,kind):
  """slot -> joint name: the existing one, else the first alias (goalies use their short names where they have one)."""
  out={}
  for s,al in SLOT.items():
    hit=[a for a in al if a in J];out[s]=hit[0] if hit else (al[-1] if kind=='goalie' and len(al)>1 else al[0])
  return out
def _fill(P,chain,step):
  known=[i for i,s in enumerate(chain) if s in P]
  if not known:return
  for i,s in enumerate(chain):
    if s in P:continue
    lo=[k for k in known if k<i];hi=[k for k in known if k>i]
    if lo and hi:a,b=lo[-1],hi[0];t=(i-a)/(b-a);P[s]=P[chain[a]]+(P[chain[b]]-P[chain[a]])*t
    elif lo:
      a=lo[-1];st=(P[chain[a]]-P[chain[lo[-2]]])/(a-lo[-2]) if len(lo)>1 else np.array(step,float);P[s]=P[chain[a]]+st*(i-a)
    else:
      b=hi[0];st=(P[chain[hi[1]]]-P[chain[b]])/(hi[1]-b) if len(hi)>1 else np.array(step,float);P[s]=P[chain[b]]-st*(b-i)
    known=sorted(known+[i])
def is_connected(f,J=None,bones=None,grip=None):
  """one tree over the frame's joints: bones + the stick joined to a hand (grip(J)->hand or None)."""
  J=f['joints'] if J is None else J;bones=f['bones'] if bones is None else bones;ns=f.get('nostick')
  ks=[k for k in J if not (ns and k.startswith('stick'))]
  if not ks:return False
  par={k:k for k in ks}
  def fd(k):
    while par[k]!=k:par[k]=par[par[k]];k=par[k]
    return k
  for a,b in bones:
    if a in par and b in par:par[fd(a)]=fd(b)
  h=grip(J) if grip else None
  if h and 'stick butt' in par and h in par:par[fd(h)]=fd('stick butt')
  return len({fd(k) for k in ks})==1
def near_hand(J):
  if 'stick butt' not in J or 'stick heel' not in J:return None
  A=np.array(J['stick butt'],float);B=np.array(J['stick heel'],float);d=B-A;L=max(1e-9,d@d);best=None
  for h in ('L glove','R glove','Lhand','Rhand'):
    if h not in J:continue
    P=np.array(J[h],float);t=np.clip((P-A)@d/L,0,1);q=np.hypot(*(A+t*d-P))
    if best is None or q<best[0]:best=(q,h)
  return best[1] if best else None
def connect(f):
  px=np.array(f['px']);ys,xs=np.nonzero(px!=255);J=f['joints'];N=names(J,f['kind'])
  P={s:np.array(J[N[s]],float) for s in SLOT if N[s] in J}
  if not any(s in P for s in SPINE):   # no spine at all: head at the top centre, pelvis at 60 % height
    x0,x1,y0,y1=xs.min(),xs.max(),ys.min(),ys.max();P['head']=np.array([(x0+x1)/2,y0+2.]);P['pelvis']=np.array([(x0+x1)/2,y0+0.6*(y1-y0)])
  for chain,step in CHAINS:_fill(P,chain,step)
  inf=[];pts=np.stack([xs,ys],1)
  for s,p in P.items():
    if N[s] in J or s in STICK:continue
    q=pts[np.argmin(np.hypot(*(pts-p).T))];J[N[s]]=[int(q[0]),int(q[1])];inf.append(N[s])
  # stick: fit from stick-labelled px (skater 13, goalie 5): butt = stick px nearest a hand, toe = farthest from the butt,
  # heel = stick px nearest 80 % of the way; no stick px at all -> flagged no-stick (auto)
  if not f.get('nostick') and not all(N[s] in J for s in STICK):
    sl={'skater':13,'goalie':5}.get(f['kind']);lab=np.array(f['lab']) if f.get('lab') and sl else None
    sp=np.stack(np.nonzero(lab==sl)[::-1],1) if lab is not None else np.zeros((0,2))
    if len(sp)>=3:
      hands=[np.array(J[N[h]],float) for h in ('LH','RH')]
      dh=np.min([np.hypot(*(sp-h).T) for h in hands],0);b=sp[dh.argmin()];t=sp[np.hypot(*(sp-b).T).argmax()]
      m=b+0.8*(t-b);hq=sp[np.hypot(*(sp-m).T).argmin()]
      for s_,q in zip(STICK,(b,hq,t)):
        if N[s_] not in J:J[N[s_]]=[int(q[0]),int(q[1])];inf.append(N[s_])
    else:f['nostick']=True;f['nostick_src']='auto (no stick px)'
  B=[]
  for chain,_ in CHAINS:B+=[[N[a],N[b]] for a,b in zip(chain,chain[1:])]
  if not f.get('nostick'):B+=[[N[a],N[b]] for a,b in zip(STICK,STICK[1:]) if N[a] in J and N[b] in J]
  f['bones']=B;f['inferred']=sorted(set(f.get('inferred',[]))|set(inf));return f
