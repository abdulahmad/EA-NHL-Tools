# v5.3 (Abdul pt793u): one 3D stick man per SPA pose shared by all 8 directions + stick fit from the drawn stick pixels.
exec(open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)),'pose_load_v5.py')).read())
import json,numpy as np,collections
from scipy.optimize import least_squares
from scipy.ndimage import distance_transform_edt as EDT,map_coordinates
from PIL import Image,ImageDraw
OUT='/workspace/out/zones/v2/poc5/v5/pose3d';os.makedirs(OUT,exist_ok=True)
GROUPS={'SPAskate phase 0':{42:0,47:1,52:2,57:3,62:4,67:5,72:6,77:7},
        'SPAcrosscheck phase 0':{889:0,891:1,893:2,895:3,897:4,899:5,901:6,903:7},
        'SPAanthem1 phase 0 (same frame 370 in all 8 directions)':{370:4}}
# ---------- stick from the drawn stick pixels (136 not neck): endpoints = the stick pixels themselves, hands lie along the shaft
def stick2d(n):
    q,A,LEV,fixed=G['MAPS'][n];P=G['SEGS'][n]['part']
    S=[p for p,t in fixed.items() if t=='stick']
    S=np.array([p for p in S if any(max(abs(p[0]-o[0]),abs(p[1]-o[1]))<=2 for o in S if o!=p)],float)   # drop isolated stray px
    if len(S)<3:return None
    xy=S[:,::-1]
    def perp(pts,c0,a0):return np.abs((pts-c0)@np.array([-a0[1],a0[0]]))
    # shaft = the straight line holding the most stick pixels (exhaustive pair search, inlier <= 0.75 px; ties -> longer span)
    GL=[np.array(G['SEGS'][n]['joints'][s+' glove'],float) for s in 'RL' if s+' glove' in G['SEGS'][n]['joints']]
    best=None
    for i in range(len(xy)):
        for j in range(i+1,len(xy)):
            a0=xy[j]-xy[i];L=np.linalg.norm(a0)
            if L<2:continue
            a0=a0/L;inl=perp(xy,xy[i],a0)<=0.75;tt=(xy[inl]-xy[i])@a0;ng=sum(1 for g in GL if perp(g[None],xy[i],a0)[0]<=1.5)
            key=(inl.sum()+2*ng,np.ptp(tt))   # a glove on the line counts as 2 stick pixels (hands hold the shaft)
            if best is None or key>best[0]:best=(key,xy[i],a0,inl)
    _,c1,a1,inl=best
    c1=xy[inl].mean(0);a1=np.linalg.svd(xy[inl]-c1)[2][0]                    # refit on the inliers
    off=~(perp(xy,c1,a1)<=1.0);tt=(xy-c1)@a1
    if off.any():   # blade = the off-line pixels; they sit at one end of the shaft
        if np.mean(tt[off])<np.mean(tt[~off]):a1=-a1;tt=-tt
    else:           # straight stick: blade at the lower end
        e0,e1=xy[tt.argmin()],xy[tt.argmax()]
        if e0[1]>e1[1]:a1=-a1;tt=-tt
    on=~off;t_heel=tt[on].max();t_butt=tt[on].min()
    heel=c1+a1*t_heel;butt=c1+a1*t_butt
    gl={s:np.array(G['SEGS'][n]['joints'][s+' glove'],float) for s in 'RL' if s+' glove' in G['SEGS'][n]['joints']}
    # both hands on the stick (Abdul): a glove beyond the drawn butt (stick hidden behind the body, 42) moves the butt to that hand
    for s,g in gl.items():
        if (g-c1)@a1<t_butt-1 and perp(g[None],c1,a1)[0]<=12:butt=g.copy();t_butt=(g-c1)@a1
    # blade = off-line stick pixels + black blade tape (idx 0, gear) next to the heel, on the blade side, not on a glove centre
    q_=G['MAPS'][n][0];P_=G['SEGS'][n]['part'];tape=np.array([(x,y) for y,x in zip(*np.nonzero(q_==0)) if P_.get((y,x)) in(None,8,9)],float).reshape(-1,2)   # not skates
    R_=6 if off.any() else 4
    cand=[p for p in list(xy[off])+list(tape) if np.linalg.norm(p-heel)<=R_ and (p-c1)@a1>=t_heel-(2 if off.any() else 4) and all(np.linalg.norm(p-g)>2 for g in gl.values())]
    if cand:toe=max(cand,key=lambda p:np.linalg.norm(p-heel))
    else:toe=c1+a1*t_heel;heel=c1+a1*(t_heel-3)
    hands={s:float(np.abs((g-butt)@np.array([-(heel-butt)[1],(heel-butt)[0]])/max(1e-6,np.linalg.norm(heel-butt)))) for s,g in gl.items()}
    return dict(butt=butt.tolist(),heel=heel.tolist(),toe=[float(v) for v in toe],shaft_len=float(np.linalg.norm(heel-butt)),
                blade_len=float(np.linalg.norm(toe-heel)),blade_longer_than_shaft=bool(np.linalg.norm(toe-heel)>=np.linalg.norm(heel-butt)),hand_offsets_px=hands,pixels=len(S),shaft_inliers=int(on.sum()),
                blade_side=float(np.sign((heel-butt)[0]*(toe[1]-heel[1])-(heel-butt)[1]*(toe[0]-heel[0]))))
