from lib import *
from scipy import ndimage as ndi
import collections,json
GR={'helmet':(190,191),'yoke':(159,161,162,163),'body':(165,166,167),'waist':tuple(range(168,177)),'pants':(177,178,179,180),'socks':tuple(range(181,190))}
ARM={'a1':(153,154,155),'a2':(150,151,152),'a3':(147,148,149),'fa':(144,145,146),'ua':(156,157,158)}
OK_LOW={0,8,28,82,88,99,255}
def metrics(p):
    m=p!=255;h=p.shape[0];r={}
    ys={k:np.nonzero(np.isin(p,v))[0] for k,v in GR.items()}
    order=[k for k in GR if len(ys[k])>3];mean=[ys[k].mean() for k in order]
    r['inv']=sum(1 for i in range(len(mean)) for j in range(i+1,len(mean)) if mean[i]>mean[j]+1)
    comps=0;px=0
    for v in ARM.values():
        mm=np.isin(p,v);px+=mm.sum();comps+=ndi.label(mm)[1]
    r['armfrag']=comps/max(px,1)
    # shade adjacency: light next to dark of the same part without medium (jersey/socks/upper arm)
    r['lowidx']=float(np.isin(p,[i for i in range(1,128) if i not in OK_LOW]).sum()/max(m.sum(),1))
    # isolated single pixels of a jersey zone (no 4-neighbour in same part group)
    iso=0;tot=0
    for v in list(GR.values())+list(ARM.values()):
        mm=np.isin(p,v);tot+=mm.sum()
        nb=ndi.convolve(mm.astype(int),np.array([[0,1,0],[1,0,1],[0,1,0]]),mode='constant')
        iso+=(mm&(nb==0)).sum()
    r['iso']=iso/max(tot,1)
    return r
RANGES=[('skaters 1-352',1,352),('goalie 408-554',408,554),('extra 569-644',569,644),('ref 650-699',650,699),('bench/cup 873-888',873,888),
        ('95 crosscheck 889-904',889,904),('95 boards 905-974',905,974),('95 goalie 975-1072',975,1072),('95 shotblock 1073-1128',1073,1128)]
per={}
for n in range(1,1135):
    p=frame(n)
    if p.size: per[n]=metrics(p)
stats={}
for name,a,b in RANGES:
    v=[per[n] for n in range(a,b+1) if n in per]
    stats[name]={k:round(float(np.mean([x[k] for x in v])),3) for k in v[0]}
    print(name,stats[name])
base={k:np.percentile([per[n][k] for n in range(1,353) if n in per],95) for k in ('armfrag','iso','lowidx')}
flag={n:[k for k in base if per[n][k]>base[k]*1.0] for n in range(877,1135) if n in per}
flag={n:f for n,f in flag.items() if len(f)>=2}
print('baseline p95',base);print('flagged',len(flag),sorted(flag)[:200])
json.dump({'stats':stats,'per':per,'flag':flag,'base':{k:float(v) for k,v in base.items()}},open('broken_metrics.json','w'),indent=0)
