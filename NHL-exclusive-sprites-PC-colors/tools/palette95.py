"""The two NHL 95 PC palettes and the mapping between them.

  sprite palette  the colour indices stored in the sprite files (.PPV / SPIT), 0..255 ("Sprite Data Palette Mapping"
                  in PAL-To-ACT/README.md). A player sprite pixel is NOT a screen colour.
  game palette    the 256 slots on screen during play (LoadTeamPalette, see NHL9XStudio lib/pc-rink.js):
                  0..127 rink palette (RINKPAL.QFS), 128..191 home team's 64 colours (HOMEPALS),
                  192..250 away team's colours (AWAYPALS colours 0..58), 251..255 rink palette again
                  (overwrites away colours 59..63).
  colour mapping  each 448-byte team record = 64 colours (bytes 0..191, 6-bit RGB) + a 256-byte map
                  sprite index -> game slot (bytes 192..447). Map values < 128 are rink slots (the same for both sides);
                  values 128..191 are team colours: the home side uses them as is, the away side +64.

Reads your own NHL 95 PC game files from NHL95_DIR (RINKPAL.QFS, HOMEPALS.BIN, AWAYPALS.BIN, RINK.QFS, *.PPV).
Writes ../status/palette95_indices.csv and the two charts (palette95_sheet.py). No game file goes into the repo:
the rink RGB is also in PAL-To-ACT/rinkpal.act, and the example team colours are 64 RGB triplets per team."""
import os,sys,csv,glob,numpy as np
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import paths,ppv95,refpack
D=os.environ.get('NHL95_DIR','')
if not D:raise SystemExit('Set NHL95_DIR to the folder with your NHL 95 PC game files')
def P(n):return os.path.join(D,n)
def shpi(b):
  if b[:4]!=b'SHPI':b=refpack.unpack(b)
  return ppv95.parse(b)
TEAMS=['BOS','BUF','CGY','CHI','DET','EDM','HFD','LA','MIN','MTL','NJ','NYI','NYR','OTT','PHI','PIT','QUE','STL','SJ','TB','TOR','VAN','WSH','WPG','ANA','FLA','ASW','ASE']  # PAL-To-ACT/binToAct.js teamName95
EX_HOME,EX_AWAY='TOR','MTL'
# 1. rink palette: SHPI with one '!pal' picture: 256 x RGB, 6-bit (x4 = 8-bit) = PAL-To-ACT/rinkpal.act
rp=shpi(open(P('RINKPAL.QFS'),'rb').read())
RINK=np.frombuffer(rp['pics'][0]['raw'][16:16+768],np.uint8).reshape(256,3).astype(int)*4
# 2. team records
def recs(f):
  b=open(P(f),'rb').read()
  return [(np.frombuffer(b[i*448:i*448+192],np.uint8).reshape(64,3).astype(int)*4,np.frombuffer(b[i*448+192:i*448+448],np.uint8).astype(int)) for i in range(len(b)//448)]
HOME,AWAY=recs('HOMEPALS.BIN'),recs('AWAYPALS.BIN')
M=np.array([m for _,m in HOME+AWAY])
def slot(v,side):return v if v<128 else (v if side=='home' else v+64)
def game_palette(home,away):
  g=RINK.copy();g[128:192]=home[0];g[192:251]=away[0][:59];return g   # 251..255 stay rink
GAME=game_palette(HOME[TEAMS.index(EX_HOME)],AWAY[TEAMS.index(EX_AWAY)])
# 3. how often each value appears in the game's own art
def hist(files):
  h=np.zeros(256,int)
  for f in files:
    try:o=shpi(open(f,'rb').read())
    except Exception:continue
    for p in o['pics']:
      if p['tag']=='!pal' or p['w']<=0 or p['h']<=0:continue
      h+=np.bincount(np.frombuffer(p['pixels'],np.uint8),minlength=256)
  return h
player=hist(sorted(f for f in glob.glob(P('*.PPV')) if os.path.basename(f)[0].isdigit()))
rink=hist([P('RINK.QFS')])
OTHER=['GOAL.PPV','SIREN.PPV','CROSS.PPV','NUMSHP.PPV','SCRBRD1.PPV','SCRBRD2.PPV','TRINKND.PPV','GUILT.PPV','HOOK.PPV','RUFF.PPV','CLAP.PPV','FANOM.PPV','GADGET5.PPV','GADGET6.PPV','CFLAG.PPV','UFLAG.PPV','SAVED.PPV','CRESTS4.PPV','F000_149.PPV']
# F000_049 / F050_099 / F100_149 are byte-identical subsets of F000_149, so they are not counted twice.
# SCRBRD2.QFS / PSTATBAR.QFS (HUD) are not counted.
other=hist([P(f) for f in OTHER if os.path.exists(P(f))])
def role(i):   # names from PAL-To-ACT/README.md "Sprite Data Palette Mapping" and binToAct's ACT layout
  if i==255:return 'transparent'
  if i>=192:return 'crest / ice logo (team)'
  if i>=144:return 'jersey zones (team)'
  if i>=128:return 'skin tones / eyes / stick (fixed)'
  if i==8:return 'blade side (remapped to 16)'
  if i in(82,88):return 'shadow (remapped to 99)'
  return 'rink palette (identity)'
def rng(v):
  v=sorted(set(int(x) for x in v));return str(v[0]) if len(v)==1 else '%d..%d'%(v[0],v[-1]) if len(v)>3 else ','.join(map(str,v))
rows=[]
for i in range(256):
  hs=[slot(m[i],'home') for _,m in HOME];aw=[slot(m[i],'away') for _,m in AWAY]
  fixed=len(set(hs+aw))==1
  c=RINK[hs[0]] if fixed and i!=255 else (None)
  rows.append(dict(sprite_index=i,role=role(i),stored_map_value=rng(M[:,i]),game_slot_home=rng(hs),game_slot_away=rng(aw),
    same_for_every_team=int(fixed),r='' if c is None else c[0],g='' if c is None else c[1],b='' if c is None else c[2],
    player_px=int(player[i]),rink_px=int(rink[i]),other_px=int(other[i])))
out=os.path.join(paths.STATUS,'palette95_indices.csv')
with open(out,'w',newline='') as f:
  w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
print('wrote',out)
if __name__=='__main__' and '--no-image' not in sys.argv:
  import palette95_sheet
  palette95_sheet.draw(dict(rows=rows,rink=RINK,game=GAME,home=HOME[TEAMS.index(EX_HOME)],away=AWAY[TEAMS.index(EX_AWAY)],
    ex_home=EX_HOME,ex_away=EX_AWAY,slot=slot))
