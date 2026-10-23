from lib import *
import json
CREST=[i for r in (192,208,224,240) for i in range(r,r+5)]
def m(p):
    h=p.shape[0];ys,xs=np.nonzero(p==88)
    return {'shadow_above_feet':int((ys<0.7*h).sum()),'stick136':int((p==136).sum()),'crest':int(np.isin(p,CREST).sum()),'skin':int(np.isin(p,[133,134,135,140]).sum())}
per={n:m(frame(n)) for n in range(1,1135) if frame(n).size}
R=[('skaters 1-352',1,352),('goalie 408-554',408,554),('extra 569-644',569,644),('bench/cup 873-888',873,888),('crosscheck 889-904',889,904),('boards 905-974',905,974),('goalie95 975-1072',975,1072),('shotblock 1073-1128',1073,1128)]
for name,a,b in R:
    v=[per[n] for n in range(a,b+1) if n in per]
    print(name,{k:round(float(np.mean([x[k] for x in v])),1) for k in v[0]}, 'frames w/ shadow-stick&no136:',sum(1 for x in v if x['shadow_above_feet']>=4 and x['stick136']==0),'/',len(v))
bad=[n for n in per if per[n]['shadow_above_feet']>=4 and per[n]['stick136']==0]
print('shadow-index-stick frames:',bad)
json.dump({'per':per,'shadow_stick':bad},open('broken_stick.json','w'))
