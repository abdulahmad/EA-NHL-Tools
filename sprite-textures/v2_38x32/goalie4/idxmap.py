import sys;sys.path.insert(0,'../scripts')
from lib import *
from PIL import ImageDraw,ImageFont
F=lambda s:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',s)
sp=spritepal(team('chi'))
for n in [413,416,422,428,449,519,980,1000]:
  p=frame(n);h,w=p.shape;z=min(960//w,960//h,30)
  Im=Image.new('RGB',(w*z+30,h*z+30),(60,60,60));d=ImageDraw.Draw(Im)
  for y in range(h):
    d.text((2,30+y*z+z//3),str(y),fill='white',font=F(10))
    for x in range(w):
      if y==0:d.text((30+x*z+3,10),str(x),fill='white',font=F(10))
      i=int(p[y,x])
      if i==255:continue
      c=tuple(int(v) for v in sp[i]);d.rectangle([30+x*z,30+y*z,30+x*z+z-1,30+y*z+z-1],fill=c)
      L=0.299*c[0]+0.587*c[1]+0.114*c[2]
      d.text((30+x*z+1,30+y*z+z//3),str(i),fill='black' if L>110 else 'white',font=F(z//3))
  Im.save(f'/workspace/preview_v2/goalie4/idx_{n}.png')
