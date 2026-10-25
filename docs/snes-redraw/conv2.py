"""D177 converter v2: smooth scaling, verbatim 94G heads, connectivity repair, facing-constrained pose match."""
from conv import *
FG[46]=5
import json,pickle
from scipy.ndimage import zoom,label,binary_dilation
from collections import deque
HOLD={'skatewp','hook','stop','duck'}
imap={int(k):v for k,v in json.load(open('/workspace/snesredraw/analysis.json'))['imap'].items()}
EIGHT=np.ones((3,3),int)
# ---- D177a smooth scaling: per-index one-hot, bilinear, argmax (non-empty bias keeps 1-px lines)
def sscale(s,sy=SY,sx=SX):
    vals=[v for v in np.unique(s)];H=round(s.shape[0]*sy);W=round(s.shape[1]*sx)
    st=[]
    for v in vals:
        m=zoom((s==v).astype(float),(H/s.shape[0],W/s.shape[1]),order=1,mode='nearest',grid_mode=True)
        st.append(m+(0.12 if v else 0))
    return np.array(vals)[np.argmax(st,0)]
# ---- heads
SK_S={39};SK_G={38,39};HD_S={39,43,38,34};HD_G={38,39,43,44,45,34}
def head(a,skin,hd):
    """returns (mask,facing,(cy,cx)) of the head; facing in L,R,F,B"""
    H=a.shape[0];m=np.isin(a,list(skin));m[int(H*0.55):]=0
    lab,n=label(m,EIGHT)
    if n:
        k=1+np.argmax([(lab==i).sum() for i in range(1,n+1)]);sk=lab==k
        ys,xs=np.nonzero(sk);hm=np.isin(a,list(hd));hm[ys.max()+1:]=0;hm[:max(0,ys.min()-5)]=0
        l2,_=label(hm,EIGHT);ids=set(l2[sk])-{0};hm=np.isin(l2,list(ids))
        hy,hx=np.nonzero(hm);dx=xs.mean()-hx.mean()
        f='B' if sk.sum()<2 else ('R' if dx>0.6 else 'L' if dx<-0.6 else 'F')
        return hm,f,(hy.mean(),hx.mean())
    # no skin: back of head = top helmet blob
    hm=np.isin(a,list(hd));ys=np.nonzero(hm.any(1))[0]
    if not len(ys):return None,'?',None
    hm[ys[0]+6:]=0;l2,n=label(hm,EIGHT)
    if not n:return None,'?',None
    k=1+np.argmax([(l2==i).sum() for i in range(1,n+1)]);hm=l2==k;hy,hx=np.nonzero(hm)
    return hm,'B',(hy.mean(),hx.mean())
FLIP={'L':'R','R':'L','F':'F','B':'B','?':'?'}
def facing(a,G=False):return head(a,SK_G if G else SK_S,HD_G if G else HD_S)[1]
def headlib(exclude=()):
    L=[]
    for n,a in A['G94'].items():
        if n in exclude or not pl(a):continue
        for mir in(False,True):
            b=a[:,::-1] if mir else a;hm,f,c=head(b,SK_G,HD_G)
            if hm is None or hm.sum()<8 or hm.sum()>60:continue
            ys,xs=np.nonzero(hm);y0,x0=ys.min(),xs.min()
            L.append(dict(n=n,mir=mir,f=f,patch=np.where(hm,b,0)[y0:ys.max()+1,x0:xs.max()+1]))
    return L
def bestshift(A_,B_):
    best=(-1,0,0)
    for dy in range(-2,3):
        for dx in range(-2,3):
            Bs=np.roll(np.roll(B_,dy,0),dx,1);i=(A_&Bs).sum()/max(1,(A_|Bs).sum())
            if i>best[0]:best=(i,dy,dx)
    return best
