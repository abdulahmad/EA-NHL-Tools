#!/usr/bin/env python3
"""Convert remaining 93G exclusive (injury1 633-644) and write index PNGs + BOS previews
for all 93G exclusive (36) and all converted 94G exclusive-set frames."""
import os,sys,json,csv,shutil
import numpy as np
from PIL import Image,ImageDraw,ImageFont

sys.path[:0]=[
  '/workspace/g94-to-pc-zones/v5/final3k/work',
  '/workspace/g94-to-pc-zones/v5/final3j/work',
  '/workspace/g94-to-pc-zones/v5/final3j/exclusive/fight',
  '/workspace/g94-to-pc-zones/v5/final3c/work',
  '/workspace/g94-to-pc-zones/v4/work',
]
from eval_and_build import convert_93, spit_rt, png_rt, init_valid, VALID, ABDIR, SH
from train_final3k import apply_pcpal_overrides
from build_fight import decode_with_origin, paint, FONT, FONTS, FONTT, T, big
from teams import teamact
import pandas as pd

BOS=teamact('bos','h')
ICE=(168,196,214)
F3K='/workspace/g94-to-pc-zones/v5/final3k/'
STAGING=F3K+'publish/'
ABDUL_FULL={354,355,356,357,359,360,361,362,368,637,638,639,642}
PART={364,365,370,371,372,373,374,375,376,633,634,635,636,640,641,643,644}

def source_of(n):
  if n in ABDUL_FULL: return 'ABDUL'
  if n in PART: return 'PART'
  return 'AUTO'

def load_abdul(n):
  path=ABDIR+f'93_{n}.png'
  if not os.path.exists(path):
    return None
  idx=np.array(Image.open(path)).astype(np.int16)
  if n==354:
    idx[idx==194]=190; idx[idx==195]=191
  return idx

def compose(n, g):
  kind=source_of(n)
  ab=load_abdul(n)
  auto=convert_93(g)
  if kind=='ABDUL':
    idx=ab.copy()
    hole=(g>0)&(idx==255)
    if hole.any():
      idx[hole]=auto[hole]; kind='PART'
  elif kind=='PART':
    idx=auto.copy()
    if ab is not None and ab.shape==g.shape:
      idx[ab!=255]=ab[ab!=255]
  else:
    idx=auto.copy()
    if ab is not None and ab.shape==g.shape:
      keep=ab!=255
      if keep.any():
        idx[keep]=ab[keep]
  return idx, kind

def write_idx_preview(idx, idx_path, prev_path):
  ok_p=png_rt(idx, idx_path)
  ok_s=spit_rt(idx)
  rgb=paint(idx, BOS)
  Image.fromarray(rgb,'RGB').save(prev_path)
  bad=sorted(set(int(v) for v in np.unique(idx) if v!=255 and v not in VALID))
  return ok_p, ok_s, bad

