# Oilers Fuhr (Abdul v12 art) into goalie layout pass 3. Only the pads are resized; everything else is 1:1.
import json,numpy as np
from PIL import Image
V='/workspace/preview_back/root/sprite-textures/textures/v12/';O='/workspace/preview_v2/goalie3/'
ld=lambda f:np.asarray(Image.open(V+f).convert('RGB')).astype(np.uint8)
pick=lambda s,d:[min(s-1,int((i+0.5)*s/d)) for i in range(d)]
L={};tex=np.zeros((32,38,3),np.uint8);tex[:]=(252,0,252)
def put(name,a,x0,y0,w,h,mirror=False):
    if mirror:a=a[:,::-1]
    H,W=a.shape[:2];cx=pick(W,w);cy=pick(H,h);tex[y0:y0+h,x0:x0+w]=a[np.ix_(cy,cx)]
    L[name]=dict(src=[W,H],dst=[w,h],at=[x0,y0],mirrored=mirror,cols_kept=cx if W!=w else 'all',rows_kept=cy if H!=h else 'all')
pad,padb=ld('tex_gear_pad.png'),ld('tex_gear_pad_b.png')
put('padF_L',pad,0,0,9,20);put('padF_R',pad,9,0,10,20,True)
put('padB_L',padb,19,0,9,20);put('padB_R',padb,28,0,10,20,True)
put('blocker',ld('tex_gear_blocker.png'),0,20,8,12);put('catcher',ld('tex_gear_catcher.png'),8,20,11,9)
m=ld('tex_gear_goalie_mask.png');put('maskF',m,19,20,6,7);put('maskB',ld('tex_gear_mask_b.png'),25,20,5,6)
lum=m.astype(int).sum(2);tex[20,30]=m[np.unravel_index(lum.argmin(),lum.shape)];L['cage']=dict(at=[30,20],colour=tex[20,30].tolist(),src='darkest maskF texel')
Image.fromarray(tex).save(O+'fuhr_oilers_texture_v3.png');json.dump(L,open(O+'fuhr_oilers_resize_log_v3.json','w'),indent=1)
for k,v in L.items():print(k,v)
