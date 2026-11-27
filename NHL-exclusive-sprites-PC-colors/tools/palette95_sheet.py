"""Draw ../status/palette95_rink.png from the rows palette95.py makes (or from ../status/palette95_indices.csv)."""
import os,sys,csv
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import paths
from PIL import Image,ImageDraw
BLOOD={83:'B1',78:'B2',76:'b1'}   # recommended (B) and alternative (b), see PALETTE95.md
def is_red(r):
  i=int(r['index']);R,G,B=int(r['r']),int(r['g']),int(r['b'])
  return i<128 and R>=64 and G<=R*0.5 and B<=R*0.5
def draw(rows,out=None):
  out=out or os.path.join(paths.STATUS,'palette95_rink.png')
  rows=[{k:(int(v) if k not in('role','maps_to') else v) for k,v in r.items()} for r in rows]
  RG={r['index']:(r['r'],r['g'],r['b']) for r in rows}
  CW,CH,X0=58,46,32;W=X0*2+16*CW
  f_h,f_i,f_s,f_t=paths.font(24),paths.font(17),paths.font(13),paths.font(30)
  secs=[('Fixed rink colours 0-127 (same for every team)',range(0,128)),
        ('Shared skin / stick 128-143 (fixed, game colour)',range(128,144)),
        ('Team zones 144-191 (swapped per team: no fixed colour)',range(144,192)),
        ('Crest / logo 192-254 (team), 255 transparent',range(192,256))]
  H=70+sum(44+((len(s)+15)//16)*CH+10 for _,s in secs)+250
  im=Image.new('RGB',(W,H),(255,255,255));d=ImageDraw.Draw(im)
  d.text((X0,16),'95 PC palette: what each sprite index shows on the ice',font=f_t,fill=(0,0,0))
  y=70
  for title,rng in secs:
    d.text((X0,y+8),title if len(title)<64 else title,font=f_h,fill=(0,0,0));y+=44
    for k,i in enumerate(rng):
      r=rows[i];x=X0+(k%16)*CW;yy=y+(k//16)*CH
      if i<128:c=RG[i]
      elif i<144:c=RG[int(r['maps_to'])]
      elif i==255:c=(255,255,255)
      else:c=(200,200,200)
      d.rectangle([x,yy,x+CW-3,yy+CH-3],fill=c,outline=(0,0,0))
      lum=0.299*c[0]+0.587*c[1]+0.114*c[2];tc=(0,0,0) if lum>110 else (255,255,255)
      d.text((x+4,yy+3),str(i),font=f_i,fill=tc)
      tag=[]
      if r['player_px']>0 and i!=255:tag.append('P')
      if i<128 and r['player_px']+r['rink_px']+r['other_px']==0:tag.append('-')
      if i in BLOOD:tag.append(BLOOD[i])
      if tag:d.text((x+4,yy+CH-20),' '.join(tag),font=f_s,fill=tc)
      if i in(8,82,88) or 251<=i<=254:
        d.line([x,yy,x+CW-3,yy+CH-3],fill=tc,width=3)
      if is_red(r) and i not in(8,82,88):
        d.rectangle([x-1,yy-1,x+CW-2,yy+CH-2],outline=(255,215,0),width=4)
        d.rectangle([x+3,yy+3,x+CW-7,yy+CH-7],outline=(0,0,0),width=1)
    y+=((len(rng)+15)//16)*CH+10
  L=['Gold frame = red, dark-red or red-orange fixed colour (blood candidate)','P = used by 95 PC player sprites    - = not used by any art counted',
     'B1, B2 = recommended blood (Genesis 29 -> 83, Genesis 28 -> 78)    b1 = alternative for 29 (76)',
     'Diagonal line = not usable: 8/82/88 remap to blade/shadow, 251-254 map to 0','Grey = team-swapped, no fixed colour. 128-143 black = maps to 0.','Colours: RINKPAL.QFS (= PAL-To-ACT rinkpal.act), 6-bit x 4']
  y+=6
  for t in L:d.text((X0,y),t,font=f_s if False else paths.font(17),fill=(0,0,0));y+=30
  im=im.crop((0,0,W,y+10));im.save(out);print('wrote',out,im.size)
if __name__=='__main__':
  draw(list(csv.DictReader(open(os.path.join(paths.STATUS,'palette95_indices.csv')))))
