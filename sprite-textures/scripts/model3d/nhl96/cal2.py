"""Camera calibration on the outline misses: per-view offset and yaw, shared pitch. Fewer missed body pixels after an all-views carve = better."""
import numpy as np,sys,pickle
import carve96 as C, align96, err96
def inside(v,G,d,phi,xo,yo,yaw,pitch=None):
    X,Y,Z=G;th=np.deg2rad(45*d+yaw);ph=np.deg2rad(phi if pitch is None else pitch);sx=X*np.cos(th)+Z*np.sin(th);w=-X*np.sin(th)+Z*np.cos(th);sy=-(Y*np.cos(ph)+w*np.sin(ph))
    px=np.floor(sx+xo).astype(np.int32);py=np.floor(sy+yo).astype(np.int32);ok=(px>=0)&(px<v['w'])&(py>=0)&(py<v['h']);m=v['p']!=255
    ins=np.zeros(X.shape,bool);ins[ok]=m[py[ok],px[ok]];return ins,px,py,ok
def misses(V,G,P,phi,IN=None):
    IN=IN or [inside(v,G,d,phi,*P[d]) for d,v in enumerate(V)];occ=np.logical_and.reduce([i[0] for i in IN]);tot=0
    for d,v in enumerate(V):
        _,px,py,ok=IN[d];o=occ&ok;cov=np.zeros((v['h'],v['w']),bool);cov[py[o],px[o]]=True;tot+=int(((v['p']!=255)&~np.isin(v['p'],err96.STK)&~cov).sum())
    return tot,IN
def calibrate(V,phi,G,P=None,rounds=2,steps=((1,0,0),(-1,0,0),(0,1,0),(0,-1,0),(.5,0,0),(-.5,0,0),(0,.5,0),(0,-.5,0),(0,0,3),(0,0,-3))):
    P=P or [[v['xo'],v['yo'],0.0] for v in V];best,IN=misses(V,G,P,phi)
    for r in range(rounds):
        for d,v in enumerate(V):
            imp=True
            while imp:
                imp=False
                for st in steps:
                    q=[P[d][0]+st[0],P[d][1]+st[1],P[d][2]+st[2]];IN2=list(IN);IN2[d]=inside(v,G,d,phi,*q);e,_=misses(V,G,P,phi,IN2)
                    if e<best:best=e;P[d]=q;IN=IN2;imp=True
        print('phi',phi,'round',r,'misses',best,flush=True)
    return P,best
if __name__=='__main__':
    i0=int(sys.argv[1]);G=C.grid(0.5);V=C.views(i0);res={}
    for phi in [float(a) for a in sys.argv[2:]]:
        P,b=calibrate(V,phi,G);res[phi]=(P,b);print(phi,b,np.round(np.array(P)-np.array([[v['xo'],v['yo'],0] for v in V]),1).tolist())
    pickle.dump(res,open('cal_%d.pkl'%i0,'wb'))
