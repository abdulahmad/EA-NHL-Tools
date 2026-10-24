# Fuhr v9 (Abdul pt931u): built straight from the v12 source art (textures/v12/tex_gear_*) + Abdul's mask references,
# in the current 23x32 layout (goalie15/goalie_texture_v6_indexed.png cells). Also a HIGH-RES build of the same layout
# (S px per texel, source art resampled into each part box) for comparison. D130.
#   pad front  rows 9-22 x0-9 (10x14)  <- tex_gear_pad 15x25            (v8 went 15x25 -> 9x20 -> 10x14: two resamples)
#   blocker    rows 0-6 x0-9 (10x7)    <- tex_gear_blocker 8x12 ROTATED 90 deg (12x8) so the portrait art is not squashed
#   mask       rows 0-7 x12-20         <- front ref -> x14-18; back ref goalie-right half -> x12-13, goalie-left half -> x19-20
#   catcher    rows 23-31 front x11-21 <- tex_gear_catcher 11x9 (1:1);  back x0-10 and sock strip x10-12: EDM home palette
import sys,os,collections,numpy as np;from PIL import Image
H=os.path.dirname(os.path.abspath(__file__));G=H+'/..';V12=G+'/../textures/v12/'
sys.path.insert(0,G+'/goalie17')
from g17inspect import TEAMS,spal
L=np.array(Image.open(G+'/goalie15/goalie_texture_v6_indexed.png')).astype(int)
t=[t for t in TEAMS if t[0]=='edm_home'][0];SP=spal(t[1],t[2]);MAG=(252,0,252)
def crop(fn):
    a=Image.open(fn).convert('RGB');n=np.asarray(a).astype(int);ys,xs=np.nonzero(n.max(2)>40);return a.crop((xs.min(),ys.min(),xs.max()+1,ys.max()+1))
def parts(mf,mb):
    bl=Image.open(V12+'tex_gear_blocker.png').convert('RGB').transpose(Image.ROTATE_90)
    B=crop(mb);w=B.width
    return {'blocker':((0,0,10,7),bl,'px'),'mask':((14,0,5,8),crop(mf),'photo'),'maskR':((12,0,2,8),B.crop((w//2,0,w,B.height)),'photo'),
            'maskL':((19,0,2,8),B.crop((0,0,w//2,B.height)),'photo'),'pad':((0,9,10,14),Image.open(V12+'tex_gear_pad.png').convert('RGB'),'px'),
            'catcher':((11,23,11,9),Image.open(V12+'tex_gear_catcher.png').convert('RGB'),'px')}
def modecell(a,w,h):
    a=np.asarray(a).astype(int);o=np.zeros((h,w,3),int);Y=np.linspace(0,a.shape[0],h+1).astype(int);X=np.linspace(0,a.shape[1],w+1).astype(int)
    for i in range(h):
        for j in range(w):
            b=a[Y[i]:max(Y[i+1],Y[i]+1),X[j]:max(X[j+1],X[j]+1)].reshape(-1,3)//16;o[i,j]=np.array(collections.Counter(map(tuple,b)).most_common(1)[0][0])*16+8
    return o
def small(mf,mb):
    T=np.zeros((32,23,3),int);T[:]=MAG
    for y in range(32):
        for x in range(23):
            if L[y,x]!=255:T[y,x]=SP[L[y,x]]
    for k,((x0,y0,w,h),a,kind) in parts(mf,mb).items():
        A=modecell(a,w,h) if kind=='photo' else np.asarray(a.resize((w,h),Image.NEAREST)).astype(int)
        for i in range(h):
            for j in range(w):
                if L[y0+i,x0+j]!=255:T[y0+i,x0+j]=A[i,j]
    return T
def hires(mf,mb,S=20):
    T=small(mf,mb);im=Image.fromarray(T.astype(np.uint8)).resize((23*S,32*S),Image.NEAREST)
    for k,((x0,y0,w,h),a,kind) in parts(mf,mb).items():
        im.paste(a.resize((w*S,h*S),Image.LANCZOS if kind=='photo' else Image.NEAREST),(x0*S,y0*S))
    return im
if __name__=='__main__':
    T=small(sys.argv[1],sys.argv[2]);Image.fromarray(T.astype(np.uint8)).save(H+'/fuhr_oilers_texture_v9.png');print('saved v9')
