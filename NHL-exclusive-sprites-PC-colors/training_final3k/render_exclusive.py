"""Sheets and GIFs of 94 Genesis exclusive animations, converted with the hybrid
(final3k (K+Abdul) plain zones + socks + J arms; goalies = J), in the BOS home palette."""
import sys,os,time,shutil,json
sys.path.insert(0,'/workspace/g94-to-pc-zones/v5/final3k/work')
sys.path.insert(0,'/workspace/g94-to-pc-zones/v5/final3j/work')
sys.path.insert(0,'/workspace/g94-to-pc-zones/v5/final3c/work')
from render3g import *
from render_helpers import PCGROUPS
from teams import teamact
import pandas as pd
from PIL import Image,ImageDraw,ImageSequence
J3='/workspace/g94-to-pc-zones/v5/final3k/'
EX=J3+'exclusive/'
act=teamact('bos','h')
ICE=(168,196,214)  # ice-coloured, mid luminance so white jerseys stay distinct
# exclusive set
ex=set(int(x) for x in pd.read_csv('/workspace/exclusive-frames/exclusive_frames.csv').query("section=='94G only'").frame)
mx=pd.read_csv('/workspace/wt-census/sprite-textures/docs/platform-census/frames_matrix.csv')
G94=mx[(mx.set=='G94')&(mx.empty!=True)]
def seq(lab):
  fr=[int(x) for x in G94[G94.label==lab].frame]
  if lab=='slambot':fr=[x for x in fr if x<=737]
  return fr
NAMES={
  'ghighl':'Goalie high save, left',
  'ghighr':'Goalie high save, right',
  'gstick2l':'Goalie stick save, left',
  'gstick2r':'Goalie stick save, right',
  'gslamtop':'Goalie slammed, from above',
  'gslambot':'Goalie slammed, from below',
  'slambot':'Skater slammed into the boards',
  'boardfront':'Board check, front',
  'boardback':'Board check, back',
  'boardleft':'Board check, left',
  'boardright':'Board check, right',
  'benchcheckl':'Bench check, left',
  'benchcheckr':'Bench check, right',
  'crosscheck':'Cross-check',
  'benchcheckl+1':'Bench check, left (extra frames)',
  'benchcheckl+2':'Bench check, left (extra frames 2)',
  'benchcheckr+1':'Bench check, right (extra frames)',
}
SHORT_PAL={'shoulder patch':'shoulder patch','socks stripe 1':'sock stripe 1','socks stripe 2':'sock stripe 2',
           'pants stripe 1':'pants stripe 1','pants stripe 2':'pants stripe 2','goalie mask':'mask','yoke corner':'yoke corner'}
def legend(d,x,y):
  T(d,x,y,'BOS home palette',15);y+=22
  for name,ix,sh in PCGROUPS:
    if name in ('goalie mask',):continue
    order=sorted(range(len(ix)),key=lambda j:['light','medium','dark'].index(sh[j]))
    T(d,x,y+1,SHORT_PAL.get(name,name),12,False)
    for jj,j in enumerate(order):
      d.rectangle([x+118+jj*20,y,x+134+jj*20,y+15],fill=tuple(int(v) for v in act[ix[j]]),outline=(0,0,0))
    y+=19
  y+=8
  T(d,x,y,'On each frame',14);y+=20
  T(d,x,y,'Top tile = 94 Genesis',12,False);y+=16
  T(d,x,y,'in Genesis colours.',12,False);y+=16
  T(d,x,y,'Bottom tile = converted',12,False);y+=16
  T(d,x,y,'to 95 PC zones, BOS home.',12,False);y+=18
  T(d,x,y,'* = exclusive (no 95 PC',12,False);y+=16
  T(d,x,y,'counterpart). Unmarked',12,False);y+=16
  T(d,x,y,'frames are in the same',12,False);y+=16
  T(d,x,y,'animation and also exist',12,False);y+=16
  T(d,x,y,'on 95 PC, shown so the',12,False);y+=16
  T(d,x,y,'sequence reads.',12,False);y+=20
  T(d,x,y,'Conversion: final3k hybrid',12,False);y+=16
  T(d,x,y,'K+Abdul plain zones + socks',12,False);y+=16
  T(d,x,y,'+ J arms (J not retrained).',12,False);y+=16
  T(d,x,y,'Goalies still use J.',12,False)
  return y
