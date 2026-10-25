import pickle,re,glob,json,csv,numpy as np
from spa import parse
from calib import support
import pcspa
M=pickle.load(open('match.pkl','rb'));RF=pickle.load(open('refine.pkl','rb'))
for k,v in M.items():
    v['best']=list(v['best']);v['score']=list(map(float,v['score']));v['mir']=list(v['mir']);v['scale']=list(v['scale']);v['how']=['grid']*len(v['A'])
    for i,a in enumerate(v['A']):
        r=RF[k].get(a)
        if r and r[0]>=v['score'][i]:v['score'][i],v['best'][i],v['mir'][i],v['scale'][i],v['how'][i]=r[0],r[1],r[2],r[3],'aligned'
F=pickle.load(open('feat.pkl','rb'))
A,S93SET=pickle.load(open('all.pkl','rb'))
SRC={'G92':('/workspace/NHL92Genesis/src/frames.Asm',[],'/workspace/NHL92Genesis/src'),
     'G93':('/workspace/NHLPA93Genesis/src/frames93.asm',[],'/workspace/NHLPA93Genesis/src'),
     'G94':('/workspace/NHL94Genesis/src/frames94.asm',[],'/workspace/NHL94Genesis/src'),
     'S93':('/workspace/n93s/src/data/frames93s.asm',['/workspace/n93s/src/ram93snes.asm'],'/workspace/n93s/src'),
     'S94':('/workspace/NHL94SNES/src/data/frames94s.asm',[],'/workspace/NHL94SNES/src')}
INFO={}
for g,(f,pre,d) in SRC.items():
    spf,used,anims=parse(f,pre)
    code={};low={k.lower():v for k,v in spf.items()}
    for p in glob.glob(d+'/**/*.asm',recursive=True)+glob.glob(d+'/**/*.Asm',recursive=True):
        if p==f or 'frames' in p.lower() or 'ram93snes' in p or 'equals' in p:continue
        for ln in open(p,errors='ignore'):
            c=ln.split(';')[0]
            for m in re.finditer(r'(SPF\w+)(?:\s*\+\s*(\d+))?',c):
                if m.group(1).lower() in low:code.setdefault(low[m.group(1).lower()]+int(m.group(2) or 0),set()).add(m.group(0).replace(' ',''))
    INFO[g]=dict(spf=spf,used=used,code=code)
# PC usage from SPAtab (stored 0-based)
w=pcspa.load();tabs=pcspa.walk(w);pcu={}
for pos,frs in tabs:
    for f in frs:pcu.setdefault(f+1,set()).add('PCSPA@%d'%pos)
INFO['PC']=dict(spf={},used=pcu,code={})
def spfgroup(g,n):
    s=INFO[g]['spf'];c=[(v,k) for k,v in s.items() if v<=n]
    return max(c)[1][3:] if c else '?'
def label(g,n):
    u=INFO[g]['used'].get(n)
    if g=='PC':return None
    if u:
        names=sorted({x[3:] for x in u});return names[0]+('+%d'%(len(names)-1) if len(names)>1 else '')
    return spfgroup(g,n)
CAT=[('fight',r'fight|gloves|finjury|punch'),('injury',r'injur|blood'),('celebration',r'celebr|pump|cup'),('referee',r'ref'),
     ('goalie',r'^g[a-z]|goalie|^gstack|^gslam'),('nonplayer',r'puck|goal$|arrow|pad|replay|siren|bglass|zam|font|hat|bench$|pen$|crowd|net')]
def cat(lab):
    l=(lab or '').lower()
    for c,r in CAT:
        if re.search(r,l):return c
    return 'player'
GEN={'G92','G93','G94','S93'}
def klass(ta,tb,s,sup):
    if 'S94' in (ta,tb):mt,ms,at,as_=0.75,0.65,0.62,0.55
    else:mt,ms,at,as_=0.80,0.70,0.65,0.60
    if s>=mt or (sup and s>=ms):return 'match'
    if s>=at or (sup and s>=as_):return 'ambiguous'
    return 'none'
SUP={k:support(v) for k,v in M.items()}
SETS=['G92','G93','G94','S93','S94','PC'];SCOPE=['G92','G93','G94','S94','PC']
rows={}
for t in SETS:
    for n,a in sorted(A[t].items()):
        rows[(t,n)]=dict(set=t,frame=n,empty=True)
