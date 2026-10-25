from common import *
import collections
from scipy.ndimage import zoom
FAM=['empty','black','grey/white','team blue','skin','stick','ice']
def fam_rgb(c):
    r,g,b=map(int,c);mx,mn=max(c),min(c)
    if mx<60:return 1
    if g>130 and b>130 and r<170 and b-r>40:return 6
    if b>r+30 and b>=g:return 3
    if r>b+60 and r>g+20 and g>b+20 and r<240 and (r-g)<90 and g>90:return 4 if r>150 and g<170 and b>60 else 5
    if r>b+40:return 4 if b>60 else 5
    return 2
FS=np.array([fam_rgb(c) for c in SP]);FS[0]=0
FG=np.array([fam_rgb(c) for c in GP]);FG[0]=0
def pl(a):
    m=a>0;return m.sum()>60 and (a[m]>=32).mean()>0.9
def pairs():
    r=[x for x in rows if x['set']=='S94' and x['G94_class']=='match' and x['G94_mirror']=='False' and 0.9<=float(x['G94_scale'])<=1.15 and x['spf_group']!='Goalie' and int(x['G94_best']) in A['G94'] and pl(A['S94'][int(x['frame'])]) and pl(A['G94'][int(x['G94_best'])])]
    return [(int(x['frame']),int(x['G94_best']),x['spf_group']) for x in r]
SY,SX=1.08,1.12
def scale(s):
    H=round(s.shape[0]*SY);W=round(s.shape[1]*SX)
    yy=(np.arange(H)/SY).astype(int);xx=(np.arange(W)/SX).astype(int);return s[yy][:,xx]
def place(s,g):
    """offset of s on g canvas maximizing mask IoU; returns S,G same shape"""
    return align(s,g)
R=3
def feats(S):
    f=FS[S];H,W=S.shape;P=np.pad(f,R);ys,xs=np.nonzero(np.ones_like(S))
    win=np.stack([P[ys+dy+R,xs+dx+R] for dy in range(-R,R+1) for dx in range(-R,R+1)],1)
    m=S>0;rows_=np.nonzero(m.any(1))[0];top=rows_[0] if len(rows_) else 0;bot=rows_[-1] if len(rows_) else 1
    rel=(ys-top)/max(1,bot-top)
    oh=np.concatenate([(win==k) for k in range(7)],1).astype(np.uint8)
    return np.concatenate([oh,rel[:,None],S.ravel()[:,None]],1),f.ravel()
