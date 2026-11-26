"""Helmet + face, gloves and skates for the clean NHL 96 PC model, built as clean shapes (not carved) and fitted to the sprites.
Each part is a few simple solids with a handful of numbers (position, size, direction). The numbers are tuned on the wrong-pixel
count against the 8 standing sprites; the shapes themselves stay what they are: a helmet, a glove, a skate."""
import numpy as np,sys,pickle,os,time,imageio,trimesh
from PIL import Image
from rig96 import *
from shape96 import Shape
import hires96
HELMET,SKIN,EYE,BLACK,WHITE=33*4+3,170,3,153,156
def ico(n):m=trimesh.creation.icosphere(subdivisions=n);return np.array(m.vertices),np.array(m.faces)
def sbox(n,e=0.45):
    """rounded box with half size 1: a sphere pushed toward a cube"""
    v,f=ico(n);return np.sign(v)*np.abs(v)**e,f
def tube(sections=14,rings=3):
    """open-ended cylinder along +y from 0 to 1, radius 1, with end caps"""
    m=trimesh.creation.cylinder(radius=1,height=1,sections=sections);v=np.array(m.vertices)[:,[0,2,1]];v[:,1]+=0.5;return v,np.array(m.faces)[:,::-1]
def frame(a,hint):
    a=a/np.linalg.norm(a);e2=hint-a*(hint@a);e2/=np.linalg.norm(e2);e1=np.cross(e2,a);return e1,e2,a
