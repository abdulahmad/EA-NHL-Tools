# side-by-side x16: Abdul's template (left) vs each v5 texture (right); grid + yellow line under head row 7
import sys,os
from PIL import Image,ImageDraw
H=os.path.dirname(os.path.abspath(__file__));O=sys.argv[1]
T=Image.open(f'{H}/../../templates/abdul_layout_v4_template.png').convert('RGB')
def big(I):
    B=I.resize((54*16,32*16),Image.NEAREST);d=ImageDraw.Draw(B)
    for x in range(0,54*16,16):d.line([(x,0),(x,512)],fill=(0,0,0))
    for y in range(0,512,16):d.line([(0,y),(864,y)],fill=(0,0,0))
    for x in (14*16,28*16):d.line([(x,0),(x,512)],fill=(90,90,90),width=2)
    d.line([(0,128),(864,128)],fill=(255,255,0),width=2);return B
for f in ['leafs_home','rangers_away','chicago_home_top','chicago_alt_bottom','montreal_baby_blue_bottom','stripe_diagnostic']:
    C=Image.new('RGB',(864*2+30,542),(30,30,30));d=ImageDraw.Draw(C)
    C.paste(big(T),(0,30));C.paste(big(Image.open(f'{O}/{f}.png').convert('RGB')),(894,30))
    d.text((4,8),'Abdul v4 template (exact file)',fill=(255,255,0));d.text((898,8),f,fill=(255,255,0))
    C.save(f'{O}/compare_template_vs_{f}_x16.png')
