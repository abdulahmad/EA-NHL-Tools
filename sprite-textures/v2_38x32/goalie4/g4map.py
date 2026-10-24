# Goalie layout v3 mapping from segmentation v4: position-based (pads knee->toe, inner->outer), family relocation only when needed.
import sys,os,json,collections,pickle,numpy as np
os.chdir('/workspace/preview_back/root/sprite-textures/out');sys.path.insert(0,'../scripts');sys.path.insert(0,'/workspace/preview_v2/goalie4')
from lib import ZN,act,D
from seg4 import seg,FRG
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
LYING={1000}
SEG={n:seg(n) for n in FRG}
PIX={}
for n in FRG:
    p,o,f=SEG[n];out={}
    for part in set(o[o!='']):
        ys,xs=np.nonzero(o==part)
        if part=='cage':
            for y,x in zip(ys,xs):out[(y,x)]=('cage',0,0)
            continue
        for y,x in zip(ys,xs):
            if part.startswith('pad'):
                if n in LYING:   # knee = end nearest the body (screen right), toe = screen left; across = y
                    col=ys[xs==x];v=(xs.max()-x)/max(np.ptp(xs),1);u=(y-col.min())/max(np.ptp(col),1)
                else:            # knee = top, toe = bottom; across = x within the row, inner edge per side
                    row=xs[ys==y];v=(y-ys.min())/max(np.ptp(ys),1);u=(x-row.min())/max(np.ptp(row),1)
            else:
                u=(x-xs.min())/max(np.ptp(xs),1);v=(y-ys.min())/max(np.ptp(ys),1)
                if f=='B' and part in('blocker','catcher'):u=1-u   # seen from behind: mirror across
            out[(int(y),int(x))]=(part,u,v)
    PIX[n]=out
def naive(blk,a,b):
    if blk=='cage':return CAGE
    x0,y0,w,h=GL[blk];return (x0+int(round(a*(w-1))),y0+int(round(b*(h-1))))
btex=lambda blk:[(x,y) for y in range(GL[blk][1],GL[blk][1]+GL[blk][3]) for x in range(GL[blk][0],GL[blk][0]+GL[blk][2])]
votes=collections.defaultdict(collections.Counter)
for n in FRG:
    p=SEG[n][0]
    for q,(blk,a,b) in PIX[n].items():votes[naive(blk,a,b)][fam(int(p[q]))]+=1
FAMG={t:c.most_common(1)[0][0] for t,c in votes.items()}
# D44 vote smoothing: texel family = family with most geometric hits in a window around the texel (pads 3 wide x 5 tall,
# others 3x3), inside the same block. Removes speckle so the default texture reads as gear; costs extra relocation.
WIN=int(os.environ.get('WIN','1'))
if WIN:
    for b_ in GL:
        x0,y0,w,h=GL[b_];ry=2 if b_.startswith('pad') else 1
        for y in range(y0,y0+h):
            for x in range(x0,x0+w):
                c=collections.Counter()
                for yy in range(max(y0,y-ry),min(y0+h,y+ry+1)):
                    for xx in range(max(x0,x-1),min(x0+w,x+2)):
                        wt=3 if (xx,yy)==(x,y) else 1
                        for k,v in votes.get((xx,yy),{}).items():c[k]+=v*wt
                if c:FAMG[(x,y)]=c.most_common(1)[0][0]
STEAL=[];EXT=0
for blk in GL:
    T=btex(blk);vt=[s for s in T if s in votes]
    for t in T:
        if t not in FAMG and vt:FAMG[t]=FAMG[min(vt,key=lambda s:(abs(s[1]-t[1])*3+abs(s[0]-t[0])))];EXT+=1
    need=collections.Counter(fam(int(SEG[n][0][q])) for n in FRG for q,v in PIX[n].items() if v[0]==blk)
    for f_,cnt in need.most_common():
        if any(FAMG.get(t)==f_ for t in T):continue
        own=collections.Counter(FAMG.get(t) for t in T);cand=[t for t in T if own[FAMG.get(t)]>=2]
        t=max(cand,key=lambda t:votes[t][f_]);STEAL.append(dict(block=blk,family=f_,texel=t,from_family=FAMG.get(t),pixels=cnt));FAMG[t]=f_
A={};MOVED=collections.Counter();SHIFT=collections.defaultdict(list);RELOC=[]
for n in FRG:
    p=SEG[n][0];A[n]={}
    for q,(blk,a,b) in PIX[n].items():
        f_=fam(int(p[q]));t=naive(blk,a,b)
        if FAMG.get(t)!=f_:
            c=[s for s in btex(blk) if FAMG.get(s)==f_];t0=t
            t=min(c,key=lambda s:((s[0]-t0[0])**2+(1.5*(s[1]-t0[1]))**2));MOVED[blk]+=1;SHIFT[blk].append(max(abs(t[0]-t0[0]),abs(t[1]-t0[1])))
            RELOC.append((n,q,blk,f_,t0,t))
        A[n][q]=t
res={};PER={}
for tm in TEAMS:
    sp=spal(*tm);k=' '.join(tm);PER[k]={}
    for n in FRG:
        p=SEG[n][0];PER[k][n]=sum(1 for q,t in A[n].items() if tuple(sp[lev_idx(FAMG[t],SH(int(p[q])),int(p[q]))])!=tuple(sp[int(p[q])]))
    res[k]=sum(PER[k].values())
used=collections.Counter(t for n in FRG for t in A[n].values())
blk={}
for b in list(GL)+['cage']:
    T=[CAGE] if b=='cage' else btex(b);px=sum(1 for n in FRG for v in PIX[n].values() if v[0]==b)
    s=np.array(SHIFT[b]) if SHIFT[b] else np.zeros(1)
    blk[b]=dict(texels=len(T),used=sum(1 for t in T if t in used),pixels=px,relocated=MOVED[b],reloc_ge2=int((s>=2).sum()),
                frames=[n for n in FRG if any(v[0]==b for v in PIX[n].values())])
tot=sum(len(PIX[n]) for n in FRG)
pickle.dump(dict(A=A,FAMG=FAMG,PIX=PIX,GL=GL,CAGE=CAGE),open('/tmp/g4.pkl','wb'))
J=dict(control_px_wrong=res,per_frame=PER,gear_px=tot,relocated=sum(MOVED.values()),blocks=blk,steals=STEAL,edge_extended=EXT,
       families={f'{x},{y}':f for (x,y),f in sorted(FAMG.items())})
json.dump(J,open('/workspace/preview_v2/goalie4/g4_map.json','w'),indent=1,default=str)
print(json.dumps(dict(res=res,tot=tot,reloc=sum(MOVED.values()),blocks=blk,steals=STEAL),default=str,indent=0))
# pure position mapping (no colour-driven relocation): used for real art (Fuhr), not for the control
pickle.dump(dict(A={n:{q:naive(*v) for q,v in PIX[n].items()} for n in FRG},FAMG=FAMG,PIX=PIX,GL=GL,CAGE=CAGE),open('/tmp/g4_geo.pkl','wb'))
