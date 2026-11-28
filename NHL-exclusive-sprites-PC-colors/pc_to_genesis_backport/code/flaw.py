import sys;sys.path.insert(0,'.')
from sets import *
from feat import FAMLUT,FAMS,FID
from scipy import ndimage as ndi
import collections
STRIPE=['arm stripe 1','arm stripe 2','arm stripe 3','waist 1','waist 2','waist 3','socks stripe 1','socks stripe 2','pants stripe 1','pants stripe 2']
TEAMF=[f for f in FAMS if f not in('other','black','skin','stick','blade','shadow')]
def edges(a):
    """family-pair edge counter between 4-neighbour opaque pixels (different families, team zones only)"""
    fam=np.where(a!=255,FAMLUT[np.clip(a,0,255)],-1);C=collections.Counter()
    for f1,f2 in ((fam[:,:-1],fam[:,1:]),(fam[:-1,:],fam[1:,:])):
        m=(f1!=f2)&(f1>=0)&(f2>=0)
        for x,y in zip(f1[m],f2[m]):
            if FAMS[x] in TEAMF and FAMS[y] in TEAMF:C[tuple(sorted((FAMS[x],FAMS[y])))]+=1
    return C
def baseline():
    """adjacency counts over the 95 PC frames that DO have a 94G match (known-good zones)"""
    E=collections.Counter();n=0
    for k in P.index:
        if tier(k)=='match' and kindof(k)=='skater':E.update(edges(A['PC'][k]));n+=1
    return E,n
def metrics(a,E,tot):
    a=np.asarray(a);fam=np.where(a!=255,FAMLUT[np.clip(a,0,255)],-1)
    team=np.isin(fam,[FID[f] for f in TEAMF]);nt=int(team.sum())
    ed=edges(a);rare=0;rare_pairs=[]
    for k,v in ed.items():
        fr=E.get(k,0)/tot
        if E.get(k,0)<=2:rare+=v;rare_pairs.append(f'{k[0]}|{k[1]}')
    stray=0;straylist=collections.Counter()
    for f in STRIPE:
        mk=fam==FID[f]
        if not mk.any():continue
        lab,nn=ndi.label(mk,np.ones((3,3)))
        sz=ndi.sum(mk,lab,range(1,nn+1))
        s=int((np.array(sz)<=1).sum());stray+=s
        if s:straylist[f]+=s
    present={f:int((fam==FID[f]).sum()) for f in STRIPE}
    return dict(team_px=nt,rare_edge_px=rare,rare_pairs=';'.join(sorted(set(rare_pairs))),stray_px=stray,stray_fams=';'.join(f'{k}:{v}' for k,v in straylist.items()),
        present_arm=sum(1 for f in STRIPE[:3] if present[f]),present_waist=sum(1 for f in STRIPE[3:6] if present[f]),present_sock=sum(1 for f in STRIPE[6:8] if present[f]))
def fam_counts(a):
    a=np.asarray(a);fam=np.where(a!=255,FAMLUT[np.clip(a,0,255)],-1)
    return {f:int((fam==FID[f]).sum()) for f in FAMS if f!='other'}
def structure_flags(a):
    c=fam_counts(a);fl=[]
    if c['forearm']>=4 and c['upper arm']>=4 and not any(c[f] for f in STRIPE[:3]):fl.append('no arm stripes')
    if c['jersey']>=8 and c['pants']>=8 and not any(c[f] for f in STRIPE[3:6]):fl.append('no waist bands')
    if c['socks']>=6 and not any(c[f] for f in STRIPE[6:8]):fl.append('no sock stripes')
    return fl
class Baseline:
    def __init__(s,kind):
        s.E=collections.Counter();s.n=0
        for k in P.index:
            if tier(k)=='match' and kindof(k)==kind:s.E.update(edges(A['PC'][k]));s.n+=1
        s.sf=collections.Counter(tuple(structure_flags(A['PC'][k])) for k in P.index if tier(k)=='match' and kindof(k)==kind)
    def flags(s,a):
        m=metrics(a,s.E,s.n);fl=[]
        if m['rare_edge_px']>0:fl.append('odd zone contact: '+m['rare_pairs'])
        if m['stray_px']>=6:fl.append(f"stray stripe px {m['stray_px']}")
        fl+=structure_flags(a)
        return fl,m
EXPECT={'arm stripe 1':['upper arm','arm stripe 2','arm stripe 3','forearm'],'arm stripe 2':['arm stripe 1','arm stripe 3','upper arm','forearm'],'arm stripe 3':['forearm','arm stripe 2','arm stripe 1','upper arm'],
 'waist 1':['waist 2','waist 3','jersey'],'waist 2':['waist 1','waist 3'],'waist 3':['waist 2','waist 1','pants'],
 'socks stripe 1':['socks','socks stripe 2'],'socks stripe 2':['socks stripe 1','socks'],'pants stripe 1':['pants','pants stripe 2'],'pants stripe 2':['pants','pants stripe 1']}
def broken(a):
    """stripe components (8-conn) that are a single pixel or touch none of the zones they sit between = broken stripe"""
    a=np.asarray(a);fam=np.where(a!=255,FAMLUT[np.clip(a,0,255)],-1);out=[]
    for f,exp in EXPECT.items():
        mk=fam==FID[f]
        if not mk.any():continue
        ok=np.isin(fam,[FID[e] for e in exp])
        near=ndi.binary_dilation(ok,np.ones((3,3)))
        lab,nn=ndi.label(mk,np.ones((3,3)))
        for i in range(1,nn+1):
            c=lab==i;sz=int(c.sum())
            if sz<=1 or not (near&c).any():out.append((f,sz))
    return out
