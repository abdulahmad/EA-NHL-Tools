# Goalie default gear v6: geometric UV from the skeleton (Abdul pt863u), canonical-frame texture, family relocation only as a last resort.
#  pads   : V = along the leg (projection on knee->ankle, pad top -> toe); U = angle around the leg: theta = c - asin(s),
#           s = across-leg offset / half-width in that V row, c = view centre (4-d)*45 deg (d = SPA direction; 0 = goalie front, +90 = goalie right).
#           Front blocks take theta in [-90,90] (U = (90-theta)/180), back blocks theta in [90,270] (U = (270-theta)/180).
#  mask   : ONE wrap strip 12x7 (layout change): column = ((180-theta) mod 360)/360*12 = back centre at col 0, goalie RIGHT side col 3,
#           FRONT centred col 6 (front art cols 3-8 read left->right as seen from the front), LEFT side col 9, back again 9-11. Row = head top -> chin.
#  gloves : per-frame box U/V (mirrored in back views), as v5.
#  texel family: from the clearest frame(s) for that surface (CANON, Abdul's anthem-sprite method), then all-frame votes for texels the
#  canonical frames do not reach; a pixel whose family is not at its geometric texel is relocated to the nearest same-family texel.
import sys,os,json,math,collections,pickle,numpy as np
HERE=os.path.dirname(os.path.abspath(__file__));sys.path.insert(0,HERE);sys.path.insert(0,HERE+'/../goalie6');os.chdir('/workspace/preview_back/root/sprite-textures/out');sys.path.insert(0,'../scripts')
from lib import ZN,act,D
from seg6 import seg,FRG
from skel6 import ADJ,DIRS
GL={'padF_L':(0,0,9,20),'padF_R':(9,0,10,20),'padB_L':(19,0,9,20),'padB_R':(28,0,10,20),
    'blocker':(0,20,8,12),'catcher':(8,20,11,9),'mask':(19,20,12,7)}
STRAP=(31,20)
CANON={'padF_L':[422,416],'padF_R':[422,416],'padB_L':[519,980,449],'padB_R':[519,980,449],
       'blocker':[416,422,519],'catcher':[416,422,519],'mask':[416,413,449,980]}
MODE=os.environ.get('MODE','canon');GLOVEAX=int(os.environ.get('GLOVEAX','0'))
TEAMS=[('HOME.json','tor'),('AWAY.json','nyr'),('HOME.json','chi'),('AWAY.json','chi'),('HOME.json','mtl')]
def spal(f,c):
    t=next(t for t in json.load(open(D+f)) if t['code']==c);p=act.copy().astype(int);p[128:192]=np.array(t['colors'])*4;return p[np.array(t['map'])]
SH=lambda i:next((w for w in ZN.get(str(i),'').split() if w in('light','dark','medium')),'')
fam=lambda i:' '.join(w for w in ZN[str(i)].split() if w not in('light','dark','medium')) if str(i) in ZN else f'idx{i}'
FIDX={(fam(int(k)),SH(int(k))):int(k) for k in ZN}
def lev_idx(f,lv,q):
    if f.startswith('idx'):return int(f[3:])
    return FIDX.get((f,lv),FIDX.get((f,''),FIDX.get((f,'medium'),q)))
