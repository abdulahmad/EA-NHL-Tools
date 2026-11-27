"""Write each PSD frame (best layer, overlays composited in place, lined up on the retail 93 frame) as an indexed PNG whose
pixel values ARE 95 PC palette indices (255 = transparent). The PNG palette is Abdul's guide palette, for viewing only.
Pixels that are still Genesis colours are left as 255 here and listed in <frame>_todo.png (white = still to do).
Then runs the round-trip gate on every exported frame: encode to a 95 PC SPIT picture -> decode -> identical indices."""
import os,sys;sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)));import paths
import json,pickle,numpy as np,csv
from PIL import Image
from ppv95 import encode_pic,decode_pic
OUT=os.path.join(paths.ROOT,'frames_pc')+os.sep;os.makedirs(OUT,exist_ok=True)
R={r['layer']:r for r in json.load(open(paths.WORK+'recon.json'))['results']}
U={n:(a,f,al,mp) for n,a,f,al,mp in pickle.load(open(paths.WORK+'recon.pkl','rb'))}
A,S=paths.frames();G93=A['G93']
B=Image.open(paths.ABDUL+'abdul_palette.bmp');BP=np.array(B.getpalette()).reshape(-1,3)
GUIDE={tuple(int(x) for x in BP[i]):i for i in sorted(set(np.array(B).flatten().tolist()))}
PAL=[int(v) for v in BP.flatten()]
best={}
for r in R.values():
  if r['layer']=='Layer 33':continue
  f=r['frame']
  if f not in best or (r['done_pct'],r['kind']=='PC_PAL')>(best[f]['done_pct'],best[f]['kind']=='PC_PAL'):best[f]=r
rows=[];ok=0
for f,r in sorted(best.items()):
  a,_,al,mp=U[r['layer']];s,mir,y,x=al;g=G93[f];gg=g[:,::-1] if mir else g
  idx=np.full(gg.shape,255,np.uint8);todo=np.zeros(gg.shape,np.uint8)
  for gy,gx in zip(*np.nonzero(gg)):
    ly,lx=gy+y,gx+x
    c=tuple(int(t) for t in a[ly,lx,:3]) if 0<=ly<a.shape[0] and 0<=lx<a.shape[1] else None
    if c is not None and mp[gy,gx] in('pc','shared'):idx[gy,gx]=GUIDE.get(c,c[0])
    else:todo[gy,gx]=255
  if mir:idx=idx[:,::-1];todo=todo[:,::-1]           # back to the retail frame's own facing
  im=Image.fromarray(idx,'P');im.putpalette(PAL);im.save(OUT+f'93_{f}.png',transparency=255)
  if todo.any():Image.fromarray(todo).save(OUT+f'93_{f}_todo.png')
  h,w=idx.shape;hdr=bytes([0x81,2,4,8])+bytes(12)           # placeholder header (a common retail value); real slot headers come from the target PPV
  back=decode_pic(encode_pic(hdr,w,h,idx.tobytes()))
  same=back['pixels']==idx.tobytes();ok+=same
  rows.append([f,r['layer'],r['status'],r['done_pct'],int((todo>0).sum()),w,h,'pass' if same else 'FAIL'])
with open(OUT+'frames_pc.csv','w',newline='') as fh:
  wr=csv.writer(fh);wr.writerow(['frame_93','psd_layer','status','pc_pct','todo_px','w','h','spit_roundtrip']);wr.writerows(rows)
print(f'exported {len(rows)} frames to {OUT}; SPIT encode->decode identical: {ok}/{len(rows)}')
