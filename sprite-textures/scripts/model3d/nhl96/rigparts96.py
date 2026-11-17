"""Rig on the modelled parts: every solid belongs to one rigid part (head, upper arm, forearm + glove, pelvis, thigh, shin + skate,
chest), joints sit where the limb capsules meet (shoulder, elbow, hip, knee, neck, waist). Used to fit joint angles to other poses,
and to tune the part sizes on several poses at once while one pose is kept back as the check."""
import numpy as np,sys,pickle,time
from parts96 import *
SOLID_PART=[1,1, 2,3,3,3,3, 4,5,5,5,5, 7,7,7, 9,9,9, 0, 6,8]
class Rig2:
    def __init__(s,cl,pt,old,th):
        s.cl=cl;s.pt=pt;s.F=pt.F;nb=len(pt.body_v);bp=np.zeros((nb,NP));kf=old.fp[pt.keep]
        for k in range(3):np.add.at(bp,(pt.body_f[:,k],kf),1.0)
        s.vp=[np.where(bp.sum(1)>0,bp.argmax(1),10)]
        for (v,f,c),p in zip([t[:3] for t in pt.solids(th)],SOLID_PART):s.vp.append(np.full(len(v),p))
        s.vp=np.concatenate(s.vp);s.W=np.eye(NP)[s.vp];s.touch=s.W>0;s.set(th)
    def set(s,th):
        pt=s.pt;s.V0=refresh(s.cl,pt,th);J=np.zeros((NP,3));h=pt.get(th,'head');J[1]=[h[0],h[1]-h[4],h[2]];pv=pt.get(th,'pelvis');J[0]=pv[:3];J[10]=[pv[0],pv[1]+0.6*pv[4],pv[2]]
        for sg,(u,f,t,k) in ((-1,(2,3,6,7)),(1,(4,5,8,9))):
            A=pt.get(th,'arm%+d'%sg);T=pt.get(th,'thigh%+d'%sg);J[u]=A[0:3];J[f]=A[3:6];J[t]=T[0:3];J[k]=T[3:6]
        s.J=J
    pose=Rig.pose
def make(path,ptfile):
    D,cl,old=setup_rig(path);st=pickle.load(open(ptfile,'rb'));pt=attach(cl,old)
    for k,v in st.get('rules',{}).items():setattr(cl,k,v)
    return D,cl,Rig2(cl,pt,old,st['th']),st['th']
def fit_one(pf,secs,x=None,seed=0):
    if x is None:
        st=coarse(pf);cands=[fit_pose(pf,r[1],secs/6,log=False) for r in st[:3]];cands.sort(key=lambda r:r[1]);x=cands[0][0]
    for r in range(2):
        x,e=arm_search(pf,x);x,e=fit_pose(pf,x,secs/4,seed=seed+r,log=False)
    return x,e
if __name__=='__main__':
    D,cl,rig,th=make(sys.argv[1],sys.argv[2]);pal=with_number(pals()['!bfh'],88,fg=np.array([12,0,174]));yaw=[p[2] for p in D['P']];out=sys.argv[3];secs=float(sys.argv[4]);res={}
    print('faces per part',dict(zip(PARTS,np.bincount(rig.vp,minlength=NP))))
    for i0 in [int(a) for a in sys.argv[5:]]:
        pf=PoseFit(rig,D['V'] if i0==8 else C.views(i0),D['phi'],yaw,pal);x,e=fit_one(pf,secs) if i0!=8 else (np.zeros(NX),pf.err(np.zeros(NX)));res[i0]=x;print('pose',i0,'wrong',e,flush=True);sheet(pf,x,pal,'%s_%d.png'%(out,i0),D['rules']['light'])
        pickle.dump(res,open(out+'.pkl','wb'))