class Parts:
    def __init__(s,cl,rig):
        V,F=cl.D['verts'],cl.D['faces'];c=V[F].mean(1);fz=cl.fz;s.th0=[];s.step=[];s.lo=[];s.hi=[];s.names=[]
        def add(nm,vals,steps,lo=None,hi=None):
            s.names.append((nm,len(s.th0),len(vals)));s.th0+=list(vals);s.step+=list(steps);s.lo+=list(lo if lo is not None else [-1e9]*len(vals));s.hi+=list(hi if hi is not None else [1e9]*len(vals))
        hm=rig.fp==1;hc=c[hm].mean(0);add('head',[hc[0],hc[1]+0.3,hc[2]-0.3,3.0,4.1,3.6,0.25,0.22,-0.5,0.0,-0.35,1.7,-0.4,3.6],[.25,.25,.25,.15,.15,.15,.05,.06,.08,.08,.08,.15,.2,.3],[-9,0,-9,2.6,3.6,3.0,-0.1,0.0,-0.8,-0.5,-0.6,1.3,-1.5,2],[9,99,9,3.6,4.8,4.2,0.6,0.5,-0.1,0.5,0.3,2.6,1.5,6])
        for sg in (-1,1):
            side=np.sign(c[:,0]-cl.tc[0])==sg;a0=c[(fz==1)&side].mean(0);a1=c[(fz==25)&side].mean(0);ax=(a1-a0)/np.linalg.norm(a1-a0);g=a1+ax*4.2
            add('glove%+d'%sg,[*g,ax[0],ax[2],1.0,1.0],[.25,.25,.25,.05,.05,.04,.04],[-99,-99,-99,-0.7,-0.7,0.85,0.8],[99,99,99,0.7,0.7,1.3,1.6])
        for sg in (-1,1):
            side=np.sign(c[:,0]-cl.tc[0])==sg;m=np.isin(fz,[38,39])&(c[:,1]<10)&side;q=V[np.unique(F[m])];u=np.linalg.svd((q-q.mean(0))[:,[0,2]])[2][0];u=u if u[1]>0 else -u
            an=c[(fz==23)&side].mean(0);add('skate%+d'%sg,[an[0],0.0,an[2],np.arctan2(u[0],u[1]),1.0,1.0,1.0,3.9,1.2],[.25,.2,.25,.06,.04,.06,.08,.2,.2],[-99,-1,-99,-1.5,0.85,0.7,0.4,2.8,0.2],[99,1.5,99,1.5,1.5,1.4,1.5,4.4,2.0])
        s.th0=np.array(s.th0,float);s.step=np.array(s.step);s.lo=np.array(s.lo);s.hi=np.array(s.hi)
        s.keep=~(hm|(np.isin(rig.fp,[3,5])&(fz==38))|(np.isin(rig.fp,[7,9])&np.isin(fz,[38,39])));s.body_v=V;s.body_f=F[s.keep];s.prim=[];s.build(s.th0,first=True)
    def get(s,th,nm):
        for n,i,k in s.names:
            if n==nm:return th[i:i+k]
    def solids(s,th):
        """list of (vertices, faces, colour index per face)"""
        out=[]
        # head: one egg; the helmet is the part of it pushed out a little, with a straight brim over the eyes, down over the ears and round the back
        cx,cy,cz,rx,ry,rz,pt,brim,back,hy,ear,nr,nz,nl=s.get(th,'head');n,f=ico(3);hel=(n[:,1]>brim)|((n[:,2]<0.15)&(n[:,1]>back))|((np.abs(n[:,0])>0.72)&(n[:,1]>ear)&(n[:,2]<0.55))
        R=np.array([[np.cos(hy),0,np.sin(hy)],[0,1,0],[-np.sin(hy),0,np.cos(hy)]])@np.array([[1,0,0],[0,np.cos(pt),-np.sin(pt)],[0,np.sin(pt),np.cos(pt)]]);v=(n*np.array([rx,ry,rz])*np.where(hel,1.09,1.0)[:,None])@R.T+np.array([cx,cy,cz])
        fc=n[f].mean(1);fh=hel[f].sum(1)>=2;col=np.where(fh,HELMET,SKIN);eye=(~fh)&(fc[:,2]>0.5)&(fc[:,1]>brim-0.24)&(fc[:,1]<brim-0.02)&(np.abs(fc[:,0])>0.2)&(np.abs(fc[:,0])<0.62);col[eye]=EYE;col[:]=-2;s.head=(np.array([cx,cy,cz]),R,np.array([rx,ry,rz]),brim,back,ear);out.append((v,f,col))
        tv,tf=tube();nv=tv*np.array([nr,nl,nr])+np.array([0,-nl,0]);out.append((nv@R.T+np.array([cx,cy,cz])+R@np.array([0,-ry*0.75,nz]),tf,np.full(len(tf),SKIN)))
        for sg in (-1,1):
            # glove: flared cuff, padded hand, thumb
            gx,gy,gz,ax,az,kw,kl=s.get(th,'glove%+d'%sg);k=np.array([kw,kl,kw]);a=np.array([ax,-np.sqrt(max(1e-6,1-ax*ax-az*az)),az]);e1,e2,a=frame(a,np.array([0,0.2,1.0]));M=np.stack([e1,a,e2],1);o=np.array([gx,gy,gz])
            tv,tf=tube();rad=(2.25-0.5*tv[:,1])[:,None];cv=np.c_[tv[:,0]*rad[:,0],tv[:,1]*2.8-3.3,tv[:,2]*rad[:,0]*0.85];out.append((o+(k*cv)@M.T,tf,np.full(len(tf),BLACK)))
            bv,bf=sbox(2);hv=bv*np.array([1.9,2.0,1.55])+np.array([0,1.2,0]);out.append((o+(k*hv)@M.T,bf,np.full(len(bf),BLACK)))
            iv,i_f=ico(1);th_=iv*np.array([0.75,1.3,0.8])+np.array([-sg*0.9,0.5,1.7]);out.append((o+(k*th_)@M.T,i_f,np.full(len(i_f),BLACK)))
        for sg in (-1,1):
            # skate: boot (foot + ankle shaft), white blade holder and blade underneath
            x,y,z,yaw,k,ksh,kbl,bl,bo=s.get(th,'skate%+d'%sg);bh=0.95*kbl;fw=np.array([np.sin(yaw),0,np.cos(yaw)]);sd=np.array([np.cos(yaw),0,-np.sin(yaw)]);M=np.stack([sd,np.array([0,1.0,0]),fw],1);o=np.array([x,y,z])
            bv,bf=sbox(2);t=(bv[:,2]+1)/2;fv=np.c_[bv[:,0]*1.45*(1-0.2*t),bv[:,1]*1.45*(1-0.25*t)+2*bh+1.25-0.3*t,bv[:,2]*3.4+1.3];out.append((o+k*fv@M.T,bf,np.full(len(bf),BLACK)))
            tv,tf=tube();rad=1.55+0.35*tv[:,1];sv=np.c_[tv[:,0]*rad,tv[:,1]*5.2*ksh+2*bh+1.7,tv[:,2]*rad-0.9+0.6*tv[:,1]];out.append((o+k*sv@M.T,tf,np.full(len(tf),BLACK)))
            bv,bf=sbox(1,0.3);lv=bv*np.array([0.28,bh,bl])+np.array([0,bh,bo]);out.append((o+k*lv@M.T,bf,np.full(len(bf),WHITE)))
        return out
    def build(s,th,first=False):
        S=s.solids(th);vs=[s.body_v];fs=[s.body_f];n=len(s.body_v)
        for v,f,c in S:vs.append(v);fs.append(f+n);n+=len(v)
        V=np.ascontiguousarray(np.concatenate(vs),np.float64)
        if first:s.F=np.ascontiguousarray(np.concatenate(fs),np.int32);s.fixed=np.r_[np.full(len(s.body_f),-1),np.concatenate([c for _,_,c in S])].astype(int)
        return V
def normals(V,F):
    n=np.cross(V[F[:,1]]-V[F[:,0]],V[F[:,2]]-V[F[:,0]]);return n/(np.linalg.norm(n,axis=1,keepdims=True)+1e-9)
class WithParts(Sym):
    def label(s,p,face):
        res=Sym.label(s,p,face);fx=s.fixed[face];res=np.where(fx>=0,fx,res);m=fx==-2
        if m.any():
            # head: helmet / face / eyes decided per point from where it sits on the head, so the helmet edge is a clean line
            c,R,r,brim,back,ear=s.head;n=((p[m]-c)@R)/r;n/=np.linalg.norm(n,axis=1,keepdims=True)+1e-9
            hel=(n[:,1]>brim)|((n[:,2]<0.15)&(n[:,1]>back))|((np.abs(n[:,0])>0.72)&(n[:,1]>ear)&(n[:,2]<0.55))
            eye=(~hel)&(n[:,2]>0.5)&(n[:,1]>brim-0.26)&(n[:,1]<brim-0.06)&(np.abs(n[:,0])>0.22)&(np.abs(n[:,0])<0.6);res[m]=np.where(hel,HELMET,np.where(eye,EYE,SKIN))
        return res
