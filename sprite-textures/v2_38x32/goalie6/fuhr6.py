# Fuhr Oilers texture in layout v6: pads/blocker/catcher blocks unchanged from goalie3/fuhr_oilers_texture_v3.png (same rectangles);
# mask rebuilt as the 12x7 wrap strip from the source art: front 6x7 -> cols 3-8 as is; back 5x6 -> 6x7 (nearest), its goalie-right
# half (art cols 3-5) -> strip cols 0-2, goalie-left half (art cols 0-2) -> strip cols 9-11 (seen from behind, art left = goalie left).
import numpy as np;from PIL import Image
V='/workspace/preview_back/root/sprite-textures/textures/v12/';H='/workspace/EA-NHL-Tools/sprite-textures/v2_38x32/'
t=np.asarray(Image.open(H+'goalie3/fuhr_oilers_texture_v3.png').convert('RGB')).copy()
strap=t[20,30].copy();t[20:27,19:32]=(252,0,252)
mf=np.asarray(Image.open(V+'tex_gear_goalie_mask.png').convert('RGB'))
mb=np.asarray(Image.open(V+'tex_gear_mask_b.png').convert('RGB').resize((6,7),Image.NEAREST))
t[20:27,22:28]=mf;t[20:27,19:22]=mb[:,3:6];t[20:27,28:31]=mb[:,0:3];t[20,31]=strap
Image.fromarray(t).save(H+'goalie6/fuhr_oilers_texture_v6.png');print(mf.shape,mb.shape)
