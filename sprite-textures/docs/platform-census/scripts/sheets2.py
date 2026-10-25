import pickle,re
from vis2 import grid
rows,_=pickle.load(open('rows.pkl','rb'))
SCOPE=['G92','G93','G94','S94','PC']
def base(l):return re.sub(r'\+\d+$','',l or '')
def closest(t,n,among=SCOPE):
    r=rows[(t,n)];c=[(r[x]['score'],x,r[x]['best']) for x in among if x!=t and x in r]
    return max(c)
def cells(t,ns):
    out=[]
    for n in ns:
        s,x,b=closest(t,n);r=rows[(t,n)]
        out.append((f"{base(r['label']) if t!='PC' else 'nearest'} | {x} {b} {s:.2f}",[(t,n),(x,b)]))
    return out
def pages(t,ns,title,stem,per=36):
    fs=[]
    for i in range(0,len(ns),per):
        p=ns[i:i+per];f=f'{stem}_{i//per+1}.png'
        grid(cells(t,p),f'{title} ({i+1}-{i+len(p)} of {len(ns)})',f);fs.append(f)
    return fs
