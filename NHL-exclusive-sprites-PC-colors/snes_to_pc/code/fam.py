import numpy as np,collections
from pal import GPB
def fam_rgb(c):
    r,g,b=map(int,c);mx,mn=max(c),min(c)
    if mx<60:return 1
    if g>130 and b>130 and r<170 and b-r>40:return 6
    if b>r+30 and b>=g:return 3
    if r>b+60 and r>g+20 and g>b+20 and r<240 and (r-g)<90 and g>90:return 4 if r>150 and g<170 and b>60 else 5
    if r>b+40:return 4 if b>60 else 5
    return 2
# family on TOR home palette (as the earlier SNES-redraw scoring used): needs the same palette for all slots
from s2g import A
import sys
def _gp_tor():
    d=open('/workspace/NHL94Genesis/Extracted/NHL94/Graphics/Pals/TORh.pal','rb').read();P=np.zeros((256,3),int)
    for i in range(16):
        x=int.from_bytes(d[2*i:2*i+2],'big');P[32+i]=((x&14)*18,((x>>4)&14)*18,((x>>8)&14)*18)
    return P
GT=_gp_tor();FG=np.array([fam_rgb(c) for c in GT]);FG[0]=0;FG[46]=5
def score(C,G):
    u=(C>0)|(G>0);i=(C>0)&(G>0)
    return dict(exact_union=float((C[u]==G[u]).mean()),fam_union=float((FG[C][u]==FG[G][u]).mean()),sil=float(i.sum()/u.sum()),exact_inter=float((C[i]==G[i]).mean()),fam_inter=float((FG[C][i]==FG[G][i]).mean()),npx_ratio=float((C>0).sum()/(G>0).sum()))
