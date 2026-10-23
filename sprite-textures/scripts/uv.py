"""Per-pixel body-local UV from zone anchors + harmonic interpolation, sampled into a reference atlas."""
from parts import *
W4=np.array([[0,1,0],[1,0,1],[0,1,0]],float)
def harmonic(mask,fixed,vals,it=600):
    u=np.where(fixed,vals,0.5).astype(float); u[~mask]=0
    mk=mask.astype(float); cnt=ndi.convolve(mk,W4,mode='constant'); cnt[cnt==0]=1
    for _ in range(it):
        s=ndi.convolve(u*mk,W4,mode='constant'); nu=s/cnt
        u=np.where(fixed,vals,np.where(mask,nu,0))
    return u
def adj(m,other): return m&ndi.binary_dilation(other,np.ones((3,3),bool))
# atlas regions: name -> (x,y,w,h) in a 512x512 reference texture
ATLAS={'torso_front':(16,16,160,160),'torso_back':(192,16,160,160),'sleeve':(368,16,64,200),'sleeve_b':(440,16,64,200),
       'pants':(16,192,160,96),'sock':(192,192,64,128),'sock_b':(264,192,64,128),'helmet':(336,232,96,64),
       'glove':(16,304,64,48),'skate':(96,304,64,48),'goalie_mask':(336,304,96,64),'pad':(16,368,96,128),'blocker':(128,368,64,64),'catcher':(208,368,64,64)}
