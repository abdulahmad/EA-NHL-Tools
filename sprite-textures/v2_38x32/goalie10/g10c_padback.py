# Goalie v10c Part 1 (Abdul pt872u): is 186 (socks stripe 1 dark) a real pad-back zone, an errant frame, or a mirror/wrap artefact?
# For every goalie frame (g9 SPA set) and every pad-back stripe-1 run (184 185 next to each other in a row):
#   third = the px after 185 going away from 184 (186 = full triplet, 155 = trim replaces the dark shade),
#   order = is the stripe-2 run (187-189) directly ABOVE (2/1, Abdul's strip order) or BELOW (1/2, 520 order) the stripe-1 run.
import sys,os,json,collections;sys.path.insert(0,os.path.dirname(os.path.abspath(__file__))+'/../goalie9')
from g9scan import *
def runs(n):
    p=frame(n);h,w=p.shape;out=[]
    for y in range(h):
        for x in range(w-1):
            a,b=int(p[y,x]),int(p[y,x+1])
            for d,(i,j) in ((1,(x,x+1)),(-1,(x+1,x))):
                if int(p[y,i])==184 and int(p[y,j])==185:
                    k=j+d;third=int(p[y,k]) if 0<=k<w else 255
                    up=[int(p[y-1,c]) for c in (i,j,k) if 0<=c<w and y>0];dn=[int(p[y+1,c]) for c in (i,j,k) if 0<=c<w and y+1<h]
                    o='2/1' if any(187<=v<=189 for v in up) else '1/2' if any(187<=v<=189 for v in dn) else '?'
                    out.append(dict(y=y,x=min(i,k),dir='184->right' if d==1 else '184->left',third=third,order=o))
    return out
if __name__=='__main__':
    F=goalie_frames();J={};T=collections.Counter()
    for n in F:
        r=runs(n)
        if r:J[n]=dict(anim=F[n][0][0],d=F[n][0][1],runs=r)
        for q in r:T[(q['order'],q['third'])]+=1
    print({'%s third=%s'%k:v for k,v in sorted(T.items())})
    byanim=collections.defaultdict(collections.Counter)
    for n,v in J.items():
        for q in v['runs']:byanim[v['anim']][(q['order'],q['third'])]+=1
    for a,c in byanim.items():print(a,dict(c))
    json.dump(dict(totals={'%s|%s'%k:v for k,v in T.items()},frames=J),open(os.path.dirname(os.path.abspath(__file__))+'/g10c_padback.json','w'),indent=0,default=int)
