"""D180b: hard skeleton constraints (Abdul t1016u), shared by the SNES converter, PC/94G fits and editor auto-fit.
(1) exist: every joint and bone sample (0.5 px steps) lies on a non-transparent pixel.
(2) zone: each pixel's nearest bone has a part allowed for that pixel's colour zone (D174 table / family table).
(3) cover: every body pixel (not ice/shadow) is within COVER px of some bone, else it is an orphan.
enforce() moves joints (<=2 px each, coordinate search) to minimise violations; joints are never added or removed."""
import numpy as np
COVER=2.5
RAD={1:4.0,2:6.0,3:5.0,4:3.5,7:3.5}   # torso/pelvis/head are wide: radius per part (others COVER)
def part_of(a,b):
    s=a+' '+b;p=11 if 'toe' in b else 10 if 'stick' in s else 1 if a=='head' else 6 if ('glove' in b or 'hand' in s) else 4 if ('elbow' in b or 'elb' in b) else 5 if ('wrist' in b or 'Rhand' in b or 'Lhand' in b) else 3 if ('hip' in b) else 7 if 'knee' in b else 8 if ('ankle' in b or 'ank' in b) else 9 if 'skate' in b else 2
    return p
def _seg(P,A,B):
    d=B-A;L=max(1e-9,d@d);t=np.clip(((P-A)@d)/L,0,1);Q=A+t[:,None]*d;return np.hypot(*(Q-P).T)
def check(mask,body,allowed,J,bones,off=0.0):
    """mask: HxW bool non-transparent; body: HxW bool pixels needing cover; allowed: dict (y,x)->set(parts) or None;
    J: joint->(x,y) in pixel units, centre of pixel = +off. Returns counts and per-check pixel lists."""
    H,W=mask.shape;bs=[(a,b) for a,b in bones if a in J and b in J]
    def on(x,y):
        xi,yi=int(np.floor(x+0.5-off+1e-6)) if False else int(np.floor(x-off+0.5)),int(np.floor(y-off+0.5))
        return 0<=xi<W and 0<=yi<H and mask[yi,xi]
    offs=[];
    for k,(x,y) in J.items():
        if not on(x,y):offs.append(('joint',k))
    for a,b in bs:
        A=np.array(J[a],float);B=np.array(J[b],float);n=max(2,int(np.hypot(*(B-A))*2)+1);t=np.linspace(0,1,n)[:,None];Q=A+(B-A)*t
        xi=np.floor(Q[:,0]-off+0.5).astype(int);yi=np.floor(Q[:,1]-off+0.5).astype(int);ok=(xi>=0)&(yi>=0)&(xi<W)&(yi<H)
        good=np.zeros(n,bool);good[ok]=mask[yi[ok],xi[ok]];bad=int((~good).sum())
        if bad:offs.append(('bone',a+'-'+b,bad))
    ys,xs=np.nonzero(mask);P=np.stack([xs+off,ys+off],1).astype(float)
    if bs:
        D=np.stack([_seg(P,np.array(J[a],float),np.array(J[b],float))-RAD.get(part_of(a,b),COVER)+COVER for a,b in bs],1);near=D.argmin(1);dmin=D.min(1)
    else:near=np.zeros(len(P),int);dmin=np.full(len(P),99.)
    bodyv=body[ys,xs];orph=[(int(x),int(y)) for x,y in zip(xs[bodyv&(dmin>COVER)],ys[bodyv&(dmin>COVER)])]
    zone=[]
    if allowed is not None and bs:
        AL=allowed if isinstance(allowed,np.ndarray) else None
        if AL is None:
            AL=np.zeros((len(P),13),bool)
            for i,(y,x) in enumerate(zip(ys,xs)):
                al=allowed.get((y,x))
                if al:AL[i,list(al)]=True
                else:AL[i,:]=True
            check.cacheAL=AL
        pp=np.array([part_of(a,b) for a,b in bs])[near];bad=~AL[np.arange(len(P)),pp]
        zone=[(int(x),int(y)) for x,y in zip(xs[bad],ys[bad])]
    nb=sum(o[2] for o in offs if o[0]=='bone')
    return dict(exist=len(offs),exist_samples=nb,zone=len(zone),orphan=len(orph),offs=offs,zone_px=zone,orphan_px=orph)
