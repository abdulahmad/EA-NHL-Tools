import os,sys,collections,json,numpy as np
os.environ['PARTS']='socks,helmet,skates,gloves'
s=open('/workspace/preview_v2/mapped/v2map3.py').read();s=s[:s.index('# ---- verification')];NS={};exec(s,NS)
MAPS,TF,FR,A2,NZ,FAM2=NS['MAPS'],NS['TF'],NS['FR'],NS['A2'],NS['NZ'],NS['FAM2'];oz=NS['ozone']
for v in range(8,17):print(v,''.join((NZ.get((x,v)) or '--')[:2] for x in range(38)),' ',''.join((FAM2.get((x,v)) or '.')[:1] for x in range(38)))
ARMS=('FR','FL','BL','BR');R={}
for n in FR:
    A=MAPS[n][1];g=collections.defaultdict(list)
    for p,a in A.items():
        z=oz(*a)
        if z in ARMS and TF[a]!='gear':g[(z,a[1],TF[a])].append(p)
    for (z,v,f),ps in g.items():
        ts=collections.Counter(A2[n][p] for p in ps);nT=len([x for (x,vv),zz in NZ.items() if zz==z and vv==A2[n][ps[0]][1] and FAM2.get((x,vv))==f])
        R.setdefault(int(v),[]).append(dict(n=n,z=z,f=f,m=len(ps),nT=nT,shared=sum(1 for c in ts.values() if c>1),pix=[list(map(int,p)) for p in ps],tex=[list(A2[n][p]) for p in ps]))
for v in sorted(R):
    rs=R[v];ov=[r for r in rs if r['m']>r['nT']]
    print(v,'groups',len(rs),'overflow',len(ov),f"{100*len(ov)/len(rs):.0f}%",'shared',sum(r['shared'] for r in rs),'frames',len({r['n'] for r in ov}))
json.dump({str(k):v for k,v in R.items()},open('/tmp/arms.json','w'),default=int)
