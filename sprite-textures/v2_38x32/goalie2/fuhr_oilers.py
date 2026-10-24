# Lay Abdul's v12 Oilers Fuhr gear art into the goalie layout pass 2 (padL 9x21, padR 10x21, blocker 10x10, catcher 10x10, mask 7x6, cage texel 36,0)
import json,numpy as np
from PIL import Image
V='/workspace/EA-NHL-Tools/sprite-textures/textures/v12/'
ld=lambda f:np.asarray(Image.open(V+f).convert('RGB')).astype(np.uint8)
def pick(n_src,n_dst):   # nearest-neighbour index list (centre sampling), documented in the log
    return [min(n_src-1,int((i+0.5)*n_src/n_dst)) for i in range(n_dst)]
def edge(a,w,h):         # grow by repeating edge rows/cols (Abdul's edge-extension rule), centred
    H,W=a.shape[:2];l=(w-W)//2;t=(h-H)//2
    return np.pad(a,((t,h-H-t),(l,w-W-l),(0,0)),mode='edge')
LOG={}
def fit(a,w,h,name,mode):
    H,W=a.shape[:2];cx=list(range(W));cy=list(range(H))
    if W>w:cx=pick(W,w)
    if H>h:cy=pick(H,h)
    b=a[np.ix_(cy,cx)]
    if b.shape[1]<w or b.shape[0]<h:b=edge(b,max(w,b.shape[1]),max(h,b.shape[0]))
    LOG[name]=dict(src=[W,H],dst=[w,h],mode=mode,cols_kept=cx if W>w else 'all',rows_kept=cy if H>h else 'all',
                   edge_added=[w-min(W,w),h-min(H,h)])
    return b
tex=np.zeros((32,38,3),np.uint8);tex[:]=(252,0,252)
pad=ld('tex_gear_pad.png')
tex[0:21,0:9]=fit(pad,9,21,'padL','nearest resample 15x25 -> 9x21')
tex[0:21,9:19]=fit(pad[:,::-1],10,21,'padR','mirror, nearest resample 15x25 -> 10x21')
tex[0:10,19:29]=fit(ld('tex_gear_blocker.png'),10,10,'blocker','height 12->10 nearest, width 8->10 edge-extend')
tex[10:20,19:29]=fit(ld('tex_gear_catcher.png'),10,10,'catcher','width 11->10 nearest, height 9->10 edge-extend')
m=ld('tex_gear_goalie_mask.png');tex[0:6,29:36]=fit(m,7,6,'goalie_mask','height 7->6 nearest, width 6->7 edge-extend')
lum=m.astype(int).sum(2);tex[0,36]=m[np.unravel_index(lum.argmin(),lum.shape)];LOG['cage']=dict(texel=[36,0],colour=tex[0,36].tolist(),src='darkest mask texel (cage bars)')
# reserved, not yet mapped (mapping has no front/back face choice yet): mask_b 5x6 at cols 29-33 rows 6-11
tex[6:12,29:34]=ld('tex_gear_mask_b.png');LOG['mask_b']='reserved at cols 29-33 rows 6-11, 1:1, not mapped yet'
LOG['pad_b']='not placed: 17x24 needs ~2 blocks of 9-10x21; free area is rows 21-31 (11 rows) -> needs a layout decision'
Image.fromarray(tex).save('/workspace/preview_v2/goalie/fuhr_oilers_texture.png')
Image.fromarray(tex).resize((38*10,32*10),Image.NEAREST).save('/workspace/preview_v2/goalie/fuhr_oilers_texture_x10.png')
json.dump(LOG,open('/workspace/preview_v2/goalie/fuhr_oilers_resize_log.json','w'),indent=1)
for k,v in LOG.items():print(k,v)
