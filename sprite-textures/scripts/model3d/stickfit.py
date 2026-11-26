"""Place the stick from its own pixels: 2D shaft line + blade per frame, lifted to 3D through the nearest glove."""
import numpy as np
from scipy import ndimage as ndi
from carve import proj,P as LP
import tmpl
PHI=25.0
def stick2d(v):
    p,lab,fg=v['p'],v['lab'],v['fg'];sh=(p==136)&fg
    if sh.sum()<4:return None
    ys,xs=np.nonzero(sh);pts=np.stack([xs+0.5,ys+0.5],1);best=(0,0,None)
    for i in range(len(pts)):                      # the straight line that holds the most shaft pixels
        for j in range(i+1,len(pts)):
            u=pts[j]-pts[i];L=np.linalg.norm(u)
            if L<3:continue
            u=u/L;off=np.abs((pts-pts[i])@np.array([-u[1],u[0]]));inl=off<0.75;t=(pts[inl]-pts[i])@u
            sc=(inl.sum(),t.max()-t.min())
            if sc>best[:2]:best=(sc[0],sc[1],(pts[i],u,inl))
    c,u,inl=best[2];t=(pts[inl]-c)@u;ends=[c+u*t.min(),c+u*t.max()]
    # blade / tape = black stick pixels plus shaft-coloured pixels off the line
    by,bx=np.nonzero((lab==LP['stick'])&(p==0)&fg);bp=np.concatenate([np.stack([bx+0.5,by+0.5],1),pts[~inl]]) if len(by) or (~inl).any() else np.zeros((0,2))
    cnt=[(np.linalg.norm(bp-e,axis=1)<6.5).sum() if len(bp) else 0 for e in ends]
    if max(cnt)==0:
        e=int(ends[1][1]>ends[0][1]);return dict(heel=ends[e],butt=ends[1-e],toe=None)
    e=int(np.argmax(cnt));heel=ends[e];q=bp[np.linalg.norm(bp-heel,axis=1)<6.5];toe=q[np.argmax(np.linalg.norm(q-heel,axis=1))]
    q2=bp[np.linalg.norm(bp-ends[1-e],axis=1)<3.5]
    if len(q2):                                   # butt-end tape continues the shaft
        tt=(q2-c)@u;ends[1-e]=c+u*(tt.max() if e==0 else tt.min())
    return dict(heel=heel,butt=ends[1-e],toe=toe)
def lift(sxy,w,d):
    th=np.deg2rad(45*d);ph=np.deg2rad(PHI);sx,sy=sxy
    return np.array([sx*np.cos(th)-w*np.sin(th),-(sy+w*np.sin(ph))/np.cos(ph),sx*np.sin(th)+w*np.cos(th)])
def depth(P3,d):
    th=np.deg2rad(45*d);return -P3[0]*np.sin(th)+P3[2]*np.cos(th)
def to_ice(sxy,d,Y):
    ph=np.deg2rad(PHI);return lift(sxy,-(Y*np.cos(ph)+sxy[1])/np.sin(ph),d)
def stick3d(x,v,d,off):
    s=stick2d(v)
    if s is None:return None
    J,p=tmpl.joints(np.asarray(x));a=v['a']+np.asarray(off,float);S={k:(None if q is None else q-a) for k,q in s.items()}
    def pr(P3):
        sx,sy,_=proj(P3[0],P3[1],P3[2],d,PHI);return np.array([sx,sy])
    h,b=S['heel'],S['butt'];ax=b-h;L2=np.linalg.norm(ax);best=None
    for g in ('R glove','L glove'):
        q=pr(J[g]);t=np.clip((q-h)@ax/L2**2,0,1);dist=np.linalg.norm(q-(h+t*ax))
        if best is None or dist<best[0]:best=(dist,g,t)
    _,g,t=best;A=lift(h+t*ax,depth(J[g],d),d);ice=min(J['R ankle'][1],J['L ankle'][1])-2.2
    H=to_ice(h,d,ice+0.3);len3=np.linalg.norm(H-A)/max(t,0.15) if t>0.05 else 99;onice=(h[1]>(h+t*ax)[1]+2) and 14<len3<32
    if not onice:H=lift(h,depth(J[g],d),d)
    B=H+(A-H)/max(t,1e-3) if t>0.05 else lift(b,depth(J[g],d),d)
    if S['toe'] is None:T=H+np.array([0,0,3.0])
    else:T=to_ice(S['toe'],d,ice+0.3) if onice else lift(S['toe'],depth(H,d),d)
    if np.linalg.norm(T-H)>5:T=H+(T-H)/np.linalg.norm(T-H)*5
    return dict(heel=H.tolist(),butt=B.tolist(),toe=T.tolist(),hand=g,onice=bool(onice),len=float(np.linalg.norm(B-H)))
