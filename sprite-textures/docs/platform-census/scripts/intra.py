import pickle,numpy as np,struct,json
from gdec import dec_blob,decode
rows,INFO=pickle.load(open('rows.pkl','rb'));F=pickle.load(open('feat.pkl','rb'))
K=F['K'];V=F['V'];Vm=F['Vm'];out={}
# (b) within-set duplicates (grid score >=0.97, incl mirror)
def gs(a,B):
    inter=a[:,0]@B[:,0].T;ua=a[:,0].sum(1)[:,None]+B[:,0].sum(1)[None]-inter
    return 0.5*inter/np.maximum(ua,1)+0.5*sum(a[:,k]@B[:,k].T for k in (1,2,3))/np.maximum(inter,1)
dups={}
for t in ['G92','G93','G94','S93','S94','PC']:
    ix=[i for i,k in enumerate(K) if k[0]==t];a=V[ix]
    s=np.maximum(gs(a,a),gs(a,Vm[ix]));np.fill_diagonal(s,0)
    pr=[(K[ix[i]][1],K[ix[j]][1],round(float(s[i,j]),3)) for i,j in zip(*np.nonzero(np.triu(s>=0.985)))]
    dups[t]=pr;print(t,'near-identical pairs',len(pr))
out['dups']=dups
# (b2) SPA -> SPF group cross-use
cross={}
for g,I in INFO.items():
    if g=='PC':continue
    spf=I['spf'];grp=lambda n:max([(v,k) for k,v in spf.items() if v<=n],default=(0,'?'))[1][3:]
    m={}
    for f,ss in I['used'].items():
        for s in ss:m.setdefault(s[3:],set()).add(grp(f))
    cross[g]={k:sorted(v) for k,v in m.items()}
out['spa_groups']=cross
# unused frames
unused={}
for g in ['G92','G93','G94','S93','S94','PC']:
    unused[g]=[n for (t,n),r in sorted(rows.items()) if t==g and not r['used']]
    print(g,'unused',len(unused[g]))
out['unused']=unused
# (c) 93 revisions trailing frame
b=open('/workspace/NHLPA93Genesis/nhlpa93retailRevA.bin','rb').read();f=dec_blob(b,238502)
out['rev93_extra_frame']=None if f[649] is None else list(f[649].shape)
print('93 retail/RevA frame 650:',out['rev93_extra_frame'])
json.dump(out,open('intra.json','w'),indent=1)
