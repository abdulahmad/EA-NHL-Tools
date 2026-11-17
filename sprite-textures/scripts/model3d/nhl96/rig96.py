"""Rig for the clean NHL 96 PC model: the standing-pose mesh is cut into 10 rigid parts with joints, and only the joint angles are
fitted to another pose's 8 sprites. Shape, texture rules and light stay exactly as fitted on the standing pose, so the score on the
new pose is a held-out test of the model."""
import numpy as np,sys,pickle,os,time,ctypes,imageio
from PIL import Image
from clean96 import *
import carve96 as C,shade96
from final96 import Sym,shade_idx
PARTS=['pelvis','head','upper arm L','forearm L','upper arm R','forearm R','thigh L','shin L','thigh R','shin R','chest'];PARENT=[-1,10,10,2,10,4,0,6,0,8,0];NP=len(PARTS);ORDER=[0,10,1,2,3,4,5,6,7,8,9];NQ=3+3*NP;NX=NQ+16
def rodrigues(r):
    a=np.linalg.norm(r)
    if a<1e-9:return np.eye(3)
    k=r/a;K=np.array([[0,-k[2],k[1]],[k[2],0,-k[0]],[-k[1],k[0],0]]);return np.eye(3)+np.sin(a)*K+(1-np.cos(a))*K@K
def face_parts(cl):
    Vt,F=cl.D['verts'],cl.D['faces'];c=Vt[F].mean(1);fz=cl.fz;side=(c[:,0]-cl.tc[0]>0).astype(int);part=np.full(len(F),10);part[np.isin(fz,[28,29,30])]=0
    part[np.isin(fz,[33,42,0])&(c[:,1]>47)]=1
    up=np.isin(fz,[1,5,9]);fo=np.isin(fz,[13,17,21,25])|(np.isin(fz,[38])&(c[:,1]>=26)&(np.abs(c[:,0]-cl.tc[0])>5));part[up]=2+2*side[up];part[fo]=3+2*side[fo]
    th=np.isin(fz,[28,29,30])&(c[:,1]<27.5);sh=np.isin(fz,LEG)|(np.isin(fz,[38,39])&(c[:,1]<10));part[th]=6+2*side[th];part[sh]=7+2*side[sh];return part
class Rig:
    def __init__(s,cl):
        s.cl=cl;Vt,F=cl.D['verts'],cl.D['faces'];s.V0=Vt.copy();s.F=F;s.fp=face_parts(cl);nv=len(Vt);W=np.zeros((nv,NP))
        for k in range(3):np.add.at(W,(F[:,k],s.fp),1.0)
        s.touch=W>0;W/=W.sum(1,keepdims=True);nb=neighbours(nv,F)
        for _ in range(2):W=0.5*W+0.5*np.array([W[n].mean(0) if len(n) else W[i] for i,n in enumerate(nb)])
        s.W=W/W.sum(1,keepdims=True);s.J=np.zeros((NP,3))
        for k in range(1,NP):
            m=s.touch[:,k]&s.touch[:,PARENT[k]]
            if m.sum()<3:m=s.touch[:,k]
            s.J[k]=Vt[m].mean(0)
        s.J[0]=Vt[s.touch[:,0]].mean(0)
    def pose(s,q):
        """q: 3 root translation + 10 x 3 rotation vectors (root first). Returns posed vertices."""
        R=[None]*NP;T=[None]*NP
        for k in ORDER:
            r=rodrigues(q[3+3*k:6+3*k])
            if k==0:R[0]=r;T[0]=s.J[0]+q[:3]-r@s.J[0]
            else:p=PARENT[k];R[k]=R[p]@r;T[k]=R[p]@s.J[k]+T[p]-R[k]@s.J[k]
        out=np.zeros_like(s.V0)
        for k in range(NP):out+=s.W[:,k:k+1]*(s.V0@R[k].T+T[k])
        return out
