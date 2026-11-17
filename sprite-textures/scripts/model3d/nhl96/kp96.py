"""Pose solver from landmarks. Helmet, gloves, skates, knee pads and pants have their own palette colours, so each can be found in
3D: a point in space belongs to a landmark if it falls on that colour in several of the 8 views. The joint angles are then solved so
the model's own helmet, gloves, skates, knees and pants sit on those points (no rendering), and only after that refined on pixels."""
import numpy as np,sys,pickle,time
from scipy.optimize import least_squares
from scipy import ndimage
from rigparts96 import *
CLASSES={'helmet':lambda p:(p>=132)&(p<=135),'black':lambda p:(p>=151)&(p<=153),'knee':lambda p:(p>>2==35)&(p<148),'pants':lambda p:(p>>2==28)&(p<148),'sock':lambda p:(p>>2==23)&(p<148),'yoke':lambda p:(p>>2==26)&(p<148),'crest':lambda p:np.isin(p,CREST),'num':lambda p:np.isin(p,NUM),'shoulder':lambda p:((p>>2==1)|(p>>2==36))&(p<148)&(p>=4),'forearm':lambda p:((p>>2==25)|(p>>2==24))&(p<148)}
def landmarks(pf,step=1.0):
    fit=pf.fit;g=np.arange(-30,30.01,step);gy=np.arange(-2,66.01,step);X,Y,Z=[a.ravel() for a in np.meshgrid(g,gy,g,indexing='ij')];sil=np.zeros(len(X),int);cnt={k:np.zeros(len(X),int) for k in CLASSES}
    for d,v in enumerate(fit.V):
        c,s,cp,sp_,xo,yo=fit.cam[d];sx=X*c+Z*s;w=-X*s+Z*c;sy=-(Y*cp+w*sp_);px=np.floor(sx+xo).astype(int)-fit.pad;py=np.floor(sy+yo).astype(int)-fit.pad;ok=(px>=0)&(px<v['w'])&(py>=0)&(py<v['h'])
        pix=np.full(len(X),255);pix[ok]=v['p'][py[ok],px[ok]];sil+=pix!=255
        for k,fn in CLASSES.items():cnt[k]+=fn(pix)&(pix!=255)
    hull=sil>=7;P=np.c_[X,Y,Z];out={}
    def blobs(m,k):
        """the k biggest connected lumps of a set of grid points: centre of each"""
        vol=np.zeros((len(g),len(gy),len(g)),bool);vol.ravel()[np.nonzero(m)[0]]=True;lab,n=ndimage.label(ndimage.binary_dilation(vol));lab[~vol]=0
        if n==0:return []
        sz=ndimage.sum(vol,lab,range(1,n+1));order=np.argsort(-sz)[:k];return [P[(lab.ravel()==o+1)].mean(0) for o in order if sz[o]>=3]
    out['head']=blobs(hull&(cnt['helmet']>=3),1);bl=hull&(cnt['black']>=3);out['skates']=blobs(bl&(Y<11),2);out['gloves']=blobs(bl&(Y>=13),2)
    out['knees']=blobs(hull&(cnt['knee']>=3),2);out['pelvis']=blobs(hull&(cnt['pants']>=3),1);out['socks']=blobs(hull&(cnt['sock']>=2),2)
    out['yoke']=blobs(hull&(cnt['yoke']>=3),1);out['crest']=blobs(hull&(cnt['crest']>=2),1);out['num']=blobs(hull&(cnt['num']>=2),1);out['shoulders']=blobs(hull&(cnt['shoulder']>=2),2);out['forearms']=blobs(hull&(cnt['forearm']>=2),2);return out
def model_points(rig):
    """the same landmarks on the model at rest, with the rigid part each one rides on"""
    cl=rig.cl;V,F=rig.V0,rig.F;c=V[F].mean(1);fp=rig.vp[F[:,0]];side=lambda sg:np.sign(c[:,0]-cl.tc[0])==sg;m={}
    m['head']=(1,c[cl.fixed==-2].mean(0));m['pelvis']=(0,c[(cl.fz==28)&(fp==0)].mean(0))
    for sg,(fo,sh) in ((-1,(3,7)),(1,(5,9))):
        m['glove%+d'%sg]=(fo,c[(fp==fo)&(cl.fixed==BLACK)].mean(0));m['skate%+d'%sg]=(sh,c[(fp==sh)&(cl.fixed==BLACK)].mean(0));m['knee%+d'%sg]=(sh,c[(cl.fz==35)&side(sg)].mean(0));m['sock%+d'%sg]=(sh,c[(cl.fz==23)&side(sg)].mean(0))
    lab=zone_of(cl.label(c,np.arange(len(F))))
    for nm,z in (('yoke',26),('crest',40),('num',45)):
        if (lab==z).sum()>3:m[nm]=(10,c[lab==z].mean(0))
    for sg,(up,fo) in ((-1,(2,3)),(1,(4,5))):
        if ((lab==1)&(fp==up)).sum()>3:m['shoulder%+d'%sg]=(up,c[(lab==1)&(fp==up)].mean(0))
        if ((lab==25)&(fp==fo)).sum()>3:m['forearm%+d'%sg]=(fo,c[(lab==25)&(fp==fo)].mean(0))
    return m
