import sys,json,pickle,struct,numpy as np
sys.path[:0]=['/workspace/g94-to-pc-zones/v4/work','/workspace/g94-to-pc-zones/v5/final3j/work','/workspace/g94-to-pc-zones/v5/final3c/work','/workspace/g94-to-pc-zones/v5/x95']
from PIL import Image,ImageDraw,ImageFont
import viz
from teams import teamact
A=pickle.load(open('/workspace/preview_v2/platform_unique/v2/all.pkl','rb'))[0]
FB=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',30)
FM_=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',15)
FS=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',12)
FT=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',20)
BG=(222,228,236);ICE=BG
BOS=np.array(teamact('bos','h')).astype(np.uint8)
def paint_pc(idx,sc):
  H,W=idx.shape;o=np.zeros((H,W,4),np.uint8)
  m=(idx!=255)&(idx>=0);o[m,:3]=BOS[np.clip(idx[m],0,255)];o[m,3]=255
  return Image.fromarray(o).resize((W*sc,H*sc),Image.NEAREST)
def paint_gen(raw,pal,sc):
  im=viz.render(raw,pal);return im.resize((im.width*sc,im.height*sc),Image.NEAREST)
import pandas as pd
_d=pd.read_csv('/workspace/EA-NHL-Tools/sprite-textures/docs/platform-census/frames_matrix.csv');_pc=_d[(_d.set=='PC')&(_d.empty==False)].set_index('frame')
CAT={int(k):str(v) for k,v in _pc.category.items()}
def iou_(a,pm,dy,dx):
  H,W=a.shape;h,w=pm.shape;y0,y1=max(0,dy),min(H,h+dy);x0,x1=max(0,dx),min(W,w+dx)
  if y1<=y0 or x1<=x0:return 0
  sub=pm[y0-dy:y1-dy,x0-dx:x1-dx];inter=(a[y0:y1,x0:x1]&sub).sum();return inter/(a.sum()+pm.sum()-inter)
def nearest(img,kind):
  a=img>0;na=a.sum();gy,gx=np.nonzero(a);best=(0,None);okc=('goalie',) if kind=='goalie' else ('player','celebration','injury','fight')
  for k,p in A['PC'].items():
    if CAT.get(k) not in okc:continue
    pm0=p!=255;n=pm0.sum()
    if abs(n-na)>0.25*na or abs(pm0.shape[0]-a.shape[0])>6 or abs(pm0.shape[1]-a.shape[1])>8:continue
    for mir in (False,True):
      pm=pm0[:,::-1] if mir else pm0;ys,xs=np.nonzero(pm);cy,cx=int(round(gy.mean()-ys.mean())),int(round(gx.mean()-xs.mean()))
      for dy in range(cy-2,cy+3):
        for dx in range(cx-2,cx+3):
          v=iou_(a,pm,dy,dx)
          if v>best[0]:best=(v,dict(pc=k,mir=mir,dy=dy,dx=dx,iou=float(v)))
  return best[1]
def pc_ref(info,shape,gen_mask):
  """PC frame placed on the Genesis canvas using the alignment (-1 outside)."""
  p=A['PC'][info['pc']];W=p.shape[1];out=-np.ones(shape,int)
  for py,px in zip(*np.nonzero(p!=255)):
    x=W-1-px if info['mir'] else px;gy,gx=py+info['dy'],x+info['dx']
    if 0<=gy<shape[0] and 0<=gx<shape[1]:out[gy,gx]=p[py,px]
  return out