WRAP=True;ELEV=35
def solve(n):
    p=frame(n);h,w=p.shape;part,goalie=segment(n,p)
    U=np.full(p.shape,np.nan);V=np.full(p.shape,np.nan);R=np.full(p.shape,'',object)
    front=(isin(p,CREST).sum()>=2) or (isin(p,SKIN).sum()>=2)
    def side_anchor(mask,Vm,excl):
        # U anchors: silhouette boundary pixels on either side of the body axis
        ys,xs=np.nonzero(mask)
        top=np.array([ys[Vm[mask]<0.35].mean(),xs[Vm[mask]<0.35].mean()]) if (Vm[mask]<0.35).any() else np.array([ys.min(),xs.mean()])
        bot=np.array([ys[Vm[mask]>0.65].mean(),xs[Vm[mask]>0.65].mean()]) if (Vm[mask]>0.65).any() else np.array([ys.max(),xs.mean()])
        ax=top-bot; ax/= (np.linalg.norm(ax)+1e-6); nrm=np.array([-ax[1],ax[0]])
        edge=mask&ndi.binary_dilation(~mask,np.ones((3,3),bool))&~excl
        c=(top+bot)/2; ey,ex=np.nonzero(edge); s=(ey-c[0])*nrm[0]+(ex-c[1])*nrm[1]
        fx=np.zeros_like(mask);val=np.zeros(mask.shape)
        for y,x,si in zip(ey,ex,s):
            if abs(si)<0.5: continue
            fx[y,x]=True; val[y,x]=0.0 if si<0 else 1.0
        if fx.sum()<2: return None
        return harmonic(mask,fx,val)
    # torso
    T=np.isin(part,[P['torso'],P['crest'],P['shoulder_patch']])
    if T.sum()>8:
        fx=np.zeros_like(T);val=np.zeros(p.shape)
        topn=adj(T,np.isin(part,[P['helmet'],P['skin'],P['goalie_mask']])); fx|=topn
        for ids,v in (((168,169,170),0.80),((171,172,173),0.87),((174,175,176),0.94)):
            m=T&isin(p,set(ids)); fx|=m; val[m]=v
        b=adj(T,part==P['pants'])&~fx; fx|=b; val[b]=1.0
        m=T&isin(p,{159,161,162,163})&~topn; fx|=m; val[m]=0.12
        Vt=harmonic(T,fx,val)
        Ut=side_anchor(T,Vt,ndi.binary_dilation(np.isin(part,[P['helmet'],P['skin'],P['pants']]),np.ones((3,3),bool)))
        if Ut is not None:
            if not front: Ut=1-Ut
            if WRAP:
                # cylinder wrap: camera is elevated, so a horizontal ring's near side sags at the body centre line.
                # sag (in V units) = half-width*sin(ELEV)/torso length; 4V(1-V) keeps neck/pants anchors fixed.
                ys,xs=np.nonzero(T);L=max(np.ptp(ys)+1,1);Wd=np.median(np.bincount(ys)[np.bincount(ys)>0])
                sag=0.5*Wd*np.sin(np.radians(ELEV))/L
                Vt=np.where(T,Vt-sag*np.sqrt(np.clip(1-(2*Ut-1)**2,0,1))*4*Vt*(1-Vt),Vt)
            U[T]=Ut[T];V[T]=Vt[T];R[T]='torso_front' if front else 'torso_back'
    # sleeves (each arm component)
    S=part==P['sleeve'];lab,k=ndi.label(S,np.ones((3,3)))
    for c in range(1,k+1):
        m=lab==c
        if m.sum()<4: continue
        fx=adj(m,T).copy();val=np.zeros(p.shape)
        for ids,v in (((153,154,155),0.45),((150,151,152),0.55),((147,148,149),0.65)):
            mm=m&isin(p,set(ids)); fx|=mm; val[mm]=v
        e=adj(m,np.isin(part,[P['glove'],P['catcher'],P['blocker']]))&~fx; fx|=e; val[e]=1.0
        if not e.any(): mm=m&isin(p,{144,145,146}); fx|=mm; val[mm]=0.9
        Vs=harmonic(m,fx,val); Us=side_anchor(m,Vs,adj(m,T))
        if Us is None: Us=np.full(p.shape,0.5)
        xs=np.nonzero(m)[1].mean(); cx=np.nonzero(T)[1].mean() if T.any() else w/2
        U[m]=Us[m];V[m]=Vs[m];R[m]='sleeve' if xs<cx else 'sleeve_b'
    # pants (single region)
    Pm=part==P['pants']
    if Pm.sum()>4:
        fx=adj(Pm,T);val=np.zeros(p.shape);b=adj(Pm,part==P['sock'])&~fx;fx=fx|b;val[b]=1
        Vp=harmonic(Pm,fx,val);Up=side_anchor(Pm,Vp,ndi.binary_dilation(T|(part==P['sock']),np.ones((3,3),bool)))
        if Up is not None: U[Pm]=Up[Pm];V[Pm]=Vp[Pm];R[Pm]='pants'
    # socks
    Sk=part==P['sock'];lab,k=ndi.label(Sk,np.ones((3,3)))
    for c in range(1,k+1):
        m=lab==c
        if m.sum()<4: continue
        fx=adj(m,Pm).copy();val=np.zeros(p.shape)
        for ids,v in (((184,185,186),0.45),((187,188,189),0.65)):
            mm=m&isin(p,set(ids));fx|=mm;val[mm]=v
        e=adj(m,np.isin(part,[P['skate'],P['skate_blade'],P['outline']]))&~fx;fx|=e;val[e]=1
        Vs=harmonic(m,fx,val);Us=side_anchor(m,Vs,adj(m,Pm))
        if Us is None: Us=np.full(p.shape,0.5)
        xs=np.nonzero(m)[1].mean(); cx=np.nonzero(Pm)[1].mean() if Pm.any() else w/2
        U[m]=Us[m];V[m]=Vs[m];R[m]='sock' if xs<cx else 'sock_b'
    # simple bbox-normalised UV for compact parts
    for nm in ('helmet','glove','skate','goalie_mask','pad','blocker','catcher'):
        lab,k=ndi.label(part==P[nm],np.ones((3,3)))
        for c in range(1,k+1):
            m=lab==c;ys,xs=np.nonzero(m)
            U[m]=(xs-xs.min())/max(np.ptp(xs),1);V[m]=(ys-ys.min())/max(np.ptp(ys),1);R[m]=nm
    return p,part,U,V,R
def sample(atlas,p,U,V,R):
    out=np.zeros(p.shape+(3,));A=np.asarray(atlas).astype(float)
    for nm,(x,y,w,h) in ATLAS.items():
        m=R==nm
        if not m.any(): continue
        xx=np.clip((x+U[m]*(w-1)).astype(int),0,511);yy=np.clip((y+V[m]*(h-1)).astype(int),0,511)
        out[m]=A[yy,xx]
    return out
