import pickle,re,json,csv
from collections import defaultdict,Counter
rows,_=pickle.load(open('rows.pkl','rb'));miss,comp=pickle.load(open('miss.pkl','rb'))
intra=json.load(open('intra.json'))
base=lambda l:re.sub(r'\+\d+$','',l or '')
def rng(ns):
    ns=sorted(ns);o=[];s=p=ns[0]
    for n in ns[1:]+[None]:
        if n!=p+1 if n else True:o.append(f'{s}' if s==p else f'{s}-{p}');s=n
        p=n
    return ', '.join(o)
def closest(t,n):
    r=rows[(t,n)];return max((r[x]['score'],x,r[x]['best']) for x in ['G92','G93','G94','S94','PC'] if x!=t)
def groups(t,pred):
    d=defaultdict(list)
    for (s,n),r in rows.items():
        if s==t and not r['empty'] and pred(r):d[(r['category'],base(r['label']))].append(n)
    return d
L=[]
def tbl(t,pred,title):
    d=groups(t,pred);L.append(f'\n#### {title} — {sum(map(len,d.values()))} frames\n\n| category | animation (SPF) | frames |\n|---|---|---|')
    for (c,l),ns in sorted(d.items()):L.append(f'| {c} | {l} | {rng(ns)} |')
for t in ['G92','G93','G94','S94','PC']:
    tbl(t,lambda r:r['exclusive'],f'{t}: exclusive (no match or ambiguous in any other in-scope game)')
    tbl(t,lambda r:r['exclusive_or_amb'] and not r['exclusive'],f'{t}: ambiguous only (no confident match anywhere; check by eye)')
open('_excl.md','w').write('\n'.join(L))
# roadmap CSVs
with open('roadmap_missing_from_pc.csv','w',newline='') as f:
    w=csv.writer(f);w.writerow(['group','representative','category','animation','all_copies','closest_set','closest_frame','closest_score'])
    for i,c in enumerate(sorted(comp,key=lambda c:min(c))):
        rep=sorted(c,key=lambda k:(['G94','G93','G92','S94'].index(k[0]),k[1]))[0];r=rows[rep];s,x,b=closest(*rep)
        w.writerow([i,f'{rep[0]} {rep[1]}',r['category'],base(r['label']),' '.join(f'{a} {b}' for a,b in sorted(c)),x,b,f'{s:.2f}'])
with open('roadmap_snes_only.csv','w',newline='') as f:
    w=csv.writer(f);w.writerow(['S94 frame','category','animation','used','status vs G92 G93 G94 PC','closest G94','G94 score','closest PC','PC score'])
    for (t,n),r in sorted(rows.items()):
        if t=='S94' and not r['empty'] and r['exclusive_or_amb']:
            w.writerow([n,r['category'],base(r['label']),r['used'],r['status'],r['G94']['best'],f"{r['G94']['score']:.2f}",r['PC']['best'],f"{r['PC']['score']:.2f}"])
with open('roadmap_92_93_exclusive.csv','w',newline='') as f:
    w=csv.writer(f);w.writerow(['set','frame','category','animation','used','status vs scope','G92','G93','G94','S94','PC'])
    for (t,n),r in sorted(rows.items()):
        if t in('G92','G93') and not r['empty'] and (r['exclusive_or_amb'] or r['PC']['cls']=='none'):
            w.writerow([t,n,r['category'],base(r['label']),r['used'],r['status']]+[f"{r[x]['best']}:{r[x]['cls']}:{r[x]['score']:.2f}" if x in r else 'self' for x in ['G92','G93','G94','S94','PC']])
print(Counter(k[0] for k in miss),len(comp))
