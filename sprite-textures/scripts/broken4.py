from lib import *
import json
AR=np.full(256,-1)
for i in (156,157,158):AR[i]=0
for i in (153,154,155):AR[i]=1
for i in (150,151,152):AR[i]=2
for i in (147,148,149):AR[i]=3
for i in (144,145,146):AR[i]=4
CR={192:0,208:1,224:2,240:3}
def m(p):
    r=AR[p];bad=0;tot=0
    for a,b in ((r[:,:-1],r[:,1:]),(r[:-1,:],r[1:,:])):
        v=(a>=0)&(b>=0)&(a!=b);tot+=v.sum();bad+=(v&(abs(a-b)>1)).sum()
    rows=[k for base,k in CR.items() if np.isin(p,range(base,base+5)).any()]
    gap=bool(rows) and (max(rows)-min(rows)+1!=len(rows))
    return {'arm_skip':float(bad/max(tot,1)),'arm_trans':int(tot),'crest_rows':rows,'crest_gap':gap}
per={n:m(frame(n)) for n in range(1,1135) if frame(n).size}
R=[('skaters 1-352',1,352),('goalie 408-554',408,554),('extra 569-644',569,644),('bench/cup 873-888',873,888),('crosscheck 889-904',889,904),('boards 905-974',905,974),('goalie95 975-1072',975,1072),('shotblock 1073-1128',1073,1128)]
res={}
for name,a,b in R:
    v=[per[n] for n in range(a,b+1) if n in per]
    res[name]={'arm_skip_mean':round(float(np.mean([x['arm_skip'] for x in v])),3),'crest_gap_frames':sum(x['crest_gap'] for x in v),'n':len(v)}
    print(name,res[name])
print('crest gap frames',[n for n in per if per[n]['crest_gap']])
th=np.percentile([per[n]['arm_skip'] for n in range(1,353) if per[n]['arm_trans']>5],95)
print('p95 skater arm_skip',th,'95-new frames above:',[n for n in range(877,1135) if n in per and per[n]['arm_trans']>5 and per[n]['arm_skip']>th])
json.dump({'per':per,'ranges':res},open('broken_arm_crest.json','w'))
