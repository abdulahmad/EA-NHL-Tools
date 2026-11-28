#!/usr/bin/env python3
"""A Genesis / B old (K+J hybrid) / C final3k / D Abdul or 95 PC comparison."""
import os,sys
import numpy as np
from PIL import Image,ImageDraw,ImageFont

sys.path[:0]=[
  '/workspace/g94-to-pc-zones/v5/final3k/work',
  '/workspace/g94-to-pc-zones/v5/final3j/work',
  '/workspace/g94-to-pc-zones/v5/final3j/exclusive/fight',
  '/workspace/g94-to-pc-zones/v5/final3c/work',
  '/workspace/g94-to-pc-zones/v4/work',
]
from build_fight import paint,paint_g,big,decode_with_origin
from teams import teamact
from percolor import A

BOS=teamact('bos','h')
ICE=(168,196,214)
J3J='/workspace/g94-to-pc-zones/v5/final3j/'
J3K='/workspace/g94-to-pc-zones/v5/final3k/'
ABDIR='/workspace/wt-exclusive/NHL-exclusive-sprites-PC-colors/frames_pc/'
OUT=J3K+'exclusive/'

# colour-blind-safe (Wong): blue, orange, reddish-purple, black — not red next to green
COL={
  'A':(0,114,178),
  'B':(230,159,0),
  'C':(204,121,167),
  'D':(0,0,0),
}
FB=lambda s: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',s)
FR=lambda s: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',s)
FONTB,FONT,FONTS,FONTT=FB(16),FB(13),FR(11),FB(20)

def T(d,x,y,s,font,fill=(20,20,30)):
  d.text((x,y),s,fill=fill,font=font)

def bbox_union(*masks):
  ys=[]; xs=[]
  for m in masks:
    yy,xx=np.where(m)
    if len(xx):
      ys.append(yy); xs.append(xx)
  if not ys: return None
  ys=np.concatenate(ys); xs=np.concatenate(xs)
  y0,y1=int(ys.min()),int(ys.max())+1
  x0,x1=int(xs.min()),int(xs.max())+1
  # 1px pad if room
  return y0,y1,x0,x1

def crop_arr(a, bb, pad=1):
  if bb is None: return a
  y0,y1,x0,x1=bb
  y0=max(0,y0-pad); x0=max(0,x0-pad)
  y1=min(a.shape[0],y1+pad); x1=min(a.shape[1],x1+pad)
  return a[y0:y1,x0:x1]

def tile_idx(idx, z):
  return big(paint(idx, BOS), z)

def tile_g(g, z):
  return big(paint_g(g), z)

