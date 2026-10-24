# Editor data (Abdul pt947u): python3 g28export.py [out.json]  (run from goalie12, after g28all.py) -> a LOCAL json with each
# goalie frame's sprite indices, part labels and skeleton joints, the EDM home palette and both textures. It holds game data:
# keep it on your machine, never commit it. Open sprite-textures/goalie_part_editor.html and load this file.
import sys,os,json,numpy as np
H=os.path.dirname(os.path.abspath(__file__));G=os.path.abspath(H+'/..');sys.path.insert(0,G+'/goalie17')
from g17inspect import TEAMS,spal,frame
from PIL import Image
t=[t for t in TEAMS if t[0]=='edm_home'][0];sp=spal(t[1],t[2])
A=json.load(open('/tmp/g28_all.json'))
out=dict(palette=[list(map(int,c)) for c in sp],
  texDefault=np.array(Image.open(G+'/goalie29/goalie_texture_v8_indexed.png')).astype(int).tolist(),
  texFuhr=np.asarray(Image.open(G+'/goalie29/fuhr_oilers_texture_v14.png').convert('RGB')).astype(int).tolist(),
  frames={n:dict(px=frame(int(n)).astype(int).tolist(),lab=r['lab'],joints=r['joints'],back=r['back']) for n,r in A.items()})
o=sys.argv[1] if len(sys.argv)>1 else '/tmp/goalie_editor_data.json';json.dump(out,open(o,'w'),separators=(',',':'));print(o,len(out['frames']),'frames')
