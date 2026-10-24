# Goalie v12 (Abdul pt880u): drop Abdul's unused 8x12 catcher piece (no frame maps to it since v10d) and repack:
#  rows 0-8 blocker + mask, rows 9-22 pad front + strip (x0-12), rows 23-31 catcher (A: 22x9 rect, B: back rect + oval).
#  Texture 23x32, index-based. Missing parts filled by skeleton/zone seeds: 428 blocker (blocker zones near skel10 Rhand),
#  520 mask (mask zones, top cluster of the sprite). Images local only.
import sys,os
H=os.path.dirname(os.path.abspath(__file__));sys.path.insert(0,H+'/../goalie11')
import g11
from g11 import *
H12=os.path.dirname(os.path.abspath(__file__))
def repack(T,P):
    x0,y0,x1,y1=P['catcher'];T=T.copy();T[y0:y1+1,x0:x1+1]=TRANS
    N=np.full((32,23),TRANS,int);N[0:23]=T[0:23];N[23:32]=T[24:33]
    Q={k:(v if v[1]<23 else (v[0],v[1]-1,v[2],v[3]-1)) for k,v in P.items() if k!='catcher'};return N,Q
ORIG={o:OPT[o] for o in 'AB'}
for o in 'AB':OPT[o]=repack(*ORIG[o])
def save():
    for o,nm in (('A','goalie_texture_v4b_indexed.png'),('B','goalie_texture_v5b_candidate_indexed.png')):
        T=OPT[o][0];im=Image.fromarray(np.where(T==WHITE,181,T).astype(np.uint8),'P');im.putpalette(g10tex.ACT.flatten().tolist());im.save(H12+'/'+nm)
def comp(p,seed_ok,zones,cx,cy,r,taken):
    S=[(y,x) for y in range(p.shape[0]) for x in range(p.shape[1]) if int(p[y,x]) in zones and (y,x) not in taken and max(abs(y-cy),abs(x-cx))<=r]
    if not S:return []
    s=min(S,key=lambda c:max(abs(c[0]-cy),abs(c[1]-cx)));out={s};st=[s];S=set(S)
    while st:
        y,x=st.pop()
        for dy in (-1,0,1):
            for dx in (-1,0,1):
                c=(y+dy,x+dx)
                if c in S and c not in out:out.add(c);st.append(c)
    return sorted(out)
_parts=g11.parts
def parts(n):
    L=_parts(n);have={g for g,_ in L};taken={c for _,q in L for c in q}|set(map(tuple,catcher_q(n)))
    p=frame(n)
    if n==428 and 'blocker' not in have:
        x,y=skel10.ADJ[428]['Rhand'];q=comp(p,None,{144,146,147},x,y,4,taken)
        if len(q)>=4:L.append(('blocker',q))
    if n==520 and 'mask' not in have:
        ys=np.nonzero(p!=255)[0];top=ys.min();xs=np.nonzero(p[top]!=255)[0];cx=int(xs.mean())
        q=comp(p,None,{164,177,184,185,186,187,188,189},cx,top+3,5,taken)
        if len(q)>=4:L.append(('mask',q))
    return L
g11.parts=parts
if __name__=='__main__':
    save()
    import collections
    for n in (428,520):print(n,[(g,len(q)) for g,q in parts(n)])
    R={};tot=collections.Counter()
    for n in FRAMES:
        for o in 'AB':
            m,t,row=map_frame(n,o);R['%d%s'%(n,o)]=dict(frame=n,opt=o,**t,parts=row);tot[o+'s']+=t['strict'];tot[o+'a']+=t['after']
    print(dict(tot));print({k:R[k]['parts'] for k in ('428A','520A')})
    json.dump(dict(frames=R,totals=dict(tot)),open(H12+'/g12_teams.json','w'),indent=1,default=int)
