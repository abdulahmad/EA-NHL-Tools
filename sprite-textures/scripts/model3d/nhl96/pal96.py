import struct,numpy as np
def pals(path='newpal.qfs.un'):
    d=open(path,'rb').read();n=struct.unpack('<I',d[8:12])[0];out={}
    for i in range(n):
        nm=d[16+8*i:20+8*i].decode();o=struct.unpack('<I',d[20+8*i:24+8*i])[0]
        out[nm]=(np.frombuffer(d[o+16:o+16+768],np.uint8).reshape(256,3).astype(int)*255//63).astype(np.uint8)
    return out
