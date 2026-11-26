import re,json,os
L=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'../../../Sprite-Viewer/data/frames95pc.asm')).read().split('\n')
SPA={};cur=None
for l in L:
    m=re.match(r'^(SPA\w+)\s*=',l)
    if m:cur=m.group(1);SPA[cur]=[];continue
    m=re.match(r'^\s*dc\.w\s+(.*)',l)
    if m and cur:SPA[cur].append([int(t) for t in re.findall(r'-?\d+',m.group(1).split(';')[0])])
    elif l.strip() and not l.startswith(';') and cur and not m:cur=None
OUT={}
for k,rows in SPA.items():
    if not rows or len(rows[0])<8:continue
    flat=[v for r in rows for v in r];offs=rows[0][:8];dirs=[]
    for d,o in enumerate(offs):
        i=o//2;seq=[]
        while i+1<len(flat):
            f,t=flat[i],flat[i+1];seq.append(f);i+=2
            if t<0:break
        dirs.append(seq)
    OUT[k]=dirs
