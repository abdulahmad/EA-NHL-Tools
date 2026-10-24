# Fuhr Oilers texture v7: base colours only. The v3/v6 art had baked grey shading (neutral greys) in pads/gloves/mask; shading now
# comes from the gear shading layer, so neutral greys are snapped: luminance >= 96 -> white (252,252,252), else black. Colours untouched.
import numpy as np,collections;from PIL import Image
H='/workspace/EA-NHL-Tools/sprite-textures/v2_38x32/'
t=np.asarray(Image.open(H+'goalie6/fuhr_oilers_texture_v6.png').convert('RGB')).astype(int).copy()
mag=(t==(252,0,252)).all(2);ch=t.max(2)-t.min(2);L=t@[.299,.587,.114];g=(ch<30)&~mag
w=g&(L>=96)&((t!=252).any(2));b=g&(L<96)&((t!=0).any(2))
t[g&(L>=96)]=252;t[g&(L<96)]=0;t[31-11:31-11+0]=t[31-11:31-11+0]
Image.fromarray(t.astype(np.uint8)).save(H+'goalie7/fuhr_oilers_texture_v7.png')
print('snapped to white',int(w.sum()),'to black',int(b.sum()),'of',int((~mag).sum()))
print(collections.Counter(map(tuple,t[~mag])).most_common(12))
