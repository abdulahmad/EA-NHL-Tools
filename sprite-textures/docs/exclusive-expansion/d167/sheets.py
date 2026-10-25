import sys,json,pickle,collections,numpy as np
sys.path[:0]=['/workspace/preview_v2/exclusive_samples','/workspace/preview_v2/exclusive_samples/v2']
from PIL import Image,ImageDraw
import render as RD
from gpal import GP
from assign import assign,TEX
F_=RD.F_;ng=RD.ng;TX=RD.tex();PCL=TX['Leafs home (default team)']
H=[k for k in TX if 'Horizontal' in k][0];Vt=[k for k in TX if 'Vertical' in k][0]
TEXRGB=np.where((TEX>0)[...,None],GP[TEX],(252,0,252)).astype(np.uint8)
R=pickle.load(open('map3.pkl','rb'));RT=pickle.load(open('retry.pkl','rb')) if len(sys.argv)>1 else {}
best={}
for (s,n,d),r in RT.items():
  if r['tmap'] and len(r['tmap'])>len(best.get((s,n),(0,{}))[1]):best[(s,n)]=(d,r['tmap'])
OUT={};rowsimg=[]
for (s,n,d),r in sorted(R.items(),key=lambda k:(k[0][0]!='G93',k[0][1])):
  tm=r['tmap'];note=''
  if not tm and (s,n) in best:d,tm=best[(s,n)];note=f' (fallback dir {d})'
  g=r['g'];M,c,E,mv=assign(g,tm);err=sum(v for k,v in c.items() if k.startswith('ERROR'))
  OUT[f'{s}_{n}']=dict(dir=d,errors=err,mean_texel_move=mv,**c,note=note.strip())
  org=np.full(g.shape+(3,),20,np.uint8);org[g>0]=GP[g[g>0]]
  P=[]
  for T in (None,PCL,TX[Vt],TX[H]):
    o=org.copy()
    for (y,x),(u,v) in M.items():o[y,x]=TEXRGB[v,u] if T is None else T[v,u]
    P.append(o)
  rowsimg.append((f'{s} {n} d{d}{note}: {err} err, mean move {mv}',[org]+P,E))
json.dump(OUT,open('final.json','w'),indent=1)
TT=[None,TEXRGB,PCL,TX[Vt],TX[H]];TN=['original','94G tex (rings=err)','PC Leafs','vertical','horizontal']
SC=4;CW=196;PER=5
for si in range(0,len(rowsimg),PER):
  ch=rowsimg[si:si+PER];RH=[max(a.shape[0] for a in r[1])*SC+110 for r in ch]
  im=Image.new('RGB',(1000,60+sum(RH)),(15,15,15));d=ImageDraw.Draw(im)
  d.text((8,6),f'D167 exclusive frames, hard colour constraint  {si//PER+1}/{(len(rowsimg)+PER-1)//PER}',font=F_(22),fill='white')
  d.text((8,34),'cols: '+' | '.join(TN)+'   (texture used under each)',font=F_(15),fill='white');y=60
  for (lab,P,E),rh in zip(ch,RH):
    d.text((8,y),lab,font=F_(18),fill=(255,230,0) if E else 'white')
    for j,a in enumerate(P):
      x=8+j*CW;e=Image.fromarray(ng(a)).resize((a.shape[1]*SC,a.shape[0]*SC),Image.NEAREST)
      if e.size[0]>CW-8:e=e.resize((CW-8,int(e.size[1]*(CW-8)/e.size[0])),Image.NEAREST)
      sc=e.size[0]/a.shape[1];im.paste(e,(x,y+26))
      if j==1:
        for yy,xx in E:d.ellipse([x+xx*sc-2,y+26+yy*sc-2,x+xx*sc+sc+1,y+26+yy*sc+sc+1],outline=(255,230,0),width=2)
      if TT[j] is not None:im.paste(Image.fromarray(ng(TT[j].astype(np.uint8))).resize((76,64),Image.NEAREST),(x,y+rh-70))
    y+=rh
  im.save(f'frames_{si//PER+1:02d}.png')
# texture comparison
im=Image.new('RGB',(1000,560),(15,15,15));d=ImageDraw.Draw(im);B=json.load(open('build.json'))
d.text((8,6),'Built 94G Leafs texture (left) vs PC Leafs texture (right), 38x32 v2',font=F_(22),fill='white')
for i,(t,nm) in enumerate(((TEXRGB,'94G Leafs (Genesis TORh palette)'),(PCL,'PC Leafs home'))):
  im.paste(Image.fromarray(ng(t.astype(np.uint8))).resize((456,384),Image.NEAREST),(8+i*490,70));d.text((8+i*490,42),nm,font=F_(18),fill='white')
g=B['G94'];v=B['G94 validation']
d.text((8,465),f"{B['zero_error_pc_frames']} zero-error PC frames; {g['pairs']} matched 94G frames. texels filled {g['filled']}/{g['used texels']}, gap-filled {g['gap filled']}, unfilled {g['still unfilled']} (magenta)",font=F_(16),fill='white')
d.text((8,490),f"mean texel vote agreement {g['mean agreement']}; {g['conflict texels']} texels had >1 colour",font=F_(16),fill='white')
d.text((8,515),f"validation: {v['match']}/{v['px']} matched-frame pixels reproduced ({100*v['match']/v['px']:.0f}%)",font=F_(16),fill=(255,230,0))
im.save('texture_94G_vs_PC.png');print(json.dumps(OUT)[:200])
