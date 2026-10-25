from common import *
from dirmap import build,NAMES
from PIL import Image,ImageDraw
import pickle;A,_=pickle.load(open('/workspace/preview_v2/platform_unique/v2/all.pkl','rb'))
_,MG,_=build('G94');_,MS,_=build('S94')
rows=[('94G skate',lambda d:A['G94'].get(41+5*d),rgbG),('94S skate',lambda d:A['S94'].get(41+5*d),rgbS),
      ('94G celebrate',lambda d:A['G94'].get(185+2*d+1),rgbG),('94S celebrate',lambda d:A['S94'].get(185+2*d+1),rgbS),('94S crosscheck',lambda d:A['S94'].get(518+2*d+1),rgbS)]
k=2;cw=104;W=150+8*cw;H=70+len(rows)*130+60;im=Image.new('RGB',(W,H),(20,20,20));dr=ImageDraw.Draw(im)
dr.text((10,8),'D180 direction check: table direction 0-7 (0 = N, clockwise)',fill='white',font=font(20))
for d in range(8):dr.text((150+d*cw+cw//2,50),f'{d} {NAMES[d]}',fill='white',font=font(16),anchor='mm')
for r,(lab,fn,col) in enumerate(rows):
    y=70+r*130;dr.text((8,y+50),lab,fill='white',font=font(15))
    for d in range(8):
        a=fn(d)
        if a is None:continue
        t=Image.fromarray(col(a)).resize((a.shape[1]*k,a.shape[0]*k),0);im.paste(t,(150+d*cw+(cw-t.width)//2,y+(125-t.height)//2))
dr.text((10,H-50),'Columns are the table direction for each frame (from frames94.asm / frames94s.asm).\nSkate row: frame base + 5*dir. Celebrate/crosscheck: base + 2*dir + 1.',fill=(230,230,230),font=font(13))
im.save('d180_dircheck.png');print(im.size)