def shade_all(idx,n,co):
    lv=n@co[:3]+co[3];out=shade_idx(idx,n,co)
    for base in (151,154):
        m=(idx>=base)&(idx<base+3);out=np.where(m,base+np.clip(np.round(lv*2/3),0,2).astype(int),out)
    m=(idx>=166)&(idx<=173);return np.where(m,166+np.clip(np.round(lv*7/3),2,7).astype(int),out)
def pnormals(cl,ns,p,face):
    """normals for shading: smoothed face normals, except on the head where the exact normal of the egg is used (smooth helmet)"""
    n=ns[face].copy();m=cl.fixed[face]==-2
    if m.any():
        c,R,r=cl.head[:3];g=(((p[m]-c)@R)/r/r)@R.T;n[m]=g/(np.linalg.norm(g,axis=1,keepdims=True)+1e-9)
    return n
def attach(cl,rig):
    """swap the carved head, gloves and skates of the clean model for the modelled parts"""
    pt=Parts(cl,rig);V=pt.build(pt.th0);cl.__class__=WithParts;cl.fz=np.r_[cl.fz[pt.keep],np.full(len(pt.F)-pt.keep.sum(),38)];nb=cl.nrm[pt.keep];cl.fixed=pt.fixed;cl.head=pt.head;cl.fit.bind(pt.F);cl.D=dict(cl.D,verts=V,faces=pt.F)
    cl.nrm=np.r_[nb,normals(V,pt.F)[len(nb):]];cl.nbody=len(nb);return pt
def refresh(cl,pt,th):
    V=pt.build(th);cl.head=pt.head;cl.D['verts']=V;cl.nrm=np.r_[cl.nrm[:cl.nbody],normals(V,pt.F)[cl.nbody:]];return V
def tune(cl,pt,sh,th,rounds=3,log=True):
    th=th.copy();best=sh.err(refresh(cl,pt,th))
    if log:print('parts tune start',best,flush=True)
    for r in range(rounds):
        for scale in (1.0,0.5):
            for i in range(len(th)):
                for sg in (1,-1):
                    while True:
                        old=th[i];new=np.clip(old+sg*pt.step[i]*scale,pt.lo[i],pt.hi[i])
                        if new==old:break
                        th[i]=new;e=sh.err(refresh(cl,pt,th))
                        if e<best:best=e
                        else:th[i]=old;break
        rng=np.random.default_rng(r)
        for _ in range(1200):          # joint moves of one part's numbers, to get out of spots where single numbers are stuck
            n,i,k=pt.names[rng.integers(len(pt.names))];y=th.copy();y[i:i+k]=np.clip(y[i:i+k]+rng.normal(0,1,k)*pt.step[i:i+k]*rng.choice([0.5,1,2,3]),pt.lo[i:i+k],pt.hi[i:i+k]);e=sh.err(refresh(cl,pt,y))
            if e<best:best=e;th=y
        if log:print('parts tune round',r,best,flush=True)
    refresh(cl,pt,th);return th,best
def hires(cl,light,pal,yaws,pitch=13,sc=8,levels=5,size=(64,76)):
    V,F=cl.D['verts'],cl.D['faces'];big=np.linalg.norm(np.cross(V[F[:,1]]-V[F[:,0]],V[F[:,2]]-V[F[:,0]]),axis=1)>0.5;ns=shade96.smooth_normals(cl,1)
    P,fid=hires96.subdivide(V,F,levels);idx=shade_all(cl.label(P,fid),pnormals(cl,ns,P,fid),light);rgb=pal[idx].astype(np.uint8);return [hires96.render(P,rgb,y,pitch,sc=sc,size=size) for y in yaws]
if __name__=='__main__':
    D,cl,rig=setup_rig(sys.argv[1]);out=sys.argv[2];pal=with_number(pals()['!bfh'],88,fg=np.array([12,0,174]));sh=Shape(cl,pal);print('before parts',sh.err(D['verts']))
    pt=attach(cl,rig);sh=Shape(cl,pal);th=pt.th0;print('faces',len(pt.F),'with untuned parts',sh.err(cl.D['verts']))
    if len(sys.argv)>4:th=pickle.load(open(sys.argv[4],'rb'))['th']
    if len(sys.argv)>3:th,e=tune(cl,pt,sh,th,int(sys.argv[3]))
    for n,i,k in pt.names:print(n,th[i:i+k].round(2))
    pickle.dump(dict(th=th),open(out+'.pkl','wb'));cl.cache(pal);cl.sheet(pal,out+'.png');Image.fromarray(np.concatenate(hires(cl,D['rules']['light'],pal,(180,135,90,0)),1)).save(out+'_hi.png')
