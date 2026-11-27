import os,sys;sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)));import paths
import numpy as np,csv,collections,pickle
from PIL import Image,ImageDraw,ImageFont
OUT=paths.STATUS
F=paths.font
ZN=['forearm dark','forearm medium','forearm light','arm stripe 3 light','arm stripe 3 medium','arm stripe 3 dark','arm stripe 2 dark','arm stripe 2 medium','arm stripe 2 light','arm stripe 1 light','arm stripe 1 medium','arm stripe 1 dark','upper arm light','upper arm medium','upper arm dark','yoke corner','shoulder patch','yoke 3','yoke 1','yoke 2','goalie mask','jersey light','jersey medium','jersey dark','waist 1 odd','waist 1 even','waist 1 hidden','waist 2 light','waist 2 medium','waist 2 dark','waist 3 light','waist 3 medium','waist 3 dark','pants dark','pants stripe 2','pants stripe 1','pants medium','socks light','socks medium','socks dark','socks stripe 1 light','socks stripe 1 medium','socks stripe 1 dark','socks stripe 2 light','socks stripe 2 medium','socks stripe 2 dark','helmet medium','helmet dark']
NAME={144+i:(n,'NHL9XStudio pc-jersey.js ZONES') for i,n in enumerate(ZN)}
for r in range(4):
  for c in range(5):NAME[192+r*16+c]=(f'crest r{r+1}c{c+1}','pc-jersey.js CREST')
GUESS={0:'black outline',1:'light grey',8:'skate blade dark',28:'blade dark 2',88:'ice shadow',
 133:'skin light',134:'skin medium',135:'skin dark',136:'stick / skin darkest',137:'skin/stick ramp',138:'skin/stick ramp',139:'skin/stick ramp',140:'skin shadow'}
NAME[255]=('transparent','pc95.js skips 255')
for k,v in GUESS.items():NAME.setdefault(k,(v,'GUESS from 94G/93G vs 95 PC aligned frames + BMP position'))
B=Image.open(paths.ABDUL+'abdul_palette.bmp');a=np.array(B);P=np.array(B.getpalette()).reshape(-1,3)
U=sorted(set(a.flatten().tolist()));cnt=collections.Counter(a.flatten().tolist())
with open(OUT+'abdul_palette_indices.csv','w',newline='') as f:
  w=csv.writer(f);w.writerow(['index','r','g','b','pixels_in_bmp','pc_zone','source'])
  for i in U:w.writerow([i,*P[i],cnt[i],*NAME.get(i,('?','unknown'))])
SC=12;bh,bw=a.shape;left=Image.fromarray(np.array([[P[v] for v in row] for row in a],dtype='uint8')).resize((bw*SC,bh*SC),Image.NEAREST)
d0=ImageDraw.Draw(left)
for y in range(bh):
  for x in range(bw):
    if a[y,x]!=255 and a[y,x] not in range(192,256):pass
# label crest grid and a few anchors directly on the image is too dense; numbered table instead
rows=[i for i in U]
half=(len(rows)+1)//2;RH=24;W=990;H=max(bh*SC,half*RH)+70
im=Image.new('RGB',(W,H),(255,255,255));im.paste(left,(5,40));d=ImageDraw.Draw(im)
d.text((5,6),"Abdul's palette BMP (20x36, x12) - pixels are 95 PC palette indices; swatches = his guide colours",fill=(0,0,0),font=F(15))
cx=[bw*SC+20,bw*SC+20+(W-bw*SC-20)//2]
for j,i in enumerate(rows):
  x=cx[j//half];y=40+(j%half)*RH;c=tuple(int(t) for t in P[i])
  d.rectangle([x,y,x+34,y+RH-3],fill=c,outline=(0,0,0))
  n,src=NAME.get(i,('?',''));g='?' if src.startswith('GUESS') else ''
  d.text((x+40,y+2),f"{i:>3} {n}{' (guess)' if g else ''}"[:32],fill=(0,0,0),font=F(14))
im.save(OUT+'abdul_palette_labeled.png');print(im.size,len(U))
