# Abdul's 3 player-glove textures (v12, 5x9) -> 4-wide glove block (4 cols x rows 18-20 per arm), rendered on 11 test + 6 extra frames
import os,sys,pickle,json,numpy as np
from PIL import Image,ImageDraw,ImageFont
V='/workspace/EA-NHL-Tools/sprite-textures/textures/v12/'
COLS=[0,1,3,4];ROWS=[1,4,7]     # 5x9 -> 4x3 nearest picks (documented: drop centre col 2; keep rows 1,4,7 = cuff / palm / fingers)
ARM={'FR':(0,False),'FL':(16,True),'BL':(20,False),'BR':(34,True)}   # left arms mirrored
def glove_tex(name):
    g=np.asarray(Image.open(V+f'tex_gear_glove_{name}.png').convert('RGB'));s=g[np.ix_(ROWS,COLS)]
    T=np.zeros((32,38,3),np.uint8);T[:]=(252,0,252)
    for z,(x0,mir) in ARM.items():T[18:21,x0:x0+4]=s[:,::-1] if mir else s
    return g,T
# --- 11 test frames: v2 mapping with the 4-wide block (glove4 WIDE=1)
K=pickle.load(open('/tmp/glove4_1.pkl','rb'));sp=K['sp']
# --- extra frames via glovestick placement with the widened block
src=open('/workspace/preview_v2/mapped/glovestick.py').read().split('\n')
pre='\n'.join(src[:9]+["for _t,_z in ({(3,v):'FR' for v in (18,19,20)}|{(34,v):'BR' for v in (18,19,20)}).items():FAM2[_t]='gear';NZ[_t]=_z"]+src[9:46])
os.chdir('/workspace/preview_v2/mapped');G={};exec(pre,G)
EXTRA=[16,55,127,235,307,627];EX={n:G['maps'](n) for n in EXTRA}
F=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',22);Fs=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',15)
for name in ('edmonton','ottawa','redblack'):
    g,T=glove_tex(name);Image.fromarray(T).save(f'/workspace/preview_v2/gloves/glove_{name}_v2block.png')
    W=1000;Im=Image.new('RGB',(W,900),(40,40,40));d=ImageDraw.Draw(Im)
    d.text((10,8),f'PLAYER GLOVE: {name.upper()}  (v12 art -> 4-wide glove block)',fill='white',font=F)
    d.text((10,44),'source 5x9',fill='white',font=Fs);Im.paste(Image.fromarray(g).resize((5*16,9*16),Image.NEAREST),(10,64))
    crop=T[17:22].copy();crop[np.all(crop==(252,0,252),2)]=(30,30,30)
    d.text((110,44),'v2 texture rows 17-21 (FR | FL BL | BR), x14',fill='white',font=Fs);Im.paste(Image.fromarray(crop).resize((38*14,5*14),Image.NEAREST),(110,64))
    d.text((110,140),'5x9 -> 4x3: cols 0,1,3,4  rows 1,4,7 (nearest); left arms mirrored',fill='white',font=Fs)
    frames=[(n,K['MAPS'][n][0],{p:K['A2'][n][p] for p in K['gl'][n]},'test') for n in K['FR']]+[(n,EX[n][0],{q:t for q,t in EX[n][1].items() if t[1]>=18},'extra*') for n in EXTRA]
    x,y,rh=10,230,0
    for n,q,mp,tag in frames:
        m=q!=255;a=np.zeros(q.shape+(3,),np.uint8);a[:]=40;a[m]=sp[q[m]];b=a.copy()
        for p,(tx,tv) in mp.items():b[p]=T[tv,tx]
        sc=3;w,h=q.shape[1]*sc,q.shape[0]*sc
        if x+2*w+20>W:x=10;y+=rh+30;rh=0
        d.text((x,y),f'{n} {tag}',fill='white',font=Fs)
        Im.paste(Image.fromarray(a).resize((w,h),Image.NEAREST),(x,y+20));Im.paste(Image.fromarray(b).resize((w,h),Image.NEAREST),(x+w+2,y+20))
        x+=2*w+16;rh=max(rh,h+20)
    y+=rh+34;d.text((10,y),'each pair: in-game | glove texture applied.  * extra frames use approximate UV placement (D25)',fill='white',font=Fs)
    Im=Im.crop((0,0,W,y+26));Im.save(f'/workspace/preview_v2/gloves/glove_{name}_sheet.png');print(name,Im.size)
