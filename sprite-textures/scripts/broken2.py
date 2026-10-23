from lib import *
import json
rank=np.full(256,-1)
for i in (165,166,167):rank[i]=0
for k,g in enumerate([(168,169,170),(171,172,173),(174,175,176)]):
    for i in g:rank[i]=k+1
for i in (177,178,179,180):rank[i]=4
rs=np.full(256,-1)
for i in (181,182,183):rs[i]=0
for i in (184,185,186):rs[i]=1
for i in (187,188,189):rs[i]=2
def shear(p,R):
    r=R[p];a=r[:,:-1];b=r[:,1:];v=(a>=0)&(b>=0)
    # horizontal neighbours differing by band while vertically the frame is upright
    return float(((a!=b)&v).sum()/max(v.sum(),1)), int(v.sum())
RANGES=[('skaters 1-352',1,352),('goalie 408-554',408,554),('extra 569-644',569,644),('bench/cup 873-888',873,888),('95 crosscheck 889-904',889,904),('95 boards 905-974',905,974),('95 goalie 975-1072',975,1072),('95 shotblock 1073-1128',1073,1128)]
per={}
for n in range(1,1135):
    p=frame(n)
    if not p.size: continue
    w=shear(p,rank);s=shear(p,rs)
    per[n]={'waist_shear':round(w[0],3),'sock_shear':round(s[0],3),'idx28':int((p==28).sum()),'idx8':int((p==8).sum())}
out={}
for name,a,b in RANGES:
    v=[per[n] for n in range(a,b+1) if n in per]
    out[name]={k:round(float(np.mean([x[k] for x in v])),3) for k in v[0]}
    print(name,out[name])
bw=np.percentile([per[n]['waist_shear'] for n in range(1,353)],95);bs=np.percentile([per[n]['sock_shear'] for n in range(1,353)],95)
print('p95 skaters',bw,bs)
flag={n:per[n] for n in per if n>876 and (per[n]['waist_shear']>bw or per[n]['sock_shear']>bs or per[n]['idx28']>per[n]['idx8'])}
print(len(flag),sorted(flag))
json.dump({'ranges':out,'per':per,'flag':sorted(flag),'p95':[bw,bs]},open('broken_metrics.json','w'))
