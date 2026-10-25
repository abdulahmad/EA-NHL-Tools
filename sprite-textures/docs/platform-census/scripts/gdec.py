import struct,numpy as np
DIM=[(1,1),(1,2),(1,3),(1,4),(2,1),(2,2),(2,3),(2,4),(3,1),(3,2),(3,3),(3,4),(4,1),(4,2),(4,3),(4,4)]
def decode(b,T,ft,rel=None):
    rel=ft-2 if rel is None else rel
    n=struct.unpack('>H',b[ft:ft+2])[0]//2-1
    out=[]
    for i in range(n):
        o=struct.unpack('>H',b[ft+2*i:ft+2*i+2])[0]+rel
        o2=struct.unpack('>H',b[ft+2*i+2:ft+2*i+4])[0]+rel
        sp=[]
        for k in range((o2-o)//8):
            x,y,t,p,s=struct.unpack('>hhHBB',b[o+8*k:o+8*k+8])
            w,h=DIM[s&15];sp.append((x,y,t,(p>>4)&1,(p>>3)&1,(p>>5)&3,w,h))
        if not sp:out.append(None);continue
        x0=min(s[0] for s in sp);y0=min(s[1] for s in sp)
        W=max(s[0]+s[6]*8 for s in sp)-x0;H=max(s[1]+s[7]*8 for s in sp)-y0
        if W<=0 or H<=0 or W>256 or H>256:out.append(None);continue
        c=np.zeros((H,W),np.uint8)
        for x,y,t,vf,hf,pi,w,h in sp:
            tl=np.zeros((h*8,w*8),np.uint8);idx=T+t*32
            for cx in range(w):
                for cy in range(h):
                    raw=np.frombuffer(b[idx:idx+32],np.uint8);idx+=32
                    if len(raw)<32:continue
                    px=np.stack([raw>>4,raw&15],1).reshape(8,8)
                    tl[cy*8:cy*8+8,cx*8:cx*8+8]=px
            if hf:tl=tl[:,::-1]
            if vf:tl=tl[::-1]
            m=tl>0;sub=c[y-y0:y-y0+h*8,x-x0:x-x0+w*8]
            sub[m]=tl[m]+16*pi
        out.append(c)
    return out
def blob(b,start):
    L=struct.unpack('>I',b[start+4:start+8])[0];return start+8,start+L

def dec_blob(b,B):
    L=struct.unpack('>I',b[B+4:B+8])[0];ft=B+L
    if struct.unpack('>H',b[ft:ft+2])[0]==0:ft+=2
    return decode(b,B+10,ft,B+L)
