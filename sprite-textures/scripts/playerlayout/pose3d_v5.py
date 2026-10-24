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
def obs(n):
    J=dict(G['SEGS'][n]['joints']);s=ST.get(n)
    if s:J.update({'stick butt':s['butt'],'stick heel':s['heel'],'stick toe':s['toe']})
    return {k:np.array(v,float) for k,v in J.items()}
BONES=[('head','neck'),('neck','chest'),('chest','belly'),('belly','pelvis')]+[(f'{s} {a}',f'{s} {b}') for s in 'RL' for a,b in
       (('shoulder','elbow'),('elbow','wrist'),('wrist','glove'),('hip','knee'),('knee','ankle'),('ankle','skate'))]+\
      [('neck','R shoulder'),('neck','L shoulder'),('pelvis','R hip'),('pelvis','L hip'),('stick butt','stick heel'),('stick heel','stick toe')]
def fitgroup(fr,swap=None,phis=(5,10,15,25,35)):
    swap=swap or {}
    O={};M={}
    for n in fr:
        o=obs(n)
        if swap.get(n):o={(('L'+k[1:]) if k[0]=='R' else ('R'+k[1:]) if k[0]=='L' else k) if k[:2] in('R ','L ') else k:v for k,v in o.items()}
        O[n]=o;q=G['MAPS'][n][0];M[n]=EDT(q==255)
    names=sorted(set(k for o in O.values() for k in o));ix={k:i for i,k in enumerate(names)};N=len(names)
    best=None
    for phi in np.radians(list(phis)):
        # init: average of back-projections with f=0
        P0=np.zeros((N,3));cnt=np.zeros(N)
        for n,o in O.items():
            th=np.radians(45*fr[n]);ce=np.mean(list(o.values()),0)
            for k,v in o.items():
                P0[ix[k]]+=[ (v[0]-ce[0])*np.cos(th),-(v[1]-ce[1])/np.cos(phi),(v[0]-ce[0])*np.sin(th)];cnt[ix[k]]+=1
        P0/=np.maximum(1,cnt)[:,None]
        nf=list(fr);x0=np.concatenate([P0.ravel(),[1.0]]+[np.mean(list(O[n].values()),0) for n in nf])
        OI={n:(np.array([ix[k] for k in O[n]]),np.array(list(O[n].values()))) for n in nf}
        BI=np.array([(ix[a],ix[b]) for a,b in BONES if a in ix and b in ix]);TS=np.array([0.25,0.5,0.75])
        SY=[(ix[a],ix[b],ix['L'+a[1:]],ix['L'+b[1:]]) for a,b in BONES if a[:2]=='R ' and b[:2]=='R ' and all(k in ix for k in(a,b,'L'+a[1:],'L'+b[1:]))]
        SY=np.array(SY) if SY else np.zeros((0,4),int)
        def res(x):
            P3=x[:3*N].reshape(N,3);s=x[3*N];R=[]
            for i,n in enumerate(nf):
                o=x[3*N+1+2*i:3*N+3+2*i];pr=proj(P3,np.radians(45*fr[n]),phi,s,o)
                R.append((pr[OI[n][0]]-OI[n][1]).ravel())
                if len(BI):
                    p=(pr[BI[:,0]][:,None,:]*(1-TS[None,:,None])+pr[BI[:,1]][:,None,:]*TS[None,:,None]).reshape(-1,2)
                    R.append(0.5*map_coordinates(M[n],[p[:,1],p[:,0]],order=1,mode='nearest'))
            if len(SY):R.append(0.5*(np.linalg.norm(P3[SY[:,0]]-P3[SY[:,1]],axis=1)-np.linalg.norm(P3[SY[:,2]]-P3[SY[:,3]],axis=1)))
            return np.concatenate(R)
        r=least_squares(res,x0,loss='soft_l1',f_scale=1.5,max_nfev=400)
        if best is None or r.cost<best[0]:best=(r.cost,r,phi)
    _,r,phi=best;x=r.x;P3=x[:3*N].reshape(N,3);s=x[3*N]
    per={};PR={}
    for i,n in enumerate(fr):
        o=x[3*N+1+2*i:3*N+3+2*i];pr=proj(P3,np.radians(45*fr[n]),phi,s,o);PR[n]={k:pr[ix[k]] for k in names}
        e=[float(np.linalg.norm(pr[ix[k]]-v)) for k,v in O[n].items()]
        sil=[];q=G['MAPS'][n][0]
        for a,b in BONES:
            if a in ix and b in ix:
                for t in np.linspace(0,1,7):
                    p=np.round(PR[n][a]*(1-t)+PR[n][b]*t).astype(int)
                    sil.append(0<=p[1]<q.shape[0] and 0<=p[0]<q.shape[1] and q[p[1],p[0]]!=255)
        worst=sorted(((float(np.linalg.norm(PR[n][k]-v)),k) for k,v in O[n].items()),reverse=True)[:3]
        per[n]=dict(dir=fr[n],mean_err_px=round(float(np.mean(e)),2),max_err_px=round(float(np.max(e)),2),
                    bone_on_sprite=round(float(np.mean(sil)),3),worst=[(k,round(v,1)) for v,k in worst])
    return dict(phi_deg=round(float(np.degrees(phi)),1),scale=round(float(s),3),joints3d={k:P3[ix[k]].round(2).tolist() for k in names},per_frame=per),PR,O
