import sys,json,pickle,collections,numpy as np
from tex import *
sys.path[:0]=['/workspace/preview_v2/exclusive_samples','/workspace/preview_v2/exclusive_samples/v2']
import render as RD
from gpal import GP
from PIL import Image,ImageDraw
F_=RD.F_;ng=RD.ng
V,S,FT=pickle.load(open('tex_G94_d169.pkl','rb'))
SH={k:c.most_common(1)[0][0] for k,c in S.items()}           # (family, PC idx) -> Genesis index
FB=collections.defaultdict(collections.Counter)
for (fm,pi),c in S.items():FB[fm].update(c)
FBI={fm:c.most_common(1)[0][0] for fm,c in FB.items()}         # fallback: most common Genesis index of the family
REP={'white':44,'navy':36,'skin':38,'black':34}
TEXRGB=np.full((32,38,3),(252,0,252),np.uint8)
for (u,v),fm in FT.items():TEXRGB[v,u]=GP[REP[fm]]
OUT={}
# --- validation on matched frames ---
c=collections.Counter()
for n,pn,mir,dy,dx in pairs('G94',zero=ZERO):
  f=D['frames'][str(pn)];px=np.array(f['px']);tm=f['tmap'];g=A['G94'][n]
  for gy,gx,py,qx in corr(g,px,mir,dy,dx):
    gi=int(g[gy,gx]);t=tm.get(f'{py},{qx}')
    if gi not in GFAM:continue
    if t is None:c['no texel']+=1;continue
    fm=FT[tuple(t)];r=SH.get((fm,int(px[py,qx])),FBI[fm]);c['px']+=1;c['family ok']+=fm==GFAM[gi];c['exact ok']+=r==gi
OUT['validation']=dict(c);print(dict(c))
# --- exclusives: pipeline texels kept, family constraint only ---
R=pickle.load(open('../v2/map3.pkl','rb'));RT=pickle.load(open('../v2/retry.pkl','rb'))
TX=RD.tex();PCL=TX['Leafs home (default team)'];H=[k for k in TX if 'Horizontal' in k][0];Vt=[k for k in TX if 'Vertical' in k][0]
rows_=[];TOT=collections.Counter();HOW=collections.Counter()
import warp172 as W7;from warp172 import DARK;import warp173 as W3;from warp173 import warp
for (s,n,d),r in sorted(R.items(),key=lambda k:(k[0][0]!='G93',k[0][1])):
  tm=r['tmap'];g=r['g'];note=''
  if not tm:
    for (s2,n2,d2),r2 in RT.items():
      if (s2,n2)==(s,n) and r2['tmap']:tm,d,note=r2['tmap'],d2,' (refit)'
  tm=tm or {};LAB=r['lab'] if r['tmap'] else [r2 for (s2,n2,d2),r2 in RT.items() if (s2,n2)==(s,n)][0]['lab']
  W3.CUR['k']=f'{s}_{n}';W7.EXC.clear();M2,hw,FM,OL,INFO=warp(g,tm,LAB,FT);EX=set(W7.EXC);HOW.update(hw);tm={f'{y},{x}':t for (y,x),t in M2.items()}
  c=collections.Counter();E=[];M={}
  for y,x in zip(*np.nonzero(g)):
    gi=int(g[y,x])
    if gi in NOTEX:c[NOTEX[gi]+' (game colour)']+=1;continue
    if gi not in GFAM:c['blood/decal (game colour)']+=1;continue
    c['px']+=1;t=tm.get(f'{y},{x}')
    if t is None:c['ERROR no texel']+=1;E.append((y,x));continue
    fm=FT.get(tuple(t))
    if fm is None:c['ERROR unfilled texel']+=1;E.append((y,x));continue
    M[(y,x)]=tuple(t)
    if fm!=FM[(y,x)]:c[f'ERROR family {FM[(y,x)]} px on {fm} texel']+=1;E.append((y,x))
  err=sum(v for k,v in c.items() if k.startswith('ERROR'));TOT.update(c);OUT[f'{s}_{n}']=dict(dir=d,errors=err,**c)
  org=np.full(g.shape+(3,),20,np.uint8);org[g>0]=GP[g[g>0]];P=[]
  for T_ in (None,PCL,TX[Vt],TX[H]):
    o=org.copy()
    for (y,x),(u,v) in M.items():
      if T_ is None:fm=FT[(u,v)];o[y,x]=(GP[DARK[fm]] if (y,x) in OL else GP[g[y,x]]) if fm==FM[(y,x)] else GP[REP[fm]]   # family ok -> original shade level
      else:o[y,x]=T_[v,u]
    P.append(o)
  rows_.append((f'{s} {n} d{d}{note}: {err} err, {len(EX)} nudged / {c["px"]} px',[org]+P,E,EX))
OUT['total']=dict(TOT);OUT['refit']=dict(HOW);print(dict(HOW));json.dump(OUT,open('final173.json','w'),indent=1)
print(dict(TOT));print({k:v['errors'] for k,v in OUT.items() if k not in('validation','total','refit')})
TT=[None,TEXRGB,PCL,TX[Vt],TX[H]];TN=['original','D169 tex','PC Leafs','vertical','horizontal']
SC=4;CW=196;PER=5
for si in range(0,len(rows_),PER):
  ch=rows_[si:si+PER];RH=[max(a.shape[0] for a in r[1])*SC+110 for r in ch]
  im=Image.new('RGB',(1000,60+sum(RH)),(15,15,15));d_=ImageDraw.Draw(im)
  d_.text((8,6),f'D173: skeleton-driven per-bone warp vs D169 texture  {si//PER+1}/{(len(rows_)+PER-1)//PER}',font=F_(22),fill='white')
  d_.text((8,34),'cols: '+' | '.join(TN)+'  (texture under each; yellow ring = error, cyan box = nudge)',font=F_(15),fill='white');y=60
  for (lab,P,E,EX),rh in zip(ch,RH):
    d_.text((8,y),lab,font=F_(18),fill=(255,230,0) if E else 'white')
    for j,a in enumerate(P):
      x=8+j*CW;e=Image.fromarray(ng(a)).resize((a.shape[1]*SC,a.shape[0]*SC),Image.NEAREST)
      if e.size[0]>CW-8:e=e.resize((CW-8,int(e.size[1]*(CW-8)/e.size[0])),Image.NEAREST)
      sc=e.size[0]/a.shape[1];im.paste(e,(x,y+26))
      if j==1:
        for yy,xx in EX:d_.rectangle([x+xx*sc,y+26+yy*sc,x+xx*sc+sc-1,y+26+yy*sc+sc-1],outline=(0,255,255),width=1)
        for yy,xx in E:d_.ellipse([x+xx*sc-2,y+26+yy*sc-2,x+xx*sc+sc+1,y+26+yy*sc+sc+1],outline=(255,230,0),width=2)
      if TT[j] is not None:im.paste(Image.fromarray(ng(TT[j].astype(np.uint8))).resize((76,64),Image.NEAREST),(x,y+rh-70))
    y+=rh
  im.save(f'd173_frames_{si//PER+1:02d}.png')
