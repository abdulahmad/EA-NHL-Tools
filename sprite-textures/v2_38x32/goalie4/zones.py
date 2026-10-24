import sys;sys.path.insert(0,'../scripts')
from lib import *
from PIL import ImageDraw,ImageFont
FRG=[413,416,422,428,449,519,980,1000]
B=lambda s:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',s)
sp=spritepal(team('chi'))
fam=lambda i:' '.join(w for w in ZN[str(i)].split() if w not in('light','dark','medium')) if str(i) in ZN else f'idx{i}'
groups={}
for n in FRG:
  p=frame(n)
  for i in set(p[p!=255].tolist()):groups.setdefault(fam(i),set()).add(i)
G=sorted(groups)
sc=5
rows=[]
for g in ['ALL']+G:
  ims=[]
  for n in FRG:
    p=frame(n);m=p!=255;a=np.zeros(p.shape+(3,),np.uint8);a[:]=(40,40,40)
    if g=='ALL':a[m]=sp[p[m]]
    else:
      a[m]=(90,90,90);s=np.isin(p,list(groups[g]));a[s]=(255,255,0)
    ims.append(Image.fromarray(a).resize((p.shape[1]*sc,p.shape[0]*sc),Image.NEAREST))
  rows.append((g,ims))
W=150+8*(33*sc);H=len(rows)*(44*sc*0+ 45*sc//1)
per=6
for k in range(0,len(rows),per):
  ch=rows[k:k+per];Im=Image.new('RGB',(150+8*34*sc,len(ch)*(44*sc+6)),(20,20,20));d=ImageDraw.Draw(Im)
  for r,(g,ims) in enumerate(ch):
    y=r*(44*sc+6);d.text((4,y+4),g.replace(' ','\n'),fill='white',font=B(20))
    d.text((4,y+80),' '.join(map(str,sorted(groups.get(g,[])))),fill=(0,200,255),font=B(14))
    for j,im in enumerate(ims):Im.paste(im,(150+j*34*sc,y))
  Im=Im.resize((1000,int(Im.height*1000/Im.width)),Image.NEAREST);Im.save(f'/workspace/preview_v2/goalie4/zones_{k//per}.png')
print(G)