class PoseFit:
    """Wrong pixels of the posed model, coloured by the standing pose's texture rules, against one pose's 8 sprites."""
    def __init__(s,rig,V,phi,yaw,pal):
        s.rig=rig;cl=rig.cl;s.cl=cl;s.fit=Fit(V,phi,yaw);s.fit.bind(rig.F);fit=s.fit;n=fit.n;s.pal=pal.astype(int);s.tgt=np.zeros((n,MH,MW,3),int);s.body=np.zeros((n,MH,MW),bool);s.empty=np.zeros((n,MH,MW),bool)
        for d,v in enumerate(V):
            pd=fit.pad;sp=FL[v['p']];st=np.isin(v['p'],err96.STK);sl=(d,slice(pd,pd+v['h']),slice(pd,pd+v['w']));s.tgt[sl]=pal[sp];s.body[sl]=(sp!=255)&~st;s.empty[sl]=(v['p']==255)
        for d in range(n):                   # outside the sprite window counts as empty
            e=np.ones((MH,MW),bool);v=V[d];e[fit.pad:fit.pad+v['h'],fit.pad:fit.pad+v['w']]=s.empty[d,fit.pad:fit.pad+v['h'],fit.pad:fit.pad+v['w']];e[fit.H[d]:,:]=False;e[:,fit.W[d]:]=False;s.empty[d]=e
        s.zo=np.zeros((n,MH,MW));s.fid=np.full((n,MH,MW),-1,np.int32);L.set_zout.argtypes=[ctypes.c_void_p];s.cam0=fit.cam.copy();s.nb=int(s.body.sum())
    def raster(s,Vp,cam=None,W=None,H=None,n=None):
        fit=s.fit;n=fit.n if n is None else n;zo=s.zo if cam is None else np.zeros((n,MH,MW));fid=s.fid if cam is None else np.full((n,MH,MW),-1,np.int32);L.set_zout(zo.ctypes.data);old=fit.fid;fit.fid=fid
        lab=np.full((n,MH,MW),-2,np.int16) if cam is not None else None;fit.score(np.ascontiguousarray(Vp),fid=True,cam=cam,W=W,H=H,lab=lab,n=n);fit.fid=old;L.set_zout(None);return fid,zo
    def restpts(s,Vp,cam,fid,zo,d,ys,xs):
        """posed surface point under each pixel, carried back to the standing pose through its triangle"""
        c=cam[d];sx=xs+0.5-c[:,4];sy=ys+0.5-c[:,5];zz=zo[d,ys,xs];Y=-sy*c[:,2]-zz*c[:,3];w=-sy*c[:,3]+zz*c[:,2];p=np.stack([sx*c[:,0]-w*c[:,1],Y,sx*c[:,1]+w*c[:,0]],1)
        f=fid[d,ys,xs];T=Vp[s.rig.F[f]];a=T[:,0];e1=T[:,1]-a;e2=T[:,2]-a;v=p-a;d11=(e1*e1).sum(1);d12=(e1*e2).sum(1);d22=(e2*e2).sum(1);b1=(v*e1).sum(1);b2=(v*e2).sum(1);det=d11*d22-d12*d12+1e-12
        u=(d22*b1-d12*b2)/det;w2=(d11*b2-d12*b1)/det;R=s.rig.V0[s.rig.F[f]];return R[:,0]+u[:,None]*(R[:,1]-R[:,0])+w2[:,None]*(R[:,2]-R[:,0]),f
    def setcam(s,x):
        s.fit.cam[:]=s.cam0;s.fit.cam[:,4]+=x[NQ:NQ+8];s.fit.cam[:,5]+=x[NQ+8:NQ+16]
    def err(s,x):
        s.setcam(x);Vp=s.rig.pose(x[:NQ]);fid,zo=s.raster(Vp);cov=fid>=0;e=int((s.body&~cov).sum())+int((s.empty&cov).sum());d,ys,xs=np.nonzero(cov&s.body)
        p,f=s.restpts(Vp,s.fit.cam,fid,zo,d,ys,xs);return e+int((s.pal[s.cl.label(p,f)]!=s.tgt[d,ys,xs]).any(-1).sum())
    def images(s,x,light=None,ns=None):
        s.setcam(x);Vp=s.rig.pose(x[:NQ]);fid,zo=s.raster(Vp);out=np.full(fid.shape,255,np.uint8);d,ys,xs=np.nonzero(fid>=0);p,f=s.restpts(Vp,s.fit.cam,fid,zo,d,ys,xs);idx=s.cl.label(p,f)
        if light is not None:idx=shade_idx(idx,posed_normals(s.rig,Vp,ns)[f],light)
        out[d,ys,xs]=idx;return out
