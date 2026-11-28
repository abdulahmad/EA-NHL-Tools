#!/usr/bin/env python3
"""Build two sister exclusive sets with final3l:
  G = arm bands / sock stripes at Genesis locations (FORCE_ARM='G', FORCE_SOCK='G0')
  P = arm bands / sock stripes at 95 PC locations   (FORCE_ARM='P', FORCE_SOCK='P')
All 36 93G + 129 94G exclusives. ABDUL frames as-is (354 helmet fix only).
PART frames keep his pixels. Index PNGs must SPIT + PNG/SH round-trip.
BOS home previews and a fight GIF for each set.
93G AUTO/PART fills use convert_93 (no joint-based arm/sock relocation), so
93G frames are the same in both sets; 94G skaters differ. Goalies stay on J.
"""
import os,sys,json,csv,collections
import numpy as np
from PIL import Image, ImageDraw
import pandas as pd

sys.path[:0]=[
  '/workspace/g94-to-pc-zones/v5/final3l/work',
  '/workspace/g94-to-pc-zones/v5/final3j/work',
  '/workspace/g94-to-pc-zones/v5/final3j/exclusive/fight',
  '/workspace/g94-to-pc-zones/v5/final3c/work',
  '/workspace/g94-to-pc-zones/v4/work',
]
from eval_and_build import (
  _build_with_kpred, convert_93, spit_rt, png_rt, init_valid, VALID,
  OUT, J3, ABDIR, A, HOLD_ABDUL, SH
)
import armmodels, socks3i
from teams import teamact
from build_fight import decode_with_origin, paint, FONT, FONTS, FONTT, T, big
import build_fight_abdul as BF

BOS=teamact('bos','h')
ICE=(168,196,214)
ROOT='/workspace/g94-to-pc-zones/v5/final3l/'
JHYB=json.load(open(J3+'exclusive/hybrid_frames.json'))
EXCSV=pd.read_csv('/workspace/exclusive-frames/exclusive_frames.csv')
EX94=sorted(int(x) for x in EXCSV[EXCSV.section=='94G only'].frame)
KIND={int(r['g94']):r['kind'] for r in JHYB}

ABDUL_FULL={354,355,356,357,359,360,361,362,368,637,638,639,642}
PART={364,365,370,371,372,373,374,375,376,633,634,635,636,640,641,643,644}
IDS93=list(range(353,377))+list(range(633,645))

SETS={
  'G': dict(tag='genesis_locs', arm='G', sock='G0',
            dest=ROOT+'exclusive_genesis_locs/'),
  'P': dict(tag='pc_locs', arm='P', sock='P',
            dest=ROOT+'exclusive_pc_locs/'),
}

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

def compose_93(n, g):
  kind=source_of(n)
  ab=load_abdul(n)
  auto=convert_93(g, n=n)
  if kind=='ABDUL':
    if ab is None or ab.shape!=g.shape:
      raise SystemExit(f'missing ABDUL {n}')
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
  os.makedirs(os.path.dirname(prev_path), exist_ok=True)
  Image.fromarray(rgb,'RGB').save(prev_path)
  bad=sorted(set(int(v) for v in np.unique(idx) if v!=255 and v not in VALID))
  return ok_p, ok_s, bad

def force(loc):
  armmodels.FORCE_ARM[0]=SETS[loc]['arm']
  socks3i.FORCE_SOCK[0]=SETS[loc]['sock']

def unforce():
  armmodels.FORCE_ARM[0]=None
  socks3i.FORCE_SOCK[0]=None

def build_94g(loc, dest):
  recs=[]; ok_s=ok_p=0; invalid=[]
  force(loc)
  try:
    for i,n in enumerate(EX94):
      kind=KIND[n]
      if kind=='goalie':
        out=np.load(J3+f'npy/g94_{n}_pcidx.npy').astype(np.int16)
      else:
        out,P,J,how,log,eyes,ne=_build_with_kpred(n)
        out=np.asarray(out).astype(np.int16)
      np.save(dest+f'94g/npy/g94_{n}_pcidx.npy', out)
      okp,oks,bad=write_idx_preview(out,
        dest+f'94g/idx/g94_{n}_idx.png',
        dest+f'94g/preview_bos_h/g94_{n}_bos_h.png')
      if oks: ok_s+=1
      if okp: ok_p+=1
      if bad: invalid.append((n,bad))
      recs.append(dict(game='94G',frame=n,kind=kind,
                       source='final3l-hybrid' if kind=='skater' else 'J-goalie',
                       exclusive=True, spit=oks, png=okp, invalid=bad,
                       opaque=int((out!=255).sum()), loc=loc))
      if (i+1)%20==0: print(f'  {loc} 94G {i+1}/{len(EX94)}')
  finally:
    unforce()
  print(f'{loc} exclusive 94G {len(EX94)} spit {ok_s} png {ok_p} invalid {invalid}')
  return recs

