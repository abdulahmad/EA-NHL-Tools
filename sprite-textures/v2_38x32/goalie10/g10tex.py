# Goalie v10 (Abdul pt869u): Abdul's hand-made goalie texture (23x23) + his NHL 9x Studio zone palette (.act).
# Decodes the texture to game palette indices and cuts it into pieces.
import os,numpy as np
from PIL import Image
HERE=os.path.dirname(os.path.abspath(__file__))
ACT=np.fromfile(HERE+'/goalie_zones_abdul.act',np.uint8)[:768].reshape(256,3)
WHITE=-1   # (252,252,252) is shared by 75 indices; inside the pad strip it is the socks plain zone 181-183
TRANS=255
# colour -> index. Unique colours map to their only index in 128-191 / 22 / 0; shared ones are resolved here (D72):
#   (0,0,0) -> 0 (outline / eye holes / straps), (160,0,0) -> 147 (not 81), (0,160,0) -> 188 (not 51),
#   (252,0,252) -> 186 when enclosed left+right inside a piece row, else transparent 255; (252,252,252) -> WHITE family.
FORCE={(0,0,0):0,(160,0,0):147,(0,160,0):188,(252,252,252):WHITE}
def decode():
    im=np.array(Image.open(HERE+'/goalie_texture_abdul.png').convert('RGB')).astype(int);h,w,_=im.shape
    lut={}
    for i in list(range(128,192))+[22,0]:
        c=tuple(int(v) for v in ACT[i]);lut.setdefault(c,i)
    lut.update(FORCE)
    T=np.full((h,w),TRANS,int)
    for y in range(h):
        for x in range(w):
            c=tuple(im[y,x])
            if c==(252,0,252):continue
            T[y,x]=lut[c]
    for y in range(h):   # enclosed magenta = 186 (mask row 1: 177 177 186 185 188 185 186 177 177)
        for x in range(1,w-1):
            if tuple(im[y,x])==(252,0,252) and T[y,x-1]!=TRANS and T[y,x+1]!=TRANS:T[y,x]=186
    return T
# pieces (x0,y0,x1,y1 inclusive) read off the texture (D72)
PIECES={'blocker':(0,0,9,6),'mask':(12,0,20,7),'padF':(0,9,9,22),'padStrip':(10,9,12,22),'catcher':(15,10,22,21)}
def piece(T,k):
    x0,y0,x1,y1=PIECES[k];return T[y0:y1+1,x0:x1+1]
if __name__=='__main__':
    T=decode()
    for k in PIECES:
        P=piece(T,k);print(k,P.shape,sorted(set(P.flatten())-{TRANS}))
        for r in P:print('  '+' '.join('  .' if v==TRANS else '  W' if v==WHITE else '%3d'%v for v in r))