def pad(im, w, h, bg=ICE):
  p=Image.new('RGB',(w,h),bg)
  p.paste(im,((w-im.width)//2,(h-im.height)//2))
  return p

def load_abdul(n):
  p=ABDIR+f'93_{n}.png'
  if not os.path.exists(p):
    return None
  idx=np.array(Image.open(p)).astype(np.int16)
  if n==354:
    idx[idx==194]=190; idx[idx==195]=191
  return idx

def blank_tile(w,h,msg):
  im=Image.new('RGB',(w,h),ICE)
  d=ImageDraw.Draw(im)
  T(d,6,h//2-8,msg,FONTS,(40,40,50))
  return im

def main():
  fight_ids=[353,358,363,366,367,369]
  excl_ids=[805,823,797,765,749,781,835]  # one from each exclusive skater anim
  sprites=decode_with_origin('/workspace/NHLPA93Genesis/Extracted/Graphics/Sprites.anim', fight_ids)

  # collect cells: (section, label, tags, tiles[A,B,C,D], note)
  rows=[]
  for n in fight_ids:
    g=sprites[n]['img']
    old=np.load(J3J+f'exclusive/fight/npy/g93_{n}_pcidx.npy')
    new=np.load(J3K+f'exclusive/fight/g93_{n}_pcidx.npy')
    ab=load_abdul(n)
    dlt=int((old!=new).sum())
    z=4
    masks=[g>0, old!=255, new!=255]
    if ab is not None: masks.append(ab!=255)
    bb=bbox_union(*masks)
    g=crop_arr(g,bb); old=crop_arr(old,bb); new=crop_arr(new,bb)
    Aim=tile_g(g,z); Bim=tile_idx(old,z); Cim=tile_idx(new,z)
    if ab is not None and (ab!=255).any():
      ab=crop_arr(ab,bb)
      Dim=tile_idx(ab,z)
      dlab='Abdul pixels only' if (ab==255).any() and (ab!=255).sum()< (g>0).sum() else 'Abdul'
    else:
      Dim=None; dlab='no Abdul frame'
    note=f'{dlt} px changed'
    rows.append(('93G fight AUTO', f'93G {n}', note, (Aim,Bim,Cim,Dim), dlab, z))

  for n in excl_ids:
    g=A['G94'][n].astype(int)
    old=np.load(J3J+f'exclusive/npy/g94_{n}_pcidx.npy')
    new=np.load(J3K+f'exclusive/npy/g94_{n}_pcidx.npy')
    dlt=int((old!=new).sum())
    z=3
    bb=bbox_union(g>0, old!=255, new!=255)
    g=crop_arr(g,bb); old=crop_arr(old,bb); new=crop_arr(new,bb)
    Aim=tile_g(g,z); Bim=tile_idx(old,z); Cim=tile_idx(new,z)
    rows.append(('94G exclusive (no 95 PC / no Abdul)', f'94G {n}', f'{dlt} px changed',
                 (Aim,Bim,Cim,None), 'none', z))

  # layout
  W=990
  # header
  header_h=118
  # measure cell sizes
  packed=[]
  for sec,lab,note,tiles,dlab,z in rows:
    ims=[]
    for t in tiles[:3]:
      ims.append(t)
    w=max(t.width for t in tiles[:3])
    h=max(t.height for t in tiles[:3])
    Dim=tiles[3]
    if Dim is None:
      Dim=blank_tile(w,h,dlab)
    else:
      # pad later
      pass
    ims.append(Dim)
    ims=[pad(t,w,h) for t in ims]
    packed.append((sec,lab,note,ims,w,h))

  # 2 frames per row
  gap=8; label_h=36; col_lab_h=16
  row_h=[]
  i=0
  layout=[]
  y=header_h
  cur_sec=None
  while i<len(packed):
    sec=packed[i][0]
    if sec!=cur_sec:
      cur_sec=sec
      y+=28
    # take 1 or 2 depending on width
    pair=[packed[i]]; i+=1
    if i<len(packed) and packed[i][0]==sec:
      wneed=8+sum(p[4]*4+gap*3+14 for p in pair+[packed[i]])
      if wneed<=W-8:
        pair.append(packed[i]); i+=1
    h=max(p[5] for p in pair)+label_h+col_lab_h
    layout.append((y,pair))
    y+=h+10
  H=y+16
  im=Image.new('RGB',(W,H),(255,255,255))
  d=ImageDraw.Draw(im)
  T(d,8,6,'final3k comparison   A Genesis   B old hybrid (K+J)   C new final3k   D Abdul or 95 PC',FONTT)
  T(d,8,32,'BOS home palette.  Numbers from 1 (Genesis) / 0 (PC).  Ice field behind sprites.',FONT)
  T(d,8,52,'Fight AUTO frames use the new model only on unfilled pixels.  ABDUL frames (not in this AUTO set) stay as-is.',FONTS)
  # colour key
  x=8
  for k,name in (('A','A  Genesis'),('B','B  old K+J'),('C','C  final3k'),('D','D  Abdul / PC')):
    d.rectangle([x,74,x+18,90],fill=COL[k],outline=(0,0,0))
    T(d,x+24,74,name,FONT,COL[k] if k!='D' else (20,20,30))
    x+=200

  drawn_sec=None
  for y0,pair in layout:
    sec=pair[0][0]
    y=y0
    if sec!=drawn_sec:
      T(d,8,y-24,sec,FONTB,(20,20,30))
      drawn_sec=sec
    x=8
    for sec,lab,note,ims,w,h in pair:
      T(d,x,y,f'{lab}   {note}',FONT)
      xx=x
      for k,tim in zip('ABCD',ims):
        T(d,xx,y+18,k,FONT,COL[k] if k!='D' else (20,20,30))
        im.paste(tim,(xx,y+label_h))
        xx+=w+gap
      # divider
      d.line([x,y+label_h+h+4,xx-gap,y+label_h+h+4],fill=(200,200,210))
      x=xx+10

  path=OUT+'final3k_compare_ABCD.png'
  if im.width>1000:
    raise SystemExit(f'too wide {im.size}')
  im.save(path)
  print('wrote',path,im.size)

if __name__=='__main__':
  main()
