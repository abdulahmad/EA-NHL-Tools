import os,sys;sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)));import paths
import json,pickle,numpy as np
from PIL import Image,ImageDraw,ImageFont
OUT=paths.STATUS
R=json.load(open(paths.WORK+'recon.json'));GENPAL={int(k):tuple(v) for k,v in R['genpal'].items()}
U={n:(a,f,al,mp) for n,a,f,al,mp in pickle.load(open(paths.WORK+'recon.pkl','rb'))}
A,S=paths.frames();G93=A['G93']
PCP=np.load(paths.PCPAL).astype(int)
B=Image.open(paths.ABDUL+'abdul_palette.bmp');BP=np.array(B.getpalette()).reshape(-1,3)
GUIDE={tuple(int(x) for x in BP[i]):i for i in sorted(set(np.array(B).flatten().tolist()))}
F=paths.font
MAPC={'pc':(45,45,45),'shared':(45,45,45),'genesis':(255,220,0),'other':(235,0,200),'missing':(0,160,255),'':(150,150,150)}
best={}
for r in R['results']:
  f=r['frame']
  if r['layer']=='Layer 33':continue   # duplicate of Layer 30 (374); listed in the report
  if f not in best or (r['done_pct'],r['kind']=='PC_PAL')>(best[f]['done_pct'],best[f]['kind']=='PC_PAL'):best[f]=r
FR=[list(range(633,645)),list(range(353,377))]
SC=3
def render(f,r):
  g=G93[f];h,w=g.shape
  ret=np.full((h,w,3),150);
  for v,c in GENPAL.items():ret[g==v]=c
  ret[g==0]=150
  if r is None:return ret,None,None
  a,_,al,mp=U[r['layer']];s,mir,y,x=al
  g=g[:,::-1] if mir else g
  pv=np.full((h,w,3),150);st=np.full((h,w,3),150)
  for gy in range(h):
    for gx in range(w):
      if not g[gy,gx]:continue
      ly,lx=gy+y,gx+x                          # mp/al are in the retail frame's (possibly mirrored) orientation
      c=tuple(int(t) for t in a[ly,lx,:3]) if 0<=ly<a.shape[0] and 0<=lx<a.shape[1] else (150,150,150)
      k=mp[gy,gx]
      if k in('pc','shared'):
        i=GUIDE.get(c,c[0]);pv[gy,gx]=PCP[i]
      else:pv[gy,gx]=c
      st[gy,gx]=MAPC[k]
  if mir:pv=pv[:,::-1];st=st[:,::-1]
  return ret,pv,st
for si,frames in enumerate(FR):
  cells=[]
  for f in frames:
    r=best.get(f);ret,pv,st=render(f,r)
    cells.append((f,r,ret,pv,st))
  W=984;pos=[];X=0;Y=0;rowh=0
  for c in cells:
    f,r,ret,pv,st=c;w=ret.shape[1];h=ret.shape[0];sc=3 if 3*w*3+12<=W-12 else 2
    cw=max(3*w*sc+18,250);chh=h*sc+48
    if X+cw>W:X=0;Y+=rowh+10;rowh=0
    pos.append((X+6,Y+4,sc));X+=cw;rowh=max(rowh,chh)
  rows_h=Y+rowh+10
  im=Image.new('RGB',(W,rows_h+150),(255,255,255));d=ImageDraw.Draw(im)
  for (f,r,ret,pv,st),(X,Y,sc) in zip(cells,pos):
    stt=r['status'] if r else 'NO LAYER';pct=f" {r['done_pct']:.0f}% PC" if r and r['status']=='PARTIAL' else ''
    d.text((X,Y),f"93:{f} {stt}{pct}",fill=(0,0,0),font=F(17))
    d.text((X,Y+20),((r['layer']+(' - NAME != PIXELS' if r['flag'] else '')) if r else 'not in PSD')[:40],fill=(0,0,0),font=F(13))
    xx=X
    for p in (ret,pv,st):
      if p is not None:
        pi=Image.fromarray(p.astype('uint8')).resize((p.shape[1]*sc,p.shape[0]*sc),Image.NEAREST);im.paste(pi,(xx,Y+40))
      xx+=ret.shape[1]*sc+6
  y=rows_h+6
  title=['Injury 633-644 (NHLPA 93, bloody)','Fights 353-370 + fight injury 371-376 (NHLPA 93)'][si]
  d.text((6,y),title+': retail 93 | Abdul PSD as 95 PC (TOR) | status',fill=(0,0,0),font=F(14));y+=26
  x=6
  for lab,c in [('PC index done',MAPC['pc']),('Genesis colour left',MAPC['genesis']),('off-palette colour',MAPC['other']),('hole / transparent',MAPC['missing'])]:
    d.rectangle([x,y,x+26,y+22],fill=c,outline=(0,0,0));d.text((x+32,y+2),lab,fill=(0,0,0),font=F(15));x+=d.textlength(lab,font=F(15))+52
  y+=30
  d.text((6,y),'FULL = every pixel a 95 PC index; PARTIAL = mix (% = PC share); NONE = Genesis colours only.',fill=(0,0,0),font=F(14));y+=22
  d.text((6,y),'Best PSD layer shown per frame (overlays such as PC Head / PC Crest composited in place).',fill=(0,0,0),font=F(14))
  im.save(OUT+f'status_{["injury","fights"][si]}.png');print(im.size)
