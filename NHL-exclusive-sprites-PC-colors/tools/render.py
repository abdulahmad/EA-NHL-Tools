import os,sys;sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)));import paths
import pickle,json,numpy as np,pandas as pd,csv,sys
from PIL import Image,ImageDraw,ImageFont
sys.path.insert(0,'.');from zones import Z,BLOOD
A,S=paths.frames()
D=pd.read_pickle(paths.WORK+'cls.pkl')
intra=json.load(open(os.path.join(paths.CENSUS,'intra.json')))
OUT=paths.SHEETS
BG=Z[0][1];W=1000;SC=4

f_h=paths.font(34);f_l=paths.font(17);f_s=paths.font(14);f_lg=paths.font(14)
LUT=np.zeros((64,3),np.uint8)
for k,(n,c) in Z.items(): LUT[32+k]=c
for k,(n,c) in BLOOD.items(): LUT[k]=c
LUT[0]=BG
def zimg(a):
  bad=[int(v) for v in np.unique(a) if v and not (32<v<48 or v in BLOOD)]
  assert not bad,bad
  return Image.fromarray(LUT[a]).resize((a.shape[1]*SC,a.shape[0]*SC),Image.NEAREST)
def anim(r):
  return r.label
def cells_for(rows,extra=None):
  cs=[]
  for r in rows:
    a=A[r.set][r.frame];im=zimg(a)
    t1=f"{'93' if r.set=='G93' else '94G'} #{r.frame}";t2=anim(r);t3=extra(r) if extra else None
    tw=max(ImageDraw.Draw(im).textlength(t,font=f) for t,f in [(t1,f_l),(t2,f_s)]+([(t3,f_s)] if t3 else []))
    w=int(max(im.width,tw))+8;lh=20+17+(17 if t3 else 0)
    cs.append(dict(im=im,w=w,h=im.height+lh,t=[(t1,f_l,(255,255,255)),(t2,f_s,(255,255,180))]+([(t3,f_s,(200,230,255))] if t3 else []),lh=lh))
  return cs
def legend_strip(blood=False):
  items=list(Z.items())[1:]+ (list(BLOOD.items()) if blood else [])
  cols=3;rh=26;rows=(len(items)+cols-1)//cols
  im=Image.new('RGB',(W,rows*rh+10),(40,40,40));d=ImageDraw.Draw(im)
  for i,(k,(n,c)) in enumerate(items):
    x=8+(i%cols)*331;y=5+(i//cols)*rh
    d.rectangle([x,y,x+28,y+20],fill=c,outline=(255,255,255))
    idx=f'{k:>2}' if k<32 and not (blood and (k,n) in BLOOD.items()) else f'{k}'
    lab=(f'L{0 if k<16 else 1}:{k%16}' if (k,(n,c)) in BLOOD.items() else f'{k}')+' '+n.replace(' (team colour A)','').replace(' (natural wood)','')
    d.text((x+34,y+1),lab[:36],fill=(255,255,255),font=f_lg)
  return im
def pages(title,rows,stem,extra=None,blood=False,maxh=1300):
  cs=cells_for(rows,extra);leg=legend_strip(blood)
  # flow layout
  placed=[];x=10;y=0;rh=0;line=[]
  lines=[]
  for c in cs:
    if x+c['w']>W-10 and line:lines.append((line,rh));line=[];x=10;rh=0
    line.append((x,c));x+=c['w']+14;rh=max(rh,c['h'])
  if line:lines.append((line,rh))
  out=[];pg=[];hh=0;HEAD=60
  for ln in lines:
    if pg and HEAD+hh+ln[1]+12+leg.height>maxh:out.append(pg);pg=[];hh=0
    pg.append(ln);hh+=ln[1]+12
  if pg:out.append(pg)
  files=[]
  for pi,pg in enumerate(out):
    H=HEAD+sum(l[1]+12 for l in pg)+leg.height+6
    P=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(P)
    d.rectangle([0,0,W,HEAD-6],fill=(20,20,20))
    d.text((10,8),f'{title}  ({pi+1}/{len(out)})',fill=(255,255,255),font=f_h)
    y=HEAD
    for line,rh in pg:
      for x,c in line:
        ty=y
        for t,f,col in c['t']:
          d.text((x,ty),t,fill=col,font=f,stroke_width=2,stroke_fill=(0,0,0));ty+=20 if f is f_l else 17
        P.paste(c['im'],(x+(c['w']-c['im'].width)//2,y+c['lh']+(rh-c['h'])))
      y+=rh+12
    P.paste(leg,(0,H-leg.height))
    fn=f'{OUT}{stem}_{pi+1}.png';P.save(fn);files.append(fn);print(fn,P.size)
  return files
g94=D[(D.set=='G94')&(D.status=='exclusive')].sort_values('frame')
g93=D[(D.set=='G93')].sort_values('frame')
unc=D[(D.status=='uncertain')].sort_values('frame')
F1=pages('94 GENESIS ONLY (not in 95 PC)',list(g94.itertuples()),'sheet_94G_only')
F2=pages('NHLPA 93 ONLY (not in 94G or 95 PC)',list(g93.itertuples()),'sheet_93_only',blood=True)
F3=pages('UNCERTAIN: 94G, similar frame in 95 PC',list(unc.itertuples()),'sheet_uncertain_94G',extra=lambda r:f'~PC #{int(r.PC_best)-1}' if not (539<=r.frame<=562 or r.frame in (381,382,383)) else ('PC 538-553' if r.frame>=539 else f'PC #{r.frame-1} differs'))   # PC numbers 0-based
