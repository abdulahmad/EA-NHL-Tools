# Goalie layout pass 3: Fuhr-art shapes incl. pad backs + mask back, geometric-first mapping with family fallback.
# Builds the mapping, the family ("default gear") texture, the control diff on 8 frames x 5 teams. Saves /tmp/g3.pkl + g3_map.json
import sys,os,json,collections,pickle,numpy as np
os.chdir('/workspace/preview_back/root/sprite-textures/out');sys.path.insert(0,'../scripts')
import uv;uv.WRAP_LIMBS=uv.SIDE_FIX=uv.FRONT_SMOOTH=uv.GLOVE_UV=uv.PAD_UV=True;uv.ELEV=40
from lib import ZN,act,D
from scipy import ndimage as ndi
FRG=[413,416,422,428,449,519,980,1000]
# (x0,y0,w,h). Pads named by SCREEN side. Front blocks used on front-facing frames, back blocks on back-facing frames.
GL={'padF_L':(0,0,9,20),'padF_R':(9,0,10,20),'padB_L':(19,0,9,20),'padB_R':(28,0,10,20),
    'blocker':(0,20,8,12),'catcher':(8,20,11,9),'maskF':(19,20,6,7),'maskB':(25,20,5,6)}
CAGE=(30,20)
TEAMS=[('HOME.json','tor'),('AWAY.json','nyr'),('HOME.json','chi'),('AWAY.json','chi'),('HOME.json','mtl')]
def spal(f,c):
    t=next(t for t in json.load(open(D+f)) if t['code']==c);p=act.copy().astype(int);p[128:192]=np.array(t['colors'])*4;return p[np.array(t['map'])]
SH=lambda i:next((w for w in ZN.get(str(i),'').split() if w in('light','dark','medium')),'')
fam=lambda i:' '.join(w for w in ZN[str(i)].split() if w not in('light','dark','medium')) if str(i) in ZN else f'idx{i}'
FIDX={(fam(int(k)),SH(int(k))):int(k) for k in ZN}
def lev_idx(f,lv,q):
    if f.startswith('idx'):return int(f[3:])
    return FIDX.get((f,lv),FIDX.get((f,''),FIDX.get((f,'medium'),q)))
S={};FRONT={}
for n in FRG:S[n]=uv.solve(n);FRONT[n]=bool(uv.solve.front)
# segmentation clean-up (D37): mask = head components only; lower-body idx164 blobs are pad pixels; tiny blocker/catcher blobs at the
# top of the sprite (helmet crown drawn with socks/idx0) are mask pixels.
RELAB=collections.Counter()
for n in FRG:
    p,part,U,V,R=S[n];R=R.copy()
    lab,k=ndi.label(R=='goalie_mask',np.ones((3,3)));top=0
    if k:
        top=min(np.nonzero(lab==c)[0].min() for c in range(1,k+1))
        for c in range(1,k+1):
            m=lab==c
            if np.nonzero(m)[0].min()>top+3:R[m]='pad';RELAB['mask->pad']+=int(m.sum())
    for nm in ('blocker','catcher'):
        lab,k=ndi.label(R==nm,np.ones((3,3)))
        for c in range(1,k+1):
            m=lab==c;ys=np.nonzero(m)[0]
            if ys.min()<=1 and ys.max()<=4 and top<=5:R[m]='goalie_mask';RELAB[nm+'->mask']+=int(m.sum())
    S[n]=(p,part,U,V,R)
def split_x(R):
    ys,xs=np.nonzero(R=='pad')
    if len(xs)==0:return 0
    u=np.unique(xs);g=np.diff(u)
    return u[g.argmax()]+0.5 if len(g) and g.max()>1 else float(np.median(xs))
def norm(v):lo,hi=np.nanmin(v),np.nanmax(v);return (v-lo)/(hi-lo) if hi>lo else v*0+0.5
# per frame: list of (pixel,(block, u, v)) ; u,v in [0,1]
PIX={}
for n in FRG:
    p,part,U,V,R=S[n];F=FRONT[n];out={}
    sx=split_x(R)
    for side in 'LR':
        m=(R=='pad')&((np.arange(p.shape[1])[None,:]<sx) if side=='L' else (np.arange(p.shape[1])[None,:]>=sx))
        if not m.any():continue
        ys,xs=np.nonzero(m)
        # PCA frame per pad side: V along the long axis, from the end nearest the body centre (knee) to the toe;
        # U across, increasing with screen x (inner edge of the screen-left pad = art right edge). Same rule front and back.
        P=np.stack([ys,xs],1).astype(float);c=P.mean(0);w_,E=np.linalg.eigh(np.cov((P-c).T)+1e-6*np.eye(2));e1,e2=E[:,1],E[:,0]
        by,bx=np.nonzero((p!=255)&(R!='pad'));body=np.array([by.mean(),bx.mean()])
        if np.dot(c-body,e1)<0:e1=-e1
        if e2[1]<0 or (abs(e2[1])<1e-6 and e2[0]<0):e2=-e2
        v=norm((P-c)@e1);u=norm((P-c)@e2)
        blk=('padF_' if F else 'padB_')+side
        for y,x,a,b in zip(ys,xs,u,v):out[(int(y),int(x))]=(blk,a,b)
    for nm,blk in (('blocker','blocker'),('catcher','catcher'),('goalie_mask','maskF' if F else 'maskB')):
        m=R==nm
        if not m.any():continue
        ys,xs=np.nonzero(m)
        u=(xs-xs.min())/max(np.ptp(xs),1);v=(ys-ys.min())/max(np.ptp(ys),1)   # union bbox of the part in this frame
        for y,x,a,b in zip(ys,xs,u,v):out[(int(y),int(x))]=('cage' if p[y,x]==135 else blk,a,b)
    PIX[n]=out
