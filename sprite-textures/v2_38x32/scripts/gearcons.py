import os,sys,collections
def run(parts):
    os.environ['PARTS']=parts
    s=open('/workspace/preview_v2/mapped/v2map3.py').read();s=s[:s.index('# ---- verification')];NS={};exec(s,NS)
    out={}
    for P in('skates','gloves'):
        tx=collections.defaultdict(collections.Counter)
        for n in NS['FR']:
            q,A,LEV,fx=NS['MAPS'][n]
            for p,o in A.items():
                if NS['category'](NS['TF'][o],NS['ozone'](*o))==P:tx[NS['A2'][n][p]][int(q[p])]+=1
        out[P]=(sum(sum(c.values())-max(c.values()) for c in tx.values()),sum(sum(c.values()) for c in tx.values()),{str(t):dict(c) for t,c in tx.items() if len(c)>1})
    return out
for parts in ['','socks,helmet,skates,gloves']:
    r=run(parts);print('PARTS=',parts or 'direct',{k:(v[0],v[1]) for k,v in r.items()});print('  conflicts',r['skates'][2])