def posed_normals(rig,Vp,iters=1):
    F=rig.F;n=np.cross(Vp[F[:,1]]-Vp[F[:,0]],Vp[F[:,2]]-Vp[F[:,0]]);ar=np.linalg.norm(n,axis=1,keepdims=True)+1e-9;n/=ar;n0=rig.cl.nrm
    V0=rig.V0;r=np.cross(V0[F[:,1]]-V0[F[:,0]],V0[F[:,2]]-V0[F[:,0]]);r/=np.linalg.norm(r,axis=1,keepdims=True)+1e-9;n*=np.sign((r*n0).sum(1,keepdims=True))
    for _ in range(iters):
        vn=np.zeros_like(Vp)
        for k in range(3):np.add.at(vn,F[:,k],n*ar)
        vn/=np.linalg.norm(vn,axis=1,keepdims=True)+1e-9;n=vn[F].mean(1);n/=np.linalg.norm(n,axis=1,keepdims=True)+1e-9
    return n
STEP=np.r_[[0.5]*3,[0.06]*(3*NP),[0.5]*16]
def fit_pose(pf,x=None,secs=240,seed=0,log=True):
    rng=np.random.default_rng(seed);x=np.zeros(NX) if x is None else x.copy();best=pf.err(x);t0=time.time()
    if log:print('pose fit start',best,flush=True)
    while time.time()-t0<secs:
        imp=False
        for scale in (2.0,1.0,0.5,0.25):
            for i in rng.permutation(NX):
                for sg in (1,-1):
                    while True:
                        old=x[i];x[i]=old+sg*STEP[i]*scale;e=pf.err(x)
                        if e<best:best=e;imp=True
                        else:x[i]=old;break
        if log:print('sweep',best,'%.0fs'%(time.time()-t0),flush=True)
        # random moves of one joint (all 3 angles), or of the whole body position, at mixed sizes
        for _ in range(1200):
            y=x.copy();k=rng.integers(-1,NP);sc=rng.choice([0.5,1,2,4,8])
            if k<0:y[:3]+=rng.normal(0,0.5,3)*sc
            else:y[3+3*k:6+3*k]+=rng.normal(0,0.06,3)*sc
            if rng.random()<0.3:
                k2=rng.integers(0,NP);y[3+3*k2:6+3*k2]+=rng.normal(0,0.06,3)*sc
            e=pf.err(y)
            if e<best:best=e;x=y
        if log:print('random',best,'%.0fs'%(time.time()-t0),flush=True)
    return x,best
def coarse(pf):
    """try a grid of whole-body bends (pelvis pitch, waist bend, hip and knee bend) and keep the best few as starts"""
    res=[]
    for pp in (0,0.3,0.6):
        for wb in (0,0.3,0.6):
            for hb in (0,-0.5,-1.0):
                for kb in (0,0.5,1.0):
                    x=np.zeros(NX);x[3]=pp;x[3+30]=wb
                    for k in (6,8):x[3+3*k]=hb-pp
                    for k in (7,9):x[3+3*k]=kb
                    # put the lowest point back on the ice and the body over the feet
                    V=pf.rig.pose(x[:NQ]);x[1]=-V[:,1].min();x[2]=-(V[pf.rig.touch[:,7]|pf.rig.touch[:,9],2].mean()-pf.rig.V0[pf.rig.touch[:,7]|pf.rig.touch[:,9],2].mean())
                    res.append((pf.err(x),x))
    res.sort(key=lambda r:r[0]);return res
