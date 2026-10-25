import pickle,numpy as np,json
from PIL import Image,ImageDraw,ImageFont
from common import rgbS,rgbG
from blackcov import CATS
EX=pickle.load(open('/tmp/d183_ex.pkl','rb'));F=lambda s:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',s)
k=8;tiles=[]
for c in range(1,7):
    for pf in ('S94','G94'):
        if (c,pf) not in EX:continue
        _,n,a,J,y,x,cat,ys,xs=EX[(c,pf)];rgb=(rgbS if pf=='S94' else rgbG)(a)
        y0,x0=max(0,y-7),max(0,x-7);cr=rgb[y0:y+8,x0:x+8];im=Image.fromarray(cr).resize((cr.shape[1]*k,cr.shape[0]*k),0);d=ImageDraw.Draw(im)
        for yy,xx,cc in zip(ys,xs,cat):
            if cc==c and y0<=yy<y0+15 and x0<=xx<x0+15:d.rectangle(((xx-x0)*k,(yy-y0)*k,(xx-x0+1)*k-1,(yy-y0+1)*k-1),outline=(255,176,0),width=2)
        tiles.append((f'{CATS[c].split(" (")[0]}\n{pf} frame {n}',im))
W=4;cw=15*k+60;ch=15*k+50;out=Image.new('RGB',(min(1000,W*cw+10),((len(tiles)+W-1)//W)*ch+90),(20,20,20));d=ImageDraw.Draw(out)
d.multiline_text((10,8),'D183 uncovered black by category\n(orange box = example pixels)',fill='white',font=F(17))
for i,(t,im) in enumerate(tiles):
    X=10+(i%W)*cw;Y=60+(i//W)*ch;d.multiline_text((X,Y),t,fill='white',font=F(13));out.paste(im,(X,Y+34))
out.save('/workspace/snesredraw/d183_exceptions_v2.png');print(out.size,len(tiles))
