# D157 (Abdul pt969u: "the vertical lines are not straight in many cases and there's no reason for them to not be").
# Column straightening pass on a skater texel map (v2 38x32 layout), run after the v5 fit / back-torso remap.
# Rows (texel v) are never changed. Per body segment (each torso region; each arm region split into upper v<=12 and lower
# v>=13) one across-axis is fixed for the whole segment: the PCA long axis of the segment's px when it is clearly elongated
# (leaning torso, diagonal arm), else screen vertical. Each px gets s = its signed distance across that axis, and ONE target
# column t = c + sign*s (1 texel per px; c and sign fitted once per segment to the previous columns: least |change|).
# Within each (row, family) group the px are matched to that row's texels of the SAME family (strict: the control texture
# still reproduces the game colour) by an order-preserving 1:1 match with min sum |t - u|; if a row has more px than
# texels, each px takes the nearest allowed texel (a few doubles, as before). So a texel column sits at the same across-axis
# position on every row -> straight vertical lines (or straight lines following the lean).
import collections,os,numpy as np
REG=[('arm R',0,0,3,21),('front torso',3,0,13,17),('arm L',16,0,4,21),('back arm L',20,0,4,21),('back torso',24,0,10,17),('back arm R',34,0,4,21)]
def reg(u,v):
    for nm,x,y,w,h in REG:
        if x<=u<x+w and y<=v<y+h:return nm,x,w
    return None
def _match(ts,us):
    m,n=len(ts),len(us);INF=1e18;C=np.full((m+1,n+1),INF);C[0,:]=0
    for i in range(1,m+1):
        for j in range(i,n+1):C[i,j]=min(C[i,j-1],C[i-1,j-1]+abs(ts[i-1]-us[j-1]))
    out=[];i,j=m,n
    while i>0:
        if j>i and C[i,j]==C[i,j-1]:j-=1
        else:out.append(us[j-1]);i-=1;j-=1
    return out[::-1]
def straighten(tm,fam,FAM2):
    """tm: {'y,x':[u,v]} v2 map; fam: {'y,x': family of the px's original texel}; FAM2: {(u,v): set of families}."""
    seg=collections.defaultdict(list)
    for k,(u,v) in tm.items():
        r=reg(u,v)
        if not r or k not in fam:continue
        part=r[0]+('' if 'torso' in r[0] else (' up' if v<=12 else ' low'))
        seg[part].append(k)
    return _run(tm,fam,FAM2,seg,lambda part,k:range(reg(*tm[k])[1],reg(*tm[k])[1]+reg(*tm[k])[2]))
# D159: same pass on the PANTS rows (v17-22). Segment = v2 pants zone of the px's texel (pantsF = front figure cols,
# pantsB = back), allowed texels = that zone's texels in the row with the px's family (NZ from v2map3.py).
def straighten_pants(tm,fam,FAM2,NZ):
    seg=collections.defaultdict(list)
    for k,(u,v) in tm.items():
        z=NZ.get((u,v))
        if 17<=v<=22 and z in('pantsF','pantsB') and k in fam:seg[z].append(k)
    cols={z:sorted({u for (u,v),zz in NZ.items() if zz==z}) for z in('pantsF','pantsB')}
    return _run(tm,fam,FAM2,seg,lambda part,k:cols[part],lambda part,u,v:NZ.get((u,v))==part)
def _run(tm,fam,FAM2,seg,colsf,okf=lambda part,u,v:True):
    out=dict(tm)
    for part,ks in seg.items():
        if len(ks)<3:continue
        P=np.array([list(map(int,k.split(','))) for k in ks],float);c0=P.mean(0)
        w,V=np.linalg.eigh(np.cov((P-c0).T));ax=V[:,1]
        if w[1]<1.6*max(w[0],1e-6):ax=np.array([1.,0.])     # not elongated: body axis = screen vertical
        if ax[0]<0:ax=-ax
        d=np.array([-ax[1],ax[0]]);d=d if d[1]>=0 else -d   # across direction, screen x increasing
        s=(P-c0)@d;u0=np.array([tm[k][0] for k in ks],float)
        sg=1.0 if np.std(s)==0 or np.std(u0)==0 or np.corrcoef(s,u0)[0,1]>=0 else -1.0
        c=float(np.median(u0-sg*s));T={k:c+sg*si for k,si in zip(ks,s)}
        C=colsf(part,ks[0])
        grp=collections.defaultdict(list)
        for k in ks:grp[(tm[k][1],fam[k])].append(k)
        for (v,f),g in grp.items():
            us=sorted(u for u in C if okf(part,u,v) and (f in FAM2.get((u,v),()) or os.environ.get('ANYFAM')=='1') and FAM2.get((u,v)))
            if not us:continue
            g.sort(key=lambda k:T[k]*sg);ts=[T[k] for k in g]
            if sg<0:us=us[::-1]
            if len(g)<=len(us):
                if sg<0:res=[-x for x in _match([-t for t in ts],[-u for u in us])]
                else:res=_match(ts,us)
            else:res=[min(us,key=lambda u:abs(u-t)) for t in ts]
            for k,u in zip(g,res):out[k]=[int(u),int(v)]
    return out
