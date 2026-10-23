# local sheet: enlarged back-/front-facing goalie heads (measured box, centred per column) next to mask_b / goalie_mask textures, 1 sprite px = 1 texel = S screen px (square)
import json,numpy as np,mask_back_v9 as MB,measure_ref as M
from build_v4 import *
from PIL import Image,ImageDraw
S=12;E=json.load(open('data/goalie_head_extent.json'));sp=spritepal(team('edm'))
def head(n,box):
    p=np.pad(frame(int(n)),1,constant_values=255)
    x0,y0,x1,y1=box;c=p[y0:y1+2,x0:x1+2];o=np.full(c.shape+(3,),40,np.uint8);m=c!=255;o[m]=sp[c[m]]
    return Image.fromarray(o).resize((c.shape[1]*S,c.shape[0]*S),Image.NEAREST)
def tex(path):a=Image.open(path).convert('RGB');return a.resize((a.width*S,a.height*S),Image.NEAREST)
def row(title,ns,texs):
    ims=[(str(n),head(n,E[n]['box'])) for n in ns]+texs;CW=max(i.width for _,i in ims)+16;RH=max(i.height for _,i in ims)+22
    R=Image.new('RGB',(CW*len(ims),RH+18),(25,25,25));d=ImageDraw.Draw(R);d.text((4,2),title,fill='white')
    for k,(t,i) in enumerate(ims):x=k*CW+(CW-i.width)//2;R.paste(i,(x,18+20+(RH-22-i.height)//2));d.text((k*CW+4,22),t,fill=(255,255,0))
    return R
back=[n for n,d in E.items() if d['view']=='back' and d['w']<=7 and d['h']<=7];front=[n for n,d in E.items() if d['view']=='front']  # back: drop blobs merged with body (outliers);front=[n for n,d in E.items() if d['view']=='front']
pick=lambda L:[L[int(i)] for i in np.linspace(0,len(L)-1,min(10,len(L)))]
ref=Image.open(M.R+MB.REF).convert('RGB').crop(MB.BOX).resize((5*S*2,6*S*2))
r1=row(f'BACK-facing goalie heads ({len(back)} frames; median 5x6 px) -> mask_b 5x6',pick(back),[('mask_b 5x6',tex('v10/tex_gear_mask_b.png')),('old mask_b 7x6',tex('v9/tex_gear_mask_b.png'))])
r2=row(f'FRONT-facing goalie heads ({len(front)} frames; median 5x8 px) vs goalie_mask',pick(front),[('goalie_mask v10 6x7',tex('v10/tex_gear_goalie_mask.png')),('old 7x6',tex('v8/tex_gear_goalie_mask.png'))])
W=max(r1.width,r2.width);O=Image.new('RGB',(W,r1.height+r2.height+ref.height+30),(25,25,25));O.paste(r1,(0,0));O.paste(r2,(0,r1.height))
O.paste(ref,(10,r1.height+r2.height+24));ImageDraw.Draw(O).text((10,r1.height+r2.height+6),'mask_b reference (local, back of helmet)',fill='white')
O.save('v10/local_goalie_heads_vs_mask.png')
