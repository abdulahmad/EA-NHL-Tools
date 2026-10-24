# Fuhr v13 (D142): v12 + the new STICK region x14-16 rows 9-22, coloured like the game (index 136 shaft colour of the
# EDM home palette, 0 black outline/blade). Knee cuff and mask V tip unchanged (D140).
import os,sys,numpy as np;from PIL import Image
H=os.path.dirname(os.path.abspath(__file__));G=os.path.abspath(H+'/..');sys.path.insert(0,G+'/goalie17')
from g17inspect import TEAMS,spal
t=[t for t in TEAMS if t[0]=='edm_home'][0];sp=spal(t[1],t[2])
T=np.array(Image.open(G+'/goalie27/fuhr_oilers_texture_v12.png').convert('RGB')).astype(int)
L=np.array(Image.open(H+'/goalie_texture_v7_indexed.png')).astype(int)
for y in range(9,23):
    for x in (14,15,16):T[y,x]=sp[L[y,x]]
Image.fromarray(T.astype(np.uint8)).save(H+'/fuhr_oilers_texture_v13.png');print('saved v13',sp[136])
