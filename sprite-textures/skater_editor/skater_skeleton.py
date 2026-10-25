# D161 (Abdul pt977u): full skater skeleton per frame. Joint names = playerlayout pose3d_v5 joints2d (the hand-fitted anchors):
#   head, neck, chest, belly, pelvis; R/L shoulder, elbow, wrist, glove (hand); R/L hip, knee, ankle, skate (skate tip);
#   stick butt, stick heel (shaft/blade corner), stick toe.  Coordinates [x, y] in sprite pixels.
# Segments (BONES): head-neck, neck-chest, chest-belly, belly-pelvis, shoulders, upper arm, forearm, hand, hips, thigh, shin,
# skate, stick shaft (butt-heel), stick blade (heel-toe).
# Sources, in order: hand-fitted pose (anchor, 17 frames) > v5 fit skeleton (frames_v5 seg_v5 joints) > part-label estimate
# (editor labels: helmet/skin, torso, sleeve, glove, pants, sock, skate, stick). The stick always comes from the stick px.
# A frame is CONFIDENT when the core joints exist, each joint sits on (or next to) a drawn px of its part, the torso is at least
# 3 px long and no limb segment is longer than the body. Otherwise it is FLAGGED (reasons listed); flagged skeletons are not used
# to drive texture directions.
import numpy as np,collections
from scipy import ndimage as ndi
BONES=[('head','neck'),('neck','chest'),('chest','belly'),('belly','pelvis'),('neck','R shoulder'),('neck','L shoulder'),
       ('R shoulder','R elbow'),('R elbow','R wrist'),('R wrist','R glove'),('L shoulder','L elbow'),('L elbow','L wrist'),('L wrist','L glove'),
       ('pelvis','R hip'),('pelvis','L hip'),('R hip','R knee'),('R knee','R ankle'),('R ankle','R skate'),('L hip','L knee'),('L knee','L ankle'),('L ankle','L skate'),
       ('stick butt','stick heel'),('stick heel','stick toe')]
CORE=['head','neck','chest','pelvis']
PNI={'skin':2,'helmet':3,'torso':4,'crest':5,'shoulder_patch':6,'sleeve':7,'glove':8,'pants':9,'sock':10,'skate':11,'skate_blade':12,'stick':13}
def _pts(lab,names):
    ys,xs=np.nonzero(np.isin(lab,[PNI[n] for n in names]));return np.stack([xs,ys],1).astype(float) if len(xs) else np.zeros((0,2))
def _comps(lab,names,mn=2):
    l,k=ndi.label(np.isin(lab,[PNI[n] for n in names]),np.ones((3,3),bool));out=[]
    for i in range(1,k+1):
        ys,xs=np.nonzero(l==i)
        if len(xs)>=mn:out.append(np.stack([xs,ys],1).astype(float))
    return sorted(out,key=len,reverse=True)