asind=lambda s:math.degrees(math.asin(max(-1,min(1,s))))
SEG={n:seg(n) for n in FRG}
# v7 (Abdul pt864u): indices that are NOT team base colours go to the SHADING layer (fixed value), so they neither vote for a
# texel family nor force a relocation. OVR = fixed-palette indices (same RGB for every team) + 164 (neutral near-white in every team).
OVR=dict((int(k),v) for k,v in json.loads(os.environ.get('OVR','{"0":"outline","109":"outline","164":"grey_hi","22":"grey_lo","31":"toe_shadow","30":"toe_shadow2","134":"cage_lt","136":"cage_dk"}')).items())
ISO=lambda i:int(i) in OVR
def uv(n):
    p,L,view,LEG,_=SEG[n];out={};c=(4-DIRS[n])*45;A=ADJ[n]
    for lg in 'RL':
        P=[(int(y),int(x)) for y,x in zip(*np.nonzero((LEG==lg)&np.vectorize(lambda s:s.startswith('pad'))(L)))]
        if not P:continue
        k=np.array(A[lg+'knee'],float);a=np.array(A[lg+'ank'],float);ax=(a-k)/np.linalg.norm(a-k);nx=np.array([-ax[1],ax[0]])
        if nx[0]<0 or (abs(nx[0])<1e-6 and nx[1]<0):nx=-nx
        if n==1000:nx=np.array([0.,1.]);ax=np.array([-1.,0.])     # lying: along = screen-left (toe), across = down
        T={q:float(np.dot([q[1],q[0]],ax)) for q in P};W={q:float(np.dot([q[1],q[0]],nx)) for q in P}
        t0,t1=min(T.values()),max(T.values());rows=collections.defaultdict(list)
        for q in P:rows[round(T[q])].append(W[q])
        for q in P:
            r=rows[round(T[q])];cen=(max(r)+min(r))/2;hw=(max(r)-min(r))/2+.5;th=c-asind((W[q]-cen)/hw)
            v=(T[q]-t0)/max(t1-t0,1);blk=L[q]
            if blk.startswith('padF'):th=((th+180)%360)-180;u=(90-max(-90,min(90,th)))/180
            else:ph=th%360;u=(270-max(90,min(270,ph)))/180
            out[q]=(blk,min(u,.999),v)
    M=[(int(y),int(x)) for y,x in zip(*np.nonzero(np.isin(L,['maskF','maskB'])))]
    if M:
        ys=[q[0] for q in M];y0,y1=min(ys),max(ys);rows=collections.defaultdict(list)
        for q in M:rows[q[0]].append(q[1])
        for q in M:
            r=rows[q[0]];cen=(max(r)+min(r))/2;hw=(max(r)-min(r))/2+.5;th=c-asind((q[1]-cen)/hw)
            out[q]=('mask',((180-th)%360)/360,(q[0]-y0)/max(y1-y0,1))
    for part in ('blocker','catcher'):
        ys,xs=np.nonzero(L==part)
        if not len(ys):continue
        if GLOVEAX:   # V along the forearm (elbow -> hand), U across it; mirrored in back views
            h='R' if part=='blocker' else 'L';e=np.array(A[h+'elb'],float);hd=np.array(A[h+'hand'],float);ax=(hd-e)/max(np.linalg.norm(hd-e),1e-6);nx=np.array([-ax[1],ax[0]])
            if nx[0]<0:nx=-nx
            Tv=xs*ax[0]+ys*ax[1];Tu=xs*nx[0]+ys*nx[1]
        else:Tv,Tu=ys.astype(float),xs.astype(float)
        for y,x,tv,tu in zip(ys,xs,Tv,Tu):
            u=(tu-Tu.min())/max(np.ptp(Tu),1);v=(tv-Tv.min())/max(np.ptp(Tv),1)
            if view=='B':u=1-u
            out[(int(y),int(x))]=(part,u,v)
    for y,x in zip(*np.nonzero(L=='strap')):out[(int(y),int(x))]=('strap',0,0)
    return out
PIX={n:uv(n) for n in FRG}
def naive(blk,a,b):
    if blk=='strap':return STRAP
    x0,y0,w,h=GL[blk]
    if blk=='mask':return (x0+min(w-1,int(a*w)),y0+int(round(b*(h-1))))
    return (x0+int(round(a*(w-1))),y0+int(round(b*(h-1))))
btex=lambda blk:[(x,y) for y in range(GL[blk][1],GL[blk][1]+GL[blk][3]) for x in range(GL[blk][0],GL[blk][0]+GL[blk][2])]
votes=collections.defaultdict(collections.Counter);cvotes=collections.defaultdict(lambda:collections.defaultdict(collections.Counter))
for n in FRG:
    p=SEG[n][0]
    for q,(blk,a,b) in PIX[n].items():
        if ISO(p[q]):continue
        t=naive(blk,a,b);votes[t][fam(int(p[q]))]+=1;cvotes[t][n][fam(int(p[q]))]+=1
FAMG={};SRC={}
for blk in GL:
    for t in btex(blk):
        if MODE=='canon':
            for n in CANON[blk]:
                if cvotes[t][n]:FAMG[t]=cvotes[t][n].most_common(1)[0][0];SRC[t]=n;break
        if t not in FAMG and votes[t]:FAMG[t]=votes[t].most_common(1)[0][0];SRC[t]='vote'
