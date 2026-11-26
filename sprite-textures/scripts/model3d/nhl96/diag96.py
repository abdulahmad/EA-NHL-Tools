import numpy as np,pickle,sys
from parts96 import *
from collections import Counter
def conf(cl,pal):
    R=cl.render();C_=Counter()
    for d,v in enumerate(cl.fit.V):
        pd=cl.fit.pad;im=R[d,pd:pd+v['h'],pd:pd+v['w']];sp=FL[v['p']];st=np.isin(v['p'],err96.STK)
        nm=lambda a:np.where(a==255,'none',np.where(a==HELMET,'helmet',np.where((a>=166)&(a<=173),'skin',np.where((a>=148)&(a<=153),'black',np.where((a>=154)&(a<=156),'blade',np.where(a==3,'eye','jersey/other'))))))
        a,b=nm(sp),nm(im);bad=~st&((sp!=255)|(im!=255))&((sp==255)|(im==255)|(pal[im].astype(int)!=pal[sp].astype(int)).any(-1))
        for x,y in zip(a[bad],b[bad]):C_[(x,y)]+=1
    return C_
if __name__=='__main__':
    D,cl,rig=setup_rig('sy8.pkl');pal=with_number(pals()['!bfh'],88,fg=np.array([12,0,174]));A=conf(cl,pal)
    pt=attach(cl,rig);refresh(cl,pt,pickle.load(open(sys.argv[1],'rb'))['th']);B=conf(cl,pal)
    for k in sorted(set(A)|set(B),key=lambda k:-(B[k]-A[k])):
        if k[0]!='jersey/other' or k[1]!='jersey/other':print('sprite %-13s model %-13s before %4d after %4d'%(k[0],k[1],A[k],B[k]))
def overlay(cl,pal,fn,sc=7):
    R=cl.render();p2=pal.copy();p2[255]=(40,90,60);tiles=[]
    for d,v in enumerate(cl.fit.V):
        pd=cl.fit.pad;im=R[d,pd:pd+v['h'],pd:pd+v['w']];sp=FL[v['p']];t=np.full((60,46),255,np.uint8);t2=t.copy();t[:min(60,sp.shape[0]),:min(46,sp.shape[1])]=sp[:60,:46];t2[:min(60,im.shape[0]),:min(46,im.shape[1])]=im[:60,:46]
        tiles.append(np.concatenate([p2[t],p2[t2]],0))
    Image.fromarray(np.kron(np.concatenate(tiles,1),np.ones((sc,sc,1),np.uint8))).save(fn)
