# D145: texture v8 (indexed) + Fuhr v14 (= v13 + the new eye-hole/strap texels in Fuhr's colours: the 45 eye cells copy Fuhr's
# eye holes (4,15)/(4,17), the 134 strap cells copy Fuhr's strap (5,12)/(5,20)). Cuff and V tip unchanged (D140).
import os,sys,numpy as np;from PIL import Image
H=os.path.dirname(os.path.abspath(__file__));G=os.path.abspath(H+'/..');sys.path.insert(0,G+'/goalie28');sys.path.insert(0,G+'/goalie12')
import g28all
Image.fromarray(g28all.L8.astype(np.uint8)).save(H+'/goalie_texture_v8_indexed.png')   # same format as v7
T=np.array(Image.open(G+'/goalie28/fuhr_oilers_texture_v13.png').convert('RGB'))
T[7,15]=T[4,15];T[7,17]=T[4,17];T[6,12]=T[5,12];T[6,20]=T[5,20]
Image.fromarray(T).save(H+'/fuhr_oilers_texture_v14.png');print('saved',T[4,15],T[5,12])
