import sys,struct,pickle,numpy as np
from PIL import Image,ImageDraw
def pal(path):
  bs=open(path,'rb').read();return [((w>>1&7)*36,(w>>5&7)*36,(w>>9&7)*36) for w in struct.unpack('>%dH'%(len(bs)//2),bs)]
def render(img,p):
  H,W=img.shape;o=np.zeros((H,W,4),np.uint8)
  for v in np.unique(img):
    if v==0:continue
    c=p[v-32] if v>=32 else (255,0,255);o[img==v]=(*c,255)
  return Image.fromarray(o)
def sheet(F,frames,p,out,scale=4,cols=6):
  ims=[render(F[i]['img'],p).resize((F[i]['img'].shape[1]*scale,F[i]['img'].shape[0]*scale),Image.NEAREST) for i in frames]
  cw=max(i.width for i in ims)+8;ch=max(i.height for i in ims)+22
  rows=(len(ims)+cols-1)//cols;S=Image.new('RGB',(cols*cw,rows*ch),(200,205,215));d=ImageDraw.Draw(S)
  for k,(i,im) in enumerate(zip(frames,ims)):
    x,y=(k%cols)*cw,(k//cols)*ch;d.text((x+3,y+3),str(i),fill=(0,0,0));S.paste(im,(x+4,y+20),im)
  S.save(out)
if __name__=='__main__':
  F94,F95,F96=pickle.load(open('frames.pkl','rb'))
  p=pal('/workspace/NHL95Genesis/Extracted/NHL95/Graphics/Pals/BOSh95.pal')
  sheet(F95,[1,9,65,73,100,123,131,139,155,163,179,227,267,331,396,420,448,496,544,576],p,'t95a.png',3,5)
