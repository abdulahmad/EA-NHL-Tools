# frame -> (anim, dir, phase) from the SPA scripts (Sprite-Viewer/data/frames95pc.asm, = HOCKEY.EXE SPAtab decoded).
import re,json,collections
S=open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)),'../../../Sprite-Viewer/data/frames95pc.asm')).read()
anims=[];cur=None
for ln in S.splitlines():
    m=re.match(r'(SPA\w+)\s*=\s*\*-SPAlist',ln)
    if m:cur=[m.group(1),[]];anims.append(cur);continue
    m=re.match(r'\s*dc\.w\s+(.*)',ln)
    if m and cur:cur[1]+= [int(x) for x in m.group(1).split(',')]
T=collections.defaultdict(list);A={};EXC=[]
for name,w in anims:
    hdr=w[:8];flag=w[8];body=w   # offsets are byte offsets from anim start: word index = off/2
    dirs={}
    for d in range(8):
        i=hdr[d]//2;seq=[]
        while i+1<len(w):
            f,t=w[i],w[i+1];seq.append((f,t));i+=2
            if t<0:break
        dirs[d]=seq
    A[name]=dict(flag=flag,dirs={d:[f for f,_ in s] for d,s in dirs.items()})
    shared=collections.defaultdict(list)
    for d in range(8):shared[hdr[d]].append(d)
    for off,ds in shared.items():
        if len(ds)>1:EXC.append(dict(kind='one script for several dirs',anim=name,dirs=ds,frames=sorted({f for f,_ in dirs[ds[0]]})))
    for d,s in dirs.items():
        for ph,(f,t) in enumerate(s):
            fr=abs(f)&0x7fff
            T[fr].append((name,d,ph,'flip' if (f<0 or f&0x8000) else ''))
# frames used in several directions (across any anims)
multi={f:sorted({d for _,d,_,_ in v}) for f,v in T.items() if len({d for _,d,_,_ in v})>1}
json.dump(dict(table={f:v for f,v in sorted(T.items())},anims=A,exceptions=EXC,multi_dir_frames=multi),open('poc/dirtable.json','w'),indent=0)
print(len(anims),'anims',len(T),'frames referenced; shared-script exceptions',len(EXC),'; frames used in >1 dir',len(multi))
for f in (42,52,407,419,889,891,895,897,903,358,370):print(f,T.get(f))
print('multi sample',list(multi.items())[:15])
print('exc sample',[(e['anim'],e['dirs']) for e in EXC][:30])
print('flags',collections.Counter(a['flag'] for a in A.values()))