def sheet(pf,x,pal,fn,light=None,sc=4):
    R=pf.images(x);Rs=pf.images(x,light,1) if light is not None else None;fit=pf.fit;rows=[[],[],[],[]];p2=pal.copy();p2[255]=(40,90,60);per=[]
    TW,TH=96,72
    for d,v in enumerate(fit.V):
        pd=fit.pad;im=R[d,pd:pd+v['h'],pd:pd+v['w']];sp=FL[v['p']];stick=np.isin(v['p'],err96.STK);body=(sp!=255)&~stick;miss=body&(im==255);extra=(im!=255)&(v['p']==255)
        wrong=body&(im!=255)&(pal[im].astype(int)!=pal[sp].astype(int)).any(-1);per.append((int(body.sum()),int(miss.sum()),int(extra.sum()),int(wrong.sum())))
        def tile(a,fill):
            t=np.empty((TH,TW)+a.shape[2:],a.dtype);t[:]=fill;t[:min(TH,a.shape[0]),:min(TW,a.shape[1])]=a[:TH,:TW];return t
        df=np.zeros(sp.shape+(3,),np.uint8);df[:]=(25,25,25);df[body]=(90,90,90);df[miss|extra|wrong]=(255,40,40)
        rows[0].append(p2[tile(v['p'],255)]);rows[1].append(p2[tile((Rs if Rs is not None else R)[d,pd:pd+v['h'],pd:pd+v['w']],255)]);rows[2].append(p2[tile(im,255)]);rows[3].append(tile(df,(25,25,25)))
    Image.fromarray(np.kron(np.concatenate([np.concatenate(r,1) for r in rows],0),np.ones((sc,sc,1),np.uint8))).save(fn)
    t=sum(m+x_+w for b,m,x_,w in per);B=sum(q[0] for q in per);print('pose: mean wrong pixels per frame %.1f of %.0f (%.1f%%)  miss %d extra %d wrong colour %d'%(t/8,B/8,100*t/B,sum(q[1] for q in per),sum(q[2] for q in per),sum(q[3] for q in per)));return 100*t/B
def setup_rig(path):
    D,fit=load(path);S=samples(D,fit);cl=Sym(D,fit,S)
    for k,v in D['rules'].items():setattr(cl,k,v)
    return D,cl,Rig(cl)
if __name__=='__main__':
    D,cl,rig=setup_rig(sys.argv[1]);i0=int(sys.argv[2]);out=sys.argv[3];secs=float(sys.argv[4]);pal=with_number(pals()['!bfh'],88,fg=np.array([12,0,174]))
    print('faces per part',dict(zip(PARTS,np.bincount(rig.fp,minlength=NP))));print('joints',rig.J.round(1).tolist())
    V=C.views(i0);pf=PoseFit(rig,V,D['phi'],[p[2] for p in D['P']],pal);st=coarse(pf);print('coarse best',[r[0] for r in st[:5]]);cands=[fit_pose(pf,r[1],secs/6,log=False) for r in st[:3]];cands.sort(key=lambda r:r[1]);print('after short fits',[c[1] for c in cands]);x,e=fit_pose(pf,cands[0][0],secs/2,seed=1);pickle.dump(dict(x=x,i0=i0,err=e),open(out+'.pkl','wb'));sheet(pf,x,pal,out+'.png',D['rules'].get('light'))
    print('pose numbers',x[:3].round(2),(np.rad2deg(x[3:NQ]).reshape(NP,3)).round(0).tolist(),'anchors',x[NQ:].round(2))
def arm_search(pf,x):
    """the descent rarely finds an arm that has to swing a long way, so try every arm position on a coarse grid (shoulder 3 angles, elbow bend)"""
    best=pf.err(x)
    for up,fo in ((2,3),(4,5)):
        for ax in np.deg2rad(np.arange(-120,61,20)):
            for ay in np.deg2rad([-40,0,40]):
                for az in np.deg2rad([-40,-20,0,20,40]):
                    for el in np.deg2rad([-100,-75,-50,-25,0]):
                        y=x.copy();y[3+3*up:6+3*up]=(ax,ay,az);y[3+3*fo:6+3*fo]=(el,0,0);e=pf.err(y)
                        if e<best:best=e;x=y
    return x,best
