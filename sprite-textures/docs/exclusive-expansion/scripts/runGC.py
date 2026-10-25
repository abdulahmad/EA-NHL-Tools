import sys,json,numpy as np;sys.path.insert(0,'/workspace/preview_v2/exclusive_samples')
import expand as E,render as RD
from PIL import Image,ImageDraw
from parts import segment,PN
from cooc import crop,A,rows
from scipy import ndimage as ndi
F_=RD.F_;PAL=RD.PAL;SC=4
PCOL={'goalie_mask':(255,230,0),'helmet':(255,255,255),'skin':(240,180,140),'torso':(0,90,255),'sleeve':(120,200,255),'pants':(150,60,200),'sock':(255,140,0),
 'skate':(120,120,120),'skate_blade':(200,200,200),'stick':(170,110,60),'outline':(30,30,30),'shadow':(70,70,110),'crest':(255,0,255)}
def pc(q):return RD.ng(np.where((q!=255)[...,None],PAL[q],40).astype(np.uint8))
def zon(q,n):
  part,_=segment(n,q);o=np.full(q.shape+(3,),40,np.uint8)
  for i,nm in enumerate(PN):
    if (part==i).any():o[part==i]=PCOL.get(nm,(200,200,200))
  o[q==255]=40;return o,{PN[i]:int((part==i).sum()) for i in np.unique(part) if i}
def put(im,a,x,y):e=Image.fromarray(a).resize((a.shape[1]*SC,a.shape[0]*SC),Image.NEAREST);im.paste(e,(x,y));return e.size
OUT={}
# --- B goalies: translated frame + PC zone segmentation (texture mapping NOT run, see METHOD) ---
GS=[('G94',711,'94G gslambot'),('G94',665,'94G ghighl'),('S94',705,'94S gcover'),('S94',733,'94S gbutterfly')]
im=Image.new('RGB',(1000,90+len(GS)*300),(15,15,15));d=ImageDraw.Draw(im)
d.text((8,6),'Goalie exclusives -> 95PC indices and zones',font=F_(22),fill='white')
d.text((8,36),'cols: console original (index grey) | translated PC-index frame (Leafs pal) | PC zone labels',font=F_(15),fill='white')
d.text((8,58),'zones: mask yellow, helmet white, skin tan, torso blue, sleeve light blue, pants purple, pads orange',font=F_(15),fill='white')
y=90
for src,n,t in GS:
  g,q,c=E.synth(src,n);z,cnt=zon(q,1);lc=int((c[g!=0]<0.5).sum())
  d.text((8,y),f'{t} ({src} {n})  px {int((g!=0).sum())}  conf<0.5: {lc}',font=F_(17),fill='white');x=8
  for a in (RD.grey(g),pc(q),z):w,h=put(im,a,x,y+26);x+=w+30
  OUT[f'{src}_{n}']=dict(title=t,px=int((g!=0).sum()),lowconf=lc,zones=cnt);y+=300
im.save('B_goalies.png')
# --- C: redraw S94 skater exclusives in 95PC style ---
CS=[(796,'94S pump2 (celebration)'),(529,'94S crosscheck')]
im=Image.new('RGB',(1000,90+len(CS)*290),(15,15,15));d=ImageDraw.Draw(im)
d.text((8,6),'94S exclusive -> redrawn in 95PC style (proof of concept)',font=F_(22),fill='white')
d.text((8,36),'cols: SNES original (index grey) | redrawn (PC indices, Leafs pal) | closest PC frame (Leafs pal)',font=F_(15),fill='white')
d.text((8,58),'redraw = scale to closest PC pose height, then translate to PC shading bands',font=F_(15),fill='white')
y=90
for n,t in CS:
  r=rows[('S94',n)]['PC'];p=crop(A['PC'][r['best']],'PC')
  if r['mirror']:p=p[:,::-1]
  g,q,c=E.synth('S94',n);k=p.shape[0]/g.shape[0]
  if abs(k-1)>0.08:  # nearest upscale of the translated index map
    H=round(g.shape[0]*k);W=round(g.shape[1]*k);yy=(np.arange(H)/k).astype(int).clip(0,g.shape[0]-1);xx=(np.arange(W)/k).astype(int).clip(0,g.shape[1]-1);q=q[yy][:,xx]
  d.text((8,y),f'{t} (S94 {n}) vs PC {r["best"]} (match {r["score"]:.2f}); scale {k:.2f}',font=F_(17),fill='white');x=8
  for a in (RD.grey(g),pc(q),pc(p)):w,h=put(im,a,x,y+26);x+=w+40
  OUT[f'C_S94_{n}']=dict(title=t,pc=int(r['best']),score=float(r['score']),scale=float(k),s94=list(g.shape),pcshape=list(p.shape));y+=290
im.save('C_redraw.png');json.dump(OUT,open('B_goalies_C.json','w'),indent=1);print(json.dumps(OUT))