def build(game,gpal,results,out,title,legend_roles,SC=3,foot=()):
  R=json.load(open(results));K0={'95':950000,'96':960000}[game]
  F94,F95,F96=pickle.load(open('/workspace/g94-to-pc-zones/v5/x95/frames.pkl','rb'));F={'95':F95,'96':F96}[game]
  m=pickle.load(open(f'/workspace/g94-to-pc-zones/v5/x95/match{game}.pkl','rb'))
  cell=40*SC+10;rowh=40*SC+52;lab=70
  sideW=lab+3*cell+10;rows_per=(len(R)+1)//2
  Wd=2*sideW;head=70;legh=250
  S=Image.new('RGB',(Wd,head+rows_per*rowh+legh+200),BG);d=ImageDraw.Draw(S)
  d.text((10,8),title,fill=(0,0,0),font=FT)
  for side in range(2):
    x0=side*sideW
    for j,l in enumerate('ABC'):
      d.text((x0+lab+j*cell+cell//2-10,34),l,fill=(0,0,0),font=FB)
  for k,r in enumerate(R):
    side=k//rows_per;row=k%rows_per;x0=side*sideW;y0=head+row*rowh
    raw=F[r['frame']]['img'];idx=np.load(f'/workspace/g94-to-pc-zones/v5/x95/out/{game}/g{game}_{r["frame"]}_pcidx.npy')
    d.text((x0+4,y0+4),f"{r['frame']}",fill=(0,0,0),font=FM_)
    d.text((x0+4,y0+22),r['kind'][:6],fill=(0,0,0),font=FS)
    imA=paint_gen(raw,gpal,SC);imB=paint_pc(idx,SC)
    cref=None;cap=''
    if r.get('partner'):
      cref=pc_ref(r['partner'],raw.shape,None);cap=f"PC {r['partner']['pc']-1} IoU {r['partner']['iou']:.2f}"
    else:
      o=nearest(raw,r['kind'])
      if o:
        cref=pc_ref(o,raw.shape,None);cap=f"nearest PC {o['pc']-1} (other pose) IoU {o['iou']:.2f}"
    imC=paint_pc(cref,SC) if cref is not None else None
    for j,im in enumerate((imA,imB,imC)):
      cx=x0+lab+j*cell;cy=y0+30
      d.rectangle([cx,cy,cx+cell-6,cy+40*SC+2],outline=(150,155,165))
      if im is not None:
        S.paste(im,(cx+(cell-6-im.width)//2,cy+(40*SC+2-im.height)//2),im)
    sc=r.get('score_final3k')
    t=(f"vs PC {sc['vs_pc']}%  (n={sc['px']} px)" if sc else 'no same-pose PC frame')
    d.text((x0+lab,y0-2),t,fill=(0,0,0),font=FM_)
    d.text((x0+lab,y0+13),'C = '+cap,fill=(40,40,40),font=FS)
  # legends
  ly=head+rows_per*rowh+8
  d.text((10,ly),'A: Genesis line-2 palette (BOS home) and the 94G index it was mapped to',fill=(0,0,0),font=FM_)
  for i,(idx,name) in enumerate(legend_roles):
    x=10+(i%7)*134;y=ly+24+(i//7)*52
    c=gpal[idx-32] if False else gpal[idx]
    d.rectangle([x,y,x+26,y+26],fill=tuple(c),outline=(0,0,0))
    d.text((x+30,y),f"{idx}",fill=(0,0,0),font=FM_);d.text((x+30,y+16),name,fill=(0,0,0),font=FS)
  ly2=ly+24+((len(legend_roles)+6)//7)*52+6
  d.text((10,ly2),'B, C: 95 PC colour zones, BOS home (index shown)',fill=(0,0,0),font=FM_)
  zones=[('helmet',190),('jersey',166),('yoke 1',162),('waist 2',172),('arm str 2',151),('upper arm',157),('forearm',145),('pants',178),('socks',182),('sock str 1',185),('skin',133),('stick',136)]
  for i,(n,v) in enumerate(zones):
    x=10+(i%7)*134;y=ly2+24+(i//7)*44
    d.rectangle([x,y,x+26,y+26],fill=tuple(int(t) for t in BOS[v]),outline=(0,0,0))
    d.text((x+30,y),n,fill=(0,0,0),font=FS);d.text((x+30,y+14),str(v),fill=(0,0,0),font=FS)
  yy=ly2+24+((len(zones)+6)//7)*44+4
  for t in foot:
    d.text((10,yy),t,fill=(0,0,0),font=FS);yy+=16
  S=S.crop((0,0,Wd,yy+6));S.save(out);return S.size
