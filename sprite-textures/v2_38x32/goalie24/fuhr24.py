# Fuhr Oilers texture v8 in the CURRENT goalie layout (23x32, same cells as goalie15/goalie_texture_v6_indexed.png), RGB.
# Abdul pt930u: mask = centre FRONT, back split onto the LEFT and RIGHT sides (cylindrical unwrap). D129.
#   blocker rows 0-6 x0-9   <- v7 blocker block (0,20,8,12) resized nearest to 10x7
#   mask    rows 0-7 x12-20 <- Abdul's reference art: front -> x14-18, back right half -> x12-13, back left half -> x19-20
#   pad     rows 9-22 x0-9  <- v7 padF_L (0,0,9,20) resized nearest to 10x14;  sock strip x10-12 = EDM home palette
#   catcher rows 23-31: front x11-21 <- v7 catcher (8,20,11,9) 1:1; back x0-10 has no Fuhr art -> EDM home palette
# Only cells that are drawn (not 255) in the current layout are filled; others are magenta (252,0,252).
# usage (from goalie12): python3 ../goalie24/fuhr24.py <mask_front.jpg> <mask_back.jpg>
import sys,os,collections,numpy as np;from PIL import Image
H=os.path.dirname(os.path.abspath(__file__));G=H+'/..'
sys.path.insert(0,G+'/goalie17')
from g17inspect import TEAMS,spal
L=np.array(Image.open(G+'/goalie15/goalie_texture_v6_indexed.png')).astype(int)
V7=np.asarray(Image.open(G+'/goalie7/fuhr_oilers_texture_v7.png').convert('RGB')).astype(int)
t=[t for t in TEAMS if t[0]=='edm_home'][0];SP=spal(t[1],t[2])
MAG=np.array([252,0,252])
def rs(a,w,h):return a[(np.arange(h)*a.shape[0])//h][:,(np.arange(w)*a.shape[1])//w]
def art(fn,w,h):   # mode colour (16-level quantised) of each cell block of the non-black bbox
    a=np.asarray(Image.open(fn).convert('RGB')).astype(int);m=a.max(2)>40;ys,xs=np.nonzero(m);a=a[ys.min():ys.max()+1,xs.min():xs.max()+1]
    o=np.zeros((h,w,3),int);Y=np.linspace(0,a.shape[0],h+1).astype(int);X=np.linspace(0,a.shape[1],w+1).astype(int)
    for i in range(h):
        for j in range(w):
            b=a[Y[i]:Y[i+1],X[j]:X[j+1]].reshape(-1,3)//16;c=collections.Counter(map(tuple,b)).most_common(1)[0][0];o[i,j]=np.array(c)*16+8
    return o
def build(front,back):
    T=np.zeros((32,23,3),int);T[:]=MAG
    def put(y0,x0,a):
        for i in range(a.shape[0]):
            for j in range(a.shape[1]):
                if L[y0+i,x0+j]!=255:T[y0+i,x0+j]=a[i,j]
    put(0,0,rs(V7[20:32,0:8],10,7))
    put(0,14,art(front,5,8));B=art(back,4,8);put(0,12,B[:,2:4]);put(0,19,B[:,0:2])
    put(9,0,rs(V7[0:20,0:9],10,14))
    for y in range(9,23):
        for x in range(10,13):
            if L[y,x]!=255:T[y,x]=SP[L[y,x]]
    put(23,11,V7[20:29,8:19])
    for y in range(23,32):
        for x in range(0,11):
            if L[y,x]!=255:T[y,x]=SP[L[y,x]]
    return T
if __name__=='__main__':
    T=build(sys.argv[1],sys.argv[2]);Image.fromarray(T.astype(np.uint8)).save(H+'/fuhr_oilers_texture_v8.png')
    print('magenta in drawn cells:',int(((T==MAG).all(2)&(L!=255)).sum()))
