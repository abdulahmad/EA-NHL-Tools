# Goalie v25 (Abdul pt931u) -> g25_map.json. Run from goalie12. D130.
# (1) PADS: the g23 maps are strict (index-equal) but not geometric: any texel with the same index was accepted, so the
#     solver jumps between the six identical 164 rows / five 164 columns (987 L: v goes 3,7,9,3 down one column). With
#     Abdul's index texture that is invisible; with art (Fuhr) it scrambles the design. Fix = GEOMETRIC SNAP: every pad px
#     gets a geometric (v,u) - v along the leg's long axis (knee 0 -> toe 13), u across the leg in its v-slice (0..9, screen-
#     left pad: u grows with screen x, screen-right pad mirrored so both inner edges hit cols 7-8) - and is then snapped to the
#     NEAREST texel with the same index (cost dv^2+du^2). Same index => still 0 strict errors; nearest => the art stays in order.
# (2) BLOCKER / CATCHER / MASK: same idea in their own blocks of the 23x32 layout. Geometric (v,u) from the part's bbox in the
#     frame, snapped to the nearest same-index texel of the block. Catcher block by facing (g12 glove orient: FRONT x11-21,
#     BACK x0-10). Mask is a cylinder (D129): x16 = face centre; front views spread over x13-19, back views over 19,20|12,13.
import sys,os,json,collections,numpy as np
H=os.path.dirname(os.path.abspath(__file__));G=H+'/..'
for d in ('/goalie15','/goalie14','/goalie13','/goalie12'):sys.path.insert(0,G+d)
import g15pad;from g15pad import frame,why
from g13pad import CYLT,eqs
from PIL import Image
L=np.array(Image.open(G+'/goalie15/goalie_texture_v6_indexed.png')).astype(int)
FR=[416,419,421,538,407,428,980,413,425,520,987,505,1044,422]
BACK={407,428,980,413,425,520}            # back-facing frames (g15)
ORI={r['frame']:r['orient'] for r in json.load(open(G+'/goalie12/g12_glove.json'))};ORI.update({520:'BACK',505:'FRONT',1044:'FRONT'})
MASK,CATCH,BLOCK=2,3,4
def axes(P):
    P=np.array(P,float);c=P.mean(0);w,V=np.linalg.eigh(np.cov((P-c).T)) if len(P)>2 else (None,np.eye(2));a=V[:,-1]
    if a[0]<0:a=-a                          # long axis points down the screen (knee -> toe); P rows are (y,x)
    return c,a,np.array([-a[1],a[0]])
def geo_pad(q,right):
    c,a,b=axes(q);P=np.array(q,float);s=(P-c)@a;t=(P-c)@b
    if b[1]<0:t=-t                          # across axis points to screen +x
    v=(s-s.min())/max(1e-6,s.max()-s.min())*13;u=np.zeros(len(q))
    for k in np.unique(np.round(v)):
        m=np.round(v)==k;tt=t[m];u[m]=(tt-tt.min())/max(1e-6,tt.max()-tt.min())*9 if tt.max()>tt.min() else 4.5
    if right:u=9-u
    return v,u
CY=[(vv,uu) for vv in range(CYLT.shape[0]) for uu in range(CYLT.shape[1])]
def snap_pad(s,v,u):
    C=[(vv,uu) for vv,uu in CY if eqs(s,CYLT[vv,uu])]
    return min(C,key=lambda z:(z[0]-v)**2+(z[1]-u)**2) if C else None
BLK={'blocker':(0,0,10,7),'catFront':(11,23,11,9),'catBack':(0,23,11,9)}
def snap_box(s,box,v,u):
    x0,y0,w,h=box;C=[(y,x) for y in range(y0,y0+h) for x in range(x0,x0+w) if L[y,x]==s]
    return min(C,key=lambda z:(z[0]-(y0+v*(h-1)))**2+(z[1]-(x0+u*(w-1)))**2) if C else None
MCOLS=list(range(12,21))
def snap_mask(s,v,u,back):
    C=[(y,x) for y in range(0,8) for x in MCOLS if L[y,x]==s]
    if not C:return None
    if back:tx=[19,20,12,13];pos=u*3;tc=tx[min(3,int(round(pos)))]   # screen-left = goalie-left (x19-20) seen from behind
    else:tc=13+u*6
    def cd(x):d=abs(x-tc);return min(d,9-d)
    return min(C,key=lambda z:(z[0]-v*7)**2+cd(z[1])**2)
def run():
    P=json.load(open(G+'/goalie23/g23_pads.json'))['frames'];S=json.load(open('/tmp/g21_seg.json'))
    out={};tot=collections.Counter()
    for n in FR:
        p=frame(n);R={}
        for r in P[str(n)]:
            q=[tuple(map(int,k.split(','))) for k in r['map']];v,u=geo_pad(q,r['leg'].endswith('R'));M={}
            for i,c in enumerate(q):
                if r['map']['%d,%d'%c] is None:M[c]=None;continue
                M[c]=snap_pad(int(p[c]),v[i],u[i])
            R['geo_'+r['leg']]={'%d,%d'%c:([int(round(v[i])),int(round(u[i]))] if r['map']['%d,%d'%c] is not None else None) for i,c in enumerate(q)}   # pure geometry (no index snap), for art comparison only
            R[r['leg']]={'%d,%d'%c:(list(map(int,t)) if t else None) for c,t in M.items()}
            for c,t in M.items():
                if t is None and r['map']['%d,%d'%c] is None:continue
                tot['pad_'+('ok' if why(p,c,t)=='ok' else 'err')]+=1
        lab=np.array(S[str(n)]['lab'])
        for part,L_ in (('blocker',BLOCK),('catcher',CATCH),('mask',MASK)):
            q=[tuple(c) for c in np.argwhere((lab==L_)&(p!=255))]
            if not q:continue
            ys=[c[0] for c in q];xs=[c[1] for c in q];a,b,cc,e=min(ys),min(xs),max(ys),max(xs);M={}
            for (y,x) in q:
                v=(y-a)/max(1,cc-a);u=(x-b)/max(1,e-b);s=int(p[y,x])
                if part=='mask':t=snap_mask(s,v,u,n in BACK)
                elif part=='catcher':   # facing block first; the cuff/back colours 149-152 and palm 144-146 live in one block each,
                    pb=BLK['catFront' if ORI.get(n)=='FRONT' else 'catBack'];ob=BLK['catBack' if ORI.get(n)=='FRONT' else 'catFront']
                    t=snap_box(s,pb,v,u) or snap_box(s,ob,v,u)   # so a px whose index is only in the other block uses it (D130)
                else:t=snap_box(s,BLK['blocker'],v,u)
                M['%d,%d'%(y,x)]=list(map(int,t)) if t else None
                tot[part+('_ok' if t and L[t]==s else '_err')]+=1
            R[part]=M
        out[n]=R
    json.dump(dict(frames=out,totals=dict(tot)),open(H+'/g25_map.json','w'));print('TOTAL',dict(tot))
    return out
if __name__=='__main__':run()