RES={};PROJ={};OBS={}
QUICK=os.environ.get('QUICK')=='1'
for gname,fr in ({} if QUICK else GROUPS).items():
    if len(fr)<2:
        n=list(fr)[0];RES[gname]=dict(note='single frame: same sprite drawn for all 8 directions, no rotation to fit',per_frame={n:dict(dir=fr[n])});
        PROJ[n]={k:v for k,v in obs(n).items()};OBS[n]=obs(n);continue
    R0,PR,O=fitgroup(fr)
    # left/right test: does swapping one frame's L/R labels fit the shared pose better? (flags L/R-inconsistent segmentation or art)
    flips=[]
    for n in fr:
        R1,PR1,O1=fitgroup(fr,{n:True},phis=(R0['phi_deg'],))
        if R1['per_frame'][n]['mean_err_px']+0.5<R0['per_frame'][n]['mean_err_px']:flips.append((n,R0['per_frame'][n]['mean_err_px'],R1['per_frame'][n]['mean_err_px']))
    R0['lr_swap_improves']=flips;RES[gname]=R0;PROJ.update(PR);OBS.update(O)
    print(gname,'phi',R0['phi_deg'],{n:(v['mean_err_px'],v['max_err_px'],v['bone_on_sprite']) for n,v in R0['per_frame'].items()},'flips',flips)
if not QUICK:json.dump(dict(groups=RES,stick2d=ST),open(f'{OUT}/pose3d_v5.json','w'),indent=1,default=float)
# ---------- sheets: game sprite washed out, shared-pose projection (thick black/white bones, white dots), observed 2D joints = small black squares
SC=8
def draw(n,PRn,On,label):
    q=G['MAPS'][n][0];h,w=q.shape;sp=G['ALLP'][('HOME.json','tor')]
    o=np.full((h,w,3),255,np.uint8);m=q!=255;o[m]=(sp[q[m]]*0.35+255*0.65).astype(np.uint8)
    for p,t in G['MAPS'][n][3].items():
        if t=='stick':o[p]=(70,70,70)        # drawn stick pixels: dark grey
    im=Image.fromarray(o).resize((w*SC,h*SC),Image.NEAREST);d=ImageDraw.Draw(im)
    P=lambda v:(v[0]*SC+SC/2,v[1]*SC+SC/2)
    for k,v in On.items():X,Y=P(v);d.rectangle([X-3,Y-3,X+3,Y+3],fill=(0,0,0))
    for a,b in BONES:
        if a in PRn and b in PRn:
            stick=a.startswith('stick');d.line([P(PRn[a]),P(PRn[b])],fill=(0,0,0),width=7);d.line([P(PRn[a]),P(PRn[b])],fill=(255,255,0) if stick else (255,255,255),width=3)
    for k,v in PRn.items():
        X,Y=P(v);d.ellipse([X-5,Y-5,X+5,Y+5],fill=(0,0,0));d.ellipse([X-2,Y-2,X+2,Y+2],fill=(255,255,255))
        if k[:2] in('R ','L ') and k.split()[1] in('glove','skate','shoulder'):d.text((X+6,Y-6),k[0],fill=(0,0,0))
    for a,b,lab in(('stick butt','stick heel','SHAFT'),('stick heel','stick toe','BLADE')):
        if a in PRn:M_=((P(PRn[a])[0]+P(PRn[b])[0])/2,(P(PRn[a])[1]+P(PRn[b])[1])/2);tw=d.textlength(lab);d.rectangle([M_[0]-tw/2-2,M_[1]-15,M_[0]+tw/2+2,M_[1]-3],fill=(0,0,0));d.text((M_[0]-tw/2,M_[1]-14),lab,fill=(255,255,255))
    c=Image.new('RGB',(im.width,im.height+30),'white');c.paste(im,(0,30));ImageDraw.Draw(c).text((4,4),label,fill=(0,0,0));return c
def row_sheet(items,title,path):
    CW=max(i.width for i in items)+16;RH=max(i.height for i in items)+10
    W=Image.new('RGB',(CW*len(items),RH+40),'white');dr=ImageDraw.Draw(W);dr.text((6,6),title,fill=(0,0,0))
    for j,i in enumerate(items):W.paste(i,(j*CW+(CW-i.width)//2,40+(RH-i.height)))    # centred per column, common baseline
    W.save(path)
LEG='white bones = ONE shared 3D pose rotated to each direction; yellow = stick (SHAFT/BLADE); small black squares = joints seen in that frame'
for gname,fr in ({} if QUICK else GROUPS).items():
    if len(fr)<2:continue
    items=[draw(n,PROJ[n],OBS[n],f"{n} d{fr[n]} err {RES[gname]['per_frame'][n]['mean_err_px']}px on-sprite {RES[gname]['per_frame'][n]['bone_on_sprite']}") for n in fr]
    row_sheet(items,f"{gname}: phi {RES[gname]['phi_deg']} deg.  {LEG}",f"{OUT}/pose_{gname.split()[0]}_sheet.png")
# fixed stick sheet (2D stick from pixels) on 370/889/42/67/52/72
items=[]
for n in (370,889,42,67,52,72):
    s=ST[n];On={};PRn={'stick butt':s['butt'],'stick heel':s['heel'],'stick toe':s['toe']}
    PRn.update({k:v for k,v in G['SEGS'][n]['joints'].items() if k.endswith('glove')})
    items.append(draw(n,PRn,On,f"{n}: shaft {s['shaft_len']:.1f} blade {s['blade_len']:.1f}"))
row_sheet(items,'v5.3 stick fit from the drawn stick pixels (yellow; R/L glove dots): 370, 889, 42, 67, 52, 72',f'{OUT}/stick_fix_v53_sheet.png')
