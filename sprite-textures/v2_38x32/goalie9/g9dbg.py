# debug: segmentation overlay for chosen frames (local only)
import sys
from g9scan import *
from PIL import Image
sp=spal('HOME.json','chi');COL={'mask':(0,255,255),'glove':(255,255,0),'pad':(255,0,255),'stick':(0,0,255)}
ims=[]
for n in map(int,sys.argv[1:]):
    p,L,st=seg(n);h,w=p.shape;o=np.zeros((h,w,3),np.uint8);o[:]=(70,110,80);m=p!=255;o[m]=sp[p[m]];t=o.copy()
    for k,c in COL.items():t[L==k]=c
    ims.append(Image.fromarray(np.concatenate([o,t],1)).resize((w*8,h*4),Image.NEAREST))
from lib import sheet
sheet(ims,cols=3).save('/workspace/preview_v2/goalie9/dbg.png')
