import sys,os,json,csv;sys.path.insert(0,'.');sys.path.insert(0,'/workspace/wt-exclusive/NHL-exclusive-sprites-PC-colors/tools')
from sets import *
from flaw import *
from conv import *
from pack import roundtrip,sprite_bytes
import joblib
from PIL import Image
import sheet as S
from sheet import paint,up,legend
import zones as ZN
OUT='out/'
for d in('idx','preview_bos_h','pc_bos_h','preview_zones','pack','sheets'):os.makedirs(OUT+d,exist_ok=True)
MOD={k:joblib.load(f'model_{k}_final.joblib') for k in('skater','goalie')}
BS=Baseline('skater');EP=Baseline('skater').E+Baseline('goalie').E;NP=424+146
ZRGB=np.zeros((64,3),np.uint8)
for k,(n,c) in ZN.Z.items():
    if k:ZRGB[32+k]=c
ZRGB[1:32]=GRGB[1:32]
def pal_png(idx,rgb):
    im=Image.fromarray(idx.astype(np.uint8),'P');pal=[0]*768
    for i in range(64):pal[3*i:3*i+3]=[int(v) for v in rgb[i]]
    im.putpalette(pal);im.info['transparency']=0;return im
rows=[];cells={}
cand=[k for k in sorted(P.index) if final_tier(k) in('none','ambiguous')]
for k in cand:
    a=np.asarray(A['PC'][k]).astype(int);kd=kindof(k);t=final_tier(k)
    if kd=='fixed':
        g,line=convert_item(a);st=dict(model=0,fallback=0,fb_idx=set());mdl='item-nearest-colour line %d'%line
        fl=[];fm={}
    else:
        g,st=convert(a,MOD[kd]);mdl=kd+' model'
        if kd=='skater':fl,fm=BS.flags(a)
        else:
            m=metrics(a,EP,NP);fl=[]
            if m['rare_edge_px']>0:fl.append('odd zone contact: '+m['rare_pairs'])
            if m['stray_px']>=12:fl.append(f"stray stripe px {m['stray_px']}")
            fl+=structure_flags(a);fm=m
    g,nres=resolve_lines(g)
    ok,pk=roundtrip(g)
    n=pcn(k)
    pal_png(g,GRGB).save(OUT+f'idx/pc_{n}_g94idx.png')
    Image.fromarray(paint(g,GRGB,transp=(0,))).save(OUT+f'preview_bos_h/pc_{n}_g94_bos_h.png')
    Image.fromarray(paint(a,BOSPC,transp=(255,))).save(OUT+f'pc_bos_h/pc_{n}_pc_bos_h.png')
    Image.fromarray(paint(g,ZRGB,transp=(0,))).save(OUT+f'preview_zones/pc_{n}_g94_zones.png')
    open(OUT+f'pack/pc_{n}_tiles.bin','wb').write(pk['tiles']);open(OUT+f'pack/pc_{n}_sprites.bin','wb').write(sprite_bytes(pk))
    used=sorted(int(v) for v in np.unique(g) if v)
    ncol={l:len([u for u in used if u>>4==l]) for l in (0,1,2)}
    rows.append(dict(pc_frame=n,census_key=k,tier=t,kind=kd,exclusive_all_sets=k in EXC,census_category=P.loc[k].category,opaque_px=int((g>0).sum()),w=a.shape[1],h=a.shape[0],
        colours_used=max(ncol.values()),g94_indices=' '.join(map(str,used)),model_px=st['model'],fallback_nearest_px=st['fallback'],object_line01_px=st.get('obj',0),mixed_tile_recoloured_px=nres,fallback_pc_idx=' '.join(map(str,sorted(st['fb_idx']))),
        kind_basis=kind_basis(k),method=mdl,zone_flag=bool(fl),zone_flag_reasons=' | '.join(fl),team_px=fm.get('team_px',''),roundtrip_ok=ok,tiles=pk['ntiles'],hw_sprites=len(pk['sprites']),canvas_w=pk['W'],canvas_h=pk['H'],palette_line=pk['line']))
    cells[k]=dict(label=f'PC {n}',tag=('FIXED' if kd=='fixed' else ('ZONES?' if fl else None)),imgs=[paint(a,BOSPC,transp=(255,)),paint(g,GRGB,transp=(0,))])
import pandas as pd
D=pd.DataFrame(rows);D.to_csv(OUT+'manifest.csv',index=False)
print(D.groupby(['tier','kind']).size());print('roundtrip',D.roundtrip_ok.all(),'flagged',D.groupby(['tier','kind']).zone_flag.sum().to_dict(),'fallback px',int(D.fallback_nearest_px.sum()),'max colours',D.colours_used.max())
G94ROLE={33:'blade',34:'black',35:'A dark',36:'A mid',37:'A light',38:'skin lt',39:'skin dk',40:'B dark',41:'B light',42:'C',43:'D mid',44:'D light',45:'D dark',46:'stick',47:'shadow'}
leg=legend(GRGB,[(k,f'{k} {v}') for k,v in G94ROLE.items()],'Genesis palette line 2, BOS home (the number is the pixel value in the idx PNGs)',cols=8)
leg01=legend(GRGB,[(k,f'L{k>>4}:{k&15}') for k in list(range(1,16))+list(range(17,32))],'Genesis palette lines 0 and 1 (referees, items, cup): value = 16*line + n',cols=10)
def sheetset(name,title,sel,scale=3,lg=None):
    ks=[k for k in sorted(cells) if sel(k)]
    if not ks:return []
    return S.pages(title,[cells[k] for k in ks],scale,lg or leg,OUT+'sheets/'+name)
tk=lambda k,t,kd:final_tier(k)==t and kindof(k)==kd
f=[]
f+=sheetset('A_skaters','NO 94G MATCH: skaters',lambda k:tk(k,'none','skater'))
f+=sheetset('A_goalies','NO 94G MATCH: goalies',lambda k:tk(k,'none','goalie'))
f+=sheetset('B_skaters','UNSURE (weak 94G look-alike): skaters',lambda k:tk(k,'ambiguous','skater'))
f+=sheetset('B_goalies','UNSURE (weak 94G look-alike): goalies',lambda k:tk(k,'ambiguous','goalie'))
f+=sheetset('C_refs_items_A','REFEREES / ITEMS, no 94G match (nearest colour)',lambda k:kindof(k)=='fixed' and final_tier(k)=='none',lg=leg01)
f+=sheetset('C_refs_items_B','REFEREES / ITEMS, unsure (nearest colour)',lambda k:kindof(k)=='fixed' and final_tier(k)=='ambiguous',lg=leg01)
#f+=sheetset('C_refs_items','REFEREES / ITEMS (fixed colours, nearest colour)',lambda k:kindof(k)=='fixed')
print(len(f),'sheets');json.dump(f,open(OUT+'sheets/list.json','w'))