def main():
  init_valid()
  os.makedirs(STAGING+'93g/idx',exist_ok=True)
  os.makedirs(STAGING+'93g/preview_bos_h',exist_ok=True)
  os.makedirs(STAGING+'93g/npy',exist_ok=True)
  os.makedirs(STAGING+'94g/idx',exist_ok=True)
  os.makedirs(STAGING+'94g/preview_bos_h',exist_ok=True)
  os.makedirs(STAGING+'sheets',exist_ok=True)

  # injury1 + ensure fight already in exclusive/fight is also copied
  inj=list(range(633,645))
  sprites=decode_with_origin('/workspace/NHLPA93Genesis/Extracted/Graphics/Sprites.anim', inj)
  recs=[]
  for n in inj:
    g=sprites[n]['img']
    idx,kind=compose(n,g)
    np.save(F3K+f'exclusive/fight/g93_{n}_pcidx.npy', idx)
    np.save(STAGING+f'93g/npy/g93_{n}_pcidx.npy', idx)
    ok_p,ok_s,bad=write_idx_preview(idx,
      STAGING+f'93g/idx/g93_{n}_idx.png',
      STAGING+f'93g/preview_bos_h/g93_{n}_bos_h.png')
    recs.append(dict(game='93G',frame=n,source=kind,spit=ok_s,png=ok_p,invalid=bad,
                     opaque=int((idx!=255).sum())))
    print(f'injury1 {n} {kind} spit={ok_s} png={ok_p} invalid={bad}')

  # copy fight 353-376 into staging
  for n in range(353,377):
    src=F3K+f'exclusive/fight/g93_{n}_pcidx.npy'
    idx=np.load(src)
    np.save(STAGING+f'93g/npy/g93_{n}_pcidx.npy', idx)
    # also copy already-written idx png if present, else write
    ok_p,ok_s,bad=write_idx_preview(idx,
      STAGING+f'93g/idx/g93_{n}_idx.png',
      STAGING+f'93g/preview_bos_h/g93_{n}_bos_h.png')
    # source from source_map if present
    recs.append(dict(game='93G',frame=n,source=source_of(n),spit=ok_s,png=ok_p,invalid=bad,
                     opaque=int((idx!=255).sum())))

  # 94G
  rows=json.load(open(F3K+'exclusive/hybrid_frames.json'))
  ex=set(int(x) for x in pd.read_csv('/workspace/exclusive-frames/exclusive_frames.csv').query("section=='94G only'").frame)
  for r in rows:
    n=int(r['g94'])
    idx=np.load(F3K+f'exclusive/npy/g94_{n}_pcidx.npy')
    ok_p,ok_s,bad=write_idx_preview(idx,
      STAGING+f'94g/idx/g94_{n}_idx.png',
      STAGING+f'94g/preview_bos_h/g94_{n}_bos_h.png')
    recs.append(dict(game='94G',frame=n,source='final3k-hybrid' if r['kind']=='skater' else 'J-goalie',
                     kind=r['kind'], exclusive=(n in ex), spit=ok_s,png=ok_p,invalid=bad,
                     opaque=int((idx!=255).sum())))
  # write manifest
  with open(STAGING+'manifest.csv','w',newline='') as f:
    w=csv.DictWriter(f, fieldnames=['game','frame','source','kind','exclusive','spit','png','invalid','opaque'])
    w.writeheader()
    for r in recs:
      row=dict(kind=r.get('kind',''), exclusive=r.get('exclusive', True if r['game']=='93G' else ''), **{k:r.get(k,'') for k in ['game','frame','source','spit','png','invalid','opaque']})
      row['invalid']=','.join(map(str,r['invalid'])) if r['invalid'] else ''
      w.writerow(row)
  fails=[r for r in recs if (not r['spit']) or (not r['png']) or r['invalid']]
  print('total',len(recs),'fails',len(fails))
  if fails:
    print(fails[:10])

  # injury1 contact sheet BOS, 12 frames, genesis + converted
  # load genesis
  Z=3
  cells=[]
  for n in inj:
    g=big(paint(sprites[n]['img']*0+0, BOS),1)  # dummy
    # genesis via paint_g
    from build_fight import paint_g
    gi=big(paint_g(sprites[n]['img']),Z)
    ci=big(paint(np.load(STAGING+f'93g/npy/g93_{n}_pcidx.npy'), BOS),Z)
    cells.append((n,source_of(n),gi,ci))
  cols=6
  cellw=max(max(a[2].width,a[3].width) for a in cells)+8
  cellh=max(a[2].height+a[3].height for a in cells)+36
  W=min(990, cols*cellw+16)
  rows_n=(len(cells)+cols-1)//cols
  im=Image.new('RGB',(W, 70+rows_n*cellh+8),(255,255,255))
  d=ImageDraw.Draw(im)
  T(d,8,6,'93G exclusive injury1 633-644  ->  95 PC zones, BOS home',FONTT)
  T(d,8,32,'ABDUL = his frame.  PART = his pixels kept, rest filled.  Top = 93G colours, bottom = converted.',FONTS)
  T(d,8,48,'Numbers from 1 (Genesis).  Blood 76/78, ice chips 89.',FONTS)
  for i,(n,tag,gi,ci) in enumerate(cells):
    r,c=divmod(i,cols)
    x=8+c*cellw; y=70+r*cellh
    T(d,x,y,f'{n}  {tag}',FONT)
    im.paste(gi,(x,y+18)); im.paste(ci,(x,y+18+gi.height+2))
  path=STAGING+'sheets/g93_injury1_bos_h.png'
  im.save(path)
  print('injury sheet',path,im.size)
  # also into exclusive/sheets
  shutil.copy(path, F3K+'exclusive/sheets/g93_injury1_bos_h.png')

if __name__=='__main__':
  main()
