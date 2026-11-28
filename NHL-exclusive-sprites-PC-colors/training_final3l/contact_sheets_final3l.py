#!/usr/bin/env python3
"""Contact sheets for final3l sister sets. Columns:
  A = Genesis original colours
  G = final3l, arm/sock at Genesis locations, BOS home
  P = final3l, arm/sock at 95 PC locations, BOS home
Each sheet <=1000 px wide. Big frame numbers (Genesis from 1).
Colour-blind-safe high-contrast (Wong: blue / orange / reddish-purple).
"""
import os,sys,csv,shutil
import numpy as np
from PIL import Image,ImageDraw,ImageFont
import pandas as pd

sys.path[:0]=[
  '/workspace/g94-to-pc-zones/v5/final3j/work',
  '/workspace/g94-to-pc-zones/v5/final3c/work',
  '/workspace/g94-to-pc-zones/v4/work',
  '/workspace/g94-to-pc-zones/v5/final3j/exclusive/fight',
]
from teams import teamact
from percolor import A
from build_fight import decode_with_origin, GP

BOS=teamact('bos','h')
ICE=(168,196,214)
COL_A=(0,114,178)      # blue — Genesis
COL_G=(230,159,0)      # orange — Genesis-locations
COL_P=(204,121,167)    # reddish-purple — PC-locations
SRC_COL={'ABDUL':(0,114,178),'PART':(230,159,0),'AUTO':(204,121,167),
         'final3l-hybrid':(80,80,90),'J-goalie':(80,80,90)}
FB=lambda s: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',s)
FR=lambda s: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',s)
FONTB,FONT,FONTS,FONTT,FONTA=FB(16),FB(14),FR(11),FB(18),FB(22)

ROOT='/workspace/g94-to-pc-zones/v5/final3l/'
DIRG=ROOT+'exclusive_genesis_locs/'
DIRP=ROOT+'exclusive_pc_locs/'
OUTS=[
  ROOT+'exclusive/contact_sheets/',
  DIRG+'contact_sheets/',
  DIRP+'contact_sheets/',
]
MAN=list(csv.DictReader(open(DIRG+'manifest.csv')))
SRC={ (r['game'],int(r['frame'])): r['source'] for r in MAN }
EXCSV=pd.read_csv('/workspace/exclusive-frames/exclusive_frames.csv')

LEGEND_TEAM=[
  ('jersey', [165,166,167]),
  ('pants', [177,180]),
  ('socks', [181,182,183]),
  ('helmet', [190,191]),
  ('upper arm', [156,157,158]),
  ('forearm', [144,145,146]),
  ('waist', [168,169,170]),
  ('yoke', [161,162,163]),
  ('arm stripe', [152,153,154]),
  ('sock stripe 1', [184,185,186]),
  ('sock stripe 2', [187,188,189]),
  ('pants stripe', [178,179]),
  ('skin', [133,135]),
]
LEGEND_FIXED=[
  ('black  0',0),('blade  8',8),('stick  136',136),('shadow  88',88),
  ('crest  192',192),('blood dark  76',76),('blood bright  78',78),('ice chips  89',89),
]

NAMES={
  'ghighl':'Goalie high save, left','ghighr':'Goalie high save, right',
  'gstick2l':'Goalie stick save, left','gstick2r':'Goalie stick save, right',
  'gslamtop':'Goalie slammed, from above','gslambot':'Goalie slammed, from below',
  'slambot':'Skater slammed into the boards',
  'boardfront':'Board check, front','boardback':'Board check, back',
  'boardleft':'Board check, left','boardright':'Board check, right',
  'benchcheckl':'Bench check, left','benchcheckl+1':'Bench check, left (extra)',
  'benchcheckl+2':'Bench check, left (extra 2)',
  'benchcheckr':'Bench check, right','benchcheckr+1':'Bench check, right (extra)',
  'crosscheck':'Cross-check',
  'gloves':'Gloves','fight':'Fight','fgrab+6':'Fight ready','fgrab+1':'Fight grab',
  'fhigh+1':'Fight high punch (wind-up)','fhigh':'Fight high punch',
  'flow':'Fight low punch','fhitl':'Fight hit, low','ffall+2':'Fight hit / start fall',
  'ffall+1':'Fight fall','finjury':'Fight injury','injury1 (bloody)':'Injury 1 (bloody)',
}

