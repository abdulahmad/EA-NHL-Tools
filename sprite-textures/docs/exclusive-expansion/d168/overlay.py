import sys,collections,numpy as np;from fam import *
sys.path.insert(0,'/workspace/preview_v2/exclusive_samples');import render as RD
from PIL import Image,ImageDraw
F_=RD.F_;ng=RD.ng
P=[p for p in pairs('G94')];P=[P[i] for i in (5,len(P)//2,len(P)-7)]
im=Image.new('RGB',(1000,90+3*300),(15,15,15));d=ImageDraw.Draw(im)
d.text((8,6),'Aligned 94G / PC pairs (silhouette IoU >= 0.97)',font=F_(22),fill='white')
d.text((8,36),'cols: 94G (Genesis TORh pal) | PC frame rendered Leafs | silhouette overlay: white=both,',font=F_(15),fill='white')
d.text((8,58),'yellow=94G only, blue=PC only',font=F_(15),fill=(255,230,0));y=90;SC=5
for n,pn,mir,dy,dx in P:
  g=A['G94'][n];f=D['frames'][str(pn)];px,rgb=pcrgb(f);pp=px[:,::-1] if mir else px;rr=rgb[:,::-1] if mir else rgb
  H,W=g.shape;pc=np.full((H,W),255,int);pr=np.full((H,W,3),20,np.uint8)
  for py,qx in zip(*np.nonzero(pp!=255)):
    gy,gx=py+dy,qx+dx
    if 0<=gy<H and 0<=gx<W:pc[gy,gx]=pp[py,qx];pr[gy,gx]=rr[py,qx]
  go=np.full((H,W,3),20,np.uint8);go[g>0]=GP[g[g>0]]
  ov=np.full((H,W,3),20,np.uint8);a=g>0;b=pc!=255;ov[a&b]=255;ov[a&~b]=(255,230,0);ov[~a&b]=(60,120,255)
  ys,xs=np.nonzero(a|b);sl=(slice(ys.min(),ys.max()+1),slice(xs.min(),xs.max()+1))
  d.text((8,y),f'94G {n} <-> PC {pn}  mirror={mir} offset dy={dy} dx={dx}',font=F_(18),fill='white');x=8
  for z in (go,pr,ov):
    z=z[sl];e=Image.fromarray(ng(z)).resize((z.shape[1]*SC,z.shape[0]*SC),Image.NEAREST);im.paste(e,(x,y+28));x+=e.size[0]+30
  y+=300
im.save('align_overlays.png')
