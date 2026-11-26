"""NHL 96 PC sprite bank reader (SHPI with RefPack-compressed SPIT frames)."""
import struct,numpy as np
def refpack(d,p=0):
    assert d[p+1]==0xfb;hdr=d[p];p+=2
    if hdr&1:p+=3
    n=int.from_bytes(d[p:p+3],'big');p+=3;o=bytearray()
    while len(o)<n:
        c=d[p];p+=1
        if c<0x80:
            b=d[p];p+=1;lit=c&3;cnt=((c>>2)&7)+3;off=((c&0x60)<<3)+b+1
        elif c<0xc0:
            b,b2=d[p],d[p+1];p+=2;lit=b>>6;cnt=(c&0x3f)+4;off=((b&0x3f)<<8)+b2+1
        elif c<0xe0:
            b,b2,b3=d[p],d[p+1],d[p+2];p+=3;lit=c&3;cnt=((c>>2)&3)*256+b3+5;off=((c&0x10)<<12)+(b<<8)+b2+1
        elif c<0xfc:
            lit=((c&0x1f)+1)*4;o+=d[p:p+lit];p+=lit;continue
        else:
            lit=c&3;o+=d[p:p+lit];p+=lit;break
        o+=d[p:p+lit];p+=lit
        for _ in range(cnt):o.append(o[-off])
    return bytes(o[:n])
def bank(path):
    d=open(path,'rb').read();n=struct.unpack('<I',d[8:12])[0];out=[]
    for i in range(n):
        nm=d[16+8*i:20+8*i].decode();o=struct.unpack('<I',d[20+8*i:24+8*i])[0]
        w,h,xo,yo,xp,yp=struct.unpack('<6H',d[o+4:o+16]);px=np.frombuffer(refpack(d,o+16),np.uint8)[:w*h].reshape(h,w)
        out.append(dict(i=i,name=nm,w=w,h=h,xo=xo,yo=yo,xp=xp,yp=yp,p=px,typ=d[o]))
    return out
if __name__=='__main__':
    import sys,collections
    B=bank(sys.argv[1]);print(len(B));print(collections.Counter(np.concatenate([b['p'].ravel() for b in B]).tolist()).most_common(80))
    print([(b['name'],b['w'],b['h'],b['xo'],b['yo'],b['xp'],b['yp']) for b in B[:40]])
    grp=[i for i,b in enumerate(B) if b['name']=='0000'];print(len(grp),grp[:80])
