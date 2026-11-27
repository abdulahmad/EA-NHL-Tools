import os,sys;sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)));import paths
import pickle,numpy as np,pandas as pd,csv,sys
from PIL import Image
sys.path.insert(0,'.');from zones import Z,BLOOD,OVL
A,S=paths.frames()
D=pd.read_pickle(paths.WORK+'cls.pkl');OUT=paths.INDEXED
PAL=[c for k in range(16) for c in Z[k][1]]
INV={v:k for k,v in OVL.items()}
BPAL=[c for k in range(16) for c in (BLOOD[INV[k]][1] if k in INV else Z[k][1])]
assert len({tuple(BPAL[i:i+3]) for i in range(0,48,3)})==16,'overlay palette not unique'
grid=[]
def build(rows,stem,game):
  ms=[A[r.set][r.frame] for r in rows]
  cw=max(m.shape[1] for m in ms)+2;ch=max(m.shape[0] for m in ms)+2
  cols=max(1,1000//cw);nr=(len(ms)+cols-1)//cols
  im=np.zeros((nr*ch,cols*cw),np.uint8);bl=np.zeros_like(im);hasb=False
  for i,(r,m) in enumerate(zip(rows,ms)):
    y,x=(i//cols)*ch+1,(i%cols)*cw+1
    sub=np.where((m>32)&(m<48),m-32,0).astype(np.uint8);im[y:y+m.shape[0],x:x+m.shape[1]]=sub
    bm=OVL;b=np.vectorize(lambda v:bm.get(int(v),0))(m).astype(np.uint8)
    if b.any():hasb=True;bl[y:y+m.shape[0],x:x+m.shape[1]]=b
    other=[int(v) for v in np.unique(m) if v and not (32<v<48) and v not in bm];assert not other,(r.frame,other)
    grid.append(dict(file=f'{stem}.png',cell=i,row=i//cols,col=i%cols,x=x,y=y,w=m.shape[1],h=m.shape[0],game=game,frame=r.frame,animation=r.label,status=r.status))
  P=Image.fromarray(im,'P');P.putpalette(PAL);P.save(OUT+stem+'.png',transparency=0)
  if hasb:
    B=Image.fromarray(bl,'P');B.putpalette(BPAL);B.save(OUT+stem+'_blood_overlay.png',transparency=0)
g94=D[(D.set=='G94')&(D.status=='exclusive')].sort_values('frame')
g93=D[(D.set=='G93')].sort_values('frame');unc=D[D.status=='uncertain'].sort_values('frame')
build(list(g94.itertuples()),'indexed_94G_only','NHL94 Genesis')
build(list(g93.itertuples()),'indexed_93_only','NHLPA93 Genesis')
build(list(unc.itertuples()),'indexed_uncertain_94G','NHL94 Genesis')
with open(OUT+'indexed_grid_order.csv','w',newline='') as f:
  w=csv.DictWriter(f,fieldnames=list(grid[0]));w.writeheader();w.writerows(grid)
# palette table
def gp(path):
  d=open(path,'rb').read();return [int.from_bytes(d[i:i+2],'big') for i in range(0,32,2)]
tor=gp(paths.TORPAL94)
with open(OUT+'zone_palette.csv','w',newline='') as f:
  w=csv.writer(f);w.writerow(['file','index','genesis_value','zone','display_R','display_G','display_B','display_hex','TOR_home_game_colour_0BGR'])
  for k in range(16):
    n,c=Z[k];w.writerow(['indexed_*.png + sheets',k,32+k if k else '',n,*c,'#%02X%02X%02X'%c,'%03X'%tor[k] if k else ''])
  for k,(n,c) in BLOOD.items():
    w.writerow(['indexed_93_only_blood_overlay.png',OVL[k],f'line {k//16} idx {k%16}',n,*c,'#%02X%02X%02X'%c,''])
for fn in ['indexed_94G_only','indexed_93_only','indexed_uncertain_94G','indexed_93_only_blood_overlay']:
  im=Image.open(OUT+fn+'.png');p=im.getpalette()[:48];cols=[tuple(p[i:i+3]) for i in range(0,len(p),3)]
  used=sorted(set(np.array(im).flatten().tolist()))
  print(fn,im.mode,im.size,'palette entries',len(im.getpalette())//3,'unique RGB in 16:',len(set(cols)),'indices used',used,'transparency',im.info.get('transparency'))
