"""D178 staged pipeline: (1) skeleton pose fit on SNES, (2) body-part labels, (3) skeleton-driven scale to 94G proportions,
(4) colour by part+zone, smooth, keep zones connected, verbatim 94G heads. Train on matched pairs; HOLD animations never seen."""
import json,pickle,sys
from conv2 import *
from facing import gdir,feat,train as ftrain
from sklearn.ensemble import RandomForestClassifier
BUN='/workspace/EA-NHL-Tools/sprite-textures/editor/data/bundle.js'
_s=open(BUN).read();_B=json.loads(_s[_s.index('{'):_s.rstrip().rstrip(';').rindex('}')+1])
PCF={int(f['id'].split()[-1]):f for f in _B['frames'] if f['kind']=='skater'}
BONES=PCF[12]['bones'];JN=list(PCF[12]['joints'])
GROW={int(x['frame']):x for x in rows if x['set']=='G94'}
def off_align(a,b):
    """best (dy,dx) placing mask a on mask b"""
    ma,mb=a>0,b>0;best=(-1,0,0)
    for dy in range(-ma.shape[0]+1,mb.shape[0]):
        for dx in range(-ma.shape[1]+1,mb.shape[1]):
            y0,x0=max(0,dy),max(0,dx);y1,x1=min(mb.shape[0],dy+ma.shape[0]),min(mb.shape[1],dx+ma.shape[1])
            if y1<=y0 or x1<=x0:continue
            i=(ma[y0-dy:y1-dy,x0-dx:x1-dx]&mb[y0:y1,x0:x1]).sum();u=ma.sum()+mb.sum()-i;s=i/u
            if s>best[0]:best=(s,dy,dx)
    return best
def gt_g94(n):
    r=GROW.get(n)
    if not r or r['PC_class']!='match' or r['PC_mirror']!='False' or float(r['PC_scale'])!=1.0:return None
    pc=int(r['PC_best']);f=PCF.get(pc)
    if not f or not f.get('joints') or len(f['joints'])<len(JN):return None
    px=np.array(f['px']);a=np.where(px==255,0,1);iou,dy,dx=off_align(a,A['G94'][n])
    if iou<0.8:return None
    return {k:(v[0]+dx,v[1]+dy) for k,v in f['joints'].items()}   # (x,y) on the 94G frame
# ---------- pairs with GT joints in SNES coords
def build():
    P=[];
    for s,g,grp in pairs():
        J=gt_g94(g)
        if J is None:continue
        a=A['S94'][s];Ss=sscale(a);iou,dy,dx=off_align(Ss,A['G94'][g])
        if iou<0.55:continue
        sy,sx=Ss.shape[0]/a.shape[0],Ss.shape[1]/a.shape[1]
        JS={k:((x-dx)/sx,(y-dy)/sy) for k,(x,y) in J.items()}
        P.append(dict(s=s,g=g,grp=grp,JG=J,JS=JS,iou=iou))
    return P
# ---------- stage 1: skeleton fit = kNN pose retrieval in bbox-normalised coords + snapping
def desc(a):
    F=MF(FS[a]);ys,xs=np.nonzero(a);F=F[ys.min():ys.max()+1,xs.min():xs.max()+1]
    from facing import rs
    return np.concatenate([rs(F==k,16,12).ravel()*(2 if k in(4,5) else 1) for k in(1,2,4,5)]+[rs(F>0,16,12).ravel(),[F.shape[1]/F.shape[0]*3]])
def bbox(a):ys,xs=np.nonzero(a);return xs.min(),ys.min(),xs.max()+1,ys.max()+1
def norm(J,a):x0,y0,x1,y1=bbox(a);return {k:((x-x0)/(x1-x0),(y-y0)/(y1-y0)) for k,(x,y) in J.items()}
def denorm(N,a):x0,y0,x1,y1=bbox(a);return {k:(x0+u*(x1-x0),y0+v*(y1-y0)) for k,(u,v) in N.items()}
SNAPF={'head':(2,4),'R glove':(1,),'L glove':(1,),'R skate':(1,),'L skate':(1,),'stick butt':(5,1),'stick heel':(5,1),'stick toe':(5,1)}
class Skel:
    def __init__(s,train,k=3,snap=True):
        s.D=np.array([desc(A['S94'][p['s']]) for p in train]);s.N=[norm(p['JS'],A['S94'][p['s']]) for p in train];s.k=k;s.snap=snap
    def fit(s,a):
        d=((s.D-desc(a))**2).sum(1);idx=np.argsort(d)[:s.k];w=1/(d[idx]+1e-3)
        N={k:(sum(w[i]*s.N[j][k][0] for i,j in enumerate(idx))/w.sum(),sum(w[i]*s.N[j][k][1] for i,j in enumerate(idx))/w.sum()) for k in JN}
        J=denorm(N,a)
        if s.snap:
            F=MF(FS[a])
            for k,fams in SNAPF.items():
                ys,xs=np.nonzero(np.isin(F,fams))
                if len(ys):
                    x,y=J[k];dd=(xs+.5-x)**2+(ys+.5-y)**2;i=dd.argmin()
                    if dd[i]<9:J[k]=(xs[i]+.5*0+ (x-xs[i])*0.0+0.0 if False else 0.5*x+0.5*xs[i],0.5*y+0.5*ys[i])
        return J
