import re,struct
def load():
    L=open('/workspace/NHL95PC/src/dseg02/035_C9078_data_engine_35.asm').read().split('\n')
    i=[k for k,l in enumerate(L) if l.startswith('SPAtab:')][0];by=[]
    for l in L[i+1:]:
        if not l.startswith('db'):break
        for v in l[2:].split(','):
            v=v.strip().split(';')[0].strip();by.append(int(v[:-1],16) if v.endswith('h') else int(v))
    b=bytes(by);w=struct.unpack('<%dh'%(len(b)//2),b[:len(b)//2*2]);return w
def walk(w):
    pos=1;tabs=[]
    while pos+8<len(w):
        h=[w[pos]&0x7FFF]+list(w[pos+1:pos+8])
        if any(x<0 or x>2000 for x in h):break
        end=pos+8;fr=set()
        for c in h:
            q=pos+8+c
            while q+1<len(w):
                fr.add(w[q]);t=w[q+1];q+=2
                if t<0:break
            end=max(end,q)
        tabs.append((pos,sorted(fr)));pos=end
    return tabs
if __name__=='__main__':
    w=load();t=walk(w);print(len(w),len(t),t[:3],t[-2:]);print(sum(len(x[1]) for x in t))
    s=set(f for _,x in t for f in x);print(len(s),min(s),max(s))
