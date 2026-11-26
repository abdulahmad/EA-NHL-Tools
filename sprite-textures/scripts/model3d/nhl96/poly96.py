"""Low-poly recovery for NHL 96 PC: a mesh of flat faces, one palette zone per face, vertices moved until the 8 views match the sprites.
Score = wrong pixels over the 8 views (missed body pixel, pixel outside the sprite, or pixel whose zone differs from its face's zone)."""
import numpy as np,sys,pickle,ctypes,time,os
from PIL import Image
from scipy import ndimage
from skimage import measure
import fast_simplification
import carve96 as C,err96
from hull96 import FL,pals
from num96 import NUM,CREST,with_number
MW=MH=96;L=ctypes.CDLL(os.path.join(os.path.dirname(os.path.abspath(__file__)),'rast.so'));dp=ctypes.POINTER(ctypes.c_double);ip=ctypes.POINTER(ctypes.c_int);sp=ctypes.POINTER(ctypes.c_short)
L.score.restype=ctypes.c_int
ZC=FL.copy();ZC[CREST.ravel()]=160;ZC[NUM.ravel()]=182          # crest and number areas are one zone each for the shape fit
def classes():
    u=np.unique(ZC);u=u[u!=255];cid=np.full(256,-1);cid[u]=np.arange(len(u));return cid,u
class Fit:
    def __init__(s,V,phi,yaw,pad=8):
        s.V=V;s.n=len(V);s.pad=pad;s.cid,s.rep=classes();s.K=len(s.rep);s.W=np.array([v['w']+2*pad for v in V],np.int32);s.H=np.array([v['h']+2*pad for v in V],np.int32)
        s.lab=np.full((s.n,MH,MW),-1,np.int16);s.cam=np.zeros((s.n,6))
        for d,v in enumerate(V):
            l=s.cid[ZC[v['p']]].astype(np.int16);l[np.isin(v['p'],err96.STK)]=-2;s.lab[d,pad:pad+v['h'],pad:pad+v['w']]=l
            th=np.deg2rad(45*d+yaw[d]);ph=np.deg2rad(phi);s.cam[d]=[np.cos(th),np.sin(th),np.cos(ph),np.sin(ph),v['xo']+pad,v['yo']+pad]
        s.body=int((s.lab>=0).sum())
    def bind(s,F):
        s.F=np.ascontiguousarray(F,np.int32);s.nf=len(F);s.votes=np.zeros(s.nf*s.K,np.int32);s.fl=np.zeros(s.nf,np.int32);s.parts=np.zeros(3,np.int32);s.fid=np.zeros((s.n,MH,MW),np.int32)
    def score(s,Vt,fid=False,cam=None,W=None,H=None,lab=None,n=None):
        cam=s.cam if cam is None else cam
        return L.score(Vt.ctypes.data_as(dp),s.F.ctypes.data_as(ip),s.nf,s.n if n is None else n,cam.ctypes.data_as(dp),(s.W if W is None else W).ctypes.data_as(ip),(s.H if H is None else H).ctypes.data_as(ip),
                       (s.lab if lab is None else lab).ctypes.data_as(sp),s.K,s.fl.ctypes.data_as(ip),s.votes.ctypes.data_as(ip),s.fid.ctypes.data_as(ip) if fid else None,s.parts.ctypes.data_as(ip))
def init_mesh(occ,G,nf):
    f=ndimage.gaussian_filter(np.pad(occ,3).astype(np.float32),1.0);v,fc,_,_=measure.marching_cubes(f,0.45);v=(v-3)*0.5+np.array([G[0].min(),G[1].min(),G[2].min()])
    v2,f2=fast_simplification.simplify(v.astype(np.float32),fc.astype(np.int32),target_count=nf);return np.ascontiguousarray(v2,np.float64),np.ascontiguousarray(f2,np.int32)
def neighbours(nv,F):
    nb=[set() for _ in range(nv)]
    for a,b,c in F:nb[a]|={b,c};nb[b]|={a,c};nb[c]|={a,b}
    return [np.array(sorted(x)) for x in nb]
def climb(fit,Vt,F,iters,lam=0.15,sig=0.6,seed=0,log=None):
    rng=np.random.default_rng(seed);nb=neighbours(len(Vt),F);Vt=Vt.copy();err=fit.score(Vt)
    def lap(i):
        t=0.0
        for j in [i,*nb[i]]:
            if len(nb[j]):t+=((Vt[j]-Vt[nb[j]].mean(0))**2).sum()
        return t
    t0=time.time();acc=0
    for it in range(iters):
        i=rng.integers(len(Vt));old=Vt[i].copy();l0=lap(i);Vt[i]=old+rng.normal(0,sig*(0.3+0.7*rng.random()),3);l1=lap(i);e=fit.score(Vt)
        if e+lam*l1<=err+lam*l0:err=e;acc+=1
        else:Vt[i]=old
        if it%20000==0:print(it,err,fit.parts.tolist() if False else '',acc,'%.0fs'%(time.time()-t0),flush=True)
    return Vt,err
