import json,os,sys,numpy as np
from PIL import Image
D=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),'out','data','')
if not os.path.exists(D+'frames.json'):
    sys.path.insert(0,os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),'editor'));from envcheck import need_data;need_data()
H=json.load(open(D+'frames.json'));B=np.fromfile(D+'frames.bin',np.uint8)
HOME=json.load(open(D+'HOME.json'));ZN=json.load(open(D+'zn.json'))
act=np.fromfile(os.path.join(os.path.dirname(os.path.abspath(__file__)),'../../PAL-To-ACT/rinkpalShadowfixed.act'),np.uint8)[:768].reshape(256,3)
def frame(n):
    f,w,h,o=H[n-1][:4];return B[o:o+w*h].reshape(h,w)
def team(code): return next(t for t in HOME if t['code']==code)
def spritepal(t):
    p=act.copy().astype(int);p[128:192]=np.array(t['colors'])*4;return p[np.array(t['map'])]
BG=(40,90,60)
def toimg(rgb,mask,s=6):
    h,w=mask.shape;o=np.zeros((h,w,3),np.uint8);o[:]=BG;o[mask]=np.clip(rgb[mask],0,255);return Image.fromarray(o).resize((w*s,h*s),Image.NEAREST)
def sheet(imgs,cols=8,pad=4):
    W=max(i.width for i in imgs)+pad;Hh=max(i.height for i in imgs)+pad;rows=(len(imgs)+cols-1)//cols
    s=Image.new('RGB',(W*cols,Hh*rows),(20,20,20))
    for k,i in enumerate(imgs):s.paste(i,((k%cols)*W,(k//cols)*Hh))
    return s

def sheet_aligned(imgs,cols=8,pad=6,bg=(20,20,20)):
    """Grid: column width = max width in that column + pad, each sprite centred on the column centre line;
    each row shares a baseline (sprites bottom-aligned)."""
    rows=[imgs[i:i+cols] for i in range(0,len(imgs),cols)]
    cw=[max((r[c].width for r in rows if c<len(r)),default=0)+pad for c in range(cols)]
    rh=[max(i.height for i in r)+pad for r in rows]
    s=Image.new('RGB',(sum(cw),sum(rh)),bg);y=0
    for r,h in zip(rows,rh):
        x=0
        for c,im in enumerate(r):
            s.paste(im,(x+(cw[c]-im.width)//2,y+h-pad//2-im.height));x+=cw[c]
        y+=h
    return s
sheet=sheet_aligned  # all future comparisons use the aligned layout
