"""Clean texture for the NHL 96 PC model. The fitted mesh gives the shape and says which body part a surface point is on;
the colour then comes from simple jersey rules whose few numbers are measured from the sprites:
straight rings along each sleeve and sock, straight hem bands, a smooth yoke line, a centred pant stripe, and the crest / number as texel grids."""
import numpy as np,pickle,sys
from PIL import Image
from scipy.optimize import minimize
import carve96 as C,err96
from poly96 import *
from samp96 import load,samples,depth_render,unproject
from num96 import NUM,CREST,with_number
SLEEVE=[1,5,9,13,17,21,25];SLEEVE_SET={1,36,4,5,8,9,12,13,16,17,20,21,24,25};LEG=[35,3,7,11,15,19,23];HEM=[34,2,6,10,14,18,22]
TORSO_SET={34,2,6,10,14,18,22,40,45,26,27,31,32,46};PANTS_SET={28,29,30};MERGE={36:1,4:5,8:9,12:13,16:17,20:21,24:25,32:26}
def zone_of(idx):
    idx=np.asarray(idx);z=np.where(idx<148,idx>>2,np.where(np.isin(idx,CREST),40,np.where(np.isin(idx,NUM),45,np.where(idx>=166,42,37+(idx-148)//3))));z=np.where(idx==3,0,z)
    return np.vectorize(lambda a:MERGE.get(int(a),int(a)))(z)
def idx_of(z):
    z=np.asarray(z);return np.where(z==0,3,np.where(z==42,170,np.where(z==37,150,np.where(z==38,153,np.where(z==39,156,z*4+3)))))
def splits(t,z,order,want_err=False):
    """ordered boundaries along t (decreasing) between ring zones: the monotone labelling that misfiles the fewest samples (dynamic programme)"""
    o=np.argsort(-t);t=t[o];z=z[o];K=len(order);N=len(t);mis=(z[:,None]!=np.array(order)[None,:]).astype(np.int32);dp=np.zeros((N,K),np.int32);bk=np.zeros((N,K),np.int8)
    dp[0]=mis[0]+np.where(np.arange(K)>0,10**6,0)*0
    for i in range(1,N):
        stay=dp[i-1];move=np.r_[10**9,np.minimum.accumulate(dp[i-1])[:-1]];bk[i]=move<stay;dp[i]=np.minimum(stay,move)+mis[i]
    k=int(np.argmin(dp[-1]));err=int(dp[-1,k]);lab=np.zeros(N,int)
    for i in range(N-1,-1,-1):
        lab[i]=k
        if i and bk[i,k]:k=int(np.argmin(dp[i-1,:k]))
    b=[]
    for c in range(1,K):
        hi=t[lab<c];lo=t[lab>=c];b.append((hi.min()+lo.max())/2 if len(hi) and len(lo) else (t.max()+1 if not len(hi) else t.min()-1))
    b=np.minimum.accumulate(np.array(b,float));return (b,err) if want_err else b
def ring(t,b,order):return np.array(order)[np.searchsorted(-b,-t,side='right')]
def _yb(c,a):return c[0]+c[1]*np.cos(a)+c[2]*np.cos(2*a)
class Clean:
    def __init__(s,D,fit,S):
        s.D=D;s.fit=fit;Vt,F=D['verts'],D['faces'];fit.score(Vt);s.fz=zone_of(fit.rep[np.clip(fit.fl,0,None)]);s.fz[fit.fl<0]=38
        n=np.cross(Vt[F[:,1]]-Vt[F[:,0]],Vt[F[:,2]]-Vt[F[:,0]]);n/=np.linalg.norm(n,axis=1,keepdims=True)+1e-9;cen=Vt[F].mean(1)
        if (n*(cen-Vt.mean(0))).sum(1).mean()<0:n=-n
        s.nrm=n;p=S['p'];z=zone_of(S['idx']);fz=s.fz[S['face']];s.par={}
        # sleeves and legs: own axis per side, rings cut along it
        for nm,zs,order in (('sleeve',SLEEVE_SET,SLEEVE),('leg',set(LEG),LEG)):
            for sg in (-1,1):
                m=np.isin(fz,list(zs))&(np.sign(p[:,0])==sg)&np.isin(z,order);q=p[m];c=q.mean(0);B3=np.linalg.svd(q-c)[2];u0=B3[0] if B3[0,1]>0 else -B3[0];best=None
                for a in np.arange(-0.8,0.81,0.2):          # the rings need not be square to the limb: search the tilt that files the most samples correctly
                    for b_ in np.arange(-0.8,0.81,0.2):
                        u=u0+a*B3[1]+b_*B3[2];u/=np.linalg.norm(u);bb,e=splits((q-c)@u,z[m],order,True)
                        if best is None or e<best[0]:best=(e,u,bb)
                print(nm,sg,'misfiled',best[0],'of',int(m.sum()));s.par[(nm,sg)]=(c,best[1],best[2])
        mt=np.isin(fz,list(TORSO_SET));q=p[mt];zt=z[mt];s.tc=np.array([np.median(q[:,0]),0,np.median(q[:,2])])
        mh=np.isin(zt,HEM);best=None
        for kx in np.arange(-0.3,0.31,0.1):
            for kz in np.arange(-0.6,0.61,0.1):
                b,e=splits(q[mh,1]+kx*(q[mh,0]-s.tc[0])+kz*(q[mh,2]-s.tc[2]),zt[mh],HEM,True)
                if best is None or e<best[0]:best=(e,kx,kz,b)
        s.hemk=(best[1],best[2]);s.hem=best[3];print('hem tilt',s.hemk,'misfiled',best[0],'of',int(mh.sum()))
        # yoke line: height as a smooth function of the angle round the body
        az=np.arctan2(q[:,0]-s.tc[0],q[:,2]-s.tc[2]);yk=np.isin(zt,[26,27,31]);bd=np.isin(zt,[34,40,45])&(q[:,1]>40)
        yb=_yb
        cost=lambda c:((q[yk,1]<yb(c,az[yk])).sum()+(q[bd,1]>=yb(c,az[bd])).sum())
        best=min((minimize(cost,[y0,c1,0.0],method='Nelder-Mead',options=dict(xatol=.05,fatol=.5)) for y0 in (44,45,46,47) for c1 in (-1,0,1)),key=lambda r:r.fun);s.yoke=best.x;s.yb=yb
        d=yb(s.yoke,az)-q[:,1];t27=d[(zt==27)];s.trim=float(np.clip(np.percentile(t27,80),0.6,2.0)) if len(t27)>5 else 1.0
        m31=zt==31;s.collar=float(np.percentile(q[m31,1],15)) if m31.sum()>5 else 1e9
        # crest and number: texel grids placed by a straight-line fit from (x, y) to (column, row)
        s.grid={}
        for nm,T,front in (('crest',CREST,True),('num',NUM,False)):
            m=np.isin(S['idx'],T)&mt
            if m.sum()<12:continue
            rc=np.array([np.argwhere(T==i)[0] for i in S['idx'][m]])+0.5
            cc=np.linalg.lstsq(np.c_[p[m,0],p[m,2],np.ones(m.sum())],rc[:,1],rcond=None)[0];rr=np.linalg.lstsq(np.c_[p[m,1],np.ones(m.sum())],rc[:,0],rcond=None)[0]
            s.grid[nm]=(T,front,cc,rr)
        # pant stripe: centred band on the outer side of each leg
        mp=np.isin(fz,list(PANTS_SET));qp=p[mp];zp=z[mp];out=(s.nrm[S['face'][mp],0]*np.sign(qp[:,0]))>0.35
        def pc(c):
            lab=np.where(out&(np.abs(qp[:,2]-c[0])<abs(c[1])),30,np.where(out&(np.abs(qp[:,2]-c[0])<abs(c[1])+abs(c[2])),29,28));return (lab!=zp).sum()
        s.pant=min((minimize(pc,[0,w,w2],method='Nelder-Mead',options=dict(xatol=.05,fatol=.5)) for w in (0.5,1,1.5) for w2 in (0.5,1,1.5)),key=lambda r:r.fun).x
    def label(s,p,face):
        fz=s.fz[face];out=fz.copy()
        for (nm,sg),(c,u,b) in s.par.items():
            zs=SLEEVE_SET if nm=='sleeve' else set(LEG);m=np.isin(fz,list(zs))&(np.sign(p[:,0])==sg)
            out[m]=ring((p[m]-c)@u,b,SLEEVE if nm=='sleeve' else LEG)
        m=np.isin(fz,list(TORSO_SET));q=p[m];lab=ring(q[:,1]+s.hemk[0]*(q[:,0]-s.tc[0])+s.hemk[1]*(q[:,2]-s.tc[2]),s.hem,HEM);az=np.arctan2(q[:,0]-s.tc[0],q[:,2]-s.tc[2]);d=s.yb(s.yoke,az)-q[:,1]
        lab=np.where(d<=0,26,np.where((d<s.trim)&(lab==34),27,lab));lab=np.where((q[:,1]>s.collar)&(s.nrm[face[m],2]>0.2),31,lab);idx=idx_of(lab)
        for nm,(T,front,cc,rr) in s.grid.items():
            cf=cc[0]*q[:,0]+cc[1]*q[:,2]+cc[2];row=np.floor(rr[0]*q[:,1]+rr[1]).astype(int);col=np.floor(cf).astype(int)
            side=(s.nrm[face[m],2]>0) if front else (s.nrm[face[m],2]<0)
            ok=side&(col>=0)&(col<T.shape[1])&(row>=0)&(row<T.shape[0])&np.isin(lab,[34,26,27,31])
            if nm=='num':ok&=~((row%2==1)&(col%2==1))      # on rows 1 and 3 the model has number texels only in columns 0, 2, 4, 6; plain jersey shows between them
            idx[ok]=T[row[ok],col[ok]]
        res=idx_of(out);res[m]=idx
        m=np.isin(fz,list(PANTS_SET));q=p[m];o=(s.nrm[face[m],0]*np.sign(q[:,0]))>0.35;c=s.pant
        res[m]=idx_of(np.where(o&(np.abs(q[:,2]-c[0])<abs(c[1])),30,np.where(o&(np.abs(q[:,2]-c[0])<abs(c[1])+abs(c[2])),29,28)));return res
    def render(s,cam=None,W=None,H=None,n=None):
        fit=s.fit;fid,zo=depth_render(fit,s.D['verts'],cam,W,H,n);n=fit.n if n is None else n;cam=fit.cam if cam is None else cam;out=np.full((n,MH,MW),255,np.uint8)
        for d in range(n):
            ys,xs=np.nonzero(fid[d]>=0);p=unproject(cam[d],xs,ys,zo[d,ys,xs]);out[d,ys,xs]=s.label(p,fid[d,ys,xs])
        return out
    def sheet(s,pal,fn,sc=4):
        R=s.render();fit=s.fit;rows=[[],[],[]];p2=pal.copy();p2[255]=(40,90,60);per=[]
        for d,v in enumerate(fit.V):
            pd=fit.pad;im=R[d,pd:pd+v['h'],pd:pd+v['w']];sp=FL[v['p']];stick=np.isin(v['p'],err96.STK);body=(sp!=255)&~stick;miss=body&(im==255);extra=(im!=255)&(v['p']==255)
            wrong=body&(im!=255)&(pal[im].astype(int)!=pal[sp].astype(int)).any(-1);per.append((int(body.sum()),int(miss.sum()),int(extra.sum()),int(wrong.sum())))
            def tile(a,fill):
                t=np.empty((72,64)+a.shape[2:],a.dtype);t[:]=fill;t[:min(72,a.shape[0]),:min(64,a.shape[1])]=a[:72,:64];return t
            df=np.zeros(sp.shape+(3,),np.uint8);df[:]=(25,25,25);df[body]=(90,90,90);df[miss|extra|wrong]=(255,40,40)
            rows[0].append(p2[tile(sp,255)]);rows[1].append(p2[tile(im,255)]);rows[2].append(tile(df,(25,25,25)))
        Image.fromarray(np.kron(np.concatenate([np.concatenate(r,1) for r in rows],0),np.ones((sc,sc,1),np.uint8))).save(fn)
        for d,(b,m,x,w) in enumerate(per):print(d,'body',b,'miss',m,'extra',x,'wrong colour',w,'total %.1f%%'%(100*(m+x+w)/b))
        t=sum(m+x+w for b,m,x,w in per);print('clean texture: mean wrong pixels per frame %.1f of %.0f (%.1f%%)'%(t/8,np.mean([q[0] for q in per]),100*t/sum(q[0] for q in per)));return per
    def novel(s,pal,fn,yaws,pitch,sc=5,size=(64,76),anchor=(32,68)):
        n=len(yaws);cam=np.array([[np.cos(np.deg2rad(y)),np.sin(np.deg2rad(y)),np.cos(np.deg2rad(pitch)),np.sin(np.deg2rad(pitch)),anchor[0],anchor[1]] for y in yaws])
        R=s.render(cam,np.full(n,size[0],np.int32),np.full(n,size[1],np.int32),n);p2=pal.copy();p2[255]=(40,90,60);return [np.kron(p2[R[k,:size[1],:size[0]]],np.ones((sc,sc,1),np.uint8)) for k in range(n)]
if __name__=='__main__':
    D,fit=load(sys.argv[1]);S=samples(D,fit);cl=Clean(D,fit,S);pal=with_number(pals()['!bfh'],88,fg=np.array([12,0,174]));out=sys.argv[2]
    print('hem',cl.hem.round(1),'yoke',cl.yoke.round(2),'trim',cl.trim,'collar',cl.collar,'pant',cl.pant.round(2),{k:(v[2].round(2),v[3].round(2)) for k,v in cl.grid.items()})
    for k,(c,u,b) in cl.par.items():print(k,b.round(1))
    cl.sheet(pal,out+'.png');Image.fromarray(np.concatenate([np.concatenate(cl.novel(pal,None,(22.5,67.5,112.5,157.5,202.5,247.5,292.5,337.5),p),1) for p in (D['phi'],40)],0)).save(out+'_novel.png')
    pickle.dump(cl,open(out+'.pkl','wb'))
