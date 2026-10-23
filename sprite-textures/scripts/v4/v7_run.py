# v6 driver: band-team fronts built like backs (+crest at true position); else as v5
import build_v7 as B7,build_v6 as B6,build_v5 as B5,build_v4 as BV,json,numpy as np,measure_ref as M,jerseys,os
from build_v4 import *
from v4_run import grid_px,row_sheet,stack,compare_sheet,fit,anchored,CROPS,TCROPS,FR,anc,sp
O='v7/';os.makedirs(O,exist_ok=True)
def as_D5(key,s):
    tb=lambda bl:[(a,b,col(s,n)) for a,b,n in bl]
    back=[] if key in ('stars_alt','thrashers_home') else tb(B5.strip_collar(s['back']))
    sl=[] if key=='thrashers_home' else tb(s['sleeve'])
    return dict(jerseys.D[key],yoke=None,torso=back,sleeve=sl,sock=[],direct=True)
if __name__=='__main__':
    for k in jerseys.D:
        s,F=B7.build_team(k);A=atlas_from(F);A.save(O+f'{k}_cap_atlas.png')
        jerseys.D[k]=as_D5(k,s);crest=Image.fromarray(F['crest'])
        fl=[('torso_front',F['torso_front']),('torso_back',F['torso_back']),('sleeve',F['sleeve'])]+([('sleeve_b',F['sleeve_b'])] if k=='thrashers_home' else [])+[('sock',F['sock']),('pants',F['pants']),('helmet',F['helmet']),('glove',F['glove'])]
        row_sheet([grid_px(a,label=f'{n} {a.shape[1]}x{a.shape[0]}') for n,a in fl]).save(O+f'{k}_flat.png')
        for n,a in fl[:-3]:Image.fromarray(a).save(O+f'tex_{k}_{n}.png')
        ims=[render3(n,A,crest,sp,k,pixcrest='none')[0] for n in FR]
        anchored(ims,[anc(n) for n in FR],8).save(O+f'{k}_grid_v7.png')
        ref=Image.open('jerseys/ref/'+jerseys.D[k]['ref']).convert('RGB')
        bx=lambda b:ref.crop(b)
        rows=[('torso_front',bx(B5.FRONT[k]['box']))]
        rows.append(('torso_back',bx(B5.STARS_BACK['box']) if k=='stars_alt' else bx(B5.FRONT[k]['box']) if k=='thrashers_home' else bx((CROPS['torso_back'][0],CROPS['torso_back'][1]+M.DY[k],CROPS['torso_back'][2],CROPS['torso_back'][3]+M.DY[k]))))
        if k=='thrashers_home':rows+= [(n,bx(b)) for n,b in B5.THR_SLEEVE.items()]
        else:rows.append(('sleeve',bx((CROPS['sleeve'][0],CROPS['sleeve'][1]+M.DY[k],CROPS['sleeve'][2],CROPS['sleeve'][3]+M.DY[k]))))
        rows.append(('sock',bx(B5.SOCK[k])))
        rows=[(n,r,A.crop((ATLAS[n][0],ATLAS[n][1],ATLAS[n][0]+ATLAS[n][2],ATLAS[n][1]+ATLAS[n][3])),F[n]) for n,r in rows]
        compare_sheet(jerseys.D[k]['name']+' (v7)',rows).save(O+f'{k}_compare.png')
        print(k,'ok')
