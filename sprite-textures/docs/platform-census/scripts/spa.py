import re,sys,json
def parse(path,pre=()):
    sym={};orig={}
    for p in pre:
        for ln in open(p,errors='ignore'):
            ln=ln.split(';')[0].strip();m=re.match(r'^(SPF\w+)\s*=\s*([\$\w]+)$',ln)
            if m:
                v=m.group(2);sym[m.group(1).lower()]=int(v[1:],16) if v[0]=='$' else int(v,0) if v[0].isdigit() else sym.get(v.lower(),0)
                orig[m.group(1).lower()]=m.group(1)
    used={};cur=None;anims=[]
    def ev(e):
        e=e.strip()
        e=re.sub(r'\$([0-9A-Fa-f]+)',lambda m:str(int(m.group(1),16)),e)
        e=re.sub(r'(?<![\w.])(\.?[A-Za-z_][\w]*)',lambda m:'S[%r]'%m.group(1).lower(),e)
        return int(eval(e,{'S':sym}))
    for ln in open(path,errors='ignore'):
        ln=ln.split(';')[0].rstrip()
        if not ln.strip():continue
        m=re.match(r'^(\.?\w+)\s*(?:=|\bset\b|\bequ\b)\s*(.+)$',ln.strip(),re.I)
        if m:
            n,e=m.groups()
            if '*' in e:
                if n.startswith('SPA'):cur=n;anims.append(n)
                continue
            try:sym[n.lower()]=ev(e);orig[n.lower()]=n
            except Exception:pass
            continue
        m0=re.match(r'^(SPA\w+?)(?:_table)?:',ln.strip())
        if m0:cur=m0.group(1);anims.append(cur);continue
        m=re.match(r'^(?:\.\w+:?\s+)?\s*(?:dc\.w|dw)\s+(.+)$',ln.strip(),re.I)
        if m and cur:
            a=m.group(1)
            if re.fullmatch(r'\s*\.\w+\s*-\s*\.t\s*',a) or re.fullmatch(r'\s*\d+\s*',a):continue
            try:v=[ev(x) for x in a.split(',')]
            except Exception:continue
            for f in v[0::2]:used.setdefault(f,set()).add(cur)
    spf={orig.get(k,k):v for k,v in sym.items() if k.startswith('spf')}
    return spf,used,anims
if __name__=='__main__':
    spf,used,an=parse(sys.argv[1]);print(len(spf),len(an),len(used),min(used),max(used))
