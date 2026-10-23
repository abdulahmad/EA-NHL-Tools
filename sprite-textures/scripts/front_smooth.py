# temporal front/back vote: chains of consecutive near-identical frames share one facing (majority of crest+skin evidence)
import json,numpy as np
from lib import frame
CR=set([*range(192,197),*range(208,213),*range(224,229),*range(240,245)]);SK={133,134,135,140}
A={int(k):v for k,v in json.load(open('audit_before.json')).items()}
ev={}
for n in range(1,1135):
    p=frame(n);ev[n]=int(np.isin(p,list(CR)).sum())+int(np.isin(p,list(SK)).sum())
chains=[];cur=[]
for n in range(1,1135):
    a=A.get(n,{});b=A.get(n-1,{})
    if cur and 'torso' in a and 'torso' in b and abs(a['torso'][0]-b['torso'][0])+abs(a['torso'][1]-b['torso'][1])<=4 and .75<a['torso'][3]/b['torso'][3]<1.33: cur.append(n)
    else:
        if cur:chains.append(cur)
        cur=[n]
chains.append(cur);ov={}
for c in chains:
    if len(c)<2:continue
    votes=[(A[n].get('front',False),ev[n]) for n in c if 'front' in A.get(n,{})]
    w=sum(e if f else -e*0+0 for f,e in votes);fr=sum(1 for f,e in votes if f);bk=len(votes)-fr
    maj=fr>=bk if fr!=bk else sum(e for f,e in votes if f)>0
    for n in c:ov[n]=bool(maj)
json.dump(ov,open('data/front_override.json','w'));print(len(chains),sum(len(c)>1 for c in chains),len(ov))