def T(d,x,y,s,font,fill=(20,20,30)):
  d.text((x,y),s,fill=fill,font=font)

def paint(idx, act, bg=ICE):
  o=np.zeros(idx.shape+(3,),np.uint8); o[:]=bg
  m=(idx!=255)&(idx>=0)
  o[m]=act[np.clip(idx[m],0,255)]
  return o

def paint_g(g, bg=ICE):
  o=np.zeros(g.shape+(3,),np.uint8); o[:]=bg
  m=g>0; o[m]=GP[np.clip(g[m],0,255)]
  return o

def big(arr,z):
  im=Image.fromarray(arr)
  return im.resize((im.width*z, im.height*z), Image.NEAREST)

def bbox(mask, pad=1):
  ys,xs=np.where(mask)
  if len(xs)==0: return None
  y0,y1=max(0,int(ys.min())-pad), min(mask.shape[0], int(ys.max())+1+pad)
  x0,x1=max(0,int(xs.min())-pad), min(mask.shape[1], int(xs.max())+1+pad)
  return y0,y1,x0,x1

def load_idx(dest, game, n):
  p=dest+('93g' if game=='93G' else '94g')+f"/idx/g{'93' if game=='93G' else '94'}_{n}_idx.png"
  return np.array(Image.open(p))

def crop_triple(g, idxG, idxP):
  m=(g>0) | ((idxG!=255)&(idxG>=0)) | ((idxP!=255)&(idxP>=0))
  bb=bbox(m, pad=1)
  if bb is None:
    return g, idxG, idxP
  y0,y1,x0,x1=bb
  return g[y0:y1,x0:x1], idxG[y0:y1,x0:x1], idxP[y0:y1,x0:x1]

def legend(d,x,y):
  T(d,x,y,'BOS home palette',FONTB); y+=22
  T(d,x,y,'A  Genesis colours',FONTS,COL_A); y+=16
  T(d,x,y,'G  Genesis arm/sock',FONTS,COL_G); y+=14
  T(d,x,y,'    locations',FONTS,COL_G); y+=16
  T(d,x,y,'P  95 PC arm/sock',FONTS,COL_P); y+=14
  T(d,x,y,'    locations',FONTS,COL_P); y+=20
  for name,ixs in LEGEND_TEAM:
    T(d,x,y,name,FONTS)
    for j,ix in enumerate(ixs):
      col=tuple(int(v) for v in BOS[ix])
      d.rectangle([x+100+j*18,y,x+114+j*18,y+13],fill=col,outline=(0,0,0))
    y+=16
  y+=8
  T(d,x,y,'Fixed indices',FONTB); y+=20
  for name,ix in LEGEND_FIXED:
    col=tuple(int(v) for v in BOS[ix])
    d.rectangle([x,y,x+14,y+13],fill=col,outline=(0,0,0))
    T(d,x+20,y,name,FONTS)
    y+=16
  y+=10
  T(d,x,y,'On each frame',FONTB); y+=20
  T(d,x,y,'A = Genesis original',FONTS,COL_A); y+=15
  T(d,x,y,'G = arm/sock at',FONTS,COL_G); y+=15
  T(d,x,y,'    Genesis places',FONTS,COL_G); y+=15
  T(d,x,y,'P = arm/sock at',FONTS,COL_P); y+=15
  T(d,x,y,'    95 PC places',FONTS,COL_P); y+=18
  T(d,x,y,'Numbers from 1.',FONTS); y+=15
  T(d,x,y,'Exclusive frames only',FONTS); y+=15
  T(d,x,y,'(no 95 PC counterpart).',FONTS)
  return y

