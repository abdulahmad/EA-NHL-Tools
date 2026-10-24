# Goalie v14 pads (Abdul pt904u): g13 strict mapping on the v14 segmentation (g14seg: stick shaft+blade out, skeleton
# assignment, smoothing). COLUMN mode now lets the cylinder column shift by one (either way) once down a sprite column, so a
# stripe that crosses one sock texel column on a turned leg (407 right leg: 185 above 189) is followed. No new texels.
import sys,os,json,collections
H14=os.path.dirname(os.path.abspath(__file__));sys.path.insert(0,H14)
from g14seg import *
def colpath(p,x,ys,u):
    best=None
    for ordn,O in (('A',ORD_A),('B',ORD_B)):
        for sh in (0,1,-1):
            ks=(0,) if sh==0 else (0,1)
            uu=lambda k:(u+k*sh)%W
            cost=lambda j,i,k:0 if eqs(int(p[ys[j],x]),CYLT[O[i],uu(k)]) else 1
            D=[{(i,k):(cost(0,i,k),None) for i in range(V) for k in ks}]
            for j in range(1,len(ys)):
                gap=ys[j]-ys[j-1];cur={}
                for i in range(V):
                    for k in ks:
                        bb=None
                        for (w,kw),(t,_) in D[-1].items():
                            if kw>k:continue
                            tt=t+(0 if 0<=i-w<=2*gap else .5)
                            if bb is None or tt<bb[0]:bb=(tt,(w,kw))
                        cur[(i,k)]=(bb[0]+cost(j,i,k),bb[1])
                D.append(cur)
            s=min(D[-1],key=lambda k:D[-1][k][0]);tot=D[-1][s][0]+(0.25 if sh else 0);path=[s]
            for j in range(len(ys)-1,0,-1):s=D[j][s][1];path.append(s)
            path=path[::-1]
            if best is None or tot<best[0]:best=(tot,{(y,x):(O[i],uu(k)) for y,(i,k) in zip(ys,path)},ordn)
    return best
g13pad.colpath=colpath
def run(only=None):
    out={};tot=collections.Counter();SEG={}
    if only:
        old=json.load(open(H14+'/g14_pads.json'))['frames'];SEG=json.load(open('/tmp/g14_seg.json'))
    for n in FRAMES13:
        if only and n not in only:
            out[n]=old[str(n)]
            for r in out[n]:
                for k in ('ok','row_col_content','missing_texel'):tot[k.replace('_col_','/col ').replace('_',' ')]+=r.get(k,0)
                tot['skate']+=r['skate']
            continue
        p=frame(n);out[n]=[];L,lab,J,src=legs(n);SEG[n]=dict(lab=lab.tolist(),joints={k:list(v) for k,v in J.items()},src=src)
        for g,q,sk in L:
            t,M,mode=g13pad.solve_leg(p,q);cl=collections.Counter(why(p,c,M.get(c)) for c in q)
            miss=collections.Counter(int(p[c]) for c in q if why(p,c,M.get(c))=='missing texel')
            r=dict(leg=g,px=len(q),skate=len(sk),mode=mode,**{k.replace(' ','_').replace('/','_'):v for k,v in cl.items()},missing_idx=dict(miss),
                   map={'%d,%d'%c:(list(map(int,M[c])) if M.get(c) else None) for c in q},skate_px=[list(map(int,c)) for c in sk])
            out[n].append(r);print(n,{k:v for k,v in r.items() if k not in('map','skate_px')},flush=True)
            for k,v in cl.items():tot[k]+=v
            tot['skate']+=len(sk)
    print('TOTAL',dict(tot));json.dump(dict(frames=out,totals=dict(tot)),open(H14+'/g14_pads.json','w'),default=int)
    json.dump(SEG,open('/tmp/g14_seg.json','w'),default=int);return out
if __name__=='__main__':run([int(a) for a in sys.argv[1:]] or None)