def part_xf(rig,q):
    R=[None]*NP;T=[None]*NP
    for k in ORDER:
        r=rodrigues(q[3+3*k:6+3*k])
        if k==0:R[0]=r;T[0]=rig.J[0]+q[:3]-r@rig.J[0]
        else:p=PARENT[k];R[k]=R[p]@r;T[k]=R[p]@rig.J[k]+T[p]-R[k]@rig.J[k]
    return R,T
PART_OF={'head':1,'pelvis':0,'glove-1':3,'glove+1':5,'skate-1':7,'skate+1':9,'knee-1':7,'knee+1':9,'sock-1':7,'sock+1':9,'yoke':10,'crest':10,'num':10,'shoulder-1':2,'shoulder+1':4,'forearm-1':3,'forearm+1':5}
def standing_points(pf8):
    """the model's landmark points = the landmarks measured on the standing sprites (the rest pose), so both sides are measured the same way"""
    tg=assign(landmarks(pf8))[0];return {n:(PART_OF[n],p) for n,p in tg.items()}
def solve(rig,targets,q0=None,reg=0.3,mp=None):
    mp=mp if mp is not None else model_points(rig);names=[n for n in targets if n in mp]
    def res(q):
        R,T=part_xf(rig,q);r=[(R[mp[n][0]]@mp[n][1]+T[mp[n][0]]-targets[n]) for n in names];return np.r_[np.concatenate(r),reg*q[3:]]
    best=None
    for seed in range(6):
        q=np.zeros(NQ) if q0 is None else q0.copy()
        if seed:q[3:]+=np.random.default_rng(seed).normal(0,0.4,NQ-3)
        r=least_squares(res,q,max_nfev=300)
        if best is None or r.cost<0.7*best.cost:best=r
    return best.x,np.sqrt((res(best.x)[:3*len(names)]**2).reshape(-1,3).sum(1))
def assign(lm):
    """left / right: every pairing of the two gloves, skates, knees is a candidate; the caller keeps the one that scores best on pixels"""
    base={}
    if lm['head']:base['head']=lm['head'][0]
    if lm['pelvis']:base['pelvis']=lm['pelvis'][0]
    for k in ('yoke','crest','num'):
        if lm[k]:base[k]=lm[k][0]
    if len(lm['shoulders'])==2:
        b=sorted(lm['shoulders'],key=lambda p:p[0]);base['shoulder-1'],base['shoulder+1']=b
    opts=[base]
    for key,nm in (('skates','skate'),('gloves','glove'),('knees','knee'),('socks','sock')):
        b=lm[key]
        if len(b)<2:
            continue
        b=sorted(b,key=lambda p:p[0]);new=[]
        for o in opts:
            new.append(dict(o,**{nm+'-1':b[0],nm+'+1':b[1]}))
            if nm in ('glove',):new.append(dict(o,**{nm+'-1':b[1],nm+'+1':b[0]}))
        opts=new
    if len(lm['forearms'])==2:
        for o in opts:
            if 'glove-1' in o:
                f=lm['forearms'];i=int(np.linalg.norm(f[1]-o['glove-1'])+np.linalg.norm(f[0]-o['glove+1'])<np.linalg.norm(f[0]-o['glove-1'])+np.linalg.norm(f[1]-o['glove+1']));o['forearm-1'],o['forearm+1']=f[i],f[1-i]
    return opts
def fit_kp(pf,secs=120,log=True,mp=None):
    rig=pf.rig;lm=landmarks(pf);best=None
    if log:print({k:len(v) for k,v in lm.items()})
    for tg in assign(lm):
        q,dist=solve(rig,tg,mp=mp);x=np.zeros(NX);x[:NQ]=q;e=pf.err(x)
        if log:print('landmark solve: wrong',e,'mean landmark distance %.1f'%dist.mean(),flush=True)
        if best is None or e<best[1]:best=(x,e)
    x,e0=best;x,e=fit_pose(pf,x,secs/2,log=False);x,e=arm_search(pf,x);x,e=fit_pose(pf,x,secs/2,seed=1,log=False);return x,e,e0
if __name__=='__main__':
    D,cl,rig,th=make(sys.argv[1],sys.argv[2]);pal=with_number(pals()['!bfh'],88,fg=np.array([12,0,174]));yaw=[p[2] for p in D['P']];out=sys.argv[3];res={}
    mp=standing_points(PoseFit(rig,D['V'],D['phi'],yaw,pal));print('model landmarks',sorted(mp))
    for i0 in [int(a) for a in sys.argv[4:]]:
        pf=PoseFit(rig,D['V'] if i0==8 else C.views(i0),D['phi'],yaw,pal);x,e,e0=fit_kp(pf,mp=mp);res[i0]=x;print('pose',i0,'landmarks only %.1f%%, after pixel refinement %.1f%%'%(100*e0/pf.nb,100*e/pf.nb),flush=True);sheet(pf,x,pal,'%s_%d.png'%(out,i0),D['rules']['light']);pickle.dump(res,open(out+'.pkl','wb'))
