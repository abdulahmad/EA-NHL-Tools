"""D180: frame -> (animation, step, direction) from the disassembly animation tables (Abdul t1018u).
Direction 0 = N (up the screen), then clockwise: 1 NE, 2 E, 3 SE, 4 S, 5 SW, 6 W, 7 NW."""
import re,json,collections
SRC={'G94':'/workspace/NHL94Genesis/src/frames94.asm','S94':'/workspace/NHL94SNES/src/data/frames94s.asm'}
EQU={'G94':'/workspace/NHL94Genesis/src/frames94.asm','S94':'/workspace/NHL94SNES/src/data/frames94s.asm'}
NAMES=['N','NE','E','SE','S','SW','W','NW']
def equates(path):
    E={};L=open(path,encoding='latin1').read().splitlines()
    for _ in range(3):
        for l in L:
            m=re.match(r'^(SPF\w+)\s*=\s*([\w+\-\s]+?)\s*(;|$)',l)
            if m:
                try:E[m[1]]=eval(m[2],{},E)
                except Exception:pass
    return E
def tables(game):
    E=equates(EQU[game]);E.update(equates(SRC[game]));L=open(SRC[game],encoding='latin1').read().splitlines()
    T=collections.OrderedDict();cur=None;lab=None
    for l in L:
        code=l.split(';')[0]
        m=re.match(r'^(SPA\w+?)(_table)?:?\s',code+' ')
        if m and not code.startswith('\t') and ('=' not in code or game=='S94'):
            if '=' in code:continue
            cur=m[1];T[cur]={};lab=None;continue
        m=re.match(r'^\.(d?)([0-7])(:)?\s+(dc\.w|dw)\s+(.*)$',code.strip())
        if cur and m:lab=int(m[2]);T[cur][lab]=[];body=m[5]
        elif cur and lab is not None and re.match(r'^\s+(dc\.w|dw)\s+SPF',code):body=re.sub(r'^\s+(dc\.w|dw)\s+','',code)
        else:continue
        toks=[t.strip() for t in body.split(',') if t.strip()]
        for i in range(0,len(toks)-1,2):
            try:T[cur][lab].append(int(eval(toks[i],{},E)))
            except Exception:pass
    return T
def build(game):
    T=tables(game);F=collections.defaultdict(list);eight=[]
    for a,D in T.items():
        if len(D)!=8:continue
        sets=[set(D[d]) for d in range(8)]
        uniq=all(not(sets[i]&sets[j]) for i in range(8) for j in range(i+1,8)) and all(sets)
        if uniq:eight.append(a)
        for d in range(8):
            for st,f in enumerate(dict.fromkeys(D[d])):F[f].append(dict(anim=a,step=st,dir=d,uniq=uniq))
    M={}
    for f,L in F.items():
        U=[x for x in L if x['uniq']];ds={x['dir'] for x in U}
        if len(ds)==1:M[f]=dict(dir=ds.pop(),src='table',anims=sorted({x['anim'] for x in U}),step=U[0]['step'])
        elif len(ds)>1:M[f]=dict(dir=None,src='conflict',dirs=sorted(ds),anims=sorted({x['anim'] for x in U}))
    return T,M,eight
if __name__=='__main__':
    out={}
    for g in('G94','S94'):
        T,M,E=build(g);ok=sum(v['src']=='table' for v in M.values());out[g]=M
        print(g,'animations',len(T),'8-dir unique',len(E),'frames with table direction',ok,'conflicts',sum(v['src']=='conflict' for v in M.values()))
    for s in(196,527,800):print('S',s,out['S94'].get(s))
    json.dump({g:{str(k):v for k,v in M.items()} for g,M in out.items()},open('dirmap.json','w'),indent=0)
GOALIE={'G94':[('SPFGoalie','SPFSiren')],'S94':[('SPFGoalie','SPFpump2')]}
def sclass(game,f,_c={}):
    if game not in _c:_c[game]=equates(EQU[game]) if game=='S94' else {**equates(EQU[game])}
    E=_c[game];return 'goalie' if any(E[a]<=f<E[b] for a,b in GOALIE[game]) else 'skater'
