# D174 (pt997u): 94G frames in a distinct-colour palette (one colour per index) + index -> body-part table.
import pickle,json,numpy as np,sys
sys.path[:0]=['/workspace/preview_v2/exclusive_samples','/workspace/preview_v2/exclusive_samples/v2'];import render as RD
from PIL import Image,ImageDraw
F_=RD.F_;R=pickle.load(open('../v2/map3.pkl','rb'));T=json.load(open('palzone174.json'))
# 15 distinct colours; neighbours in the list differ strongly in luminance (no red/green pairs)
PC={33:(255,255,255),34:(90,90,90),35:(0,90,255),36:(255,220,0),37:(150,0,200),38:(255,140,0),39:(0,220,255),
    40:(130,60,0),41:(255,120,220),42:(0,0,140),43:(255,255,150),44:(0,140,140),45:(200,0,0),46:(170,170,170),47:(60,0,90)}
FR_=1
fr=sorted(((n,r) for (s,n,d),r in R.items() if s=='G94'))
SC=4;CW=124
if __name__=='__main__':
  im=Image.new('RGB',(1000,1000),(20,20,20));d=ImageDraw.Draw(im)
  d.text((8,4),'D174: 94G frames, one distinct colour per palette index',font=F_(22),fill='white')
  x=8;y=40
  for n,r in fr:
    g=np.asarray(r['g']);o=np.full(g.shape+(3,),20,np.uint8)
    for i,c in PC.items():o[g==i]=c
    e=Image.fromarray(o).resize((g.shape[1]*SC,g.shape[0]*SC),Image.NEAREST)
    if e.size[0]>CW-6:e=e.resize((CW-6,int(e.size[1]*(CW-6)/e.size[0])),Image.NEAREST)
    if x+CW>1000:x=8;y+=hmax+26
    if x==8:hmax=0
    d.text((x,y),f'94G {n}',font=F_(16),fill='white');im.paste(e,(x,y+20));hmax=max(hmax,e.size[1]);x+=CW
  y+=hmax+40
  d.text((8,y),'index  colour   94G pixels   allowed body parts (hard constraint)',font=F_(18),fill='white');y+=28
  for i,c in PC.items():
    t=T[str(i)];d.rectangle([70,y+2,110,y+20],fill=c,outline='white')
    al='stick (game colour, unconstrained)' if i==46 else 'shadow (game colour, unconstrained)' if i==47 else ', '.join(t['allowed'])
    d.text((8,y),str(i),font=F_(18),fill='white');d.text((130,y),str(t['total']),font=F_(18),fill='white');d.text((230,y),al,font=F_(18),fill='white');y+=24
  im.crop((0,0,1000,y+10)).save('d174_palette_zones.png');print(y)
  