def load_g(n):
  g=A['G94'][n].astype(int)
  o=np.zeros(g.shape+(3,),np.uint8);o[:]=ICE;m=g>0;o[m]=GP[g[m]];return o
def load_c(n):
  c=np.load(EX+f'npy/g94_{n}_pcidx.npy').astype(int)
  o=np.zeros(c.shape+(3,),np.uint8);o[:]=ICE;m=(c!=255)&(c>=0);o[m]=act[c[m]];return o
def tilepair(n,z):
  g=big(load_g(n),z);c=big(load_c(n),z)
  # same box size
  w=max(g.width,c.width);h=max(g.height,c.height)
  def pad(im):
    p=Image.new('RGB',(w,h),ICE);p.paste(im,((w-im.width)//2,(h-im.height)//2));return p
  return pad(g),pad(c)
def sheet(sections,title,fn):
  W=990;LW=210;im=Image.new('RGB',(W,8000),(255,255,255));d=ImageDraw.Draw(im)
  T(d,8,6,title,20)
  T(d,8,32,'Genesis numbered from 1. Top = 94 Genesis colours, bottom = converted (BOS home). * = exclusive frame.',13,False)
  legend(d,W-LW+6,56)
  y=58;x0=8;avail=W-LW-16
  for name,frames in sections:
    T(d,8,y,name,18);y+=26
    T(d,8,y,f'94G {frames[0]}–{frames[-1]}  ({len(frames)} frames, {sum(1 for n in frames if n in ex)} exclusive)',13,False);y+=22
    # scale so a row fits at least 5 frames, or all if fewer
    maxw=max(A['G94'][n].shape[1] for n in frames)
    z=min(4,max(2,(avail-8)//(min(6,len(frames))*(maxw+6))))
    # build cells
    cells=[]
    for n in frames:
      g,c=tilepair(n,z)
      lab=f"94G {n}"+(' *' if n in ex else '')
      cw=max(g.width,80);ch=22+g.height+4+c.height+4
      cells.append((n,lab,g,c,cw,ch))
    # pack rows
    i=0
    while i<len(cells):
      row=[];w=0
      while i<len(cells) and (not row or w+cells[i][4]+8<=avail):
        row.append(cells[i]);w+=cells[i][4]+8;i+=1
      x=x0;h=0
      for n,lab,g,c,cw,ch in row:
        T(d,x,y,lab,14,True,(0,0,0) if n in ex else (60,60,60))
        im.paste(g,(x,y+20));im.paste(c,(x,y+20+g.height+4))
        h=max(h,20+g.height+4+c.height+4);x+=cw+8
      y+=h+10
    d.line([8,y-2,W-LW-8,y-2],fill=(0,0,0));y+=10
  # footer
  y=max(y,560)
  for t in ['Ice-coloured field behind both tiles. Exclusive animations are 94 Genesis sequences with no 95 PC counterpart;',
            'in-between frames that also exist on 95 PC are included so the animation reads left to right.']:
    T(d,8,y,t,12,False);y+=16
  im.crop((0,0,W,y+8)).save(fn);return fn
def gif(frames,fn,z=4,fps=8):
  dur=int(round(1000/fps))
  ims=[]
  # common canvas: max size among frames, plus a little pad
  tiles=[big(load_c(n),z) for n in frames]
  W=max(t.width for t in tiles)+8;H=max(t.height for t in tiles)+8
  for t in tiles:
    c=Image.new('RGB',(W,H),ICE);c.paste(t,((W-t.width)//2,(H-t.height)//2));ims.append(c)
  ims[0].save(fn,save_all=True,append_images=ims[1:],duration=dur,loop=0,optimize=False)
  return fn, (W,H), len(ims)
if __name__=='__main__':
  st=time.strftime('%H%M%S');outs=[]
  packs=[
    ('final3k_excl_goalie_high_slam_bos_h.png','94G exclusive animations 1/7: goalie high saves and slammed, BOS home',
     [('ghighl','ghighr','gslamtop','gslambot')]),
    ('final3k_excl_goalie_stick_l_bos_h.png','94G exclusive animations 2/7: goalie stick save, left, BOS home',
     [('gstick2l',)]),
    ('final3k_excl_goalie_stick_r_bos_h.png','94G exclusive animations 3/7: goalie stick save, right, BOS home',
     [('gstick2r',)]),
    ('final3k_excl_slambot_bos_h.png','94G exclusive animations 4/7: skater slammed into the boards, BOS home',
     [('slambot',)]),
    ('final3k_excl_board_front_back_bos_h.png','94G exclusive animations 5/7: board checks, front and back, BOS home',
     [('boardfront','boardback')]),
    ('final3k_excl_board_sides_bos_h.png','94G exclusive animations 6/7: board checks, left and right, BOS home',
     [('boardleft','boardright')]),
    ('final3k_excl_bench_crosscheck_bos_h.png','94G exclusive animations 7/7: bench checks and cross-check, BOS home',
     [('benchcheckl','benchcheckr','crosscheck')]),
  ]
  for fn,title,groups in packs:
    sections=[(NAMES[lab],seq(lab)) for labs in groups for lab in labs]
    path=EX+'sheets/'+fn
    outs.append(sheet(sections,title,path))
  # GIFs: complete consecutive (or nearly) sequences
  gifs=[]
  for lab,fn in (('benchcheckl','final3k_excl_benchcheck_left_bos_h.gif'),
                 ('benchcheckr','final3k_excl_benchcheck_right_bos_h.gif'),
                 ('crosscheck','final3k_excl_crosscheck_bos_h.gif'),
                 ('boardfront','final3k_excl_boardfront_bos_h.gif'),
                 ('ghighl','final3k_excl_goalie_high_left_bos_h.gif'),
                 ('slambot','final3k_excl_slambot_bos_h.gif')):
    path=EX+'gif/'+fn
    p,sz,n=gif(seq(lab),path,z=4,fps=8)
    gifs.append((p,sz,n,lab))
    print('GIF',p,sz,'frames',n)
  import shutil
  for f in outs:
    t='/tmp/'+os.path.basename(f).replace('.png',f'_{st}.png');shutil.copy(f,t);print(t,Image.open(f).size)
  for p,sz,n,lab in gifs:
    t='/tmp/'+os.path.basename(p).replace('.gif',f'_{st}.gif');shutil.copy(p,t)
    # also a first-and-mid preview strip for viewing
    im=Image.open(p);frs=[]
    try:
      while True:
        frs.append(im.copy().convert('RGB'));im.seek(im.tell()+1)
    except EOFError:pass
    # contact of gif frames, max 1000 wide
    z=1;fw,fh=frs[0].size;cols=min(len(frs),max(1,990//(fw+4)));rows=(len(frs)+cols-1)//cols
    strip=Image.new('RGB',(min(990,cols*(fw+4)+4),rows*(fh+4)+4), (255,255,255))
    for i,fr in enumerate(frs):
      r,c=divmod(i,cols);strip.paste(fr,(4+c*(fw+4),4+r*(fh+4)))
    sp='/tmp/'+os.path.basename(p).replace('.gif',f'_{st}_strip.png');strip.save(sp)
    print('gifcopy',t,'strip',sp,strip.size,'n',len(frs))
