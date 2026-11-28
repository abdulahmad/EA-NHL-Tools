"""SNES 94 -> Genesis 94 style converter (slot/window random forest, 1:1 scale, +1px growth allowed)."""
import sys,numpy as np,pickle,pandas as pd
sys.path.insert(0,'/workspace/snesredraw')
V='/workspace/preview_v2/platform_unique/v2/'
A,_=pickle.load(open(V+'all.pkl','rb'))
from scipy.ndimage import binary_dilation,label
from sklearn.ensemble import RandomForestClassifier
SL=list(range(32,48))
R=3
def place_best(S,G):
    """integer offset (dy,dx) putting S on G's canvas (same-size canvas) maximising mask IoU; returns S placed, iou"""
    H,W=G.shape;h,w=S.shape;gm=G>0;best=(-1,0,0)
    for dy in range(-(h-1)//2-2,H-h+(h)//2+3):
        for dx in range(-(w-1)//2-2,W-w+(w)//2+3):
            y0,x0=max(0,dy),max(0,dx);y1,x1=min(H,dy+h),min(W,dx+w)
            if y1<=y0 or x1<=x0:continue
            sm=np.zeros((H,W),bool);sm[y0:y1,x0:x1]=S[y0-dy:y1-dy,x0-dx:x1-dx]>0
            i=(sm&gm).sum()/max(1,(sm|gm).sum())
            if i>best[0]:best=(i,dy,dx)
    i,dy,dx=best;P=np.zeros((H,W),int)
    y0,x0=max(0,dy),max(0,dx);y1,x1=min(H,dy+h),min(W,dx+w);P[y0:y1,x0:x1]=S[y0-dy:y1-dy,x0-dx:x1-dx]
    return P,i
def feats(S,goalie):
    H,W=S.shape;P=np.pad(S,R);ys,xs=np.mgrid[0:H,0:W];ys=ys.ravel();xs=xs.ravel()
    win=np.stack([P[ys+dy+R,xs+dx+R] for dy in range(-R,R+1) for dx in range(-R,R+1)],1)
    oh=np.concatenate([(win==v) for v in SL+[0]],1).astype(np.uint8)
    m=S>0;r=np.nonzero(m.any(1))[0];c=np.nonzero(m.any(0))[0]
    top,bot=(r[0],r[-1]) if len(r) else (0,1);l,rt=(c[0],c[-1]) if len(c) else (0,1)
    ex=np.stack([(ys-top)/max(1,bot-top),(xs-l)/max(1,rt-l),ys-top,np.full(len(ys),float(goalie))],1)
    return np.concatenate([oh,ex],1),m
def mk_xy(S,G,goalie,dil=1):
    X,m=feats(S,goalie);sel=binary_dilation(m,iterations=dil).ravel()
    return X[sel],G.ravel()[sel]
def train(pairs,n=120,dil=1):
    Xs,Ys=[],[]
    for S,G,gl in pairs:
        X,y=mk_xy(S,G,gl,dil);Xs.append(X);Ys.append(y)
    return RandomForestClassifier(n,min_samples_leaf=2,n_jobs=8,random_state=0).fit(np.concatenate(Xs),np.concatenate(Ys))
def predict(rf,S,goalie,dil=1):
    X,m=feats(S,goalie);sel=binary_dilation(m,iterations=dil).ravel();o=np.zeros(S.size,int)
    if sel.any():o[sel]=rf.predict(X[sel])
    return o.reshape(S.shape)
def triples():
    m=pd.read_csv('/workspace/snes-style-compare/measurements.csv');return m

THR=0.5
def convert_core(rf,S,goalie,thr=THR):
    X,m=feats(S,goalie);sel=binary_dilation(m,iterations=1).ravel()
    pr=rf.predict_proba(X[sel]);cl=rf.classes_;i0=list(cl).index(0)
    p0=pr[:,i0];nz=np.delete(pr,i0,1);c1=np.delete(cl,i0)[nz.argmax(1)]
    inm=m.ravel()[sel];keep=np.where(inm,True,p0<thr)
    o=np.zeros(S.size,int);o[sel]=np.where(keep,c1,0);o=o.reshape(S.shape)
    o[(o<33)|(o>47)]=0   # stray non-sprite classes learned from 94G (rink/blood/etc.) dropped
    # drop isolated single pixels (no 8-neighbour) except stick/ice
    nb=binary_dilation(o>0,np.ones((3,3)))
    from scipy.ndimage import convolve
    cnt=convolve((o>0).astype(int),np.ones((3,3),int),mode='constant')-(o>0)
    o[(o>0)&(cnt==0)&(o!=46)&(o!=47)]=0
    return o
def convert(rf,S,goalie,thr=THR):
    """S: SNES index array (0 empty, 33..47). Returns (G94-style index array on an 8x8-padded canvas, eye info)."""
    o=convert_core(rf,np.pad(S,3),goalie,thr);o,info=add_eye(o);return crop8(o),info
def crop8(o):
    ys,xs=np.nonzero(o);y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
    h,w=y1-y0,x1-x0;H=-(-(h+2)//8)*8;W=-(-(w+2)//8)*8;oy=(H-h)//2;ox=(W-w)//2
    C=np.zeros((H,W),int);C[oy:oy+h,ox:ox+w]=o[y0:y1,x0:x1];return C

WHITE_HD={43,44,45,35,37,38}  # not used for skin; helmet/white family in G (43-45 whites/greys)
def add_eye(C):
    """Genesis faces carry a dark eye (index 34) in the 2nd row of the ~4x5 skin blob, on the facing side. Facing from the skin blob vs helmet centroid."""
    C=C.copy();sk=np.isin(C,(38,39));lab,k=label(sk,np.ones((3,3)))
    if not k:return C,None
    i=1+np.argmax([(lab==j).sum() for j in range(1,k+1)]);b=lab==i;ys,xs=np.nonzero(b)
    h,w=ys.max()-ys.min()+1,xs.max()-xs.min()+1
    if not (7<=b.sum()<=20 and 3<=h<=6 and 3<=w<=7):return C,None
    y0,x0=ys.min(),xs.min()
    box=np.zeros_like(b);box[max(0,y0-3):y0+h+1,max(0,x0-3):x0+w+3]=1
    hm=box&np.isin(C,(43,44,45))&~b;hy,hx=np.nonzero(hm)
    dx=(xs.mean()-hx.mean()) if len(hx)>=4 else 0
    ey=y0+(1 if h>=4 else 0)
    cols=[]
    if dx>0.5:cols=[x0+w-2]
    elif dx<-0.5:cols=[x0+1]
    else:cols=[x0+1,x0+w-2] if w>=5 else [x0+w//2]
    out=[]
    for c in cols:
        if b[ey,c]:C[ey,c]=34;out.append((ey,c))
    return C,dict(dx=round(float(dx),2),eyes=out)
