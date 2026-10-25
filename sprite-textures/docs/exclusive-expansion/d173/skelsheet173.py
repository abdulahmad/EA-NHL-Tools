import json,pickle,numpy as np,sys
sys.path[:0]=['/workspace/preview_v2/exclusive_samples','/workspace/preview_v2/exclusive_samples/v2']
import render as RD;from gpal import GP
from PIL import Image,ImageDraw
F_=RD.F_
SK=json.load(open('skel173.json'));R=pickle.load(open('../v2/map3.pkl','rb'));G={f'{s}_{n}':r['g'] for (s,n,d),r in R.items()}
# high-luminance colours, no red/green pairs; sprite drawn dimmed so lines stand out
COL={'head':(255,255,0),'torso':(255,255,255),'upperarm':(0,255,255),'forearm':(255,0,255),'hand':(255,160,0),
     'thigh':(120,170,255),'shin':(255,150,200),'skate':(255,255,160),'shaft':(255,220,120),'blade':(200,120,255)}
def kind(b):return b.split(' ')[-1]
keys=sorted(SK,key=lambda k:(k[:3]!='G93',int(k[4:])));SC=5;CW=240;CH=260;PER=12
pages=[keys[i:i+PER] for i in range(0,len(keys),PER)]
for pi,ks in enumerate(pages):
  im=Image.new('RGB',(4*CW+20,90+3*CH),(0,0,0));d=ImageDraw.Draw(im)
  d.text((8,4),f'D173 skeletons on Genesis exclusives {pi+1}/{len(pages)}',font=F_(24),fill='white');x=8
  for k_,c in COL.items():d.text((x,36),k_,font=F_(16),fill=c);x+=d.textlength(k_,font=F_(16))+14
  d.text((8,60),'L side = solid line + filled dot, R side = dashed line + hollow dot.  ! = flagged',font=F_(16),fill='white')
  for i,k in enumerate(ks):
    g=G[k];o=np.zeros(g.shape+(3,),np.uint8);o[g>0]=(GP[g[g>0]]*0.45).astype(np.uint8)
    sc=min(SC,(CW-10)/g.shape[1],(CH-40)/g.shape[0]);e=Image.fromarray(o).resize((int(g.shape[1]*sc),int(g.shape[0]*sc)),Image.NEAREST)
    X0,Y0=8+(i%4)*CW,90+(i//4)*CH;im.paste(e,(X0,Y0+30));J=SK[k]['joints'];fl=SK[k]['flags']
    geo=[f for f in fl if 'IoU' not in f]
    d.text((X0,Y0+4),f"{k.replace('_',' ')} pr {SK[k]['prior']} iou {SK[k]['iou']:.2f}"+(' !' if geo else ''),font=F_(16),fill=(255,230,0) if geo else 'white')
    P=lambda n:(X0+(J[n][0]+.5)*sc,Y0+30+(J[n][1]+.5)*sc)
    for a,b,bn in SK[k]['bones']:
      if a not in J or b not in J:continue
      c=COL[kind(bn) if kind(bn) in COL else 'shaft'];p,q=P(a),P(b)
      if bn.startswith('R '):
        for t in np.linspace(0,1,8)[::2]:
          t2=min(t+1/7,1);d.line([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t,p[0]+(q[0]-p[0])*t2,p[1]+(q[1]-p[1])*t2],fill=c,width=3)
      else:d.line([p,q],fill=c,width=3)
      for n in(a,b):
        r=P(n);d.ellipse([r[0]-3,r[1]-3,r[0]+3,r[1]+3],outline=c,fill=None if n.startswith('R ') else c,width=2)
  im.save(f'd173_skeletons_{pi+1}.png')
