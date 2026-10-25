import pickle,csv,numpy as np
from PIL import Image,ImageDraw,ImageFont
V='/workspace/preview_v2/platform_unique/v2/'
F,gpal=pickle.load(open('/workspace/preview_v2/platform_unique/feat.pkl','rb'))
A,_=pickle.load(open(V+'all.pkl','rb'))
rows=list(csv.DictReader(open(V+'frames_matrix.csv')))
def rgb(a):
    o=gpal[a].astype(np.uint8);o[a==0]=(70,70,70);return o
def align(s,g):
    """best integer offset of s onto g's canvas by mask IoU (same-size canvas = max dims+pad)"""
    H=max(s.shape[0],g.shape[0])+6;W=max(s.shape[1],g.shape[1])+6
    G=np.zeros((H,W),int);gy=(H-g.shape[0])//2;gx=(W-g.shape[1])//2;G[gy:gy+g.shape[0],gx:gx+g.shape[1]]=g
    best=None
    for y in range(H-s.shape[0]+1):
        for x in range(W-s.shape[1]+1):
            S=np.zeros((H,W),int);S[y:y+s.shape[0],x:x+s.shape[1]]=s
            m1=S>0;m2=G>0;iou=(m1&m2).sum()/max(1,(m1|m2).sum())
            if best is None or iou>best[0]:best=(iou,S)
    return best[1],G,best[0]
def font(n):return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',n)
P='/workspace/NHL94SNES/Extracted/data/gfx/Pals/'
def snespal():
    P_=np.zeros((256,3),int)
    def rd(f,base):
        d=open(P+f,'rb').read()
        for i in range(len(d)//2):
            x=int.from_bytes(d[2*i:2*i+2],'little');P_[base+i]=((x&31)*255//31,((x>>5)&31)*255//31,((x>>10)&31)*255//31)
    rd('RinkPalette.pal',0);rd('TORh.pal',32);return P_
import sys;sys.path.insert(0,'/workspace/preview_v2/exclusive_samples/v2')
from gpal import GP
SP=snespal()
def rgbS(a):o=SP[a].astype(np.uint8);o[a==0]=(70,70,70);return o
def rgbG(a):o=GP[a].astype(np.uint8);o[a==0]=(70,70,70);return o