def pastehead(O,S,lib):
    hm,f,c=head(S,SK_S,HD_S)
    if hm is None:return O,None
    ys,xs=np.nonzero(hm);y0,x0,y1,x1=ys.min(),xs.min(),ys.max(),xs.max();best=None
    for h in lib:
        if h['f']!=f:continue
        p=h['patch'];ph,pw=p.shape
        # place patch so its bottom-centre sits on the SNES head's bottom-centre
        py=y1+1-ph;px=int(round((x0+x1)/2-(pw-1)/2))
        cand=np.zeros_like(S,bool);P=np.zeros_like(S)
        for yy in range(ph):
            for xx in range(pw):
                Y,X=py+yy,px+xx
                if p[yy,xx] and 0<=Y<S.shape[0] and 0<=X<S.shape[1]:cand[Y,X]=1;P[Y,X]=p[yy,xx]
        sc=(cand&hm).sum()/max(1,(cand|hm).sum())
        if best is None or sc>best[0]:best=(sc,cand,P,h)
    if best is None:return O,None
    sc,cand,P,h=best;O=O.copy();O[binary_dilation(hm)&~cand&(np.isin(O,list(HD_G)))]=0
    # keep the SNES silhouette near the head filled with neighbouring body colour later via repair
    O[cand]=P[cand];return O,dict(n=h['n'],mir=h['mir'],f=f,iou=round(float(sc),2))
# ---- D177b smoothing
def smooth(O):
    O=O.copy()
    for _ in range(2):
        P=np.pad(O,1);H,W=O.shape;ch=0
        for y in range(H):
            for x in range(W):
                nb=[P[y+dy+1,x+dx+1] for dy in(-1,0,1) for dx in(-1,0,1) if dy or dx]
                v=O[y,x];c=Counter(nb);top,cn=c.most_common(1)[0]
                if v==0 and sum(1 for q in nb if q)>=6:
                    nz=Counter(q for q in nb if q).most_common(1)[0][0];O[y,x]=nz;ch+=1
                elif v and top!=v and top!=0 and cn>=6 and c[v]<=1:O[y,x]=top;ch+=1
        if not ch:break
    return O
from collections import Counter
# ---- D177c connectivity: merged families (white+team blue = jersey)
MF=lambda F:np.where(F==3,2,F)
def comps(S,O):
    """yields (family, source component mask, output pieces label, n)"""
    fs=MF(FS[S]);fo=MF(FG[O])
    for f in(1,2,4,5,6):
        l,n=label(fs==f,EIGHT)
        for i in range(1,n+1):
            cm=l==i
            if cm.sum()<3:continue
            reg=binary_dilation(cm)&(fo==f);pl_,pn=label(reg,EIGHT)
            # count only pieces that overlap the source component itself
            ids=set(pl_[cm&reg])-{0}
            yield f,cm,pl_,ids
def disconnected(S,O):return sum(1 for f,cm,pl_,ids in comps(S,O) if len(ids)>1)
def repair(S,O):
    O=O.copy()
    for it in range(40):
        bad=None
        for f,cm,pl_,ids in comps(S,O):
            if len(ids)>1:bad=(f,cm,pl_,ids);break
        if bad is None:break
        f,cm,pl_,ids=bad;ids=sorted(ids);src=pl_==ids[0];tgt=np.isin(pl_,ids[1:])
        # BFS from src through the source component (dilated) to the nearest target piece
        allowed=binary_dilation(cm)|src|tgt;H,W=S.shape;prev={};q=deque()
        for y,x in zip(*np.nonzero(src)):prev[(y,x)]=None;q.append((y,x))
        end=None
        while q:
            y,x=q.popleft()
            if tgt[y,x]:end=(y,x);break
            for dy in(-1,0,1):
                for dx in(-1,0,1):
                    Y,X=y+dy,x+dx
                    if 0<=Y<H and 0<=X<W and allowed[Y,X] and (Y,X) not in prev:prev[(Y,X)]=(y,x);q.append((Y,X))
        if end is None:break
        fo=MF(FG[O]);vals=Counter(O[(fo==f)&binary_dilation(cm)].tolist());fill=vals.most_common(1)[0][0]
        p=end
        while p:
            if MF(FG[O[p]])!=f:O[p]=imap.get(int(S[p]),fill) if MF(FG[imap.get(int(S[p]),fill)])==f else fill
            p=prev[p]
    return O
