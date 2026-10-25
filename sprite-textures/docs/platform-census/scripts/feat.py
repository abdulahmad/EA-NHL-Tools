import pickle,numpy as np,sys
sys.path.insert(0,'/workspace/preview_v2/platform_unique');sys.path.insert(0,'/workspace/EA-NHL-Tools/sprite-textures/scripts')
from PIL import Image
import os;_c=os.getcwd();os.chdir('/workspace/preview_v2/platform_unique');import vis;os.chdir(_c)
A,_=pickle.load(open('all.pkl','rb'))
G=32
def lum(p):p=p.astype(float);return 0.299*p[:,0]+0.587*p[:,1]+0.114*p[:,2]
LC=lum(vis.g94b);LP=lum(vis.tpal)
def bands(t,a):
    L=(LP if t=='PC' else LC)[np.where(a<256,a,0)]
    return 1+(L>70).astype(int)+(L>160)
def grid(b):
    h,w=b.shape;s=max(h,w);c=np.zeros((s,s),int);c[s-h:,(s-w)//2:(s-w)//2+w]=b
    return np.array(Image.fromarray(c.astype(np.uint8)).resize((G,G),Image.NEAREST))
K=[];V=[];Vm=[];HW=[];N=[]
for t,d in A.items():
    tr=255 if t=='PC' else 0;sh={82,88,99} if t=='PC' else {47}
    for n,a in sorted(d.items()):
        m=(a!=tr)&~np.isin(a,list(sh))
        npx=int(m.sum())
        if npx<4:continue
        ys,xs=np.nonzero(m);sl=(slice(ys.min(),ys.max()+1),slice(xs.min(),xs.max()+1))
        b=np.where(m,bands(t,a),0)[sl];g=grid(b)
        K.append((t,n));HW.append(b.shape);N.append(npx)
        V.append(np.stack([(g>0)]+[g==k for k in (1,2,3)]).reshape(4,-1));Vm.append(np.stack([(g>0)]+[g==k for k in (1,2,3)])[:,:,::-1].reshape(4,-1))
V=np.array(V,np.float32);Vm=np.array(Vm,np.float32)
pickle.dump(dict(K=K,V=V,Vm=Vm,HW=np.array(HW),N=np.array(N)),open('feat.pkl','wb'))
from collections import Counter;print(Counter(k[0] for k in K),V.shape)