ST={n:stick2d(n) for g in GROUPS.values() for n in g}
# ---------- 3D model. body frame (r = player's right, u = up, f = forward); yaw theta = 45 deg * d, facing (sin,0,-cos), right (cos,0,sin)
#   (d0 facing away: player right = screen right; d4 facing camera: right = screen left; d2 facing screen-right, near = right; d6 near = left)
#   orthographic camera tilted down by phi: sx = s*X+ox, sy = s*(-u*cos(phi) + Z*sin(phi)) + oy, Z towards the camera.
def proj(P3,th,phi,s,o):
    r,u,f=P3[:,0],P3[:,1],P3[:,2];X=r*np.cos(th)+f*np.sin(th);Z=r*np.sin(th)-f*np.cos(th)
    return np.stack([s*X+o[0],s*(-u*np.cos(phi)+Z*np.sin(phi))+o[1]],1)
# v5.5 (Abdul pt800u) leg visibility: a leg side with no upper/lower-leg pixels (seg parts 10/12 R, 11/13 L) is OCCLUDED (behind the
# near leg). Its 2D leg joints are dropped (on 57 the 'L skate' was stray pixels by the stick) and the fit puts it behind the near leg.
def legvis(n):
    P_=G['SEGS'][n]['part'];c={o:sum(1 for v in P_.values() if v in(10+o,12+o)) for o in(0,1)}
    return {'RL'[o]:c[o]>=3 for o in(0,1)}
def obs(n):
    J=dict(G['SEGS'][n]['joints']);s=ST.get(n);V=legvis(n)
    J={k:v for k,v in J.items() if not(k[:2] in('R ','L ') and k.split()[1] in('hip','knee','ankle','skate') and not V[k[0]])}
    if 'R hip' in J and 'R knee' in J and np.allclose(J['R hip'],J['R knee']):J.pop('R knee')   # seg fallback put hip==knee: not a real knee
    if 'L hip' in J and 'L knee' in J and np.allclose(J['L hip'],J['L knee']):J.pop('L knee')
    if s:J.update({'stick butt':s['butt'],'stick heel':s['heel'],'stick toe':s['toe']})
    return {k:np.array(v,float) for k,v in J.items()}
BONES=[('head','neck'),('neck','chest'),('chest','belly'),('belly','pelvis')]+[(f'{s} {a}',f'{s} {b}') for s in 'RL' for a,b in
       (('shoulder','elbow'),('elbow','wrist'),('wrist','glove'),('hip','knee'),('knee','ankle'),('ankle','skate'))]+\
      [('neck','R shoulder'),('neck','L shoulder'),('pelvis','R hip'),('pelvis','L hip'),('stick butt','stick heel'),('stick heel','stick toe')]
