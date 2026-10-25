# Editor data (Abdul pt947u): python3 g28export.py [out.json]  (run from goalie12, after g28all.py) -> a LOCAL json with each
# goalie frame's sprite indices, part labels and skeleton joints, the EDM home palette and both textures. It holds game data:
# keep it on your machine, never commit it. Open sprite-textures/goalie_part_editor.html and load this file.
import sys,os,json,tempfile,numpy as np
H=os.path.dirname(os.path.abspath(__file__));G=os.path.abspath(H+'/..');sys.path.insert(0,G+'/goalie17')
from g17inspect import TEAMS,spal,frame
from PIL import Image
t=[t for t in TEAMS if t[0]=='edm_home'][0];sp=spal(t[1],t[2])
_G=os.path.join(tempfile.gettempdir(),'g28_all.json')
if not os.path.exists(_G):_G=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','editor','inputs','g28_all.json')   # D190 committed copy
A=json.load(open(_G))
out=dict(palette=[list(map(int,c)) for c in sp],
  texDefault=np.array(Image.open(G+'/goalie29/goalie_texture_v8_indexed.png')).astype(int).tolist(),
  texFuhr=np.asarray(Image.open(G+'/goalie29/fuhr_oilers_texture_v14.png').convert('RGB')).astype(int).tolist(),
  frames={n:dict(px=frame(int(n)).astype(int).tolist(),lab=r['lab'],joints=r['joints'],back=r['back']) for n,r in A.items()})
sys.path.insert(0,G+'/..');import test_textures as TT
dRGB=np.array([[sp[i] if i!=255 else (252,0,252) for i in r] for r in out['texDefault']]);used=np.array(out['texDefault'])!=255
out['textures']={'Default (v8)':dRGB.astype(int).tolist(),'Fuhr v14':out['texFuhr']}
out['textures'].update(TT.make(dRGB,used,regions={'blocker':(0,0,10,7),'mask':(12,0,9,8),'pad':(0,9,10,14),'strip':(10,9,3,14),'stick':(14,9,3,14),'catcher back':(0,23,11,9),'catcher front':(11,23,11,9)},pads=(0,9,10,14)))
# D153: goalie27 tp.py pad tests H and V (pad front only, the rest stays default), as used for the D134-D135 pad maps
for _k,_fn in (('Pad lines H (pads only)',lambda y,x:TT.CB[(y-9)%10]),('Pad lines V (pads only)',lambda y,x:TT.CB[x])):
    _T=np.array(dRGB).copy()
    for _y in range(9,23):
        for _x in range(10):
            if used[_y,_x]:_T[_y,_x]=_fn(_y,_x)
    out['textures'][_k]=_T.astype(int).tolist()
o=sys.argv[1] if len(sys.argv)>1 else os.path.join(tempfile.gettempdir(),'goalie_editor_data.json');json.dump(out,open(o,'w'),separators=(',',':'));print(o,len(out['frames']),'frames')
