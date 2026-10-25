"""Per-pixel part segmentation: geometry + zone evidence. Equipment: glove (skater), goalie mask, catcher, blocker, pads."""
from lib import *
from scipy import ndimage as ndi
import collections
ARMZ=set(range(144,159)); SOCKZ=set(range(181,190)); PANTZ={177,178,179,180}
BODYZ={159,160,161,162,163,165,166,167}|set(range(168,177)); HELM={190,191}; SKIN={133,134,135,140}
CREST={i for r in (192,208,224,240) for i in range(r,r+5)}
GOALIE=set(range(373,381))|set(range(407,555))|set(range(975,1073))   # D187: 407 is a goalie (in g28; the range started at 408)
NEW95=set(range(877,1135))
PN=['none','outline','skin','helmet','torso','crest','shoulder_patch','sleeve','glove','pants','sock','skate','skate_blade','stick','shadow','goalie_mask','catcher','blocker','pad','other']
P={n:i for i,n in enumerate(PN)}
K8=np.ones((3,3),bool)
def isin(p,s): return np.isin(p,list(s))
def touch(m,n): return (ndi.binary_dilation(m,K8)&n).any()
def segment(n,p=None):
    p=frame(n) if p is None else p; h,w=p.shape
    part=np.full(p.shape,P['other'],np.uint8); part[p==255]=0
    part[isin(p,BODYZ)]=P['torso']; part[p==160]=P['shoulder_patch']; part[isin(p,CREST)]=P['crest']
    part[isin(p,ARMZ)]=P['sleeve']; part[isin(p,PANTZ)]=P['pants']; part[isin(p,SOCKZ)]=P['sock']
    part[isin(p,HELM)]=P['helmet']; part[isin(p,SKIN)]=P['skin']; part[p==136]=P['stick']
    part[isin(p,{8,28})]=P['skate_blade']; part[isin(p,{82,88,99})]=P['shadow']; part[p==0]=P['outline']
    goalie=n in GOALIE or (p==164).sum()>=3
    if goalie:
        # mask: 164 plus helmet/black pixels touching it
        m=p==164
        if m.any():
            grow=ndi.binary_dilation(m,K8,iterations=2)&isin(p,{0,164,190,191}|SKIN)
            part[grow]=P['goalie_mask']
        ys=np.nonzero(isin(p,PANTZ))[0]
        ycut=np.median(ys) if len(ys) else h*0.55
        gear=isin(p,ARMZ|SOCKZ)|(p==0)
        lab,k=ndi.label(gear,K8)
        stick=p==136; body=isin(p,BODYZ)
        for c in range(1,k+1):
            cm=lab==c; yy=np.nonzero(cm)[0]
            if cm.sum()<3: continue
            if yy.mean()>ycut: part[cm]=P['pad']; continue
            # upper: separate sleeve (near torso) from hand gear by geodesic distance from torso
            seed=cm&ndi.binary_dilation(body,K8)
            if not seed.any(): part[cm]=P['blocker'] if touch(cm,stick) else P['catcher']; continue
            d=geodesic(cm,seed); far=cm&(d>max(3,0.55*d[cm].max()))
            sl=cm&~far; part[sl&isin(p,ARMZ)]=P['sleeve']; part[sl&(p==0)]=P['outline']
            fl,fk=ndi.label(far,K8)
            for f in range(1,fk+1):
                fm=fl==f
                if fm.sum()<3: continue
                part[fm]=P['blocker'] if touch(fm,stick) else P['catcher']
    else:
        lab,k=ndi.label(p==0,K8)
        fa=isin(p,{144,145,146}); low=isin(p,SOCKZ|{8,28,82,88})
        for c in range(1,k+1):
            cm=lab==c; s=cm.sum(); yc=np.nonzero(cm)[0].mean()/h
            if s>=3 and touch(cm,fa) : part[cm]=P['glove']
            elif s>=3 and touch(cm,low) and yc>0.55: part[cm]=P['skate']
            elif s>=2 and touch(cm,p==136) and not touch(cm,isin(p,ARMZ)): part[cm]=P['stick']
    return part,goalie
def geodesic(mask,seed):
    d=np.full(mask.shape,1e9); d[seed]=0; cur=seed.copy(); k=0
    while True:
        k+=1; nxt=ndi.binary_dilation(cur,K8)&mask&~(d<1e9)
        if not nxt.any(): break
        d[nxt]=k; cur=nxt
    d[~mask]=0; d[d>=1e9]=0; return d
