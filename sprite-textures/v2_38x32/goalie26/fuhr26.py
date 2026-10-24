# Fuhr v10 (Abdul pt932u): Fuhr's high-res DR equipment textures in the current 23x32 layout
# (goalie15/goalie_texture_v6_indexed.png cells). D131. The reference JPGs are Abdul's and stay local (never committed):
#   usage: python3 fuhr26.py REFDIR MASK_FRONT MASK_BACK   (REFDIR holds blocker_glove.jpg catcher.jpg pad_front.jpg pad_back.jpg)
#   blocker      rows 0-6  x0-9  <- blocker_glove.jpg left REFLEX board, rotated 90 deg (portrait art into a landscape box)
#   pad front    rows 9-22 x0-9  <- pad_front.jpg (top cuff trimmed)
#   pad back     rows 9-22 x10-12 (D80 wrap strip) <- pad_back.jpg strap panel, rotated 90 deg so the straps run across the leg
#   catcher back rows 23-31 x0-10  <- blocker_glove.jpg white glove (backhand, DR logo)
#   catcher frnt rows 23-31 x11-21 <- catcher.jpg (red/white trapper, mesh pocket)
#   mask         rows 0-7 x12-20: front x14-18 cylinder-warped per row to the mask silhouette (edges meet the back halves),
#                face hole filled with the NHL95 cage look (texel 164 light-grey bars, 0 black eye gaps), chin (6,16),(7,16)
#                orange with blue at (6,15),(6,17); back halves R x12-13 / L x19-20 as in v9.
import sys,os,collections,numpy as np;from PIL import Image
H=os.path.dirname(os.path.abspath(__file__));G=H+'/..'
sys.path.insert(0,G+'/goalie17')
from g17inspect import TEAMS,spal
L=np.array(Image.open(G+'/goalie15/goalie_texture_v6_indexed.png')).astype(int)
t=[t for t in TEAMS if t[0]=='edm_home'][0];SP=spal(t[1],t[2]);MAG=(252,0,252)
ORANGE=(248,72,24);BLUE=(8,24,88)
def parts(R):
    bg=Image.open(R+'/blocker_glove.jpg').convert('RGB')
    return {'blocker':((0,0,10,7),bg.crop((12,15,226,357)).transpose(Image.ROTATE_90)),
            'pad':((0,9,10,14),Image.open(R+'/pad_front.jpg').convert('RGB').crop((0,45,256,512))),
            'padback':((10,9,3,14),Image.open(R+'/pad_back.jpg').convert('RGB').crop((0,0,168,112)).transpose(Image.ROTATE_90)),
            'catchback':((0,23,11,9),bg.crop((232,0,512,300))),
            'catcher':((11,23,11,9),Image.open(R+'/catcher.jpg').convert('RGB'))}
def mode(b):b=b.reshape(-1,3)//16;return np.array(collections.Counter(map(tuple,b)).most_common(1)[0][0])*16+8
def modecell(a,w,h):
    a=np.asarray(a).astype(int);o=np.zeros((h,w,3),int);Y=np.linspace(0,a.shape[0],h+1).astype(int);X=np.linspace(0,a.shape[1],w+1).astype(int)
    for i in range(h):
        for j in range(w):o[i,j]=mode(a[Y[i]:max(Y[i+1],Y[i]+1),X[j]:max(X[j+1],X[j]+1)])
    return o
def crop(fn):
    a=Image.open(fn).convert('RGB');n=np.asarray(a).astype(int);ys,xs=np.nonzero(n.max(2)>40);return a.crop((xs.min(),ys.min(),xs.max()+1,ys.max()+1))
