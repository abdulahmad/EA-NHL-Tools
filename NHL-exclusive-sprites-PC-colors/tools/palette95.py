"""How the 95 PC in-game palette is built, and which indices each kind of art uses.
Reads your own NHL 95 PC game files from NHL95_DIR (RINKPAL.QFS, HOMEPALS.BIN, AWAYPALS.BIN, RINK.QFS, *.PPV).
Writes ../status/palette95_indices.csv (per index: rink RGB, role, team-map class, pixel counts) and ../status/palette95_rink.png.
Game files are never written to the repo; only the RGB table (also public as rinkpal.act in PAL-To-ACT) and counts."""
import os,sys,csv,glob,struct,numpy as np
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import paths,ppv95,refpack
D=os.environ.get('NHL95_DIR','')
if not D:raise SystemExit('Set NHL95_DIR to the folder with your NHL 95 PC game files')
def P(n):return os.path.join(D,n)
def shpi(b):
  if b[:4]!=b'SHPI':b=refpack.unpack(b)
  return ppv95.parse(b)
# 1. rink palette: SHPI with one '!pal' picture, 256 x RGB in 6-bit (x4 = 8-bit)
rp=shpi(open(P('RINKPAL.QFS'),'rb').read())
raw=rp['pics'][0]['raw'][16:16+768];RINK=(np.frombuffer(raw,np.uint8).reshape(256,3).astype(int)*4)
# 2. team records: 28 x 448 bytes (NHL9XStudio pc-jersey.js): 0..191 = 64 team colours (6-bit RGB, loaded at game 128..191,
#    away +64); 192..447 = map from sprite index 0..255 to game palette index
def recs(f):
  b=open(P(f),'rb').read();return [np.frombuffer(b[i*448+192:i*448+448],np.uint8) for i in range(len(b)//448)]
R=recs('HOMEPALS.BIN')+recs('AWAYPALS.BIN')
M=np.array(R)
fixed=[(M[:,i]==M[0,i]).all() for i in range(256)]
# 3. usage
def hist(files):
  h=np.zeros(256,int)
  for f in files:
    try:o=shpi(open(f,'rb').read())
    except Exception as e:continue
    for p in o['pics']:
      if p['tag']=='!pal' or p['w']<=0 or p['h']<=0:continue
      h+=np.bincount(np.frombuffer(p['pixels'],np.uint8),minlength=256)
  return h
player=hist(sorted(f for f in glob.glob(P('*.PPV')) if os.path.basename(f)[0].isdigit()))
rink=hist([P('RINK.QFS')])
OTHER=['GOAL.PPV','SIREN.PPV','CROSS.PPV','NUMSHP.PPV','SCRBRD1.PPV','SCRBRD2.PPV','TRINKND.PPV','GUILT.PPV','HOOK.PPV','RUFF.PPV','CLAP.PPV','FANOM.PPV','GADGET5.PPV','GADGET6.PPV','CFLAG.PPV','UFLAG.PPV','SAVED.PPV','CRESTS4.PPV']+sorted(os.path.basename(f) for f in glob.glob(P('F[0-9]*.PPV')))
# SCRBRD2.QFS / PSTATBAR.QFS (HUD) are not counted
other=hist([P(f) for f in OTHER if os.path.exists(P(f))])
def role(i):
  if i==255:return 'transparent'
  if i>=192:return 'crest / logo (team-swapped)'
  if i>=144:return 'team zones (team-swapped)'
  if i>=128:return 'shared skin / stick (fixed map)'
  if i==8:return 'remapped to 16 (blade side)'
  if i in(82,88):return 'remapped to 99 (shadow)'
  return 'rink (fixed)'
rows=[]
for i in range(256):
  m=sorted(set(M[:,i].tolist()))
  rows.append(dict(index=i,r=RINK[i][0],g=RINK[i][1],b=RINK[i][2],role=role(i),
    maps_to=(str(m[0]) if len(m)==1 else 'team %d..%d'%(min(m),max(m))),fixed_for_all_teams=int(fixed[i]),
    player_px=int(player[i]),rink_px=int(rink[i]),other_px=int(other[i])))
out=os.path.join(paths.STATUS,'palette95_indices.csv')
with open(out,'w',newline='') as f:
  w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
print('wrote',out)
if __name__=='__main__' and '--no-image' not in sys.argv:
  import palette95_sheet;palette95_sheet.draw(rows)