idx={(t,n):i for i,(t,n) in enumerate(F['K'])}
for (t,n),r in rows.items():
    if (t,n) not in idx:continue
    r['empty']=False;i=idx[(t,n)];r['h'],r['w']=map(int,F['HW'][i]);r['px']=int(F['N'][i])
    for tb in SETS:
        if tb==t:continue
        v=M[(t,tb)];j=v['A'].index(n);s=float(v['score'][j]);sp=SUP[(t,tb)][n]
        r[tb]=dict(best=int(v['best'][j]),score=round(s,3),mirror=bool(v['mir'][j]),scale=round(float(v['scale'][j]),2),seq=bool(sp),cls=klass(t,tb,s,sp))
for (t,n),r in rows.items():
    if t!='PC':
        r['spf_group']=spfgroup(t,n) if t in INFO else '';r['spa']=sorted(INFO[t]['used'].get(n,[]));r['code_ref']=sorted(INFO[t]['code'].get(n,[]))
        r['label']=label(t,n)
    else:
        r['spa']=sorted(INFO['PC']['used'].get(n,[]));r['code_ref']=[]
    if t=='S93':r['s93_set']=S93SET.get(n)
    r['animated']=bool(r['spa']) ;r['used']=bool(r['spa'] or r['code_ref'])
# PC label: inherit from best matching G94 then G93,S94,G92
for (t,n),r in rows.items():
    if t!='PC':continue
    lab=None
    if not r['empty']:
        for tb in ['G94','G93','S94','G92']:
            if r[tb]['cls']=='match':lab=rows[(tb,r[tb]['best'])]['label'];r['label_from']=tb;break
    r['label']=lab or ('PC-new'+('' if r['spa'] else '-unused'))
for r in rows.values():r['category']=cat(r['label']) if r['label'] and not r['label'].startswith('PC-new') else ('nonplayer' if r['empty'] else 'pc-new')
# PC-new: categorise by nearest any-match label if ambiguous
for (t,n),r in rows.items():
    if t=='PC' and r['category']=='pc-new' and not r['empty']:
        b=max(['G94','G93','S94','G92'],key=lambda tb:r[tb]['score']);r['nearest']=f"{b} {r[b]['best']} {rows[(b,r[b]['best'])]['label']} {r[b]['score']}"
        r['category']=cat(rows[(b,r[b]['best'])]['label'])+'?'
for r in rows.values():
    if r['empty']:continue
    oth=[x for x in SCOPE if x!=r['set']]
    cl={x:r[x]['cls'] for x in oth}
    r['status']=''.join({'match':'M','ambiguous':'a','none':'-'}[cl[x]] for x in oth)
    r['exclusive']=all(c=='none' for c in cl.values())
    r['exclusive_or_amb']=all(c!='match' for c in cl.values())
pickle.dump((rows,INFO),open('rows.pkl','wb'))
json.dump({f'{t}:{n}':r for (t,n),r in rows.items()},open('frames_matrix.json','w'),indent=0,default=str)
with open('frames_matrix.csv','w',newline='') as f:
    W=csv.writer(f);hdr=['set','frame','empty','h','w','label','category','spf_group','animated','used','spa','code_ref','s93_set','status','exclusive']
    for tb in SETS:hdr+=[f'{tb}_best',f'{tb}_score',f'{tb}_mirror',f'{tb}_scale',f'{tb}_seq',f'{tb}_class']
    W.writerow(hdr)
    for (t,n),r in sorted(rows.items(),key=lambda x:(SETS.index(x[0][0]),x[0][1])):
        row=[t,n,r['empty'],r.get('h',''),r.get('w',''),r.get('label',''),r.get('category',''),r.get('spf_group',''),r['animated'],r['used'],' '.join(r['spa']),' '.join(r['code_ref']),r.get('s93_set',''),r.get('status',''),r.get('exclusive','')]
        for tb in SETS:
            d=r.get(tb) if tb!=t else None
            row+=[d['best'],d['score'],d['mirror'],d['scale'],d['seq'],d['cls']] if d else ['']*6
        W.writerow(row)
from collections import Counter
for t in SETS:
    rr=[r for r in rows.values() if r['set']==t]
    print(t,len(rr),'empty',sum(r['empty'] for r in rr),'used',sum(r['used'] for r in rr),'excl',sum(r.get('exclusive',False) for r in rr),Counter(r['category'] for r in rr if r.get('exclusive')))