def maskfront(fn,w=5,h=8):
    """per texel row: the silhouette extent of that row band, sampled with a cylinder (sin) warp so the centre keeps detail
    and the outer columns land on the mask edge (contiguous with the back halves). Face hole -> NHL95 cage texels."""
    a=np.asarray(Image.open(fn).convert('RGB')).astype(int);sil=a.max(2)>40;Y=np.linspace(0,a.shape[0],h+1).astype(int)
    xs=np.nonzero(sil.any(0))[0];X0,X1=xs.min(),xs.max()+1
    th=np.linspace(-np.pi/2,np.pi/2,w+1);o=np.zeros((h,w,3),int);hole=np.zeros((h,w),bool)
    for i in range(h):
        band=sil[Y[i]:Y[i+1]];c=np.nonzero(band.any(0))[0];x0,x1=(c.min(),c.max()+1) if len(c) else (X0,X1)
        B=(x0+(x1-x0)*(0.5+0.5*np.sin(th))).astype(int)
        for j in range(w):
            cell=a[Y[i]:Y[i+1],B[j]:max(B[j+1],B[j]+1)];m=sil[Y[i]:Y[i+1],B[j]:max(B[j+1],B[j]+1)]
            # hole = dark pixels inside the silhouette band (the black face opening)
            inside=np.zeros_like(m);cc=np.arange(B[j],max(B[j+1],B[j]+1));inside[:,(cc>=x0)&(cc<x1)]=True
            dark=(cell.max(2)<=40)&inside
            if dark.mean()>0.5:hole[i,j]=True;o[i,j]=0
            else:o[i,j]=mode(cell[m]) if m.any() else mode(cell)
    return o,hole
def small(R,mf,mb):
    T=np.zeros((32,23,3),int);T[:]=MAG
    for y in range(32):
        for x in range(23):
            if L[y,x]!=255:T[y,x]=SP[L[y,x]]
    for k,((x0,y0,w,h),a) in parts(R).items():
        A=modecell(a,w,h)
        for i in range(h):
            for j in range(w):
                if L[y0+i,x0+j]!=255:T[y0+i,x0+j]=A[i,j]
    F,hole=maskfront(mf)
    for i in range(8):
        for j in range(5):
            y,x=i,14+j
            if L[y,x]==255:continue
            T[y,x]=F[i,j]
            if hole[i,j] or L[y,x] in (0,164):T[y,x]=SP[0] if L[y,x]==0 else SP[164]   # NHL95 cage look
    Bk=crop(mb);w=Bk.width
    for (x0,img) in ((12,Bk.crop((w//2,0,w,Bk.height))),(19,Bk.crop((0,0,w//2,Bk.height)))):
        A=modecell(img,2,8)
        for i in range(8):
            for j in range(2):
                if L[i,x0+j]!=255:T[i,x0+j]=A[i,j]
    for (y,x),c in {(6,16):ORANGE,(7,16):ORANGE,(6,15):BLUE,(6,17):BLUE}.items():T[y,x]=c
    return T
def hires(R,mf,mb,S=20):
    T=small(R,mf,mb);im=Image.fromarray(T.astype(np.uint8)).resize((23*S,32*S),Image.NEAREST)
    for k,((x0,y0,w,h),a) in parts(R).items():im.paste(a.resize((w*S,h*S),Image.LANCZOS),(x0*S,y0*S))
    im.paste(crop(mf).resize((5*S,8*S),Image.LANCZOS),(14*S,0));Bk=crop(mb);w=Bk.width
    im.paste(Bk.crop((w//2,0,w,Bk.height)).resize((2*S,8*S),Image.LANCZOS),(12*S,0));im.paste(Bk.crop((0,0,w//2,Bk.height)).resize((2*S,8*S),Image.LANCZOS),(19*S,0))
    return im
if __name__=='__main__':
    T=small(*sys.argv[1:4]);Image.fromarray(T.astype(np.uint8)).save(H+'/fuhr_oilers_texture_v10.png');print('saved v10')
# v11 (Abdul pt934u "make the fuhr texture symmetrical, and more of the orange needs to be on top", D133):
# mask front x14-18 mirrored about x16 (left half x14-15 -> x18-17), back halves mirror each other (x12-13 -> x20-19),
# orange flame/V brought into the top rows: row 1 x14,15,17,18 and row 2 x15-17 orange; chin kept (orange (6,16),(7,16), blue (6,15),(6,17)).
def small11(R,mf,mb):
    T=small(R,mf,mb)
    for y in range(8):
        for a,b in ((14,18),(15,17),(12,20),(13,19)):T[y,b]=T[y,a]
    for y,x in ((1,14),(1,15),(1,17),(1,18),(2,15),(2,16),(2,17)):
        if L[y,x]!=255:T[y,x]=ORANGE
    return T
if __name__=='__main__':
    T=small11(*sys.argv[1:4]);Image.fromarray(T.astype(np.uint8)).save(H+'/fuhr_oilers_texture_v11.png');print('saved v11')
