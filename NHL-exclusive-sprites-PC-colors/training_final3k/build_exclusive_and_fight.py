#!/usr/bin/env python3
"""Build final3k exclusive 94G npy, 93G fight AUTO/PART fills, round-trip checks."""
import os,sys,json,collections
import numpy as np
from PIL import Image

sys.path[:0]=[
  '/workspace/g94-to-pc-zones/v5/final3k/work',
  '/workspace/g94-to-pc-zones/v5/final3j/work',
  '/workspace/g94-to-pc-zones/v5/final3j/exclusive/fight',
  '/workspace/g94-to-pc-zones/v5/final3c/work',
  '/workspace/g94-to-pc-zones/v4/work',
]
from eval_and_build import (
  _build_with_kpred, convert_93, spit_rt, png_rt, init_valid, VALID,
  OUT, J3, F3I, ABDIR, A, HOLD_ABDUL
)
from train_final3k import apply_pcpal_overrides
import build_fight_abdul as BF

EX=OUT+'exclusive/'
os.makedirs(EX+'npy',exist_ok=True)
os.makedirs(EX+'png',exist_ok=True)
os.makedirs(EX+'fight',exist_ok=True)

def build_exclusive_94g():
  rows=json.load(open(J3+'exclusive/hybrid_frames.json'))
  ok_s=ok_p=0; invalid=[]; recs=[]
  init_valid()
  for i,r in enumerate(rows):
    n=int(r['g94']); kind=r['kind']
    if kind=='goalie':
      out=np.load(J3+f'npy/g94_{n}_pcidx.npy').astype(np.int16)
    else:
      out,P,J,how,log,eyes,ne=_build_with_kpred(n)
      out=np.asarray(out).astype(np.int16)
    np.save(EX+f'npy/g94_{n}_pcidx.npy', out)
    if spit_rt(out): ok_s+=1
    if png_rt(out, EX+f'png/g94_{n}_idx.png'): ok_p+=1
    bad=sorted(set(int(v) for v in np.unique(out) if v!=255 and v not in VALID))
    if bad: invalid.append((n,bad))
    recs.append(dict(g94=n,kind=kind,invalid=bad,roundtrip=not bad))
    if (i+1)%20==0: print('  exclusive',i+1,'/',len(rows))
  json.dump(recs, open(EX+'hybrid_frames.json','w'), indent=1)
  print('exclusive 94G',len(rows),'spit',ok_s,'png',ok_p,'invalid',invalid)
  return recs

# Fight sources (same as previous redo)
ABDUL_FULL={354,355,356,357,359,360,361,362,368}
PART_HEAD={364,365,370,371,372,373,374,375,376}
AUTO_ONLY={353,358,363,366,367,369}

def source_of(n):
  if n in ABDUL_FULL: return 'ABDUL'
  if n in PART_HEAD: return 'PART'
  return 'AUTO'

def load_abdul_gif(n):
  """ABDUL/PART pixels for the GIF: as-is, plus the 354 helmet fix only (194/195 -> 190/191)."""
  path=ABDIR+f'93_{n}.png'
  if not os.path.exists(path):
    return None
  idx=np.array(Image.open(path)).astype(np.int16)
  if n==354:
    # helmet only, as previously approved — not the other PC PAL disagreements
    idx[idx==194]=190; idx[idx==195]=191
  return idx

def build_fight_frames():
  init_valid()
  frames=list(range(353,377))
  sprites=BF.decode_with_origin('/workspace/NHLPA93Genesis/Extracted/Graphics/Sprites.anim', frames)
  converted={}; src={}; stats={}
  spit_ok=png_ok=0; invalid={}
  for n in frames:
    g=sprites[n]['img']
    kind=source_of(n); src[n]=kind
    ab=load_abdul_gif(n)
    auto=convert_93(g)
    if kind=='ABDUL':
      if ab is None or ab.shape!=g.shape:
        raise SystemExit(f'missing ABDUL {n}')
      idx=ab.copy()
      # fill holes if any
      hole=(g>0)&(idx==255)
      if hole.any():
        idx[hole]=auto[hole]; src[n]='PART'
    elif kind=='PART':
      idx=auto.copy()
      if ab is not None and ab.shape==g.shape:
        keep=ab!=255
        idx[keep]=ab[keep]
    else:
      idx=auto.copy()
      if ab is not None and ab.shape==g.shape:
        keep=ab!=255
        if keep.any():
          idx[keep]=ab[keep]
    converted[n]=idx
    np.save(EX+f'fight/g93_{n}_pcidx.npy', idx)
    if spit_rt(idx): spit_ok+=1
    if png_rt(idx, EX+f'fight/g93_{n}_idx.png'): png_ok+=1
    bad=sorted(set(int(v) for v in np.unique(idx) if v!=255 and v not in VALID))
    if bad: invalid[n]=bad
    kept=int((ab!=255).sum()) if ab is not None and ab.shape==g.shape else 0
    stats[n]=dict(source=src[n], kept=kept, opaque=int((idx!=255).sum()))
    print(f'  fight {n} {src[n]:5s} kept={kept}')
  print('fight 24 spit',spit_ok,'png',png_ok,'invalid',invalid)

  # compose GIF + strip + contact using BF helpers
  W,H,cx,cy=BF.compose_canvas(sprites)
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
  gif_path=EX+'fight/nhlpa93_bos_vs_phi_fight.gif'
  gif_frames[0].save(gif_path, save_all=True, append_images=gif_frames[1:],
                     duration=durations, loop=0, optimize=False, disposal=2)
  # strip
  view=[im.resize((im.width//2, im.height//2), Image.NEAREST) for im in gif_frames]
  ch=view[0].height; maxw=990; x=6; row=0; coords=[]
  for i,im in enumerate(view):
    if x+im.width+6>maxw and x>6:
      row+=1; x=6
    coords.append((x,6+row*(ch+28),i)); x+=im.width+6
  strip=Image.new('RGB',(maxw, 6+(row+1)*(ch+28)), (245,245,248))
  d=ImageDraw_safe(strip)
  from PIL import ImageDraw
  d=ImageDraw.Draw(strip)
  for x,py,i in coords:
    strip.paste(view[i],(x,py+16))
    st=BF.SEQ[i]
    d.text((x,py),f"{st['bos']}/{st['phi']}",fill=(20,20,30),font=BF.FONTS)
  strip.save(EX+'fight/sequence_strip.png')
  # contact via BF.build_sheet
  BF.OUT=EX+'fight/'
  # monkeybuild_sheet uses converted/src from its module constants? it uses arguments
  BF.build_sheet(sprites, converted, src, stats)
  # build_sheet writes to BF.OUT
  json.dump(dict(source=src,stats=stats,invalid=invalid,spit_ok=spit_ok,png_ok=png_ok),
            open(EX+'fight/source_map.json','w'), indent=1, default=int)
  print('wrote', gif_path)
  return converted, src, sprites

def ImageDraw_safe(im):
  return None

if __name__=='__main__':
  init_valid()
  build_exclusive_94g()
  build_fight_frames()
