# Goalie v13 pads (Abdul pt884u). Every pad pixel is texture: no shading exemption, no white-family wildcard.
# Root-cause fixes over g12pad:
#  STRICT  a pixel is right only if the texel index == sprite index. The texture's WHITE (-1) sock texels are the
#          plain sock index 181 (g12 let -1 match the whole white family incl. 155 trim and 177 and then drew the
#          ORIGINAL colour there, so wrong pixels looked right and were never flagged).
#  SEG     pad pixels = goalie9 pad parts + touching unassigned pad-colour px, minus px claimed by catcher (catcher_q),
#          blocker and mask, minus the SKATE. Two pad parts that touch and together are no wider than one pad are
#          one leg (1044 was one pad cut in two). Other-gear indices (144/147/148/150/136) leave the pad.
#  SKATE   all 31 (blade) px, plus black px that reach the blade / bottom through black and are not enclosed left
#          and right in their row by non-black pad px (pad straps and the toe are enclosed; the boot is not).
#  UV      two separable mappings, best kept per leg:
#          ROW mode (g12 cylinder arcs: start, scale 0.3-2.0, skew up to +-1 row/px), and
#          COLUMN mode: each sprite column gets one cylinder column u (u steps 0..2 per column, either direction =
#          mirror), and inside the column a monotone row path v. The row path may use texture order A (as stored)
#          or order B (rows 15/16 swapped = the other stripe order), chosen per column. Column mode follows the
#          45-degree straps (538) and the curved, reversed sock stripes of back views (407).
import sys,os,json,collections,pickle
H13=os.path.dirname(os.path.abspath(__file__));sys.path.insert(0,H13+'/../goalie12')
from g12pad import *
import g12pad
H13=os.path.dirname(os.path.abspath(__file__))
SOCK=181
CYLT=OPT['A'][0][9:23,0:13].copy()          # texture rows 9-22: pad front x0-9 + sock strip x10-12
def tv(t):return SOCK if t==WHITE else t
def eqs(s,t):return t!=TRANS and s==tv(int(t))
PADIDX={0,145,146,151,152,155,164,181,182,183,184,185,186,187,188,189}
V=CYLT.shape[0];W=CYLT.shape[1]
ORD_A=list(range(V));ORD_B=list(range(V));ORD_B[6],ORD_B[7]=7,6   # cyl rows 6/7 = texture rows 15/16 (stripes)
def nb8(c):
    y,x=c;return [(y+dy,x+dx) for dy in(-1,0,1) for dx in(-1,0,1) if dy or dx]
