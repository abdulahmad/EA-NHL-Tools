"""Draw the two NHL 95 PC palette charts (called by palette95.py):
  ../status/palette95_sprite.png  (A) sprite palette: the indices stored in the .PPV files, by role
  ../status/palette95_game.png    (B) game palette: the 256 slots on screen, by band, and (C) how sprite indices reach them"""
import os,sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import paths
from PIL import Image,ImageDraw
BLOOD={83:'B1',78:'B2',76:'b1'}            # see PALETTE95.md
CW,CH,X0=58,50,36;W=X0*2+16*CW
F=paths.font
def tcol(c):return (0,0,0) if 0.299*c[0]+0.587*c[1]+0.114*c[2]>110 else (255,255,255)
def is_red(c):R,G,B=c;return R>=64 and G<=R*0.5 and B<=R*0.5
def cell(d,x,y,c,top,bottom=None,gold=False,tag=None,hatch=False):
  d.rectangle([x,y,x+CW-3,y+CH-3],fill=tuple(int(v) for v in c),outline=(0,0,0))
  tc=tcol(c)
  if hatch:   # team-dependent: corner triangle
    d.polygon([(x+CW-3,y+CH-19),(x+CW-3,y+CH-3),(x+CW-19,y+CH-3)],fill=tc)
  d.text((x+4,y+3),str(top),font=F(17),fill=tc)
  if bottom:d.text((x+4,y+CH-21),bottom,font=F(13),fill=tc)
  if tag:d.text((x+CW-24,y+4),tag,font=F(13),fill=tc)
  if gold:
    d.rectangle([x-1,y-1,x+CW-2,y+CH-2],outline=(255,200,0),width=4)
    d.rectangle([x+3,y+3,x+CW-7,y+CH-7],outline=(0,0,0),width=1)
