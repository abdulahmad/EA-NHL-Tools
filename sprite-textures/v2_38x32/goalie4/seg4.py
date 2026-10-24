# Goalie gear segmentation v4: palette-zone candidates + per-frame logical masks (boxes, row/trim split, cage rule).
import sys,json,numpy as np;sys.path.insert(0,'../scripts')
from lib import frame
FRG=[413,416,422,428,449,519,980,1000]
R=lambda a,b:set(range(a,b+1))
G={0,22,30,31,109,164}|R(144,152)|{155}|R(181,189)          # gear zones (153/154 = sleeve stripe light/medium, never gear)
H={0,22,30,31,109,164,177,134,135}|R(181,189)                # head: black outline, helmet stripes (socks zones), 164, pants-dark shell, cage; no arm zones
GL_K=R(144,149); GL_C=R(144,152)|{22}
BACK={416,422}
# per frame: mask box, gloves (boxes,idx set), pads (mode, params)
SPEC={
 413:dict(M=(8,0,12,6),K=[((9,13,14,22),GL_K)],C=[],P=('row',(0,19,11,27),1,4.5)),
 416:dict(M=(11,0,15,7),K=[((6,13,9,16),GL_C)],C=[((13,7,22,12),GL_C|{0})],P=('col',(3,17,8,26),(9,13,17,26))),
 422:dict(M=(15,0,20,8),K=[((9,7,15,15),GL_K)],C=[((24,9,28,12),GL_C)],P=('col',(16,11,21,23),(22,9,31,24))),
 428:dict(M=(6,0,10,5),K=[((15,6,17,9),GL_K|{150})],C=[((0,14,9,18),GL_C)],P=('row',(5,18,19,31),2,12.5)),
 449:dict(M=(10,0,14,5),K=[((15,11,22,17),GL_K|{0})],C=[],P=('row',(1,14,15,22),2,6.5)),
 519:dict(M=(8,0,13,6),K=[((17,7,21,13),GL_K)],C=[((0,6,5,13),GL_C)],P=('row',(5,19,21,31),2,11.5)),
 980:dict(M=(12,0,16,4),K=[((19,11,21,18),GL_K|{150,0})],C=[((0,11,9,14),GL_C),((0,15,5,16),GL_C)],P=('row',(6,15,24,25),2,13.5)),
 1000:dict(M=(28,6,32,12),K=[((32,6,37,17),GL_K)],C=[((27,14,31,17),GL_C)],P=('col',(3,7,10,12),(3,13,17,20))),
}
inb=lambda b,y,x:b[0]<=x<=b[2] and b[1]<=y<=b[3]
def seg(n):
    p=frame(n);h,w=p.shape;L=np.full((h,w),'',object);S=SPEC[n];f='B' if n in BACK else 'F'
    for y in range(h):
        for x in range(w):
            i=int(p[y,x])
            if inb(S['M'],y,x):
                bar=i==136 and any(0<=x+d<w and p[y,x+d] in(134,135) for d in(-1,1))   # stick-colour cage bar inside the head
                if i==135:L[y,x]='cage'
                elif i in H or bar:L[y,x]='mask'
    for k,lst in (('blocker',S['K']),('catcher',S['C'])):
        for b,s in lst:
            for y in range(b[1],b[3]+1):
                for x in range(b[0],b[2]+1):
                    if y<h and x<w and not L[y,x] and int(p[y,x]) in s:L[y,x]=k
    P=S['P']
    if P[0]=='col':
        for side,b in zip('LR',P[1:]):
            for y in range(b[1],min(h,b[3]+1)):
                for x in range(b[0],min(w,b[2]+1)):
                    if not L[y,x] and int(p[y,x]) in G:L[y,x]='pad'+side
    else:
        _,b,k,sc=P
        for y in range(b[1],min(h,b[3]+1)):
            xs=[x for x in range(b[0],min(w,b[2]+1)) if not L[y,x] and int(p[y,x]) in G]
            segs=[];
            for x in xs:
                if segs and x==segs[-1][-1]+1:segs[-1].append(x)
                else:segs.append([x])
            for sg in segs:
                runs=0;cut=None;prev=False
                for x in sg:
                    t=p[y,x]==155
                    if t and not prev:runs+=1
                    if prev and not t and runs==k:cut=x;break
                    prev=t
                if cut is None and prev and runs==k:cut=sg[-1]+1
                if len(segs)==1 and cut is not None and sg[0]<sc<sg[-1]:
                    for x in sg:L[y,x]='padL' if x<cut else 'padR'
                else:
                    c=(sg[0]+sg[-1])/2
                    for x in sg:L[y,x]='padL' if c<sc else 'padR'
    # final part names
    out=np.full((h,w),'',object)
    for y in range(h):
        for x in range(w):
            v=L[y,x]
            if v=='mask':v='maskF' if f=='F' else 'maskB'
            elif v.startswith('pad'):v='pad'+f+'_'+v[3]
            out[y,x]=v
    return p,out,f
if __name__=='__main__':
    J={}
    for n in FRG:
        p,o,f=seg(n);u,c=np.unique(o[o!=''],return_counts=True);J[n]=dict(facing=f,**{a:int(b) for a,b in zip(u,c)})
        idx={}
        for part in u:idx[part]=sorted(set(int(v) for v in p[o==part]))
        J[n]['idx']=idx
    print(json.dumps(J));json.dump(J,open('/workspace/preview_v2/goalie4/seg4_stats.json','w'),indent=1)
