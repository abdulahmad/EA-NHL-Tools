import sys,numpy as np,collections;from PIL import Image;sys.path.insert(0,'.')
s=open('v2map2.py').read();s=s[:s.index('# ---- verification')];NS={};exec(s,NS);import ctrl
for img,team in [('chicago_home_top_v2',('AWAY.json','chi')),('chicago_alt_bottom_v2',('HOME.json','chi'))]:
    R=np.array(Image.open(f'/workspace/preview_v2/raw/{img}.png').convert('RGB')).astype(int);F=ctrl.setup(NS);T,sp,_=ctrl.control_tex(NS,F,team);c=collections.Counter()
    for (x,v),f in F.items():
        if f in('gear',) or f.startswith('idx'):continue
        if tuple(R[v,x])!=tuple(T[v,x]):c[(f,tuple(R[v,x]),tuple(T[v,x]))]+=1
    print(img,sum(c.values()),c.most_common(8))