def legs(n):
    p=frame(n);P=dict(g11.parts(n));claimed=set(tuple(c) for c in catcher_q(n))
    for g in ('blocker','mask'):claimed|=set(tuple(c) for c in P.get(g,[]))
    allp=set()
    for g,q in P.items():allp|=set(tuple(c) for c in q)
    # px whose index is other gear (blocker/catcher 144/147/148/150, stick 136, jersey) leave the pad; shading
    # indices that sit on the pad (22/30) stay and must be matched like any colour
    raw=[(g,{c for c in set(tuple(c) for c in q)-claimed if int(p[c]) in PADIDX|{22,30,31}}) for g,q in P.items() if g.startswith('pad')]
    raw=[(g,s) for g,s in raw if s]
    # grow into unassigned pad-colour px (1044 row 23 belonged to no part)
    taken=set().union(*[s for _,s in raw]) if raw else set()
    for g,s in raw:
        fr=list(s)
        while fr:
            c=fr.pop()
            for d in nb8(c):
                if d in taken or d in claimed or d in allp:continue
                if 0<=d[0]<p.shape[0] and 0<=d[1]<p.shape[1] and int(p[d]) in PADIDX:s.add(d);taken.add(d);fr.append(d)
    # touching parts are one leg when together they are no wider than one pad (median row width <= 9)
    out=[]
    def narrow(s):
        R=collections.defaultdict(list)
        for y,x in s:R[y].append(x)
        w=sorted(max(v)-min(v)+1 for v in R.values());return w[len(w)//2]<=9
    for g,s in raw:
        for o in out:
            if narrow(o[1]|s) and any(d in o[1] for c in s for d in ((c[0],c[1]-1),(c[0],c[1]+1),(c[0]-1,c[1]),(c[0]+1,c[1]))):o[1].update(s);o[0].append(g);break
        else:out.append([[g],set(s)])
    res=[]
    for gs,s in out:
        s=main_body(s)
        sk=skate(p,s);res.append(('+'.join(gs),sorted(s-sk),sorted(sk)))
    return res
def main_body(s):
    """Drop stray pieces of a goalie9 pad part (407: helmet-stripe px at rows 1-5 were in the pad parts): keep the
    largest 8-connected component and any component within 2 px of it."""
    s=set(s);comps=[]
    while s:
        c=s.pop();cc={c};fr=[c]
        while fr:
            for d in nb8(fr.pop()):
                if d in s:s.remove(d);cc.add(d);fr.append(d)
        comps.append(cc)
    comps.sort(key=len,reverse=True);keep=set(comps[0])
    for cc in comps[1:]:
        if any(abs(a[0]-b[0])<=2 and abs(a[1]-b[1])<=2 for a in cc for b in comps[0]):keep|=cc
    return keep
def skate(p,s):
    bottom=max(y for y,x in s)
    sk={c for c in s if int(p[c])==31 and c[0]>=bottom-6}
    blk={c for c in s if int(p[c])==0}
    def enclosed(c):
        y,x=c;L=any((y,xx) in s and int(p[y,xx]) not in(0,31) for xx in range(x-1,x-12,-1));R=any((y,xx) in s and int(p[y,xx]) not in(0,31) for xx in range(x+1,x+12))
        return L and R
    bottom=max(y for y,x in s)
    seeds=[c for c in blk if not enclosed(c) and (any(d in sk for d in nb8(c)) or c[0]==bottom or not any((yy,c[1]) in s and int(p[yy,c[1]]) not in (0,31) for yy in range(c[0]+1,bottom+1)))]
    seeds=[c for c in seeds if c[0]>=bottom-6]   # the skate is at the foot: within 6 rows of the leg's bottom
    fr=list(seeds);sk|=set(seeds)
    while fr:
        c=fr.pop()
        for d in nb8(c):
            if d in blk and d not in sk and not enclosed(d) and d[0]>=bottom-6:sk.add(d);fr.append(d)
    return sk
# ---- ROW mode
def row_arc(p,xs,y,v,mir):
    a,b=min(xs),max(xs);best=None
    for sk in (0,.34,-.34,.5,-.5,.67,-.67,1,-1):
        for sc10 in range(3,21):
            sc=sc10/10
            for s0 in range(W):
                miss=0;U={}
                for x in xs:
                    k=(b-x) if mir else (x-a);u=(s0+int(k*sc))%W;vv=v+int(round(k*sk))
                    if not 0<=vv<V:miss+=1;U[x]=None;continue
                    U[x]=(vv,u)
                    if not eqs(int(p[y,x]),CYLT[vv,u]):miss+=1
                if best is None or miss<best[0]:best=(miss,U)
                if miss==0:return best
    return best
LINES={'row':lambda y,x:(y,x),'diag/':lambda y,x:(y+x,x),'diag\\':lambda y,x:(y-x,x)}
def rowmode(p,q):
    """ROW mode on three line families: sprite rows, and the two 45-degree diagonals (a pad lying at 45 degrees,
    538 right pad, has its straps on the y+x anti-diagonals). Each line is an arc on the cylinder; lines map to
    texture rows monotonically."""
    best=None
    for lk,f in LINES.items():
        rows=collections.defaultdict(list);orig={}
        for y,x in q:L,P=f(y,x);rows[L].append(P);orig[(L,P)]=(y,x)
        Y=sorted(rows)
        class PP:
            def __getitem__(s_,k):return p[orig[k]]
        pp=PP()
        for mir in (0,1):
            C={(y,v):row_arc(pp,rows[y],y,v,mir) for y in Y for v in range(V)}
            D=[{v:(C[(Y[0],v)][0],None) for v in range(V)}]
            for i in range(1,len(Y)):
                gap=Y[i]-Y[i-1];cur={}
                for v in range(V):
                    bw=min(D[-1],key=lambda w:D[-1][w][0]+(0 if 0<=v-w<=2*gap else .5))
                    cur[v]=(D[-1][bw][0]+(0 if 0<=v-bw<=2*gap else .5)+C[(Y[i],v)][0],bw)
                D.append(cur)
            v=min(D[-1],key=lambda k:D[-1][k][0]);tot=D[-1][v][0];path=[v]
            for i in range(len(Y)-1,0,-1):v=D[i][v][1];path.append(v)
            M={}
            for y,v in zip(Y,path[::-1]):
                for x in rows[y]:M[orig[(y,x)]]=C[(y,v)][1][x]
            tot+=0 if lk=='row' else .75   # prefer plain rows unless a diagonal really fits better
            if best is None or tot<best[0]:best=(tot,M,'%s m%d'%(lk,mir))
    return best
# ---- COLUMN mode
def colpath(p,x,ys,u):
    best=None
    for ordn,O in (('A',ORD_A),('B',ORD_B)):
        D=[{i:((0 if eqs(int(p[ys[0],x]),CYLT[O[i],u]) else 1),None) for i in range(V)}]
        for j in range(1,len(ys)):
            gap=ys[j]-ys[j-1];cur={}
            for i in range(V):
                c=0 if eqs(int(p[ys[j],x]),CYLT[O[i],u]) else 1;bb=None
                for w,(t,_) in D[-1].items():
                    tt=t+(0 if 0<=i-w<=2*gap else .5)
                    if bb is None or tt<bb[0]:bb=(tt,w)
                cur[i]=(bb[0]+c,bb[1])
            D.append(cur)
        i=min(D[-1],key=lambda k:D[-1][k][0]);tot=D[-1][i][0];path=[i]
        for j in range(len(ys)-1,0,-1):i=D[j][i][1];path.append(i)
        path=path[::-1]
        if best is None or tot<best[0]:best=(tot,{(y,x):(O[i],u) for y,i in zip(ys,path)},ordn)
    return best
def colmode(p,q):
    cols=collections.defaultdict(list)
    for y,x in q:cols[x].append(y)
    X=sorted(cols);C={(x,u):colpath(p,x,sorted(cols[x]),u) for x in X for u in range(W)};best=None
    for dr in (1,-1):
        D=[{u:(C[(X[0],u)][0],None) for u in range(W)}]
        for i in range(1,len(X)):
            gap=X[i]-X[i-1];cur={}
            for u in range(W):
                bb=None
                for w,(t,_) in D[-1].items():
                    st=((u-w)*dr)%W;tt=t+(0 if st<=2*gap else .5)
                    if bb is None or tt<bb[0]:bb=(tt,w)
                cur[u]=(bb[0]+C[(X[i],u)][0],bb[1])
            D.append(cur)
        u=min(D[-1],key=lambda k:D[-1][k][0]);tot=D[-1][u][0];path=[u]
        for i in range(len(X)-1,0,-1):u=D[i][u][1];path.append(u)
        M={};ords=''
        for x,u in zip(X,path[::-1]):M.update(C[(x,u)][1]);ords+=C[(x,u)][2]
        tot+=.75
        if best is None or tot<best[0]:best=(tot,M,'col %s orders %s'%('mirror' if dr<0 else 'normal',ords))
    return best
def why(p,c,t):
    s=int(p[c])
    if t and eqs(s,CYLT[t]):return 'ok'
    have={tv(int(v)) for v in CYLT.flatten() if v!=TRANS}
    return 'row/col content' if s in have else 'missing texel'
def solve_leg(p,q):
    r=rowmode(p,q);c=colmode(p,q);b=min((r,c),key=lambda z:z[0]);return b
FRAMES13=PADFRAMES
def run():
    out={};tot=collections.Counter()
    for n in FRAMES13:
        p=frame(n);out[n]=[]
        for g,q,sk in legs(n):
            t,M,mode=solve_leg(p,q);cl=collections.Counter(why(p,c,M.get(c)) for c in q)
            miss=collections.Counter(int(p[c]) for c in q if why(p,c,M.get(c))=='missing texel')
            r=dict(leg=g,px=len(q),skate=len(sk),mode=mode,**{k.replace(' ','_').replace('/','_'):v for k,v in cl.items()},missing_idx=dict(miss),
                   map={'%d,%d'%c:(list(map(int,M[c])) if M.get(c) else None) for c in q},skate_px=[list(map(int,c)) for c in sk])
            out[n].append(r);print(n,{k:v for k,v in r.items() if k not in('map','skate_px')},flush=True)
            for k,v in cl.items():tot[k]+=v
            tot['skate']+=len(sk)
    print(dict(tot));json.dump(dict(frames=out,totals=dict(tot)),open(H13+'/g13_pads.json','w'),default=int);return out
if __name__=='__main__':run()
