import pickle,numpy as np,sys,time
from PIL import Image
sys.path.insert(0,'.')
from feat import A,bands  # recomputes features quickly (writes feat.pkl again, same content)
F=pickle.load(open('feat.pkl','rb'));M=pickle.load(open('match.pkl','rb'))
BA={}
for t,d in A.items():
    tr=255 if t=='PC' else 0;sh={82,88,99} if t=='PC' else {47}
    for n,a in d.items():
        m=(a!=tr)&~np.isin(a,list(sh))
        if m.sum()<4:continue
        ys,xs=np.nonzero(m);sl=(slice(ys.min(),ys.max()+1),slice(xs.min(),xs.max()+1))
        BA[(t,n)]=np.where(m,bands(t,a),0)[sl].astype(np.int8)
def rs(b,s):
    h,w=max(1,round(b.shape[0]*s)),max(1,round(b.shape[1]*s));return np.array(Image.fromarray(b.astype(np.uint8)).resize((w,h),Image.NEAREST)).astype(np.int8)
def align(a,b):
    best=(0,0,1.0)
    for mir in (0,1):
        bb=b[:,::-1] if mir else b
        for s in (1.0,0.9,0.8):
            A_,B_=(rs(a,s),bb) if a.shape[0]>bb.shape[0] else (a,rs(bb,s))
            if s!=1.0 and abs(a.shape[0]-bb.shape[0])<2:continue
            H=max(A_.shape[0],B_.shape[0])+4;W=max(A_.shape[1],B_.shape[1])+6
            ca=np.zeros((H,W),np.int8);ya=H-2-A_.shape[0];xa=(W-A_.shape[1])//2;ca[ya:ya+A_.shape[0],xa:xa+A_.shape[1]]=A_
            ma=ca>0;na=ma.sum()
            for dy in (-1,0,1):
                for dx in (-2,-1,0,1,2):
                    cb=np.zeros((H,W),np.int8);yb=H-2-B_.shape[0]+dy;xb=(W-B_.shape[1])//2+dx
                    if yb<0 or xb<0 or yb+B_.shape[0]>H or xb+B_.shape[1]>W:continue
                    cb[yb:yb+B_.shape[0],xb:xb+B_.shape[1]]=B_
                    mb=cb>0;k=ma&mb;ks=k.sum()
                    if not ks:continue
                    v=0.5*ks/(na+mb.sum()-ks)+0.5*(ca[k]==cb[k]).mean()
                    if v>best[0]:best=(v,mir,b.shape[0]/a.shape[0])
    return best
TH={'G':0.85}
R={};t0=time.time();cnt=0
for (ta,tb),v in M.items():
    S=v['S'].astype(np.float32);A_=v['A'];B_=v['B'];bi={b:j for j,b in enumerate(B_)}
    out={}
    for i,a in enumerate(A_):
        if v['score'][i]>=0.85:continue
        c=list(np.argsort(-S[i])[:5])
        # sequence hint: same offset as neighbours' best
        for k in (-2,-1,1,2):
            if a+k in A_:
                j=A_.index(a+k);o=v['best'][j]-(a+k)
                if a+o in bi:c.append(bi[a+o])
        res=[]
        for j in set(c):
            s,mir,sc=align(BA[(ta,a)],BA[(tb,B_[j])]);res.append((round(float(s),3),int(B_[j]),int(mir),round(float(sc),2)))
            cnt+=1
        out[a]=max(res)
    R[(ta,tb)]=out;print(ta,tb,len(out),cnt,round(time.time()-t0),flush=True)
pickle.dump(R,open('refine.pkl','wb'))