def jerr(J,G):return float(np.mean([np.hypot(J[k][0]-G[k][0],J[k][1]-G[k][1]) for k in JN]))
# ---------- stage 2: parts from skeleton (+ zone constraint), as in the editor
PARTOF={}
for a_,b_ in BONES:
    s_=a_+' '+b_;p=11 if 'toe' in b_ else 10 if 'stick' in s_ else 1 if a_=='head' else 6 if 'glove' in b_ else 4 if 'elbow' in b_ else 5 if 'wrist' in b_ else 3 if 'hip' in b_ else 7 if 'knee' in b_ else 8 if 'ankle' in b_ else 9 if 'skate' in b_ else 2
    PARTOF[(a_,b_)]=p+(100 if b_.startswith('R ') and p in(4,5,6,7,8,9) else 0)
FAMOK={4:{1},5:{10,11},6:{12},1:{6,9,11,1,10}}   # skin->head, stick->shaft/blade, ice->other, black->hand/skate/blade/head(eyes)/shaft
def parts(a,J):
    H,W=a.shape;o=np.zeros((H,W),int);F=FS[a]
    segs=[(PARTOF[(p,q)],np.array(J[p]),np.array(J[q])) for p,q in BONES if p in J and q in J]
    for y,x in zip(*np.nonzero(a)):
        c=np.array([x+.5,y+.5]);best=None
        ok=FAMOK.get(F[y,x])
        for part,P0,P1 in segs:
            if ok and part%100 not in ok:continue
            d=P1-P0;t=np.clip(((c-P0)@d)/max(1e-9,d@d),0,1);dist=np.hypot(*(P0+t*d-c))
            if best is None or dist<best[0]:best=(dist,part)
        o[y,x]=best[1] if best else 12
    return o
# ---------- stage 3: skeleton-driven scaling (per-bone length ratios learned on train)
def bone_ratio(train):
    R={}
    for p,q in BONES:
        r=[np.hypot(*np.subtract(t['JG'][q],t['JG'][p]))/max(.5,np.hypot(*np.subtract(t['JS'][q],t['JS'][p]))) for t in train]
        R[(p,q)]=float(np.clip(np.median(r),0.8,1.4))
    return R
def pose_scale(a,J,PT,R):
    """move every pixel with its bone: p' = J'[start] + S*(p-J[start]); J' = J scaled by global (SX,SY) about pelvis then
    bones re-chained with learned length ratios. Splat each source px onto ceil-size footprint; depth = stick>head>arms>torso>legs>other"""
    pel=np.array(J['pelvis']);JN2={'pelvis':pel*np.array([SX,SY])}
    order=[]
    ch={}
    for p,q in BONES:ch.setdefault(p,[]).append(q)
    # BFS from all roots (pelvis-connected skeleton + stick chain)
    roots=['pelvis']+(['stick butt'] if 'stick butt' in J else [])
    if 'stick butt' in J:JN2['stick butt']=np.array(J['stick butt'])*np.array([SX,SY])
    # head chain may hang from neck; neck chain from belly... walk undirected
    adj={}
    for p,q in BONES:adj.setdefault(p,[]).append((q,1));adj.setdefault(q,[]).append((p,-1))
    from collections import deque
    dq=deque(roots)
    while dq:
        u=dq.popleft()
        for v,dirn in adj.get(u,[]):
            if v in JN2:continue
            key=(u,v) if (u,v) in R else (v,u);r=R[key]
            vec=(np.array(J[v])-np.array(J[u]))*np.array([SX,SY])*(r/np.hypot(SX,SY)*np.sqrt(2) if False else r/((SX+SY)/2))
            JN2[v]=JN2[u]+vec;dq.append(v)
    for k in JN:
        if k in J:JN2.setdefault(k,np.array(J[k])*np.array([SX,SY]))
    # pixel transform per part: anchor at the bone start joint
    anchor={}
    for (p,q),part in PARTOF.items():anchor.setdefault(part,(p,q))
    H=int(round(a.shape[0]*SY))+6;W=int(round(a.shape[1]*SX))+6;O=np.zeros((H,W),int);OP=np.zeros((H,W),int);DEP=np.full((H,W),-1)
    depth=lambda part:{10:6,11:6,1:5,4:4,5:4,6:4,2:3,3:2}.get(part%100,1)
    for y,x in zip(*np.nonzero(a)):
        part=PT[y,x];p,q=anchor.get(part,('pelvis','pelvis'))
        c=np.array([x+.5,y+.5]);n=JN2[p]+(c-np.array(J[p]))*np.array([SX,SY])+3
        for yy in range(int(np.floor(n[1]-SY/2+.5)),int(np.floor(n[1]+SY/2+.5))):
            for xx in range(int(np.floor(n[0]-SX/2+.5)),int(np.floor(n[0]+SX/2+.5))):
                if 0<=yy<H and 0<=xx<W and depth(part)>=DEP[yy,xx]:O[yy,xx]=a[y,x];OP[yy,xx]=part;DEP[yy,xx]=depth(part)
    m=O>0;ys,xs=np.nonzero(m);return O[ys.min():ys.max()+1,xs.min():xs.max()+1],OP[ys.min():ys.max()+1,xs.min():xs.max()+1],{k:(v[0]+3-xs.min(),v[1]+3-ys.min()) for k,v in JN2.items()}