def fitgroup(fr,phis=(5,10,15,25,35)):
    # v5.4 (Abdul pt799u) stage 1: ONE shared 3D pose, but each frame's body yaw is FREE (weak prior towards 45 deg x d, 0.3 per 10 deg)
    O={n:obs(n) for n in fr};M={n:EDT(G['MAPS'][n][0]==255) for n in fr}
    names=sorted(set(k for o in O.values() for k in o));ix={k:i for i,k in enumerate(names)};N=len(names);nf=list(fr)
    OI={n:(np.array([ix[k] for k in O[n]]),np.array(list(O[n].values()))) for n in nf}
    BI=np.array([(ix[a],ix[b]) for a,b in BONES if a in ix and b in ix]);TS=np.array([0.25,0.5,0.75])
    SY=[(ix[a],ix[b],ix['L'+a[1:]],ix['L'+b[1:]]) for a,b in BONES if a[:2]=='R ' and b[:2]=='R ' and all(k in ix for k in(a,b,'L'+a[1:],'L'+b[1:]))]
    SY=np.array(SY) if SY else np.zeros((0,4),int)
    NOM={n:np.radians(45*fr[n]) for n in nf}
    # per-side leg masks: each leg's bones must lie on ITS OWN leg pixels (parts 10/12/14 R, 11/13/15 L, 16 hips); an occluded leg
    # instead lies on the near leg's pixels and is pushed BEHIND it in depth (Z towards camera).
    VIS={n:legvis(n) for n in fr};LM={}
    for n in fr:
        P_=G['SEGS'][n]['part'];q_=G['MAPS'][n][0]
        for o,sd in enumerate('RL'):
            near=sd if VIS[n][sd] else 'RL'[1-o];oo='RL'.index(near)
            m=np.ones(q_.shape,bool)
            for (y,x),v in P_.items():
                if v in(10+oo,12+oo,14+oo,16):m[y,x]=False
            LM[(n,sd)]=EDT(m) if (~m).any() else M[n]
    LB={sd:np.array([(ix[f'{sd} {a}'],ix[f'{sd} {b}']) for a,b in(('hip','knee'),('knee','ankle'),('ankle','skate')) if f'{sd} {a}' in ix and f'{sd} {b}' in ix]) for sd in 'RL'}
    LJ=[(ix[f'R {k}'],ix[f'L {k}']) for k in('knee','ankle','skate') if f'R {k}' in ix and f'L {k}' in ix]
    def frame_res(P3,th,phi,s,o,n):
        pr=proj(P3,th,phi,s,o);R=[(pr[OI[n][0]]-OI[n][1]).ravel()]
        if len(BI):
            p=(pr[BI[:,0]][:,None,:]*(1-TS[None,:,None])+pr[BI[:,1]][:,None,:]*TS[None,:,None]).reshape(-1,2)
            R.append(0.5*map_coordinates(M[n],[p[:,1],p[:,0]],order=1,mode='nearest'))
        for sd in 'RL':
            if len(LB[sd]):
                p=(pr[LB[sd][:,0]][:,None,:]*(1-TS[None,:,None])+pr[LB[sd][:,1]][:,None,:]*TS[None,:,None]).reshape(-1,2)
                R.append(0.7*map_coordinates(LM[(n,sd)],[p[:,1],p[:,0]],order=1,mode='nearest'))
            if not VIS[n][sd] and VIS[n]['RL'[1-'RL'.index(sd)]] and LJ:
                Z=P3[:,0]*np.sin(th)-P3[:,2]*np.cos(th);io=1 if sd=='L' else 0
                R.append(2.0*s*np.maximum(0,np.array([Z[j[io]]-Z[j[1-io]]+0.3 for j in LJ])))
        return R
    best=None
    for phi in np.radians(list(phis)):
        P0=np.zeros((N,3));cnt=np.zeros(N)
        for n,o in O.items():
            th=NOM[n];ce=np.mean(list(o.values()),0)
            for k,v in o.items():P0[ix[k]]+=[(v[0]-ce[0])*np.cos(th),-(v[1]-ce[1])/np.cos(phi),(v[0]-ce[0])*np.sin(th)];cnt[ix[k]]+=1
        P0/=np.maximum(1,cnt)[:,None]
        x0=np.concatenate([P0.ravel(),[1.0]]+[np.mean(list(O[n].values()),0) for n in nf]+[[NOM[n] for n in nf]])
        def res(x):
            P3=x[:3*N].reshape(N,3);s=x[3*N];TH=x[3*N+1+2*len(nf):];R=[]
            for i,n in enumerate(nf):
                R+=frame_res(P3,TH[i],phi,s,x[3*N+1+2*i:3*N+3+2*i],n);R.append([0.3*np.degrees(TH[i]-NOM[n])/10])
            if len(SY):R.append(0.5*(np.linalg.norm(P3[SY[:,0]]-P3[SY[:,1]],axis=1)-np.linalg.norm(P3[SY[:,2]]-P3[SY[:,3]],axis=1)))
            return np.concatenate(R)
        r=least_squares(res,x0,loss='soft_l1',f_scale=1.5,max_nfev=500)
        if best is None or r.cost<best[0]:best=(r.cost,r,phi)
    _,r,phi=best;x=r.x;P3=x[:3*N].reshape(N,3);s=x[3*N];TH=x[3*N+1+2*len(nf):]
    # stage 2: per-frame refinement. Each frame may move its joints by D (3D) and its yaw, penalised (v5.5, relaxed): legs 0.1/px + 0.01/deg, other joints 0.4/px + 0.05/deg, bone lengths held,
    # 0.3 per 10 deg of yaw change -> the shared pose is the prior/ballpark, the fit tightens where the drawing differs.
    per={};PR={};SH={};SCAN={}
    for i,n in enumerate(nf):
        cur=[]
        for dg in range(0,360,5):
            pr=proj(P3,np.radians(dg),phi,s,(0,0));d_=OI[n][1]-pr[OI[n][0]];o_=np.median(d_,0);cur.append((float(np.mean(np.linalg.norm(d_-o_,axis=1))),dg))
        SCAN[n]=cur
    LEGK=lambda k:k[:2] in('R ','L ') and k.split()[1] in('hip','knee','ankle','skate')
    DW=np.array([0.1 if LEGK(k) else 0.4 for k in names]);BW=[0.01 if LEGK(names[b_]) else 0.05 for a_,b_ in BI];BLW=[1.5]*len(BI)
    for i,n in enumerate(nf):
        o0=x[3*N+1+2*i:3*N+3+2*i]
        def res2(z):
            D=z[:3*N].reshape(N,3);th=z[3*N];o=z[3*N+1:]
            BA=[]
            for (a_,b_),wa,wl in zip(BI,BW,BLW):   # v5.5: legs 0.01/deg (effectively free), other bones 0.05/deg; bone LENGTH kept (no stretching)
                u0=P3[b_]-P3[a_];u1=u0+D[b_]-D[a_];BA.append(wa*np.degrees(np.arctan2(np.linalg.norm(np.cross(u0,u1)),u0@u1)));BA.append(wl*s*(np.linalg.norm(u1)-np.linalg.norm(u0)))
            return np.concatenate(frame_res(P3+D,th,phi,s,o,n)+[(s*D*DW[:,None]).ravel(),BA,[0.3*np.degrees(th-TH[i])/10]])
        z=least_squares(res2,np.concatenate([np.zeros(3*N),[TH[i]],o0]),loss='soft_l1',f_scale=1.5,max_nfev=400).x
        D=z[:3*N].reshape(N,3);th=z[3*N];o=z[3*N+1:]
        pr=proj(P3+D,th,phi,s,o);PR[n]={k:pr[ix[k]] for k in names};p0=proj(P3,TH[i],phi,s,o0);SH[n]={k:p0[ix[k]] for k in names}
        def stats(PRn):
            e=[float(np.linalg.norm(PRn[k]-v)) for k,v in O[n].items()];q=G['MAPS'][n][0];sil=[]
            for a,b in BONES:
                if a in ix and b in ix:
                    for t in np.linspace(0,1,7):
                        p=np.round(PRn[a]*(1-t)+PRn[b]*t).astype(int);sil.append(0<=p[1]<q.shape[0] and 0<=p[0]<q.shape[1] and q[p[1],p[0]]!=255)
            return round(float(np.mean(e)),2),round(float(np.max(e)),2),round(float(np.mean(sil)),3)
        ang=[]
        for a,b in BONES:
            if a in ix and b in ix:
                u0=P3[ix[b]]-P3[ix[a]];u1=(P3+D)[ix[b]]-(P3+D)[ix[a]]
                ang.append(np.degrees(np.arccos(np.clip(u0@u1/max(1e-9,np.linalg.norm(u0)*np.linalg.norm(u1)),-1,1))))
        LIMB={}
        for nm,(a,b) in {'R thigh':('R hip','R knee'),'R shin':('R knee','R ankle'),'L thigh':('L hip','L knee'),'L shin':('L knee','L ankle'),'R skate':('R ankle','R skate'),'L skate':('L ankle','L skate'),
                         'R upper arm':('R shoulder','R elbow'),'L upper arm':('L shoulder','L elbow'),'R forearm':('R elbow','R wrist'),'L forearm':('L elbow','L wrist')}.items():
            if a in ix and b in ix:
                u0=P3[ix[b]]-P3[ix[a]];u1=(P3+D)[ix[b]]-(P3+D)[ix[a]];LIMB[nm]=round(float(np.degrees(np.arccos(np.clip(u0@u1/max(1e-9,np.linalg.norm(u0)*np.linalg.norm(u1)),-1,1)))),1)
        e0=stats(SH[n]);e1=stats(PR[n]);dpx=s*np.linalg.norm(D,axis=1)
        worst=sorted(((float(np.linalg.norm(PR[n][k]-v)),k) for k,v in O[n].items()),reverse=True)[:3]
        per[n]=dict(dir=fr[n],yaw_nominal=45*fr[n],yaw_shared_fit=round(float(np.degrees(TH[i])),1),yaw_refined=round(float(np.degrees(th)),1),
                    shared_mean_err=e0[0],shared_max_err=e0[1],shared_on_sprite=e0[2],mean_err_px=e1[0],max_err_px=e1[1],bone_on_sprite=e1[2],
                    dev_mean_px=round(float(dpx.mean()),2),dev_max_px=round(float(dpx.max()),2),dev_max_bone_deg=round(float(max(ang)),1),
                    worst=[(k,round(v,1)) for v,k in worst],limb_dev_deg=LIMB,leg_visible=VIS[n],
                    yaw_scan_best=min(SCAN[n])[1],yaw_scan_err_best=round(min(SCAN[n])[0],2),
                    yaw_scan_err_at_nominal=round(dict((d,e) for e,d in SCAN[n])[(45*fr[n])%360],2))
    return dict(phi_deg=round(float(np.degrees(phi)),1),scale=round(float(s),3),joints3d={k:P3[ix[k]].round(2).tolist() for k in names},per_frame=per),PR,O,SH
