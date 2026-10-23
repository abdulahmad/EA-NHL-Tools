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
ATLAS={'stick':(480,232,16,272),'torso_front':(16,16,160,160),'torso_back':(192,16,160,160),'sleeve':(368,16,64,200),'sleeve_b':(440,16,64,200),
       'pants':(16,192,160,96),'sock':(192,192,64,128),'sock_b':(264,192,64,128),'helmet':(336,232,96,64),
       'glove':(16,304,64,48),'skate':(96,304,64,48),'goalie_mask':(336,304,96,64),'pad':(16,368,96,128),'blocker':(128,368,64,64),'catcher':(208,368,64,64)}
WRAP=True;ELEV=35;WRAP_LIMBS=False;SIDE_FIX=False;FRONT_SMOOTH=False;GLOVE_UV=False;PAD_UV=False;STICK_UV=False
import json as _j,os as _o
FOV=_j.load(open(_o.path.join(_o.path.dirname(_o.path.abspath(__file__)),'data/front_override.json'))) if _o.path.exists(_o.path.join(_o.path.dirname(_o.path.abspath(__file__)),'data/front_override.json')) else {}
def wrap(mask,U,V):
    # cylinder wrap for any part: near side of a ring sags along the part axis by r*sin(ELEV)*|axis_y|
    ys,xs=np.nonzero(mask)
    if len(ys)<6: return V
    c=np.cov(np.stack([ys,xs]).astype(float));w_,v_=np.linalg.eigh(c);a=v_[:,1]
    t=(ys-ys.mean())*a[0]+(xs-xs.mean())*a[1];q=-(ys-ys.mean())*a[1]+(xs-xs.mean())*a[0]
    L=np.ptp(t)+1;Wd=np.percentile(np.abs(q),90)*2+1
    sag=0.5*Wd*np.sin(np.radians(ELEV))*max(abs(a[0]),0.4)/L
    Vn=V.copy();u=np.nan_to_num(U[mask],nan=.5);v=V[mask]
    Vn[mask]=v-sag*np.sqrt(np.clip(1-(2*u-1)**2,0,1))*4*v*(1-v)
    return Vn
