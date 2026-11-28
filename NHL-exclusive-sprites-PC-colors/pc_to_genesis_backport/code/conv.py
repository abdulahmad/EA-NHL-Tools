import sys;sys.path.insert(0,'.');sys.path.insert(0,'/workspace/g94-to-pc-zones/v4/work')
from feat import *
from train import predict
import joblib,struct
from teams import teamact
BOSPC=teamact('bos','h')
from uniform import team94
G94BOS,_=team94('bos','h')
_rom=open('/workspace/base94-teamblock-vram/nhl94retail.bin','rb').read()[0x59924:0x599A4]
G94LINE={}
for i in (0,1):
    for n in range(1,16):
        v=struct.unpack('>H',_rom[2*(i*16+n):2*(i*16+n)+2])[0]
        G94LINE[16*i+n]=tuple(((v>>s)&7)*36 for s in (1,5,9))
GRGB=np.zeros((64,3),np.uint8)
for k,c in G94BOS.items():
    if k>=33:GRGB[k]=c
for k,c in G94LINE.items():GRGB[k]=c
FIXED=[33,34,38,39,46,47]
BODYLIKE=set([0,8,28,31,82,88,99,100,132,133,134,135,136,140]+list(range(144,245)))
def nearest(rgb,cands):
    d=[sum((int(a)-int(b))**2 for a,b in zip(rgb,GRGB[c])) for c in cands];return cands[int(np.argmin(d))]
def convert(p,model,minn=30):
    """p: PC index array (255 transparent) -> Genesis index array (0 transparent) + stats"""
    p=np.asarray(p).astype(int);ys,xs,X=feats(p)
    out=np.zeros(p.shape,int);st=dict(model=0,fallback=0,fb_idx=set())
    m=model['m'];allow=model['allow'];cnt=model['cnt']
    pi=X[:,0].astype(int);known=np.array([cnt.get(i,0)>=minn for i in pi])
    pred=np.zeros(len(pi),int)
    if known.any():pred[known]=predict(m,allow,cnt,X[known],minn)
    for j in np.nonzero(~known)[0]:
        i=int(pi[j])
        if i in BODYLIKE:pred[j]=nearest(BOSPC[i],FIXED)          # body part with too little training data: nearest stock line-2 colour
        else:pred[j]=nearest(BOSPC[i],[16*l+n for l in (0,1) for n in range(1,16)]);st['obj']=st.get('obj',0)+1   # non-team object colour (cup, puck ...): palette line 0/1, as the real 94G Stanley Cup frames do
        st['fallback']+=1;st['fb_idx'].add(i)
    st['model']=int(known.sum());out[ys,xs]=pred
    return out,st
def convert_item(p):
    """items / referees: nearest colour on one of the two non-team Genesis palette lines (best line per frame)"""
    p=np.asarray(p).astype(int);m=p!=255;best=None
    for line in (0,1):
        cands=[16*line+n for n in range(1,16)]
        o=np.zeros(p.shape,int);err=0
        for idx in np.unique(p[m]):
            c=nearest(BOSPC[idx],cands);o[p==idx]=c;err+=((p==idx).sum())*sum((int(a)-int(b))**2 for a,b in zip(BOSPC[idx],GRGB[c]))**.5
        if best is None or err<best[0]:best=(err,o,line)
    return best[1],best[2]

def resolve_lines(g):
    """a hardware-sprite tile has one palette line: recolour the minority-line pixels of mixed tiles to the nearest colour of the tile's majority line"""
    g=g.copy();H,W=g.shape;ch=0
    for ty in range((H+7)//8):
        for tx in range((W+7)//8):
            blk=g[ty*8:ty*8+8,tx*8:tx*8+8];m=blk>0
            if not m.any():continue
            lines=blk[m]>>4;vals,cnt=np.unique(lines,return_counts=True)
            if len(vals)==1:continue
            maj=int(vals[np.argmax(cnt)])
            cands=FIXED if maj==2 else [16*maj+n for n in range(1,16)]
            for y,x in zip(*np.nonzero(m&((blk>>4)!=maj))):
                blk[y,x]=nearest(GRGB[blk[y,x]],cands);ch+=1
    return g,ch
