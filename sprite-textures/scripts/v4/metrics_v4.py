# before/after metrics for the v4 jersey flats (vs measured reference specs)
import json,numpy as np,jerseys,build_v4 as BV,measure_ref as M
from jerseys import D as D0
from PIL import Image
OLD={k:dict(v) for k,v in D0.items()};CAP=BV.CAP
def old_rows(k,reg):
    s=OLD[k];bl={'front':(s.get('yoke') or [])+s['torso'],'sleeve':s['sleeve'],'sock':s['sock']}[reg];n=CAP[{'front':'torso_front','sleeve':'sleeve','sock':'sock'}[reg]][1]
    rows=[s['sockbase'] if reg=='sock' else s['base']]*n
    for v0,v1,c in bl:
        a=int(round(v0*n));b=max(int(round(v1*n)),a+1)
        for r in range(a,min(b,n)):rows[r]=c
    return rows
def truth(spec,bands,n):return [M.band_at(bands,(r+.5)/n) for r in range(n)]
def nm(spec,rgb):return BV.nearest(spec,rgb)
ALL=[];out={'teams':{}};tot=dict(old_ok=0,new_ok=0,rows=0,dropped_new=0,max_edge=0)
for k in D0:
    s=json.load(open(f'specs/{k}.json'));T={}
    for reg,cap in (('front','torso_front'),('sleeve','sleeve'),('sock','sock')):
        if k=='stars_alt' and reg=='front':continue
        n=CAP[cap][1];tr=truth(s,s[reg],n);old=[nm(s,c) for c in old_rows(k,reg)]
        idx=BV.alloc(s[reg],n);new=[s[reg][i][2] for i in idx]
        drop=len(s[reg])-len(set(idx)) if len(s[reg])<=n else None
        bnd=[j for j in range(1,n) if idx[j]!=idx[j-1]];ideal=[s[reg][i][0]*n for i in sorted(set(idx))[1:]]
        errs=[abs(b-e) for b,e in zip(bnd,ideal)];ALL.extend(errs);edge=max(errs,default=0)
        T[reg]=dict(rows=n,bands=len(s[reg]),old_row_match=sum(a==b for a,b in zip(old,tr)),new_row_match=sum(a==b for a,b in zip(new,tr)),dropped_new=drop,max_edge_err=round(edge,2))
        tot['old_ok']+=T[reg]['old_row_match'];tot['new_ok']+=T[reg]['new_row_match'];tot['rows']+=n;tot['dropped_new']+=drop or 0;tot['max_edge']=max(tot['max_edge'],edge)
    T['colour_de_old']=round(max(c['de_seed'] for c in s['colours'].values()),1);T['colour_de_new']=round(max(c['de_palette'] for c in s['colours'].values()),2)
    # crest: top-3 reference crest colours (by area, bg masked) vs colours in old/new flat crest
    if k!='blackhawks_alt':
        a=np.asarray(Image.open(M.R+k+'.png').convert('RGB')).astype(float);x0,y0,x1,y1=s['crest']['box'];c=a[y0:y1,x0:x1]
        hy0=s['lines']['front'][0][1];hem=max(l[2] for l in s['lines']['front']);v0=(y0-hy0)/(hem-hy0);v1=(y1-hy0)/(hem-hy0)
        under=[s['colours'][n_]['measured'] for t0,t1,n_ in s['front'] if t1>v0 and t0<v1];fg=~M.border_bg(c,under,10)
        cols=M.palette_k(c[fg],4);lb=np.stack([M.de(c[fg],np.array(q,float)) for q in cols],-1).argmin(-1);top=[cols[i] for i in np.argsort(-np.bincount(lb,minlength=len(cols)))[:3]]
        oldc=np.asarray(jerseys.crest_px(Image.open(M.R+k+'.png').convert('RGB').crop(OLD[k]['crest']),CAP['crest'][0],max(1,round(CAP['crest'][0]*(OLD[k]['crest'][3]-OLD[k]['crest'][1])/(OLD[k]['crest'][2]-OLD[k]['crest'][0]))))).reshape(-1,3).astype(float)
        newc=np.asarray(Image.open(f'v4/tex_{k}_crest.png').convert('RGB')).reshape(-1,3).astype(float)
        f=lambda C:round(max(float(M.de(C,t).min()) for t in top),1)
        T['crest_top3_de_old']=f(oldc);T['crest_top3_de_new']=f(newc)
    out['teams'][k]=T
out['total']=dict(tot,old_row_pct=round(100*tot['old_ok']/tot['rows'],1),new_row_pct=round(100*tot['new_ok']/tot['rows'],1),dropped_old=9,edges=len(ALL),edges_within_1px=sum(e<=1 for e in ALL))
json.dump(out,open('v4/metrics.json','w'),indent=1);print(json.dumps(out['total']));[print(k,v) for k,v in out['teams'].items()]
