"""2x supersampling test: render the clean model at 4 sub-pixel positions per pixel, then reduce to one pixel by a coverage rule and a colour rule."""
import numpy as np,sys,pickle
from PIL import Image
from clean96 import *
def setup(path):
    D,fit=load(path);S=samples(D,fit);cl=Clean(D,fit,S)
    for k,v in D.get('rules',{}).items():setattr(cl,k,v)
    return D,fit,cl
def subrenders(cl,offs):
    fit=cl.fit;out=[]
    for dx,dy in offs:
        cam=fit.cam.copy();cam[:,4]-=dx;cam[:,5]-=dy;out.append(cl.render(cam,fit.W,fit.H,fit.n))     # sample at pixel centre + (dx,dy)
    return np.stack(out)                       # (samples, views, MH, MW)
def reduce(R,pal,k,rule='mode'):
    cov=(R!=255);n=cov.sum(0);out=np.full(R.shape[1:],255,np.uint8);on=n>=k
    if rule=='first':
        pick=np.argmax(cov,0);v=np.take_along_axis(R,pick[None],0)[0]
    else:
        # commonest colour among covered samples (by RGB), ties to the first sample
        key=(pal[R].astype(int)*np.array([1,256,65536])).sum(-1);key[~cov]=-1;best=np.zeros(R.shape[1:],int);bc=np.zeros(R.shape[1:],int)
        for i in range(len(R)):
            c=((key==key[i])&cov[i]).sum(0);up=c>bc;best[up]=i;bc[up]=c[up]
        v=np.take_along_axis(R,best[None],0)[0]
    out[on]=v[on];return out
def score(fit,R,pal):
    t=[0,0,0];b=0
    for d,v in enumerate(fit.V):
        pd=fit.pad;im=R[d,pd:pd+v['h'],pd:pd+v['w']];sp=FL[v['p']];body=(sp!=255)&~np.isin(v['p'],err96.STK);t[0]+=int((body&(im==255)).sum());t[1]+=int(((im!=255)&(v['p']==255)).sum())
        t[2]+=int((body&(im!=255)&(pal[im].astype(int)!=pal[sp].astype(int)).any(-1)).sum());b+=int(body.sum())
    return t,b
if __name__=='__main__':
    D,fit,cl=setup(sys.argv[1]);pal=with_number(pals()['!bfh'],88,fg=np.array([12,0,174]))
    R1=subrenders(cl,[(0,0)]);t,b=score(fit,R1[0],pal);print('1 sample at pixel centre: miss %d extra %d colour %d  = %.1f%%'%(*t,100*sum(t)/b))
    R4=subrenders(cl,[(-.25,-.25),(.25,-.25),(-.25,.25),(.25,.25)])
    for k in (1,2,3,4):
        t,b=score(fit,reduce(R4,pal,k),pal);print('2x2 samples, pixel on when >=%d of 4 covered: miss %d extra %d colour %d  = %.1f%%'%(k,*t,100*sum(t)/b))
    R9=subrenders(cl,[(a,b_) for a in (-1/3,0,1/3) for b_ in (-1/3,0,1/3)])
    for k in (3,4,5,6):
        t,b=score(fit,reduce(R9,pal,k),pal);print('3x3 samples, pixel on when >=%d of 9 covered: miss %d extra %d colour %d  = %.1f%%'%(k,*t,100*sum(t)/b))
    pickle.dump(dict(R4=R4),open('ss8.pkl','wb'))