def stick(lab,gloves):
    """stick butt/heel/toe from the stick px: order px along the main axis, butt = the end nearer a glove, heel = the split point
    where two straight lines (shaft, blade) fit best; blade at least 2 px. None if < 4 stick px."""
    P=_pts(lab,['stick'])
    if len(P)<4:return {}
    c=P.mean(0);w,V=np.linalg.eigh(np.cov((P-c).T));ax=V[:,1];t=(P-c)@ax;o=np.argsort(t);P=P[o];t=t[o]
    e0,e1=P[0],P[-1]
    if gloves:
        g=np.array(gloves)
        if min(np.hypot(*(g-e1).T))<min(np.hypot(*(g-e0).T)):P=P[::-1];t=-t[::-1]
    def res(Q):
        if len(Q)<2:return 0.0
        q=Q-Q.mean(0);return float(np.linalg.svd(q,compute_uv=False)[-1]**2) if len(Q)>2 else 0.0
    best=(res(P),len(P)-1)
    for i in range(max(3,len(P)//2),len(P)-1):
        r=res(P[:i+1])+res(P[i:])
        if r<best[0]-0.5:best=(r,i)
    h=best[1] if best[1]<len(P)-1 else max(0,len(P)-3)
    return {'stick butt':P[0].tolist(),'stick heel':P[h].tolist(),'stick toe':P[-1].tolist()}
def estimate(lab,d):
    """joints from the part labels only (frames the v5 fit could not do)."""
    J={};C=lambda Q:Q.mean(0).tolist()
    hd=_pts(lab,['helmet','skin']);to=_pts(lab,['torso','crest','shoulder_patch']);pa=_pts(lab,['pants'])
    if len(hd):J['head']=C(hd)
    if len(to):J['chest']=C(to)
    if len(pa):J['pelvis']=C(pa)
    elif len(to):J['pelvis']=to[np.argmax((to-to.mean(0))@np.array([0,1.]))].tolist()
    if 'head' in J and 'chest' in J:J['neck']=(0.5*np.array(J['head'])+0.5*np.array(J['chest'])).tolist()
    if 'chest' in J and 'pelvis' in J:J['belly']=(0.5*np.array(J['chest'])+0.5*np.array(J['pelvis'])).tolist()
    tcx=J.get('chest',[lab.shape[1]/2,0])[0];front=d in(3,4,5);back=d in(0,1,7)
    side=lambda x:('R' if x<tcx else 'L') if front else ('R' if x>tcx else 'L') if back else None
    gl=_comps(lab,['glove'])[:2];sk=_skates(lab)[:2]
    used=set()
    for nm,cs,end in (('glove',gl,'glove'),('skate',sk,'skate')):
        for i,Q in enumerate(cs):
            s=side(Q[:,0].mean()) or ('R','L')[i]
            if s in used and len(cs)==2:s={'R':'L','L':'R'}[s]
            used.add(s);J[s+' '+end]=C(Q)
        used=set()
    for s in 'RL':
        if s+' glove' in J and 'neck' in J:
            sl=_pts(lab,['sleeve']);g=np.array(J[s+' glove']);n=np.array(J['neck'])
            if len(sl):
                m=sl[np.hypot(*(sl-g).T)<np.hypot(*(sl-(2*n-g)).T)]
                if len(m):e=m[np.argmin(abs(np.hypot(*(m-g).T)-np.hypot(*(m-n).T)))];J[s+' elbow']=e.tolist();J[s+' shoulder']=(0.6*n+0.4*e).tolist();J[s+' wrist']=(0.3*e+0.7*g).tolist()
        if s+' skate' in J and 'pelvis' in J:
            so=_pts(lab,['sock']);k=np.array(J[s+' skate']);p=np.array(J['pelvis'])
            J[s+' hip']=(0.8*p+0.2*k).tolist()
            if len(so):
                m=so[np.hypot(*(so-k).T)<np.hypot(*(so-p).T)+2]
                if len(m):J[s+' ankle']=m[np.argmin(np.hypot(*(m-k).T))].tolist();J[s+' knee']=m[np.argmax(np.hypot(*(m-k).T))].tolist()
    return J
def build(lab,d,v5=None,anchor=None):
    """returns (joints {name:[x,y]}, source, confident bool, reasons list).
    Upright frames keep the v5 skeleton (median 0.2 px from the hand-fitted anchors); special poses (falls, dives, crouches:
    torso > 35 deg from vertical, or the v5 skeleton fails the checks) use posefit (median 1.4 px from the anchors)."""
    lab=np.asarray(lab);pf=posefit(lab,d);tl=tilt(pf) if pf else None;E=estimate(lab,d)
    def fin(J):   # D162: snap to the drawn px, fill gaps, then check
        J={k:list(map(float,v)) for k,v in J.items()}
        for k,v in E.items():J.setdefault(k,v)
        J=snap(lab,J);return J,check(lab,J,d)
    if anchor:
        J={k:list(map(float,v)) for k,v in anchor.items()};src='hand-fitted'
        for k,v in E.items():J.setdefault(k,v)
        if not any(k.startswith('stick') for k in J):J.update(stick(lab,[J[s+' glove'] for s in 'RL' if s+' glove' in J]))
        why=check(lab,J,d)
    else:
        C=[]   # candidates: (problems, preference, joints, source)
        if v5:J,w=fin(v5);C.append((len(w)+(2 if tl is not None and tl>35 else 0),0,J,'v5 fit',w))   # lying/diving: v5 is upright-only, trust it less
        if pf:J,w=fin(pf);C.append((len(w),1,J,'special-pose fit' if (tl or 0)>35 or v5 else 'pose fit',w))
        if C:_,_,J,src,why=min(C,key=lambda c:c[:2])
        else:J,why=fin({});src='part labels'
    return {k:[round(v[0],2),round(v[1],2)] for k,v in J.items()},src,not why,why
def _near(lab,ids,p,mask=None):
    P=_pts(lab,ids) if mask is None else mask
    if not len(P):return None
    return P[np.argmin(np.hypot(*(P-np.asarray(p)).T))]
def _on(lab,ids,p,r=0.75):
    q=_near(lab,ids,p);return q is not None and np.hypot(*(q-np.asarray(p)))<=r
def _skates(lab):
    """D162: skate blobs, dropping stray skate labels on the stick (a blob that touches stick px but no sock px)."""
    lab=np.asarray(lab);st=ndi.binary_dilation(lab==PNI['stick']);so=ndi.binary_dilation(lab==PNI['sock'])
    return [K for K in _comps(lab,['skate','skate_blade'],1) if not(st[K[:,1].astype(int),K[:,0].astype(int)].any() and not so[K[:,1].astype(int),K[:,0].astype(int)].any())]
def snap(lab,J):
    """D162: skates on skate px (one skate blob per leg when two are drawn), ankles on the sock/skate px just above,
    stick from the stick px (shaft through them, blade heel-toe), the stick hand on the glove px touching the stick."""
    J={k:list(v) for k,v in J.items()};SK=['skate','skate_blade']
    K=[k for k in _skates(lab) if len(k)>=2][:2];AK=np.vstack(_skates(lab)) if _skates(lab) else np.zeros((0,2))
    if not len(AK):   # no skate drawn (lying, hidden): no skate joint; leg ends at the ankle
        for s in 'RL':J.pop(s+' skate',None)
    for s in 'RL':
        k=s+' skate'
        if k not in J:continue
        if len(K)==2:   # give each leg its own skate blob (nearest to its knee/ankle)
            o='L' if s=='R' else 'R';ref=np.array(J.get(s+' ankle',J[k]))
            dd=[np.hypot(*(Q-ref).T).min() for Q in K]
            if o+' skate' in J:
                oref=np.array(J.get(o+' ankle',J[o+' skate']));od=[np.hypot(*(Q-oref).T).min() for Q in K]
                i=0 if dd[0]+od[1]<=dd[1]+od[0] else 1
            else:i=int(np.argmin(dd))
            q=K[i][np.argmin(np.hypot(*(K[i]-np.array(J[k])).T))]
        else:q=_near(lab,SK,J[k],AK)
        if q is not None:J[k]=q.tolist()
        a=s+' ankle'
        if a in J and not _on(lab,['sock']+SK,J[a],1.0):
            q=_near(lab,['sock'],J[k]);q=q if q is not None and np.hypot(*(q-np.array(J[k])))<=4 else _near(lab,SK,J[a],AK)
            if q is not None:J[a]=q.tolist()
    for k in [k for k in J if k.startswith('stick')]:del J[k]
    J.update(stick(lab,[J[s+' glove'] for s in 'RL' if s+' glove' in J]))
    if 'stick butt' in J:
        St=_pts(lab,['stick']);gl=[s for s in 'RL' if s+' glove' in J]
        if gl:
            s=min(gl,key=lambda s:np.hypot(*np.subtract(J[s+' glove'],J['stick butt'])));G=_pts(lab,['glove'])
            if len(G) and len(St):
                d=np.array([np.hypot(*(St-g).T).min() for g in G]);touch=G[d<=1.5]
                if len(touch):
                    c=touch[np.hypot(*(touch-np.array(J[s+' glove'])).T)<=4]
                    if len(c):J[s+' glove']=c.mean(0).tolist()
    return J
def _cross(a,b,c,d):
    f=lambda p,q,r:(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0])
    return f(a,b,c)*f(a,b,d)<0 and f(c,d,a)*f(c,d,b)<0
def check(lab,J,d=None):
    lab=np.asarray(lab);why=[]
    for s in 'RL':   # D162 sanity checks
        k=s+' skate'
        AK=_skates(lab);q=_near(lab,[],J[k],np.vstack(AK)) if (k in J and AK) else None
        if k in J and (q is None or np.hypot(*(q-np.asarray(J[k])))>1.0):why.append(k+(' on the stick' if _on(lab,['stick'],J[k],1.0) else ' not on a skate'))
    if all(s+' '+j in J for s in 'RL' for j in('hip','knee','skate')) and d in(0,1,3,4,5,7):
        R=[J['R hip'],J['R knee'],J['R skate']];L=[J['L hip'],J['L knee'],J['L skate']]
        if any(_cross(R[i],R[i+1],L[j],L[j+1]) for i in(0,1) for j in(0,1)):why.append('legs cross')
    up=tilt(J) is not None and tilt(J)<=35
    for s in 'RL':   # leg folds back on itself (ankle much nearer the hip than the knee is) on upright frames
        if up and all(s+' '+j in J for j in('hip','knee','ankle')):
            dh=lambda j:np.hypot(*np.subtract(J[s+' '+j],J[s+' hip']))
            if dh('knee')>2 and dh('ankle')<0.8*dh('knee'):why.append(s+' leg folds back')
    if 'head' in J and 'chest' in J and 'pelvis' in J and tilt(J) is not None and tilt(J)<=35 and J['head'][1]>J['chest'][1]+1:why.append('head below the chest')
    for k in CORE:
        if k not in J:why.append('no '+k)
    on=np.isin(lab,list(range(2,14)))
    dt=ndi.distance_transform_edt(~on)
    for k,(x,y) in J.items():
        xi,yi=int(round(x)),int(round(y))
        if not(0<=yi<lab.shape[0] and 0<=xi<lab.shape[1]) or dt[yi,xi]>1.5:why.append(k+' off the sprite')
    ys,xs=np.nonzero(on);size=max(np.ptp(xs),np.ptp(ys)) if len(xs) else 0
    if 'neck' in J and 'pelvis' in J and np.hypot(*np.subtract(J['neck'],J['pelvis']))<3:why.append('torso < 3 px')
    if 'head' in J and 'pelvis' in J and 'chest' in J and np.hypot(*np.subtract(J['head'],J['pelvis']))<0.8*np.hypot(*np.subtract(J['chest'],J['pelvis'])):why.append('head nearer the pelvis than the chest')
    for a,b in BONES:
        if a in J and b in J and not a.startswith('stick') and np.hypot(*np.subtract(J[a],J[b]))>0.8*size:why.append(f'{a}-{b} too long')
    for sd in 'RL':
        if sd+' hip' in J and sd+' skate' in J and np.hypot(*np.subtract(J[sd+' hip'],J[sd+' skate']))<2.5:why.append(sd+' leg collapsed')
    if len([K for K in _skates(lab) if len(K)>=3])>=2 and sum(s_+' skate' in J for s_ in 'RL')<2:why.append('a drawn skate has no leg')
    return why
def axes(J,why=()):
    """body-axis directions (unit [dx,dy], pointing 'down the body') per texture segment. A segment whose joints are named in
    a flag reason is skipped (that part keeps the D157 axis)."""
    A={};bad=' '.join(why)
    def u(a,b):
        if a in J and b in J and a not in bad and b not in bad:
            v=np.subtract(J[b],J[a]);n=np.hypot(*v)
            if n>=1.5:return (v/n).tolist()
    t=u('neck','pelvis')
    if t:A['torso']=t
    for s in 'RL':
        for nm,a,b in (('up','shoulder','elbow'),('low','elbow','wrist')):
            r=u(s+' '+a,s+' '+b) or (u(s+' shoulder',s+' glove') if nm=='low' else None)
            if r:A[s+' arm '+nm]=r
        r=u(s+' hip',s+' knee')
        if r:A[s+' thigh']=r
    if t:A['pants']=([np.mean([A[k][0] for k in A if k.endswith('thigh')]),np.mean([A[k][1] for k in A if k.endswith('thigh')])] if any(k.endswith('thigh') for k in A) else t)
    return A
def tilt(J):
    """torso angle from screen vertical (degrees), None if unknown."""
    if 'neck' in J and 'pelvis' in J:
        dx,dy=np.subtract(J['pelvis'],J['neck']);return float(np.degrees(np.arctan2(abs(dx),dy)))
# ---- D161 special-pose fit: geometry from the part labels along the body's own axis (no upright assumption)
def _cc(mask,seed):
    l,_=ndi.label(mask,np.ones((3,3),bool));ids=set(int(l[int(y),int(x)]) for x,y in seed if mask[int(y),int(x)])-{0}
    ys,xs=np.nonzero(np.isin(l,list(ids)));return np.stack([xs,ys],1).astype(float) if len(xs) else np.zeros((0,2))
def posefit(lab,d):
    lab=np.asarray(lab);J={};C=lambda Q:Q.mean(0)
    hd=_pts(lab,['helmet','skin']);to=_pts(lab,['torso','crest','shoulder_patch']);pa=_pts(lab,['pants'])
    if not len(to) or not len(hd):return {}
    hc=C(hd);body=np.vstack([to,pa]) if len(pa) else to;pc=C(pa) if len(pa) else C(to)
    ax=pc-hc;n=np.hypot(*ax)
    if n<1:return {}
    ax/=n;pr=lambda Q:(Q-hc)@ax
    t=pr(to);J['head']=hc.tolist()
    top=to[t<=np.percentile(t,15)];J['neck']=C(top).tolist()
    J['chest']=C(to[t<=np.percentile(t,45)]).tolist();J['belly']=C(to[t>=np.percentile(t,70)]).tolist()
    if len(pa):tp=pr(pa);J['pelvis']=C(pa[tp<=np.percentile(tp,20)]).tolist()    # waist line (pants top), like the hand-fitted poses
    else:J['pelvis']=C(to[t>=np.percentile(t,85)]).tolist()
    perp=np.array([-ax[1],ax[0]])   # screen side across the body
    front=d in(3,4,5);back=d in(0,1,7)
    def side(Q):   # player side of a limb component
        s=float((C(Q)-pc)@perp) if len(Q) else 0.0
        # perp points to screen +x when the body axis points down the screen; facing decides which screen side is the player's right
        sx=np.sign(perp[0]) if abs(perp[0])>1e-3 else 1.0;scr=s*sx   # >0 = screen right
        if front:return 'L' if scr>0 else 'R'
        if back:return 'R' if scr>0 else 'L'
        return None
    arm=np.isin(lab,[PNI['sleeve'],PNI['glove']]);leg=np.isin(lab,[PNI['pants'],PNI['sock'],PNI['skate'],PNI['skate_blade']])
    neck=np.array(J['neck'])
    gl=_comps(lab,['glove'])[:2];got=[]
    for i,G in enumerate(gl):
        A=_cc(arm,G);sl=A[np.isin(lab[A[:,1].astype(int),A[:,0].astype(int)],[PNI['sleeve']])] if len(A) else A
        s=side(G) or ('R','L')[i]
        if s in got:s={'R':'L','L':'R'}[s]
        got.append(s);g=C(G);J[s+' glove']=g.tolist()
        if len(sl):
            sh=sl[np.argmin(np.hypot(*(sl-neck).T))];wr=G[np.argmin(np.hypot(*(G-C(sl)).T))]
            v=g-sh;L=np.hypot(*v)
            if L>0:
                off=np.abs((sl-sh)@np.array([-v[1],v[0]])/L);mid=np.abs((sl-sh)@v/L/L-0.5)
                el=sl[np.argmin(mid-0.5*off)]
            else:el=C(sl)
            J[s+' shoulder']=sh.tolist();J[s+' elbow']=el.tolist();J[s+' wrist']=wr.tolist()
    sock=np.isin(lab,[PNI['sock']]);sk=[K for K in _skates(lab) if len(K)>=4 or any(sock[max(0,int(y)-1):int(y)+2,max(0,int(x)-1):int(x)+2].any() for x,y in K)][:2];got=[]   # skate px must touch a sock (else stray label)
    for i,K in enumerate(sk):
        s=side(K) or ('R','L')[i]
        if s in got:s={'R':'L','L':'R'}[s]
        got.append(s);L_=_cc(np.isin(lab,[PNI['sock'],PNI['skate'],PNI['skate_blade']]),K)   # this leg only (sock+skate chain)
        so=L_[lab[L_[:,1].astype(int),L_[:,0].astype(int)]==PNI['sock']] if len(L_) else L_
        an=(so[np.argmin(np.hypot(*(so-C(K)).T))] if len(so) else C(K))
        J[s+' skate']=K[np.argmax(np.hypot(*(K-an).T))].tolist();J[s+' ankle']=an.tolist()
        if len(so) and len(pa):
            dp=np.array([np.hypot(*(pa-q).T).min() for q in so]);kn=C(so[dp<=dp.min()+1])
        elif len(so):kn=so[np.argmax(np.hypot(*(so-an).T))]
        else:kn=an
        J[s+' knee']=kn.tolist()
        if len(pa):   # D162: hip at the waist line, 2 px across from the pelvis toward this leg (lying poses drew the hip on the knee)
            pv=np.array(J['pelvis']);sg=np.sign((kn-pv)@perp) or (1 if s=='R' else -1);h=pv+2*sg*perp
            J[s+' hip']=pa[np.argmin(np.hypot(*(pa-h).T))].tolist()
        else:J[s+' hip']=J['pelvis']
    return {k:list(map(float,v)) for k,v in J.items()}
