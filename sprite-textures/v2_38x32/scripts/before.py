import sys,json;sys.path.insert(0,'/workspace/preview_v2/mapped')
s=open('/workspace/preview_v2/mapped/v2map.py').read();s=s[:s.index('# ---- verification')]
NS={};exec(s,NS);import ctrl
TEAMS=[('HOME.json','tor'),('AWAY.json','nyr'),('HOME.json','chi'),('AWAY.json','chi'),('HOME.json','mtl')]
res={}
for t in TEAMS:
    o,_,_=ctrl.diff(NS,NS['A2'],t);res[' '.join(t)]=o
    tot=sum(v['diff'] for v in o.values());print('BEFORE',t,tot,{n:v['zones'] for n,v in o.items() if v['diff']})
json.dump(res,open('/workspace/preview_v2/mapped/control_before.json','w'),default=str)