def sheet(title, sections, fn, game='94G', footer=None):
  """sections: list of (section_name, list of (n, g, idxG, idxP, tag))"""
  W=990; LW=210; avail=W-LW-16
  maxw=1
  for _,items in sections:
    for n,g,idxG,idxP,tag in items:
      maxw=max(maxw, g.shape[1], idxG.shape[1], idxP.shape[1])
  # three tiles + 8px gaps + A/G/P letters. Prefer at least 2 frames/row when possible.
  z=4
  while z>2 and (3*(maxw*z+4)+24)*2+8>avail:
    z-=1
  packed=[]
  for sname,items in sections:
    cells=[]
    for n,g,idxG,idxP,tag in items:
      g,idxG,idxP=crop_triple(g,idxG,idxP)
      gi=big(paint_g(g),z)
      cG=big(paint(idxG,BOS),z)
      cP=big(paint(idxP,BOS),z)
      tw=max(gi.width,cG.width,cP.width)
      th=max(gi.height,cG.height,cP.height)
      cells.append((n,tag,gi,cG,cP,tw,th))
    packed.append((sname,cells))

  header_h=110
  y=header_h
  layout=[]
  for sname,cells in packed:
    layout.append(('sec',sname,None)); y+=26
    i=0
    while i<len(cells):
      row=[]; w=0
      while i<len(cells):
        n,tag,gi,cG,cP,tw,th=cells[i]
        labw=int(FONT.getlength(f"94G {cells[i][0]}  ABDUL")+6)
        cw=max(tw*3+24, labw)
        if row and w+cw>avail:
          break
        row.append(cells[i]); w+=cw+8; i+=1
      h=max(c[6] for c in row)+44
      layout.append(('row',None,row)); y+=h+8
  y+=40
  H=y+8
  im=Image.new('RGB',(W,H),(255,255,255))
  d=ImageDraw.Draw(im)
  T(d,8,6,title,FONTT)
  T(d,8,30,'A = Genesis original.   G = final3l, arm/sock at Genesis locations.   P = final3l, arm/sock at 95 PC locations.',FONT)
  T(d,8,50,'BOS home.  Numbers count from 1.  Exclusive frames only (no 95 PC counterpart).  Sprites centred in each column.',FONTS)
  T(d,8,68,'93G ABDUL/PART frames are the same in G and P (kept as-is / his pixels).  94G goalies stay on J, so G and P match there too.',FONTS)
  legend(d, W-LW+6, 72)
  d.line([W-LW, 70, W-LW, H-8], fill=(200,200,210))

  y=header_h
  for kind,sname,row in layout:
    if kind=='sec':
      T(d,8,y,sname,FONTB)
      y+=26
      continue
    x=8
    h=max(c[6] for c in row)+44
    for n,tag,gi,cG,cP,tw,th in row:
      lab=f"{game} {n}"
      T(d,x,y,lab,FONT)
      if tag and tag not in ('final3l-hybrid','J-goalie',''):
        T(d,x+FONT.getlength(lab)+8,y,tag,FONT,SRC_COL.get(tag,(80,80,90)))
      labw=int(FONT.getlength(lab)+ (FONT.getlength(tag)+8 if tag and tag not in ('final3l-hybrid','J-goalie','') else 0)+6)
      cw=max(tw*3+24, labw)
      T(d,x,y+18,'A',FONTA,COL_A)
      T(d,x+tw+8,y+18,'G',FONTA,COL_G)
      T(d,x+2*(tw+8),y+18,'P',FONTA,COL_P)
      tiles=(gi,cG,cP)
      for i,tile in enumerate(tiles):
        tx=x+i*(tw+8)+(tw-tile.width)//2
        ty=y+40+(th-tile.height)//2
        im.paste(tile,(tx,ty))
      x+=cw+8
    y+=h+8
  if footer:
    T(d,8,y,footer,FONTS)
  else:
    T(d,8,y,'final3l sister sets.  ABDUL = hand-completed frame kept as-is (354 helmet fix only).  PART = his pixels kept, rest filled.  AUTO = classifier.',FONTS)
  if im.width>1000:
    raise SystemExit(f'{fn} too wide {im.size}')
  os.makedirs(os.path.dirname(fn),exist_ok=True)
  im.save(fn)
  print('wrote',fn,im.size)
  return fn, im.size

def frames_of(labs, game='94G'):
  sec='94G only' if game=='94G' else '93 only'
  g=EXCSV[EXCSV.section==sec]
  out=[]
  for lab in labs:
    fr=sorted(int(x) for x in g[g.animation_spf==lab].frame)
    out.append((NAMES.get(lab,lab), fr, lab))
  return out