def sheet(fit,Vt,pal,fn,sc=4):
    e=fit.score(Vt,fid=True);rows=[[],[],[]];p2=pal.copy();p2[255]=(40,90,60);tot=[0,0,0];per=[]
    for d,v in enumerate(fit.V):
        pd=fit.pad;fid=fit.fid[d,pd:pd+v['h'],pd:pd+v['w']];im=np.where(fid>=0,fit.rep[np.clip(fit.fl[np.clip(fid,0,None)],0,None)],255).astype(np.uint8);im[(fid>=0)&(fit.fl[np.clip(fid,0,None)]<0)]=0
        spz=ZC[v['p']];stick=np.isin(v['p'],err96.STK);body=(spz!=255)&~stick;miss=body&(im==255);extra=(im!=255)&(v['p']==255);wrong=body&(im!=255)&(pal[im].astype(int)!=pal[spz].astype(int)).any(-1)
        per.append((int(body.sum()),int(miss.sum()),int(extra.sum()),int(wrong.sum())))
        def tile(a,fill=255):
            t=np.full((72,64),fill,a.dtype);t[:min(72,a.shape[0]),:min(64,a.shape[1])]=a[:72,:64];return t
        df=np.zeros(v['p'].shape+(3,),np.uint8);df[:]=(25,25,25);df[body]=(90,90,90);df[miss|extra|wrong]=(255,40,40);t3=np.zeros((72,64,3),np.uint8);t3[:]=(25,25,25);t3[:min(72,df.shape[0]),:min(64,df.shape[1])]=df[:72,:64]
        rows[0].append(p2[tile(FL[v['p']])]);rows[1].append(p2[tile(im)]);rows[2].append(t3)
    Image.fromarray(np.kron(np.concatenate([np.concatenate(r,1) for r in rows],0),np.ones((sc,sc,1),np.uint8))).save(fn)
    for d,(b,m,x,w) in enumerate(per):print(d,'body',b,'miss',m,'extra',x,'wrong colour',w,'total %.1f%%'%(100*(m+x+w)/b))
    t=sum(m+x+w for b,m,x,w in per);print('zone score',e,'| colour: mean wrong pixels per frame %.1f of %.0f (%.1f%%)'%(t/8,np.mean([p[0] for p in per]),100*t/sum(p[0] for p in per)));return per
def novel(fit,Vt,pal,fn,phi,yaws=(22.5,67.5,112.5,157.5,202.5,247.5,292.5,337.5),pitches=None,sc=5,size=(64,76),anchor=(32,68)):
    fit.score(Vt);fl=fit.fl.copy();rows=[]
    for p in (pitches or (phi,40)):
        cam=np.array([[np.cos(np.deg2rad(y)),np.sin(np.deg2rad(y)),np.cos(np.deg2rad(p)),np.sin(np.deg2rad(p)),anchor[0],anchor[1]] for y in yaws]);n=len(yaws)
        W=np.full(n,size[0],np.int32);H=np.full(n,size[1],np.int32);lab=np.full((n,MH,MW),-2,np.int16);fid=np.zeros((n,MH,MW),np.int32);old=fit.fid;fit.fid=fid;fit.score(Vt,fid=True,cam=cam,W=W,H=H,lab=lab,n=n);fit.fid=old
        ims=[]
        for k in range(n):
            f=fid[k,:size[1],:size[0]];im=np.where(f>=0,fit.rep[np.clip(fl[np.clip(f,0,None)],0,None)],255);ims.append(np.where((im==255)[...,None],np.array([40,90,60]),pal[im]).astype(np.uint8))
        rows.append(np.concatenate(ims,1))
    Image.fromarray(np.kron(np.concatenate(rows,0),np.ones((sc,sc,1),np.uint8))).save(fn)
if __name__=='__main__':
    D=pickle.load(open(sys.argv[1],'rb'));out=sys.argv[2];nf=int(sys.argv[3]);iters=int(sys.argv[4]);V,phi,P=D['V'],D['phi'],D['P']
    for d in range(8):C.YAW[d]=P[d][2]
    G=C.grid(0.5);occ=C.carve(V,phi,1,G,need=8);lab,n=ndimage.label(occ);sz=ndimage.sum(occ,lab,range(1,n+1));occ=lab==(1+int(np.argmax(sz)))
    fit=Fit(V,phi,[p[2] for p in P]);Vt,F=init_mesh(occ,G,nf);fit.bind(F);pal=pals()['!bfh'];print('verts',len(Vt),'faces',len(F),'body px',fit.body,'start',fit.score(Vt))
    sheet(fit,Vt,pal,out+'_start.png');Vt,err=climb(fit,Vt,F,iters);sheet(fit,Vt,pal,out+'.png');novel(fit,Vt,pal,out+'_novel.png',phi)
    fit.score(Vt);pickle.dump(dict(V=V,phi=phi,P=P,verts=Vt,faces=F,facelab=fit.fl.copy(),rep=fit.rep),open(out+'.pkl','wb'))
