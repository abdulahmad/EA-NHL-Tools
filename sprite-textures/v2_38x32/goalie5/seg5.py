# Goalie gear segmentation v5: skeleton (skel5) + palette zones + logical masks, facing per Abdul pt861u.
# Zone revision (D47): socks zones 181-189 on the pads = pad BACK (leg seen between the straps);
# forearm 144-146 + arm stripe 3 147/148 on the pads = pad FRONT face/straps; 150-152, 155, 164, 0, 22, 30, 31, 109 = shared.
import sys,os,math,json,numpy as np;sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from skel5 import ADJ,DIRS,frame
FRG=[413,416,422,428,449,519,980,1000]
R=lambda a,b:set(range(a,b+1))
G={0,22,30,31,109,164}|R(144,152)|{155}|R(181,189)
H={0,22,30,31,109,164,177,134,135}|R(181,189)
SOCK=R(181,189);FZ=R(144,148)
GL_K=R(144,149);GL_C=R(144,152)|{22}
# frame-level view of gloves/mask (gloves mirrored in back views); 'mixed' frames are decided per region
VIEW={413:'F',416:'F',422:'F',428:'B',449:'B',519:'B',980:'B',1000:'B'}
# pads: shared-zone pixels take the surface of the nearest zone-decided pixel of the same leg ('near'),
# or a fixed surface. 413: the near (right) leg shows only its outer roll/trim -> front side (Abdul: 413 front).
PADAMB={413:dict(R='F',L='near'),416:dict(R='near',L='near'),422:dict(R='F',L='F'),428:dict(R='near',L='near'),
        449:dict(R='B',L='B'),519:dict(R='B',L='B'),980:dict(R='B',L='B'),1000:dict(R='near',L='near')}
# mask: front / back / per column (428: face side = screen-left cols <=6)
MASKV={413:'F',416:'F',422:'F',428:('xle',6),449:'B',519:'B',980:'B',1000:'B'}
# boxes (x0,y0,x1,y1): mask; blocker = goalie RIGHT hand (holds stick); catcher = goalie LEFT hand
SPEC={
 413:dict(M=(8,0,12,6),K=[((9,13,14,22),GL_K)],C=[],P=(0,17,11,27)),
 416:dict(M=(11,0,15,7),K=[((6,13,9,16),GL_C)],C=[((13,7,22,12),GL_C|{0})],P=(2,13,17,26)),
 422:dict(M=(15,0,20,8),K=[((9,7,15,15),GL_K)],C=[((24,9,28,12),GL_C)],P=(16,9,31,24)),
 428:dict(M=(6,0,10,5),K=[((15,6,17,9),GL_K|{150})],C=[((0,14,9,18),GL_C)],P=(5,18,19,31)),
 449:dict(M=(10,0,14,5),K=[((15,11,22,17),GL_K|{0})],C=[],P=(1,14,15,22)),
 519:dict(M=(8,0,13,6),K=[((17,7,21,13),GL_K)],C=[((0,6,5,13),GL_C)],P=(5,19,21,31)),
 980:dict(M=(12,0,16,4),K=[((19,11,21,18),GL_K|{150,0})],C=[((0,11,9,14),GL_C),((0,15,5,16),GL_C)],P=(6,15,24,25)),
 1000:dict(M=(28,6,32,12),K=[((32,6,37,17),GL_K)],C=[((27,14,31,17),GL_C)],P=(3,7,17,20)),
}
inb=lambda b,y,x:b[0]<=x<=b[2] and b[1]<=y<=b[3]
def dseg(p,a,b):
    ax,ay=a;bx,by=b;vx,vy=bx-ax,by-ay;t=max(0,min(1,((p[0]-ax)*vx+(p[1]-ay)*vy)/max(vx*vx+vy*vy,1e-9)))
    return math.hypot(p[0]-ax-t*vx,p[1]-ay-t*vy)
def leg_of(n,x,y):
    A=ADJ[n];d=lambda s:min(dseg((x,y),A[s+'hip'],A[s+'knee']),dseg((x,y),A[s+'knee'],A[s+'ank']))
    return 'R' if d('R')<=d('L') else 'L'
def seg(n):
    p=frame(n);h,w=p.shape;L=np.full((h,w),'',object);S=SPEC[n]
    for y in range(h):
        for x in range(w):
            i=int(p[y,x])
            if inb(S['M'],y,x):
                bar=i==136 and any(0<=x+d<w and p[y,x+d] in(134,135) for d in(-1,1))
                if i==135:L[y,x]='strap'
                elif i in H or bar:
                    mv=MASKV[n];v=mv if isinstance(mv,str) else ('F' if x<=mv[1] else 'B');L[y,x]='mask'+v
    for k,lst in (('blocker',S['K']),('catcher',S['C'])):
        for b,s in lst:
            for y in range(b[1],b[3]+1):
                for x in range(b[0],b[2]+1):
                    if y<h and x<w and not L[y,x] and int(p[y,x]) in s:L[y,x]=k
    b=S['P'];pads=[(y,x) for y in range(b[1],min(h,b[3]+1)) for x in range(b[0],min(w,b[2]+1)) if not L[y,x] and int(p[y,x]) in G]
    leg={q:leg_of(n,q[1],q[0]) for q in pads}
    surf={q:('B' if int(p[q]) in SOCK else 'F' if int(p[q]) in FZ else None) for q in pads}
    for q in pads:
        if surf[q] is None:
            m=PADAMB[n][leg[q]]
            if m!='near':surf[q]=m
    for q in pads:
        if surf[q] is None:
            c=[r for r in pads if leg[r]==leg[q] and int(p[r]) in SOCK|FZ]
            if not c:surf[q]=VIEW[n];continue
            dd=sorted((math.dist(q,r),0 if int(p[r]) in SOCK else 1) for r in c)
            surf[q]='B' if dd[0][1]==0 else 'F'
    for q in pads:
        # block = surface + goalie leg: front R leg -> padF_L block, front L leg -> padF_R, back L leg -> padB_L, back R leg -> padB_R
        s,l=surf[q],leg[q];L[q]='pad'+s+'_'+({('F','R'):'L',('F','L'):'R',('B','L'):'L',('B','R'):'R'}[(s,l)])
    LEG=np.full((h,w),'',object)
    for q in pads:LEG[q]=leg[q]
    return p,L,VIEW[n],LEG
if __name__=='__main__':
    J={}
    for n in FRG:
        p,o,f,lg=seg(n);u,c=np.unique(o[o!=''],return_counts=True);J[n]=dict(view=f,**{a:int(b) for a,b in zip(u,c)})
        J[n]['idx']={part:sorted(set(int(v) for v in p[o==part])) for part in u}
    print(json.dumps({n:{k:v for k,v in d.items() if k!='idx'} for n,d in J.items()}))
    json.dump(J,open('/workspace/preview_v2/goalie5/seg5_stats.json','w'),indent=1)