def solve(n):
    p=frame(n);h,w=p.shape;part,goalie=segment(n,p)
    U=np.full(p.shape,np.nan);V=np.full(p.shape,np.nan);R=np.full(p.shape,'',object)
    front=(isin(p,CREST).sum()>=2) or (isin(p,SKIN).sum()>=2)
    if FRONT_SMOOTH and str(n) in FOV: front=FOV[str(n)]
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
            if WRAP and WRAP_LIMBS: Vt=wrap(T,Ut,Vt)
            elif WRAP:
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
        if WRAP_LIMBS: Vs=wrap(m,Us,Vs)
        xs=np.nonzero(m)[1].mean(); cx=np.nonzero(T)[1].mean() if T.any() else w/2
        left=xs<cx
        if SIDE_FIX and not front: left=not left   # 'sleeve' = player's right arm (screen-left only when facing camera)
        U[m]=Us[m];V[m]=Vs[m];R[m]='sleeve' if left else 'sleeve_b'
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
        if WRAP_LIMBS: Vs=wrap(m,Us,Vs)
        xs=np.nonzero(m)[1].mean(); cx=np.nonzero(Pm)[1].mean() if Pm.any() else w/2
        left=xs<cx
        if SIDE_FIX and not front: left=not left
        U[m]=Us[m];V[m]=Vs[m];R[m]='sock' if left else 'sock_b'
    # simple bbox-normalised UV for compact parts
    # gloves: V = geodesic distance from the cuff (pixels touching sleeve/forearm), U = side across the hand axis
    if GLOVE_UV:
        lab,k=ndi.label(part==P['glove'],np.ones((3,3)))
        for c in range(1,k+1):
            m=lab==c
            if m.sum()<3: continue
            cuff=adj(m,np.isin(part,[P['sleeve']]))
            if not cuff.any():  # no visible forearm: cuff = side nearest the torso centre
                ys,xs=np.nonzero(m);cy,cx=(np.nonzero(T)[0].mean(),np.nonzero(T)[1].mean()) if T.any() else (h/2,w/2)
                dd=np.hypot(ys-cy,xs-cx);cuff=np.zeros_like(m);cuff[ys[dd<=dd.min()+1],xs[dd<=dd.min()+1]]=True
            g=geodesic(m,cuff).astype(float);g=g/max(g.max(),1)
            Ug=side_anchor(m,g,cuff)
            if Ug is None: ys,xs=np.nonzero(m);Ug=np.zeros(p.shape);Ug[m]=(xs-xs.min())/max(np.ptp(xs),1)
            U[m]=Ug[m];V[m]=g[m];R[m]='glove'
    # goalie pads: V = geodesic from the knee (pad pixels touching pants, else topmost row) to the toe; U across the pad
    if PAD_UV:
        lab,k=ndi.label(part==P['pad'],np.ones((3,3)))
        for c in range(1,k+1):
            m=lab==c
            if m.sum()<4: continue
            knee=adj(m,part==P['pants'])
            if knee.sum()<2:
                ys,xs=np.nonzero(m);knee=np.zeros_like(m);knee[ys[ys==ys.min()],xs[ys==ys.min()]]=True
            g=geodesic(m,knee).astype(float);g=g/max(g.max(),1)
            Ug=side_anchor(m,g,knee)
            if Ug is None: ys,xs=np.nonzero(m);Ug=np.zeros(p.shape);Ug[m]=(xs-xs.min())/max(np.ptp(xs),1)
            if not front: Ug=1-Ug
            U[m]=Ug[m];V[m]=g[m];R[m]='pad'
    # stick: V = geodesic from the knob end (end nearest the torso centre) to the blade end; black blade pixels at the far end get V~1
    if STICK_UV:
        st=p==136;lab,k=ndi.label(st,np.ones((3,3)))
        if k:
            m=lab==(np.argmax(ndi.sum(st,lab,range(1,k+1)))+1)
            if m.sum()>=4:
                ys,xs=np.nonzero(m);cy,cx=(np.nonzero(T)[0].mean(),np.nonzero(T)[1].mean()) if T.any() else (h/2,w/2)
                a0=np.zeros_like(m);a0[ys[0],xs[0]]=True;g=geodesic(m,a0);e1=np.unravel_index(np.argmax(g),g.shape)
                s1=np.zeros_like(m);s1[e1]=True;g=geodesic(m,s1);e2=np.unravel_index(np.argmax(g),g.shape)
                knob,tip=(e1,e2) if np.hypot(e1[0]-cy,e1[1]-cx)<np.hypot(e2[0]-cy,e2[1]-cx) else (e2,e1)
                kn=np.zeros_like(m);kn[knob]=True;g=geodesic(m,kn).astype(float)
                bl=np.zeros_like(m);bl[tip]=True;bl=ndi.binary_dilation(bl,np.ones((3,3)),iterations=3)&(p==0)&~m
                bl=bl&ndi.binary_dilation(m|bl,np.ones((3,3)),iterations=1)
                L=max(g.max(),1);mm=m|bl;g[bl]=L
                U[mm]=0.5;V[mm]=np.clip(g[mm]/L,0,1);R[mm]='stick'
    skip=('pad',) if PAD_UV else ()
    for nm in tuple(x for x in (('helmet','skate','goalie_mask','pad','blocker','catcher') if GLOVE_UV else ('helmet','glove','skate','goalie_mask','pad','blocker','catcher')) if x not in skip):
        lab,k=ndi.label(part==P[nm],np.ones((3,3)))
        for c in range(1,k+1):
            m=lab==c;ys,xs=np.nonzero(m)
            U[m]=(xs-xs.min())/max(np.ptp(xs),1);V[m]=(ys-ys.min())/max(np.ptp(ys),1);R[m]=nm
    solve.front=front
    return p,part,U,V,R
def sample(atlas,p,U,V,R):
    out=np.zeros(p.shape+(3,));A=np.asarray(atlas).astype(float)
    for nm,(x,y,w,h) in ATLAS.items():
        m=R==nm
        if not m.any(): continue
        xx=np.clip((x+U[m]*(w-1)).astype(int),0,511);yy=np.clip((y+V[m]*(h-1)).astype(int),0,511)
        out[m]=A[yy,xx]
    return out
