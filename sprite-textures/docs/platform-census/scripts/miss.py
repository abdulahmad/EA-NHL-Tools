import pickle,re
from collections import defaultdict
rows,_=pickle.load(open('rows.pkl','rb'))
CON=['G92','G93','G94','S94']
def base(l):return re.sub(r'\+\d+$','',l or '')
miss=[(t,n) for (t,n),r in rows.items() if t in CON and not r['empty'] and r['PC']['cls']=='none']
# union-find over console frames by match edges
P={k:k for k in miss}
def f(x):
    while P[x]!=x:P[x]=P[P[x]];x=P[x]
    return x
S=set(miss)
for k in miss:
    r=rows[k]
    for x in CON:
        if x!=k[0] and r[x]['cls']=='match' and (x,r[x]['best']) in S:P[f(k)]=f((x,r[x]['best']))
comp=defaultdict(list)
for k in miss:comp[f(k)].append(k)
pickle.dump((miss,list(comp.values())),open('miss.pkl','wb'))
from collections import Counter
print(len(miss),Counter(k[0] for k in miss),'components',len(comp))
def rep(c):
    for g in ['G94','G93','G92','S94']:
        l=sorted(x for x in c if x[0]==g)
        if l:return l[0]
c2=Counter((rep(c)[0],base(rows[rep(c)]['label'])) for c in comp.values());print(sorted(c2.items()))
