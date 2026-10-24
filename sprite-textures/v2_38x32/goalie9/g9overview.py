# Overview sheet of every goalie frame (local output only: contains game sprites).
from g9common import *
from PIL import Image,ImageDraw,ImageFont
F=goalie_frames();sp=spal('HOME.json','chi');S=3
fnt=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',13)
fr=list(F);cols=8;cw,ch=44*S,44*S+16;rows=(len(fr)+cols-1)//cols
for part in range(0,rows,8):
    sub=fr[part*cols:(part+8)*cols]
    im=Image.new('RGB',(cw*cols,ch*((len(sub)+cols-1)//cols)),(30,30,30));dr=ImageDraw.Draw(im)
    for k,n in enumerate(sub):
        p=frame(n);h,w=p.shape;o=np.zeros((h,w,3),np.uint8);o[:]=(70,110,80);m=p!=255;o[m]=sp[p[m]]
        x,y=(k%cols)*cw,(k//cols)*ch;im.paste(Image.fromarray(o).resize((w*S,h*S),Image.NEAREST),(x+2,y+16))
        a=F[n][0];dr.text((x+2,y),f"{n} d{a[1]} {a[0][3:12]}",fill=(255,255,0),font=fnt)
    im.save(f'/workspace/preview_v2/goalie9/overview_{part//8}.png');print(im.size)
