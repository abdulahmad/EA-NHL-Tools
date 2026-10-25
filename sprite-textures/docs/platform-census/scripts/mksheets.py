import pickle,re
from sheets2 import pages,rows,base,grid
from collections import defaultdict
order=lambda t,ns:sorted(ns,key=lambda n:(base(rows[(t,n)].get('label') or ''),n))
ex=lambda t:order(t,[n for (s,n),r in rows.items() if s==t and not r['empty'] and r['exclusive']])
fs=[]
# 93G fights + blood
c=[]
for n in range(353,377):
    r=rows[('G93',n)];k=[('G93',n)]
    if r['G92']['cls']=='match':k.append(('G92',r['G92']['best']))
    k.append(('PC',r['PC']['best']))
    c.append((f"{base(r['label'])} G92:{r['G92']['cls'][0]} PC:{r['PC']['cls'][0]} {r['PC']['score']:.2f}",k))
fs.append(grid(c,'93G fights 353-370 (also 92G) + blood injury 371-376 (93G only)','sheets/g93_fights_blood.png'))
fs+=pages('G94',ex('G94'),'94G-only (no match in 92G/93G/94S/95PC)','sheets/g94_only')
fs+=pages('S94',ex('S94'),'94S-only (no match in 92G/93G/94G/95PC)','sheets/s94_only')
pcx=[n for (s,n),r in rows.items() if s=='PC' and not r['empty'] and r['exclusive']]
fs+=pages('PC',sorted(pcx),'95PC-only (no match in 92G/93G/94G/94S)','sheets/pc_only',per=40)
g92=[n for (s,n),r in rows.items() if s=='G92' and not r['empty'] and r['exclusive_or_amb']]
fs+=pages('G92',sorted(g92),'92G frames with no confident match elsewhere (ambiguous only)','sheets/g92_ambiguous')
miss,comp=pickle.load(open('miss.pkl','rb'))
def rep(c):
    for g in ['G94','G93','G92','S94']:
        l=sorted(x for x in c if x[0]==g)
        if l:return l[0]
reps=defaultdict(list)
for c in comp:t,n=rep(c);reps[t].append(n)
for t in ['G94','S94']:
    fs+=pages(t,order(t,reps[t]),f'{t} not in 95PC (1 per unique pose)',f'sheets/missing_pc_{t}')
print(fs)
