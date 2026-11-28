import sys;sys.path.insert(0,'/workspace/snes-to-pc')
from s2g import *
from pal import SPB,GPB,BG
from pcexp import *   # BOS (PC palette), convert_93, spit_rt, png_rt, VALID, SH
import percolor,pickle,json,os,csv,collections
from fam import score
import pandas as pd
from PIL import Image,ImageDraw,ImageFont
OUT='/workspace/snes-to-pc/out/';
for d in ('npy','genesis_idx','pc_idx','preview_bos','sheets'):os.makedirs(OUT+d,exist_ok=True)
rf=pickle.load(open('rf_all.pkl','rb'))
d=pd.read_csv(V+'frames_matrix.csv');s=d[d.set=='S94']
x=s[(s.G94_class!='match')&(s.PC_class!='match')]
x[['frame','category','label','animation_spf' if 'animation_spf' in x else 'spa','used','G94_class','G94_best','G94_score','PC_class','PC_best','PC_score','exclusive']].to_csv(OUT+'snes_exclusive_list.csv',index=False)
FR=[('boardback',864),('boardfront',840),('boardright',848),('boardleft',888),('crosscheck',519),('benchcheckl',896),('stanley',217),('pump2',790),('celebrate+1',185),('skatewp',2),('stumble',475),
    ('gbutterfly',718),('gcover+1',694),('gpoke',679),('gskate',619),('gsprawll',742)]
GOAL={718,694,679,619,742}
GPAL=np.zeros((256,3),np.uint8);GPAL[:]=GPB
def g_rt(a,path):
    im=Image.fromarray(a.astype(np.uint8),'P');im.putpalette([int(v) for v in GPB.ravel()]);im.save(path,transparency=0)
    b=Image.open(path);return bool(np.array_equal(np.array(b),a.astype(np.uint8)))
rows={}
for lab_,f in FR:
    S=A['S94'][f];B,info=convert(rf,S,f in GOAL)
    C=convert_93(B).astype(np.int16)
    okg=g_rt(B,OUT+f'genesis_idx/s94_{f}_g94style_idx.png')
    okp=png_rt(C,OUT+f'pc_idx/s94_{f}_pc_idx.png');oks=spit_rt(C)
    bad=sorted(set(int(v) for v in np.unique(C) if v!=255 and v not in EB.VALID))
    np.save(OUT+f'npy/s94_{f}_g94style.npy',B);np.save(OUT+f'npy/s94_{f}_pcidx.npy',C)
    Image.fromarray(paint(C,BOS),'RGB').save(OUT+f'preview_bos/s94_{f}_pc_bos_h.png') if False else None
    rows[f]=dict(label=str(x[x.frame==f].label.iloc[0]),S=S,B=B,C=C,rt=dict(genesis_png=okg,pc_png_sh=okp,spit=oks,invalid=bad),eye=info)
    print(f,lab_,B.shape,'rt',okg,okp,oks,bad,info,flush=True)
pickle.dump(rows,open(OUT+'rows.pkl','wb'))
