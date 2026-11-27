"""Where the tools look for inputs. Game data is never stored in this repo: point these at files you made from your own copies."""
import os
HERE=os.path.dirname(os.path.abspath(__file__))
ROOT=os.path.dirname(HERE)                                   # NHL-exclusive-sprites-PC-colors/
ABDUL=os.path.join(ROOT,'abdul')+os.sep                      # Abdul's PSD, palette BMP, act/ guide palettes and extracted layers
STATUS=os.path.join(ROOT,'status')+os.sep
SHEETS=os.path.join(ROOT,'sheets')+os.sep
INDEXED=os.path.join(ROOT,'indexed')+os.sep
WORK=os.environ.get('EXCL_WORK',os.path.join(HERE,'work'))+os.sep   # scratch (git-ignored)
# Decoded frame cache {'G93':{frame:2D array},'G94':...,'PC':...} built from your own game files (see METHOD.md)
FRAMES=os.environ.get('NHL_FRAMES_PKL','')
CENSUS=os.environ.get('NHL_CENSUS_DIR','')                   # frames_matrix.csv + intra.json from the D165 platform census
ALIGN=os.environ.get('NHL_ALIGN_PKL','')                     # 94G/93G <-> 95 PC silhouette alignment (D168)
PCPAL=os.environ.get('NHL95_TOR_PAL_NPY','')                 # optional 256x3 95 PC team palette; not used by default (comparisons use Abdul's palette)
TORPAL94=os.environ.get('NHL94_TOR_PAL','')                  # NHL94Genesis Extracted/.../Pals/TORh.pal
os.makedirs(WORK,exist_ok=True)
def font(size):
  from PIL import ImageFont
  for f in('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf','DejaVuSans-Bold.ttf','arialbd.ttf'):
    try:return ImageFont.truetype(f,size)
    except OSError:pass
  return ImageFont.load_default(size)
def frames():
  import pickle
  if not FRAMES:raise SystemExit('Set NHL_FRAMES_PKL to your decoded frame cache (see METHOD.md)')
  return pickle.load(open(FRAMES,'rb'))
# Abdul's guide palette. Default: his complete ACT (abdul/act/abdul_palette_complete.act), which agrees with
# abdul_palette.bmp on every index the BMP uses and also colours 135, 164, 178 (and 170). Entries still at the grey
# placeholder (i,i,i) outside 144-191 are not guide colours. Override with NHL_GUIDE_ACT.
GUIDE_ACT=os.environ.get('NHL_GUIDE_ACT',os.path.join(ABDUL,'act','abdul_palette_complete.act'))
def guide():
  """(rgb, defined): rgb = 256 x (r,g,b) tuples; defined = sorted indices that carry a real guide colour."""
  from PIL import Image
  import numpy as np
  b=open(GUIDE_ACT,'rb').read()[:768];rgb=[tuple(b[i*3:i*3+3]) for i in range(256)]
  bmp=set(np.array(Image.open(ABDUL+'abdul_palette.bmp')).flatten().tolist())
  defined=sorted(i for i in range(256) if i in bmp or 144<=i<=191 or rgb[i]!=(i,i,i))
  return rgb,defined
