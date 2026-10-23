import json,sys,numpy as np
G=lambda n:(373<=n<=380) or (408<=n<=554) or (975<=n<=1072)
R95=dict(crosscheck=(889,904),boards=(905,974),goalie95=(975,1072),shotblock=(1073,1128))
def stats(tag):
    A={int(k):v for k,v in json.load(open(f'audit_{tag}.json')).items()};r={}
    fr=[n for n,d in A.items() if 'torso' in d]
    r['frames_with_torso_uv']=len(fr)
    st=[A[n]['t_str'] for n in fr if A[n].get('t_str') is not None and A[n]['torso'][2]>=10]
    r['torso_iso_straight(<0.05)']=f"{sum(x<.05 for x in st)}/{len(st)}"
    L=[l for d in A.values() if 'limbs' in d for l in d['limbs'] if l['s'] is not None and l['ay']>.5 and l['n']>=15]
    r['limb_iso_straight_on_vertical_limbs']=f"{sum(l['s']<.05 for l in L)}/{len(L)}"
    # temporal flips
    fl=fb=pairs=0;jit=[]
    for n in fr:
        b=A.get(n+1)
        if not b or 'torso' not in b: continue
        a=A[n];
        if abs(a['torso'][0]-b['torso'][0])+abs(a['torso'][1]-b['torso'][1])>4 or not(.75<a['torso'][3]/b['torso'][3]<1.33):continue
        pairs+=1;fb+=a['front']!=b['front']
        if a.get('t_isorow') is not None and b.get('t_isorow') is not None: jit.append(abs(a['t_isorow']-b['t_isorow']))
        for la in a['limbs']:
            if 'sleeve' not in la['r']:continue
            cand=[lb for lb in b['limbs'] if 'sleeve' in lb['r']]
            if not cand:continue
            lb=min(cand,key=lambda x:np.hypot(x['c'][0]-la['c'][0],x['c'][1]-la['c'][1]))
            if np.hypot(lb['c'][0]-la['c'][0],lb['c'][1]-la['c'][1])<3 and lb['r']!=la['r']:fl+=1
    r['similar_consecutive_pairs']=pairs;r['front_back_flips']=fb;r['sleeve_label_flips']=fl
    r['torso_iso_jitter_median/p90']=[round(float(np.median(jit)),3),round(float(np.percentile(jit,90)),3)] if jit else None
    tp=[A[n]['trim_px'] for n in fr];r['trim_band(.86-.89)_zero_px']=f"{sum(t==0 for t in tp)}/{len(tp)}"
    cr=[d['crest'] for d in A.values() if 'crest' in d];r['crest_frames']=len(cr);r['crest_w_median/max']=[int(np.median([c[0] for c in cr])),max(c[0] for c in cr)];r['crest_h_median']=int(np.median([c[1] for c in cr]))
    r['arm_over_torso_frames']=sum(1 for d in A.values() if d.get('arm_over_torso',0)>=3)
    r['stride_pants_single_region']=sum(1 for d in A.values() if d.get('sock_sep',0)>.5*d.get('pants_w',99))
    for nm,cond in (('skater',lambda n:not G(n) and n<=1128),('goalie',G)):
        c=[A[n]['cov'] for n in A if cond(n) and A[n].get('cov') is not None];r[f'uv_coverage_{nm}_mean']=round(float(np.mean(c)),3)
    for nm,(a,b) in R95.items():
        c=[A[n]['cov'] for n in range(a,b+1) if A.get(n,{}).get('cov') is not None];r[f'uv_cov_{nm}']=round(float(np.mean(c)),3)
    return r
for t in sys.argv[1:]:print(t,json.dumps(stats(t),indent=0))
