import sys;sys.path.insert(0,'/workspace/snes-to-pc')
from s2g import *
from pcexp import *
import pickle,os,json,pandas as pd
from PIL import Image
from pal import GPB
OUT='/workspace/snes-to-pc/out/all/'
for d in ('npy','genesis_idx','pc_idx','sheets'):os.makedirs(OUT+d,exist_ok=True)
rf=pickle.load(open('rf_all.pkl','rb'))
L=pd.read_csv('out/snes_exclusive_list.csv')
def g_rt(a,path):
    im=Image.fromarray(a.astype(np.uint8),'P');im.putpalette([int(v) for v in GPB.ravel()]);im.save(path,transparency=0)
    return bool(np.array_equal(np.array(Image.open(path)),a.astype(np.uint8)))
res={};fail={}
for r in L[L.category!='nonplayer'].itertuples():
    f=int(r.frame)
    try:
        S=A['S94'][f]
        if S.max()==0:raise ValueError('empty frame')
        B,info=convert(rf,S,r.category=='goalie');C=convert_93(B).astype(np.int16)
        okg=g_rt(B,OUT+f'genesis_idx/s94_{f}_g94style_idx.png');okp=png_rt(C,OUT+f'pc_idx/s94_{f}_pc_idx.png');oks=spit_rt(C)
        bad=sorted(set(int(v) for v in np.unique(C) if v!=255 and v not in EB.VALID))
        np.save(OUT+f'npy/s94_{f}_g94style.npy',B);np.save(OUT+f'npy/s94_{f}_pcidx.npy',C)
        res[f]=dict(S=S,B=B,C=C,rt=dict(g=okg,p=okp,s=oks,bad=bad),eye=bool(info and info['eyes']))
        if not(okg and okp and oks) or bad:fail[f]=res[f]['rt']
    except Exception as e:
        fail[f]=repr(e);print('FAIL',f,repr(e),flush=True)
    if len(res)%40==0:print(len(res),flush=True)
pickle.dump(res,open(OUT+'res.pkl','wb'));json.dump({str(k):v for k,v in fail.items()},open(OUT+'failures.json','w'),indent=1)
print('done',len(res),'fail',len(fail))