RES={};PROJ={};OBS={};SHP={}
QUICK=os.environ.get('QUICK')=='1'
for gname,fr in ({} if QUICK else GROUPS).items():
    if len(fr)<2:
        n=list(fr)[0];RES[gname]=dict(note='single frame: same sprite drawn for all 8 directions, no rotation to fit',per_frame={n:dict(dir=fr[n])});
        PROJ[n]={k:v for k,v in obs(n).items()};OBS[n]=obs(n);continue
    R0,PR,O,SH=fitgroup(fr);RES[gname]=R0;PROJ.update(PR);OBS.update(O);SHP.update(SH)
    for n,v in R0['per_frame'].items():print(gname[:14],n,{k:v[k] for k in v if k!='worst'})
if not QUICK:json.dump(dict(groups=RES,stick2d=ST,joints2d={str(n):{k:[round(float(c),2) for c in v] for k,v in PROJ[n].items()} for n in PROJ}),open(f'{OUT}/pose3d_v5.json','w'),indent=1,default=float)
# ---------- sheets: game sprite washed out, shared-pose projection (thick black/white bones, white dots), observed 2D joints = small black squares
SC=8
def draw(n,PRn,On,label):
    q=G['MAPS'][n][0];h,w=q.shape;sp=G['ALLP'][('HOME.json','tor')]
    o=np.full((h,w,3),255,np.uint8);m=q!=255;o[m]=(sp[q[m]]*0.35+255*0.65).astype(np.uint8)
    for p,t in G['MAPS'][n][3].items():
        if t=='stick':o[p]=(70,70,70)        # drawn stick pixels: dark grey
    PAD=6;o2=np.full((h+2*PAD,w+2*PAD,3),255,np.uint8);o2[PAD:PAD+h,PAD:PAD+w]=o;o=o2   # 6-px margin: labels/stick never clip
    im=Image.fromarray(o).resize(((w+2*PAD)*SC,(h+2*PAD)*SC),Image.NEAREST);d=ImageDraw.Draw(im)
    P=lambda v:((v[0]+PAD)*SC+SC/2,(v[1]+PAD)*SC+SC/2)
    for k,v in On.items():X,Y=P(v);d.rectangle([X-3,Y-3,X+3,Y+3],fill=(0,0,0))
    for a,b in BONES:
        if a in PRn and b in PRn:
            stick=a.startswith('stick');d.line([P(PRn[a]),P(PRn[b])],fill=(0,0,0),width=7);d.line([P(PRn[a]),P(PRn[b])],fill=(255,255,0) if stick else (255,255,255),width=3)
    for k,v in PRn.items():
        X,Y=P(v);d.ellipse([X-5,Y-5,X+5,Y+5],fill=(0,0,0));d.ellipse([X-2,Y-2,X+2,Y+2],fill=(255,255,255))
        if k[:2] in('R ','L ') and k.split()[1] in('glove','skate','shoulder'):d.text((X+6,Y-6),k[0],fill=(0,0,0))
    for a,b,lab in(('stick butt','stick heel','SHAFT'),('stick heel','stick toe','BLADE')):
        if a in PRn:M_=((P(PRn[a])[0]+P(PRn[b])[0])/2,(P(PRn[a])[1]+P(PRn[b])[1])/2);tw=d.textlength(lab);d.rectangle([M_[0]-tw/2-2,M_[1]-15,M_[0]+tw/2+2,M_[1]-3],fill=(0,0,0));d.text((M_[0]-tw/2,M_[1]-14),lab,fill=(255,255,255))
    L=label.split('|');tw=int(max(ImageDraw.Draw(im).textlength(x) for x in L))+8;cw=max(im.width,tw)   # column at least as wide as its label: no clipping
    c=Image.new('RGB',(cw,im.height+16*len(L)+6),'white');c.paste(im,((cw-im.width)//2,16*len(L)+6))
    for i,x in enumerate(L):ImageDraw.Draw(c).text((4,4+16*i),x,fill=(0,0,0))
    return c
def row_sheet(items,title,path):
    CW=max(i.width for i in items)+16;RH=max(i.height for i in items)+10
    W=Image.new('RGB',(CW*len(items),RH+40),'white');dr=ImageDraw.Draw(W);dr.text((6,6),title,fill=(0,0,0))
    for j,i in enumerate(items):W.paste(i,(j*CW+(CW-i.width)//2,40+(RH-i.height)))    # centred per column, common baseline
    W.save(path)
LEG='white bones = refined pose for this direction (shared 3D pose + small penalised deviation); yellow = stick (SHAFT/BLADE); small black squares = joints seen in that frame'
for gname,fr in ({} if QUICK else GROUPS).items():
    if len(fr)<2:continue
    pf=RES[gname]['per_frame']
    items=[draw(n,PROJ[n],OBS[n],f"{n} d{fr[n]}  yaw {pf[n]['yaw_refined']:.0f} (nominal {45*fr[n]})|err {pf[n]['mean_err_px']}/{pf[n]['max_err_px']}px|dev {pf[n]['dev_mean_px']}/{pf[n]['dev_max_px']}px, {pf[n]['dev_max_bone_deg']}deg") for n in fr]
    row_sheet(items[:4],f"{gname} (1/2): per-direction refined pose (shared 3D pose = prior), free yaw, phi {RES[gname]['phi_deg']}.  {LEG}",f"{OUT}/pose_{gname.split()[0]}_sheet_a.png")
    row_sheet(items[4:],f"{gname} (2/2)",f"{OUT}/pose_{gname.split()[0]}_sheet_b.png")
# fixed stick sheet (2D stick from pixels) on 370/889/42/67/52/72
items=[]
for n in (370,889,42,67,52,72):
    s=ST[n];On={};PRn={'stick butt':s['butt'],'stick heel':s['heel'],'stick toe':s['toe']}
    PRn.update({k:v for k,v in G['SEGS'][n]['joints'].items() if k.endswith('glove')})
    items.append(draw(n,PRn,On,f"{n}: shaft {s['shaft_len']:.1f} blade {s['blade_len']:.1f}"))
row_sheet(items,'v5.3 stick fit from the drawn stick pixels (yellow; R/L glove dots): 370, 889, 42, 67, 52, 72',f'{OUT}/stick_fix_v53_sheet.png')
