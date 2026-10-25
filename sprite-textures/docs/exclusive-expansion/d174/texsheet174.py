import pickle,json,sys,numpy as np
sys.path[:0]=['/workspace/preview_v2/exclusive_samples','/workspace/preview_v2/exclusive_samples/v2']
import render as RD;from gpal import GP
REP={'white':44,'navy':36,'skin':38,'black':34}
from PIL import Image,ImageDraw
F_=RD.F_
from palsheet174 import PC
V,FI=pickle.load(open('tex174_idx.pkl','rb'));_,_,FF=pickle.load(open('tex_G94_d169.pkl','rb'))
S=12;W,H=38*S,32*S
a=np.full((32,38,3),25,np.uint8);b=a.copy()
for (u,v),i in FI.items():a[v,u]=PC[i]
for (u,v),f in FF.items():b[v,u]=GP[REP[f]]
im=Image.new('RGB',(1000,H+330),(20,20,20));d=ImageDraw.Draw(im)
d.text((8,4),'D174 palette-index texture (primary key)  vs  D169 Leafs-family texture',font=F_(22),fill='white')
d.text((20,40),'D174: one colour per 94G palette index',font=F_(18),fill='white');d.text((520,40),'D169: Leafs colour families',font=F_(18),fill='white')
im.paste(Image.fromarray(a).resize((W,H),Image.NEAREST),(20,68));im.paste(Image.fromarray(b).resize((W,H),Image.NEAREST),(520,68))
for x0 in (20,520):
  for v in (6,17,21,23,27):d.line([x0-8,68+v*S,x0-2,68+v*S],fill='white',width=2)
y=H+84;cnt=json.load(open('tex174_idx.json'))['index_counts']
d.text((20,y),'index (texels):',font=F_(18),fill='white');x=180
for i in sorted(PC):
  if str(i) not in cnt:continue
  d.rectangle([x,y,x+22,y+22],fill=PC[i],outline='white');d.text((x+28,y),f'{i} ({cnt[str(i)]})',font=F_(18),fill='white');x+=118
  if x>900:x=180;y+=30
y+=40
for t in ['Built like D169 (281 aligned pairs, row-band votes, gaps filled). Head rows 0-5 (pt1002u):',
          'helmet shades 43/44/45 -> 44, skin 38/39 -> 39; face/helmet boundary kept per texel.',
          'Vote agreement: overall 55.9% (was 51.5%); head 96.4%; torso 50.6%, sleeve 52.2%,',
          'legs 51.7% - body bands still split between shades of one family',
          '(white 43/44/45, pants 35/36/37, navy 40/41/42). Ticks: rows 6, 17, 21, 23, 27.']:
  d.text((20,y),t,font=F_(18),fill='white');y+=26
im.crop((0,0,1000,y+10)).save('d174_index_texture.png')