def main():
  for p in OUTS:
    os.makedirs(p,exist_ok=True)
  print('loading 93G sprites…')
  ids93=list(range(353,377))+list(range(633,645))
  spr=decode_with_origin('/workspace/NHLPA93Genesis/Extracted/Graphics/Sprites.anim', ids93)
  G93={n: spr[n]['img'].astype(int) for n in ids93}
  items93={}
  for n in ids93:
    g=G93[n]
    idxG=load_idx(DIRG,'93G',n)
    idxP=load_idx(DIRP,'93G',n)
    if idxG.shape!=g.shape or idxP.shape!=g.shape:
      print('WARN shape 93',n,g.shape,idxG.shape,idxP.shape)
    items93[n]=(g,idxG,idxP,SRC.get(('93G',n),'?'))

  items94={}
  ex94=sorted(int(x) for x in EXCSV[EXCSV.section=='94G only'].frame)
  for n in ex94:
    g=A['G94'][n].astype(int)
    idxG=load_idx(DIRG,'94G',n)
    idxP=load_idx(DIRP,'94G',n)
    if idxG.shape!=g.shape or idxP.shape!=g.shape:
      print('WARN shape 94',n,g.shape,idxG.shape,idxP.shape)
    items94[n]=(g,idxG,idxP,SRC.get(('94G',n),'?'))

  def pack(game, labs, items):
    secs=[]
    for title,fr,lab in frames_of(labs, game):
      cells=[]
      for n in fr:
        g,idxG,idxP,tag=items[n]
        cells.append((n,g,idxG,idxP,tag))
      if cells:
        secs.append((title+f'  ({len(cells)} exclusive)', cells))
    return secs

  packs=[
    ('final3l_contact_93g_fight.png',
     'final3l contact 1/8: NHLPA 93 fight exclusive, BOS home',
     '93G', pack('93G', ['gloves','fight','fgrab+6','fgrab+1','fhigh+1','fhigh','flow','fhitl','ffall+2','ffall+1','finjury'], items93)),
    ('final3l_contact_93g_injury1.png',
     'final3l contact 2/8: NHLPA 93 injury1 exclusive, BOS home',
     '93G', pack('93G', ['injury1 (bloody)'], items93)),
    ('final3l_contact_94g_goalie_high_slam.png',
     'final3l contact 3/8: 94G exclusive goalie high saves and slammed, BOS home',
     '94G', pack('94G', ['ghighl','ghighr','gslamtop','gslambot'], items94)),
    ('final3l_contact_94g_goalie_stick.png',
     'final3l contact 4/8: 94G exclusive goalie stick saves, BOS home',
     '94G', pack('94G', ['gstick2l','gstick2r'], items94)),
    ('final3l_contact_94g_slambot.png',
     'final3l contact 5/8: 94G exclusive skater slammed into the boards, BOS home',
     '94G', pack('94G', ['slambot'], items94)),
    ('final3l_contact_94g_board_front_back.png',
     'final3l contact 6/8: 94G exclusive board checks, front and back, BOS home',
     '94G', pack('94G', ['boardfront','boardback'], items94)),
    ('final3l_contact_94g_board_sides.png',
     'final3l contact 7/8: 94G exclusive board checks, left and right, BOS home',
     '94G', pack('94G', ['boardleft','boardright'], items94)),
    ('final3l_contact_94g_bench_crosscheck.png',
     'final3l contact 8/8: 94G exclusive bench checks and cross-check, BOS home',
     '94G', pack('94G', ['benchcheckl','benchcheckl+1','benchcheckl+2','benchcheckr','benchcheckr+1','crosscheck'], items94)),
  ]

  outs=[]
  for fn,title,game,secs in packs:
    nfr=sum(len(c) for _,c in secs)
    print('building',fn,'frames',nfr)
    path=OUTS[0]+fn
    p,sz=sheet(title, secs, path, game=game)
    for dest in OUTS[1:]:
      shutil.copy(p, dest+fn)
    outs.append((p,sz,nfr))
  print('done', outs)
  return outs

if __name__=='__main__':
  main()
