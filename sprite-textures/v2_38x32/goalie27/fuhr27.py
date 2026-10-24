# Fuhr v12 (Abdul pt935u + follow-up, D135): v11 + the navy pad stripe as one clean straight column: texel col 7,
# rows 9-20 solid navy (constant width, full pad height; rows 21-22 at col 7 are transparent in Abdul's layout).
# Col 7 is Abdul's stripe column (default 152/151 orange stripe cols 7-8) and is where the DR reference stripe falls
# (x 165-190 of 256 -> 6.4-7.4 of 10).  usage: python3 fuhr27.py
import os,numpy as np;from PIL import Image
H=os.path.dirname(os.path.abspath(__file__))
T=np.array(Image.open(H+'/../goalie26/fuhr_oilers_texture_v11.png').convert('RGB')).astype(int)
NAVY=(8,24,88)
for y in range(9,21):T[y,7]=NAVY
# the old noisy downsampled stripe (navy-ish texels in col 6/8) goes back to the pad white of its row
for y in range(9,21):
    for x in (6,8):
        r,g,b=T[y,x]
        if b>r+40 and b>g+20 and r<90:T[y,x]=T[y,5]
Image.fromarray(T.astype(np.uint8)).save(H+'/fuhr_oilers_texture_v12.png');print('saved v12')