FAMG[STRAP]=votes[STRAP].most_common(1)[0][0];SRC[STRAP]='vote'
EXT=0;STEAL=[]
for blk in GL:
    T=btex(blk);vt=[s for s in T if s in FAMG]
    for t in T:
        if t not in FAMG:FAMG[t]=FAMG[min(vt,key=lambda s:(abs(s[1]-t[1])*3+abs(s[0]-t[0])))];SRC[t]='edge';EXT+=1
    need=collections.Counter(fam(int(SEG[n][0][q])) for n in FRG for q,v in PIX[n].items() if v[0]==blk and not ISO(SEG[n][0][q]))
    for f_,cnt in need.most_common():
        if any(FAMG.get(t)==f_ for t in T):continue
        own=collections.Counter(FAMG.get(t) for t in T);cand=[t for t in T if own[FAMG.get(t)]>=2]
        t=max(cand,key=lambda t:(votes[t][f_],-abs(t[0]-GL[blk][0])));STEAL.append(dict(block=blk,family=f_,texel=t,from_family=FAMG[t],pixels=cnt));FAMG[t]=f_;SRC[t]='steal'
A={};MOVED=collections.Counter();GE2=collections.Counter();RELOC=[]
for n in FRG:
    p=SEG[n][0];A[n]={}
    for q,(blk,a,b) in PIX[n].items():
        f_=fam(int(p[q]));t=naive(blk,a,b)
        if not ISO(p[q]) and FAMG.get(t)!=f_:
            t0=t;W_=GL[blk][2] if blk=='mask' else 0
            def dist(s):
                dx=abs(s[0]-t0[0]);dx=min(dx,W_-dx) if W_ else dx   # mask strip wraps
                return dx*dx+(1.5*(s[1]-t0[1]))**2
            t=min([s for s in btex(blk) if FAMG.get(s)==f_],key=dist);MOVED[blk]+=1
            if math.sqrt(dist(t))>=2 or max(abs(t[0]-t0[0]),abs(t[1]-t0[1]))>=2:GE2[blk]+=1
            RELOC.append((n,q,blk,f_,t0,t))
        A[n][q]=t
# shading layer per pixel: light/medium/dark of the pixel's own family (as players) or an OVR level (fixed value)
SHADE={n:{q:(OVR[int(SEG[n][0][q])]+':'+str(int(SEG[n][0][q])) if ISO(SEG[n][0][q]) else (SH(int(SEG[n][0][q])) or 'flat')) for q in PIX[n]} for n in FRG}
def render_idx(f,lv):
    if ':' in lv:return int(lv.split(':')[1])
    return lev_idx(f,'' if lv=='flat' else lv,None)
res={};PER={}
for tm in TEAMS:
    sp=spal(*tm);k=' '.join(tm);PER[k]={}
    for n in FRG:
        p=SEG[n][0];PER[k][n]=sum(1 for q,t in A[n].items() if tuple(sp[render_idx(FAMG[t],SHADE[n][q])])!=tuple(sp[int(p[q])]))
    res[k]=sum(PER[k].values())
tot=sum(len(PIX[n]) for n in FRG)
blk={b:dict(pixels=sum(1 for n in FRG for v in PIX[n].values() if v[0]==b),relocated=MOVED[b],reloc_ge2=GE2[b]) for b in list(GL)+['strap']}
src=collections.Counter(str(v) for v in SRC.values())
J=dict(mode=MODE,control_px_wrong=res,per_frame=PER,gear_px=tot,relocated=sum(MOVED.values()),reloc_ge2=sum(GE2.values()),blocks=blk,steals=STEAL,
       edge_extended=EXT,shading_px=sum(1 for n in FRG for q in PIX[n] if ISO(SEG[n][0][q])),ovr=OVR,texel_source=dict(src),families={f'{x},{y}':f for (x,y),f in sorted(FAMG.items())})
json.dump(J,open(f'/workspace/preview_v2/goalie7/g7_map_{MODE}.json','w'),indent=1,default=str)
print(json.dumps({k:J[k] for k in ('shading_px','mode','control_px_wrong','gear_px','relocated','reloc_ge2','blocks','texel_source')},default=str))
pickle.dump(dict(A=A,FAMG=FAMG,PIX=PIX,GL=GL,CAGE=STRAP,SRC=SRC,RELOC=RELOC,SHADE=SHADE,OVR=OVR),open(f'/tmp/g7_{MODE}.pkl','wb'))
pickle.dump(dict(A={n:{q:naive(*v) for q,v in PIX[n].items()} for n in FRG},FAMG=FAMG,PIX=PIX,GL=GL,CAGE=STRAP),open(f'/tmp/g7_geo.pkl','wb'))
