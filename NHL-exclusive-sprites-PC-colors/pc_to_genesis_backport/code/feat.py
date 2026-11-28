import sys;sys.path.insert(0,'/workspace/g94-to-pc-zones/work');sys.path.insert(0,'.')
from common import *
FAMS=sorted(set(PCFAM.values()))+['other']
FID={f:i for i,f in enumerate(FAMS)}
SHADE={}
try:
    sys.path.insert(0,'/workspace/g94-to-pc-zones/work');from v2_palette import PCSHADE
    SHADE={i:{'dark':0,'medium':1,'light':2}.get(s,1) for i,s in PCSHADE.items()}
except Exception as e:print('noshade',e)
FAMLUT=np.full(257,FID['other'],int)   # index 255/-1 -> 256 slot reserved for empty
for i in range(256):FAMLUT[i]=FID[pcfam(i)]
EMPTY=len(FAMS)  # family id for transparent
SHLUT=np.full(256,1,int)
for i,s in SHADE.items():SHLUT[i]=s
def feats(p):
    """p: 2D int array, 255 (or -1) = transparent. returns (ys,xs,X)"""
    p=np.where(p<0,255,p).astype(int)
    H,W=p.shape;m=p!=255;ys,xs=np.nonzero(m)
    fam=np.where(m,FAMLUT[np.clip(p,0,255)],EMPTY)
    sh=np.where(m,SHLUT[np.clip(p,0,255)],-1)
    pf=np.pad(fam,2,constant_values=EMPTY);ps=np.pad(sh,2,constant_values=-1)
    y0,y1,x0,x1=ys.min(),ys.max(),xs.min(),xs.max();h=y1-y0+1;w=x1-x0+1
    cols=[p[ys,xs],fam[ys,xs],sh[ys,xs]]
    for dy in range(-2,3):
        for dx in range(-2,3):
            if dy==0 and dx==0:continue
            cols.append(pf[ys+2+dy,xs+2+dx])
    for dy,dx in((-1,0),(1,0),(0,-1),(0,1)):cols.append(ps[ys+2+dy,xs+2+dx])
    cols+=[(ys-y0)/h,(xs-x0)/w,ys-y0,y1-ys,np.abs(xs-(x0+x1)/2),np.full(len(ys),h),np.full(len(ys),w)]
    # same-family runs
    def run(dy,dx):
        out=np.zeros(len(ys),int)
        for i,(y,x) in enumerate(zip(ys,xs)):
            f=fam[y,x];n=0;yy,xx=y+dy,x+dx
            while 0<=yy<H and 0<=xx<W and fam[yy,xx]==f and n<12:n+=1;yy+=dy;xx+=dx
            out[i]=n
        return out
    for d in((-1,0),(1,0),(0,-1),(0,1)):cols.append(run(*d))
    X=np.stack(cols,1).astype(float)
    return ys,xs,X
CATIDX=[0,1]+list(range(3,27))   # categorical columns: idx, fam, 24 neighbour fams