def naive(blk,a,b):
    if blk=='cage':return CAGE
    x0,y0,w,h=GL[blk];return (x0+int(round(a*(w-1))),y0+int(round(b*(h-1))))
# pass 1: votes -> texel family
votes=collections.defaultdict(collections.Counter)
for n in FRG:
    p=S[n][0]
    for q,(blk,a,b) in PIX[n].items():votes[naive(blk,a,b)][fam(int(p[q]))]+=1
FAMG={t:c.most_common(1)[0][0] for t,c in votes.items()}
FAMG[CAGE]='idx135'
def btex(blk):x0,y0,w,h=GL[blk];return [(x,y) for y in range(y0,y0+h) for x in range(x0,x0+w)]
STEAL=[]
for blk in GL:
    T=btex(blk)
    # unvoted texels: nearest voted texel in the block (edge extension, same row first)
    for t in T:
        if t not in FAMG:
            vt=[s for s in T if s in votes]
            if vt:FAMG[t]=FAMG[min(vt,key=lambda s:(abs(s[1]-t[1])*3+abs(s[0]-t[0])))]
    # families with pixels in this block but no texel: steal the texel where that family has most votes (owner keeps >=2)
    need=collections.Counter()
    for n in FRG:
        p=S[n][0]
        for q,(b_,a,b) in PIX[n].items():
            if b_==blk:need[fam(int(p[q]))]+=1
    for f,cnt in need.most_common():
        if any(FAMG.get(t)==f for t in T):continue
        own=collections.Counter(FAMG.get(t) for t in T)
        cand=[t for t in T if own[FAMG.get(t)]>=2]
        t=max(cand,key=lambda t:(votes[t][f],-abs(t[0]-GL[blk][0]-GL[blk][2]/2)))
        STEAL.append(dict(block=blk,family=f,texel=t,from_family=FAMG.get(t),pixels=cnt));FAMG[t]=f
# pass 2: geometric-first; keep naive texel if family matches, else nearest texel of that family in the same block
A={};MOVED=collections.Counter()
for n in FRG:
    p=S[n][0];A[n]={}
    for q,(blk,a,b) in PIX[n].items():
        f=fam(int(p[q]));t=naive(blk,a,b)
        if FAMG.get(t)!=f:
            T=[CAGE] if blk=='cage' else btex(blk)
            fx,fy=(GL[blk][0]+a*(GL[blk][2]-1),GL[blk][1]+b*(GL[blk][3]-1)) if blk!='cage' else CAGE
            c=[s for s in T if FAMG.get(s)==f]
            if c:t=min(c,key=lambda s:((s[0]-fx)**2+(1.5*(s[1]-fy))**2));MOVED[blk]+=1
        A[n][q]=t
# control
res={};BAD={n:set() for n in FRG};PER={}
for tm in TEAMS:
    sp=spal(*tm);k=' '.join(tm);PER[k]={}
    for n in FRG:
        p=S[n][0];b=[q for q,t in A[n].items() if tuple(sp[lev_idx(FAMG[t],SH(int(p[q])),int(p[q]))])!=tuple(sp[int(p[q])])]
        BAD[n].update(b);PER[k][n]=len(b)
    res[k]=sum(PER[k].values())
used=collections.Counter(t for n in FRG for t in A[n].values())
blkstat={}
for blk in list(GL)+['cage']:
    T=[CAGE] if blk=='cage' else btex(blk);px=sum(1 for n in FRG for q,v in PIX[n].items() if v[0]==blk)
    blkstat[blk]=dict(texels=len(T),used=sum(1 for t in T if t in used),pixels=px,moved=MOVED[blk],
                      frames=[n for n in FRG if any(v[0]==blk for v in PIX[n].values())])
pickle.dump(dict(A=A,FAMG=FAMG,BAD=BAD,PIX=PIX,FRONT=FRONT,GL=GL,CAGE=CAGE),open('/tmp/g3.pkl','wb'))
J=dict(relabel=dict(RELAB),layout=GL,cage=CAGE,front=FRONT,control_px_wrong=res,per_frame=PER,blocks=blkstat,steals=STEAL,
       families={f'{x},{y}':f for (x,y),f in sorted(FAMG.items())})
json.dump(J,open('/workspace/preview_v2/goalie3/g3_map.json','w'),indent=1,default=str)
print(json.dumps(dict(res=res,blocks=blkstat,steals=STEAL,front=FRONT),default=str,indent=0))
# reference: pure geometric mapping (no family relocation) -> control diff, and save as alternative mapping
if os.environ.get('NAIVE'):
    A2={n:{q:naive(*v) for q,v in PIX[n].items()} for n in FRG};r2={}
    for tm in TEAMS:
        sp=spal(*tm);r2[' '.join(tm)]=sum(1 for n in FRG for q,t in A2[n].items() if tuple(sp[lev_idx(FAMG[t],SH(int(S[n][0][q])),int(S[n][0][q]))])!=tuple(sp[int(S[n][0][q])]))
    tot=sum(len(A2[n]) for n in FRG);print('NAIVE control',r2,'gear px',tot)
    pickle.dump(dict(A=A2,FAMG=FAMG,BAD=BAD,PIX=PIX,FRONT=FRONT,GL=GL,CAGE=CAGE),open('/tmp/g3_naive.pkl','wb'))