def build_93g(loc, dest, sprites):
  recs=[]; ok_s=ok_p=0; invalid=[]
  for n in IDS93:
    g=sprites[n]['img']
    idx,kind=compose_93(n,g)
    np.save(dest+f'93g/npy/g93_{n}_pcidx.npy', idx)
    np.save(dest+f'fight/g93_{n}_pcidx.npy', idx)
    okp,oks,bad=write_idx_preview(idx,
      dest+f'93g/idx/g93_{n}_idx.png',
      dest+f'93g/preview_bos_h/g93_{n}_bos_h.png')
    # also paletted idx next to fight npy
    png_rt(idx, dest+f'fight/g93_{n}_idx.png')
    if oks: ok_s+=1
    if okp: ok_p+=1
    if bad: invalid.append((n,bad))
    recs.append(dict(game='93G',frame=n,kind='skater',source=kind,
                     exclusive=True, spit=oks, png=okp, invalid=bad,
                     opaque=int((idx!=255).sum()), loc=loc))
    print(f'  {loc} 93G {n} {kind}')
  print(f'{loc} exclusive 93G {len(IDS93)} spit {ok_s} png {ok_p} invalid {invalid}')
  return recs

def fight_gif(loc, dest, sprites):
  converted={n: np.load(dest+f'93g/npy/g93_{n}_pcidx.npy') for n in range(353,377)}
  src={n: source_of(n) for n in range(353,377)}
  stats={n: dict(source=src[n], opaque=int((converted[n]!=255).sum())) for n in converted}
  W,H,cx,cy=BF.compose_canvas({k:sprites[k] for k in range(353,377)})
  gif_frames=[]; durations=[]
  for st in BF.SEQ:
    canvas=np.zeros((H,W,3),np.uint8); canvas[:]=BF.ICE
    if st['gloves']:
      BF.blit(canvas, converted[353], BF.BOS, sprites[353], cx, cy)
    phi=BF.xflip_sprite(sprites[st['phi']])
    BF.blit(canvas, converted[st['phi']][:,::-1], BF.PHI, phi, cx+10, cy)
    BF.blit(canvas, converted[st['bos']], BF.BOS, sprites[st['bos']], cx-10, cy)
    im=BF.big(canvas, BF.SCALE)
    gif_frames.append(im)
    durations.append(st['hold']*BF.DUR)
  gif_path=dest+'fight/nhlpa93_bos_vs_phi_fight.gif'
  gif_frames[0].save(gif_path, save_all=True, append_images=gif_frames[1:],
                     duration=durations, loop=0, optimize=False, disposal=2)
  view=[im.resize((im.width//2, im.height//2), Image.NEAREST) for im in gif_frames]
  ch=view[0].height; maxw=990; x=6; row=0; coords=[]
  for i,im in enumerate(view):
    if x+im.width+6>maxw and x>6:
      row+=1; x=6
    coords.append((x,6+row*(ch+28),i)); x+=im.width+6
  strip=Image.new('RGB',(maxw, 6+(row+1)*(ch+28)), (245,245,248))
  d=ImageDraw.Draw(strip)
  for x,py,i in coords:
    strip.paste(view[i],(x,py+16))
    st=BF.SEQ[i]
    d.text((x,py),f"{st['bos']}/{st['phi']}",fill=(20,20,30),font=BF.FONTS)
  strip_path=dest+'fight/sequence_strip.png'
  strip.save(strip_path)
  BF.OUT=dest+'fight/'
  fight_sprites={k:sprites[k] for k in range(353,377)}
  BF.build_sheet(fight_sprites, converted, src, stats)
  print('wrote', gif_path, strip_path)
  return gif_path, strip_path

def write_manifest(dest, recs, loc):
  path=dest+'manifest.csv'
  fields=['game','frame','source','kind','exclusive','spit','png','invalid','opaque','loc']
  with open(path,'w',newline='') as f:
    w=csv.DictWriter(f, fieldnames=fields)
    w.writeheader()
    for r in recs:
      row={k:r.get(k,'') for k in fields}
      row['invalid']=','.join(map(str,r['invalid'])) if r['invalid'] else ''
      w.writerow(row)
  fails=[r for r in recs if (not r['spit']) or (not r['png']) or r['invalid']]
  print(loc,'manifest',path,'total',len(recs),'fails',len(fails))
  if fails:
    print('FAILS',fails[:10])
  return fails

def main():
  init_valid()
  print('loading 93G sprites…')
  sprites=decode_with_origin('/workspace/NHLPA93Genesis/Extracted/Graphics/Sprites.anim', IDS93)
  all_fails=[]
  for loc,cfg in SETS.items():
    dest=cfg['dest']
    for sub in ('93g/idx','93g/preview_bos_h','93g/npy','94g/idx','94g/preview_bos_h','94g/npy','fight','contact_sheets'):
      os.makedirs(dest+sub, exist_ok=True)
    print('==== set', loc, cfg['tag'], 'arm', cfg['arm'], 'sock', cfg['sock'])
    recs94=build_94g(loc, dest)
    recs93=build_93g(loc, dest, sprites)
    fight_gif(loc, dest, sprites)
    fails=write_manifest(dest, recs93+recs94, loc)
    all_fails.extend(fails)
  if all_fails:
    raise SystemExit(f'round-trip/invalid failures: {len(all_fails)}')
  print('both sister sets ok')

if __name__=='__main__':
  main()
