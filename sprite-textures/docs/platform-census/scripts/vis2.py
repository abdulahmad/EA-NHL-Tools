import sys,pickle,numpy as np
sys.path.insert(0,'/workspace/preview_v2/platform_unique');sys.path.insert(0,'/workspace/EA-NHL-Tools/sprite-textures/scripts')
import os;_c=os.getcwd();os.chdir('/workspace/preview_v2/platform_unique');import vis;os.chdir(_c)
from PIL import Image,ImageDraw,ImageFont
A,S93SET=pickle.load(open('/workspace/preview_v2/platform_unique/v2/all.pkl','rb'))
TR={'PC':255};BG=np.array([60,60,60],np.uint8)
def img(t,n,s=3):
    a=A[t][n];tr=TR.get(t,0);m=a!=tr
    rgb=(vis.tpal if t=='PC' else vis.g94b)[np.where(m,a,0)].copy()
    g=(rgb[...,1].astype(int)>rgb[...,0]+30)&(rgb[...,1].astype(int)>rgb[...,2]+30);rgb[g]=150;rgb[~m]=BG
    return Image.fromarray(rgb).resize((a.shape[1]*s,a.shape[0]*s),Image.NEAREST)
F=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',20)
F2=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',15)
def grid(cells,title,out,W=1000,s=3):
    ims=[]
    for lab,ks in cells:
        parts=[img(t,n,s) for t,n in ks];w=sum(p.width for p in parts)+6*(len(parts)-1);h=max(p.height for p in parts)
        c=Image.new('RGB',(max(w,len(lab)*9,len(ks)*70)+4,h+42),(15,15,15));d=ImageDraw.Draw(c);x=2
        for p,(t,n) in zip(parts,ks):c.paste(p,(x,22+h-p.height));d.text((x,2),f'{t} {n}',fill=(255,255,255),font=F2);x+=max(p.width,64)+6
        d.text((2,h+24),lab,fill=(255,230,0),font=F2);ims.append(c)
    rows=[];row=[];x=0
    for c in ims:
        if x+c.width>W and row:rows.append(row);row=[];x=0
        row.append(c);x+=c.width+10
    if row:rows.append(row)
    H=36+sum(max(c.height for c in r)+10 for r in rows)
    sh=Image.new('RGB',(W,H),(15,15,15));d=ImageDraw.Draw(sh);d.text((6,6),title,fill=(255,255,255),font=F);y=36
    for r in rows:
        x=4
        for c in r:sh.paste(c.crop((0,0,min(c.width,W-8),c.height)),(x,y));x+=c.width+10
        y+=max(c.height for c in r)+10
    sh.save(out);return out
if __name__=='__main__':
    grid([('',[(t,n) for t in ['G92','G93','G94','S93','S94','PC']]) for n in [50,190,360,420]],'sanity: same frame number in each set','sanity.png')