def grid(d,y,title,rng,fn):
  d.text((X0,y+8),title,font=F(22),fill=(0,0,0));y+=42
  for k,i in enumerate(rng):fn(X0+(k%16)*CW,y+(k//16)*CH,i)
  return y+((len(rng)+15)//16)*CH+8
def legend(d,y,lines):
  for t in lines:d.text((X0,y),t,font=F(17),fill=(0,0,0));y+=28
  return y
def draw(ctx):
  rows,G,slot=ctx['rows'],ctx['game'],ctx['slot']
  home_map=ctx['home'][1];H,A=ctx['ex_home'],ctx['ex_away']
  # ---------- (A) sprite palette ----------
  im=Image.new('RGB',(W,1500),(255,255,255));d=ImageDraw.Draw(im)
  d.text((X0,14),'(A) Sprite palette: indices stored in .PPV files',font=F(28),fill=(0,0,0))
  d.text((X0,52),'Each cell = sprite index, the game slot it goes to (home side), and its colour for %s home.'%H,font=F(16),fill=(0,0,0))
  def fa(x,y,i):
    r=rows[i];hs=slot(int(home_map[i]),'home')
    if i==255:cell(d,x,y,(255,255,255),i,'clear');return
    fixed=int(r['same_for_every_team'])
    c=G[hs]
    tag=BLOOD.get(i)
    cell(d,x,y,c,i,'->%d'%hs,gold=bool(fixed and i<128 and is_red(c)),tag=tag,hatch=not fixed)
  y=86
  y=grid(d,y,'Rink palette indices 0-127: go to the same slot (except 8, 82, 88)',range(0,128),fa)
  y=grid(d,y,'Skin tones / eyes / stick 128-143: fixed slots in the rink palette',range(128,144),fa)
  y=grid(d,y,'Jersey zones 144-191: team colours (corner mark = per team)',range(144,192),fa)
  y=grid(d,y,'Crest / ice logo 192-254 (team), 255 transparent',range(192,256),fa)
  y=legend(d,y+4,['->N = game slot for the home side. Away side: N+64 when N is 128 or more.',
    'Corner mark = depends on the team (colour shown: %s home). No mark = same for every team.'%H,
    'Gold frame = red / dark-red, same for every team (blood candidate).',
    'B1, B2 = proposed blood (Genesis 29 -> 83, 28 -> 78); b1 = alternative 76.'])
  im.crop((0,0,W,y+10)).save(os.path.join(paths.STATUS,'palette95_sprite.png'))
  # ---------- (B) game palette + (C) mapping ----------
  im=Image.new('RGB',(W,2200),(255,255,255));d=ImageDraw.Draw(im)
  d.text((X0,14),'(B) Game palette: the 256 slots on screen',font=F(28),fill=(0,0,0))
  d.text((X0,52),'Example game: %s home, %s away. Real colours from RINKPAL.QFS and the two team records.'%(H,A),font=F(16),fill=(0,0,0))
  def fb(x,y,i):
    c=G[i];cell(d,x,y,c,i,gold=(i<128 and is_red(c)),tag=BLOOD.get(i),hatch=(128<=i<=250))
  y=86
  y=grid(d,y,'Rink palette 0-127 (RINKPAL.QFS, fixed)',range(0,128),fb)
  y=grid(d,y,'Team one = home 128-191 (%s HOMEPALS colours 0-63)'%H,range(128,192),fb)
  y=grid(d,y,'Team two = away 192-250 (%s AWAYPALS colours 0-58)'%A,range(192,251),fb)
  y=grid(d,y,'251-255: rink palette again (overwrites away colours 59-63)',range(251,256),fb)
  y=legend(d,y+4,['Corner mark = team colours (change every game). Gold frame = blood candidates.'])
  # (C)
  y+=16;d.text((X0,y),'(C) How sprite indices reach game slots',font=F(28),fill=(0,0,0));y+=44
  BW=16*CW;sx=lambda i:X0+i*BW/256
  ROLE=[(0,127,(200,200,200),'rink 0-127'),(128,143,(235,195,150),'skin'),(144,191,(100,150,235),'jersey 144-191'),(192,254,(185,140,230),'crest 192-254'),(255,255,(255,255,255),'')]
  for side,band in (('home',(100,150,235)),('away',(245,170,60))):
    d.text((X0,y),'%s side (%s): sprite palette'%(side.capitalize(),H if side=='home' else A),font=F(20),fill=(0,0,0));y+=30
    ys=y
    for a,b,c,l in ROLE:
      d.rectangle([sx(a),ys,sx(b+1)-1,ys+30],fill=c,outline=(0,0,0))
      if l:d.text((sx(a)+4,ys+5),l,font=F(15),fill=(0,0,0))
    yg=ys+150
    GB=[(0,127,(200,200,200),'rink 0-127'),(128,191,(100,150,235) if side=='home' else (235,235,235),'home 128-191'),(192,250,(245,170,60) if side=='away' else (235,235,235),'away 192-250'),(251,255,(90,90,90),'')]
    ov=Image.new('RGBA',im.size,(0,0,0,0));od=ImageDraw.Draw(ov)
    def fan(a,b,c,e,col):od.polygon([(sx(a),ys+31),(sx(b+1),ys+31),(sx(e+1),yg-1),(sx(c),yg-1)],fill=col+(110,))
    fan(0,127,0,127,(150,150,150))
    team=(128,191) if side=='home' else (192,255)
    fan(144,191,team[0],team[0]+42 if side=='home' else team[0]+40,(60,110,220))
    fan(192,254,team[0],team[0]+42 if side=='home' else team[0]+40,(150,90,210))
    im.paste(Image.alpha_composite(im.convert('RGBA'),ov).convert('RGB'))
    d=ImageDraw.Draw(im)
    for i in range(128,144):
      v=int(home_map[i])
      if v:d.line([(sx(i)+1.75,ys+31),(sx(v)+1.75,yg-1)],fill=(150,90,30),width=2)
    for i in (76,78,83):
      d.line([(sx(i)+1.75,ys+31),(sx(i)+1.75,yg-1)],fill=(0,0,0),width=5);d.line([(sx(i)+1.75,ys+31),(sx(i)+1.75,yg-1)],fill=(255,200,0),width=3)
    d.text((X0+6,ys+60),'blood 76/78/83:',font=F(15),fill=(0,0,0));d.text((X0+6,ys+80),'straight down ->',font=F(15),fill=(0,0,0))
    d.text((sx(128)+6,ys+100),'skin -> rink slots',font=F(15),fill=(120,60,0))
    d.text((sx(175) if side=='home' else sx(190),ys+50),'team zones + crest',font=F(15),fill=(0,0,0))
    for a,b,c,l in GB:
      d.rectangle([sx(a),yg,sx(b+1)-1,yg+30],fill=c,outline=(0,0,0))
      if l:d.text((sx(a)+4,yg+5),l,font=F(15),fill=(0,0,0) if c!=(90,90,90) else (255,255,255))
    d.text((sx(251)-30,yg+34),'251-255',font=F(13),fill=(0,0,0))
    d.text((X0,yg+34),'game palette',font=F(20),fill=(0,0,0));y=yg+64
  y=legend(d,y,['Team record map values below 128 are rink slots: the same for home and away.',
    'Values 128-191 are team colours: home uses them as is, away adds 64.',
    'Stored maps reach at most 170 (home) / 168 (away): away never reaches 251-255.'])
  im.crop((0,0,W,y+10)).save(os.path.join(paths.STATUS,'palette95_game.png'))
  print('wrote palette95_sprite.png, palette95_game.png')
