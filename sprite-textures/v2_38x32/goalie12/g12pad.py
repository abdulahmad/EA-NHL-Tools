# Goalie v12 pads (Abdul): drive pad errors to zero or prove which px cannot be matched.
# 1 SEGMENTATION: a pad part keeps only px whose index can be pad gear (pad texture zones + white family + equipment
#   shading 22/30/31/88/109 - shading now counts as gear, Abdul D99); other px (144-150 blocker/catcher colours,
#   136 stick) go back to their own part.
# 2 PER-ROW UV (DP): for each pad, piece (padF / padWrap / padStrip) and mirror, every sprite row picks a texture row v
#   and a horizontal placement (offset 0..n-m, or even stretch if m>n); rows move down monotonically (v step 0..2) with a
#   0.5 px penalty for any other jump (lets the two stripe orders remap rows without changing the texture).
#   Cost = mismatching px. Equality as g10match.eq (WHITE family). No expand step: strict.
# 3 CLASSIFY every remaining px: shading (index in the shading set: no texel carries it), missing texel (index nowhere in
#   the piece), row content (index exists in the piece but no row/placement holds it at that column).
import sys,os,json,collections
H12=os.path.dirname(os.path.abspath(__file__));sys.path.insert(0,H12)
from g12 import *
H12=os.path.dirname(os.path.abspath(__file__))
SH={22,30,31,88,109}
def padzones():
    T=OPT['A'][0];Z=set(int(v) for v in T[9:23,0:13].flatten())-{TRANS};return Z
PZ=padzones()
def is_pad(s):return s in PZ or s in SH or (WHITE in PZ and s in g10match.WHITESET)
def row_cost(p,xs,y,TP,v,mir):
    if TP.shape[1]==13 and getattr(TP,'cyl',False) or CYL[0]:return row_cost_cyl(p,xs,y,TP,v,mir)
    return row_cost_lin(p,xs,y,TP,v,mir)
CYL=[False]
def row_cost_cyl(p,xs,y,TP,v,mir):
    # pad as a cylinder: padF cols 0-9 then strip 10-12, wrapping. A sprite row is an arc: start s0, scale sc texels per
    # px (0.5-2.0, so 6 px can cover 7 texels), and skew sk (texture rows per px) for the diagonal stripes seen in 3/4 views.
    W=TP.shape[1];V=TP.shape[0];a,b=min(xs),max(xs);best=None
    for sk in (0,.34,-.34,.5,-.5):
        for sc10 in range(5,21):
            sc=sc10/10
            for s0 in range(W):
                miss=0;U={}
                for x in xs:
                    k=(b-x) if mir else (x-a);u=(s0+int(k*sc))%W;vv=v+int(round(k*sk))
                    if not 0<=vv<V:miss+=1;U[x]=None;continue
                    U[x]=(vv,u)
                    if TP[vv,u]==TRANS or not g10match.eq(int(p[y,x]),int(TP[vv,u])):miss+=1
                if best is None or miss<best[0]:best=(miss,U)
                if miss==0:return best
    return best
def row_cost_lin(p,xs,y,TP,v,mir):
    tr=[u for u in range(TP.shape[1]) if TP[v,u]!=TRANS]
    if not tr:return len(xs),None
    ta,tb=tr[0],tr[-1];n=tb-ta+1;a,b=min(xs),max(xs);m=b-a+1;best=None
    opts=range(0,n-m+1) if m<=n else [None]
    for s in opts:
        miss=0;U={}
        for x in xs:
            k=(b-x) if mir else (x-a);u=ta+s+k if s is not None else ta+int(k*n/m);U[x]=u
            if TP[v,u]==TRANS or not g10match.eq(int(p[y,x]),int(TP[v,u])):miss+=1
        if best is None or miss<best[0]:best=(miss,U)
    return best
def dp(p,q,TP,mir):
    rows=collections.defaultdict(list)
    for y,x in q:rows[y].append(x)
    Y=sorted(rows);V=TP.shape[0];C={};INF=1e9
    for y in Y:
        for v in range(V):C[(y,v)]=row_cost(p,rows[y],y,TP,v,mir)
    D=[{v:(C[(Y[0],v)][0],None) for v in range(V)}]
    for i in range(1,len(Y)):
        cur={};gap=Y[i]-Y[i-1]
        for v in range(V):
            best=None
            for w,(c,_) in D[-1].items():
                step=v-w;pen=0 if 0<=step<=2*gap else .5
                t=c+pen
                if best is None or t<best[0]:best=(t,w)
            cur[v]=(best[0]+C[(Y[i],v)][0],best[1])
        D.append(cur)
    v=min(D[-1],key=lambda k:D[-1][k][0]);tot=D[-1][v][0];path=[v]
    for i in range(len(Y)-1,0,-1):v=D[i][v][1];path.append(v)
    path=path[::-1];M={}
    for y,v in zip(Y,path):
        _,U=C[(y,v)]
        for x in rows[y]:M[(y,x)]=(U[x] if CYL[0] else (v,U[x])) if U else None
    return tot,M
PIECES=('padCyl',)
def solve(p,q):
    best=None
    for k in PIECES:
        CYL[0]=k=='padCyl'
        TP=OPT['A'][0][9:23,0:13] if k=='padCyl' else tpiece('A',k)[0]
        for mir in (0,1):
            t,M=dp(p,q,TP,mir)
            if best is None or t<best[0]:best=(t,k,mir,M,TP)
    return best
def classify(p,c,t,TP):
    s=int(p[c]);Z=set(int(v) for v in TP.flatten())-{TRANS}
    if t and TP[t]!=TRANS and g10match.eq(s,int(TP[t])):return 'ok'
    if s in SH:return 'shading'
    if not (s in Z or (WHITE in Z and s in g10match.WHITESET)):return 'missing texel'
    return 'row content'
PADFRAMES=[416,419,421,538,407,428,980,413,425,520,987,505,1044,422]
def pad_parts(n):
    return [(g,q) for g,q in g11.parts(n) if g.startswith('pad')]
def run():
    out=[];tot=collections.Counter()
    for n in PADFRAMES:
        p=frame(n);old={g:v for g,v in map_frame(n,'A')[2].items() if g.startswith('pad')}
        for g,q in pad_parts(n):
            qq=[c for c in q if is_pad(int(p[c]))];seg=len(q)-len(qq)
            t,k,mir,M,TP=solve(p,qq);cl=collections.Counter(classify(p,c,M.get(c),TP) for c in qq)
            r=dict(frame=n,part=g,px=len(q),seg_removed=seg,piece=k,mirror=mir,old=old.get(g),**{kk.replace(' ','_'):v for kk,v in cl.items()})
            out.append(r);print(r,flush=True)
            for kk,v in cl.items():tot[kk]+=v
            tot['seg_removed']+=seg;tot['old_strict']+=(old.get(g) or {}).get('strict',0);tot['old_after']+=(old.get(g) or {}).get('after',0)
    print(dict(tot));json.dump(dict(rows=out,totals=dict(tot)),open(H12+'/g12_pads.json','w'),indent=1,default=int);return out
if __name__=='__main__':run()