def cost(c):return 10*c['exist']+c['exist_samples']+c['zone']+3*c['orphan']
def enforce(mask,body,allowed,J,bones,off=0.0,R=2,sweeps=2):
    if isinstance(allowed,dict):check(mask,body,allowed,J,bones,off);allowed=check.cacheAL
    J={k:tuple(map(float,v)) for k,v in J.items()};J0=dict(J);best=check(mask,body,allowed,J,bones,off);bc=cost(best)
    for _ in range(sweeps):
        if cost(best)==0:break
        moved=False;bad=set()
        for o in best['offs']:bad.update([o[1]] if o[0]=='joint' else o[1].split('-',1) if '-' in o[1] and o[1].split('-',1)[0] in J else [])
        for a,b in bones:
            if a+'-'+b in [o[1] for o in best['offs']]:bad.update([a,b])
        pts=best['zone_px']+best['orphan_px']
        if pts:
            Pp=np.array(pts,float)+off
            for a,b in bones:
                if a in J and b in J and _seg(Pp,np.array(J[a]),np.array(J[b])).min()<RAD.get(part_of(a,b),COVER)+3:bad.update([a,b])
        for k in [k for k in J if k in bad]:
            x0,y0=J0[k];cur=J[k]
            for dx in range(-R,R+1):
                for dy in range(-R,R+1):
                    if (x0+dx,y0+dy)==cur:continue
                    T=dict(J);T[k]=(x0+dx,y0+dy);c=check(mask,body,allowed,T,bones,off);cc=cost(c)+0.3*(abs(dx)+abs(dy))
                    if cc<bc+0.3*(abs(cur[0]-x0)+abs(cur[1]-y0))-1e-9:J=T;best=c;bc=cost(c);cur=J[k];moved=True
        if not moved:break
    return J,best

# ---- editor bundle frames (PC skater/goalie and Genesis exclusives)
ZONE={33:[6,9,10,11],34:[6,9,10,11],35:[7,3],37:[7,3],36:[7,2,3],38:[1],39:[1],40:[5,8,7,2,4,3],42:[5,8,7,2,4,3],41:[5,8,2,4,3],43:[5,1,8,2,4,3],44:[5,1,8,2,4,3],45:[5,6,1,2,4]}
MATOK={'skater':{2:[1,6],3:[1],4:[2,3,4],5:[2],6:[2,4],7:[4,5],8:[6,5],9:[7,3],10:[8],11:[9],12:[9],13:[10,11,6]},'goalie':{2:[1],3:[6,5],4:[6,5],5:[10,11,6],6:[8,7,9],7:[8,7,9],8:[9]}}
SHADOW={'skater':14,'goalie':9}
SKC={'before':[0,0,0],'after':[0,0,0],'frames_before':0,'frames_after':0}
def constrain_frame(f):
  px=np.array(f['px']);mask=px!=255
  if f['pal']=='genesis':body=mask&(px!=47)&(px!=0);al={(y,x):set(ZONE[px[y,x]]) for y,x in zip(*np.nonzero(mask)) if px[y,x] in ZONE}
  elif f['lab']:
    lab=np.array(f['lab']);body=mask&(lab!=SHADOW[f['kind']])&(lab!=0);M=MATOK[f['kind']];al={(y,x):set(M[lab[y,x]]) for y,x in zip(*np.nonzero(mask)) if lab[y,x] in M}
  else:return
  if not f['joints']:return
  b=check(mask,body,al,f['joints'],f['bones'])
  if f['edited']:a=b
  else:
    J,a=enforce(mask,body,al,f['joints'],f['bones']);f['joints']={k:[int(round(v[0])),int(round(v[1]))] for k,v in J.items()}
  for i,k in enumerate(('exist','zone','orphan')):SKC['before'][i]+=b[k];SKC['after'][i]+=a[k]
  SKC['frames_before']+=any(b[k] for k in('exist','zone','orphan'));SKC['frames_after']+=any(a[k] for k in('exist','zone','orphan'))
  f['skc']=dict(exist=a['exist'],zone=a['zone'],orphan=a['orphan'],zone_px=a['zone_px'],orphan_px=a['orphan_px'])
  if a['exist']:f['why'].append(f"{a['exist']} joints/bones off-pixel")
  if a['zone']:f['why'].append(f"{a['zone']} px zone-part conflict")
  if a['orphan']:f['why'].append(f"{a['orphan']} orphan px (no bone near)")
