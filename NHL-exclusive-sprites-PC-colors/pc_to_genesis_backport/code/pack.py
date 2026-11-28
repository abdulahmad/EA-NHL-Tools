"""Mini 94G sprite packer: index array (0 = transparent, 1-15 = line 0, 17-31 = line 1, 33-47 = line 2) -> 8x8 4bpp tiles + hardware-sprite pieces,
using the layout that sprite-textures/ANIM94 decoders read (tile = 32 bytes, high nibble first; piece = >hhHBB x,y,tile,attr,size; size = (w-1)*4+(h-1);
tiles inside a piece are column-major; attr bits 5-6 = palette line). Round trip is checked with a copy of the repo decoder's inner loops."""
import numpy as np,struct
DIM=[(1,1),(1,2),(1,3),(1,4),(2,1),(2,2),(2,3),(2,4),(3,1),(3,2),(3,3),(3,4),(4,1),(4,2),(4,3),(4,4)]
def pack(idx):
    H,W=idx.shape;Hp=(H+7)//8*8;Wp=(W+7)//8*8
    a=np.zeros((Hp,Wp),int);a[:H,:W]=idx
    nib=np.where(a>0,a&15,0)
    if (nib[a>0]==0).any():raise ValueError('colour 0 of a palette line used')
    th,tw=Hp//8,Wp//8;used=np.zeros((th,tw),bool);tl=-np.ones((th,tw),int)
    for ty in range(th):
        for tx in range(tw):
            blk=a[ty*8:ty*8+8,tx*8:tx*8+8];used[ty,tx]=(blk>0).any()
            ls=set(int(v)>>4 for v in blk[blk>0])
            if len(ls)>1:raise ValueError(f'tile {tx},{ty} mixes palette lines {ls}')
            if ls:tl[ty,tx]=ls.pop()
    cov=np.zeros_like(used);pieces=[]
    for ty in range(th):
        for tx in range(tw):
            if used[ty,tx] and not cov[ty,tx]:
                best=None
                for w in range(1,5):
                    for h in range(1,5):
                        if tx+w>tw or ty+h>th:continue
                        blk=cov[ty:ty+h,tx:tx+w]
                        if blk.any():continue
                        lv=set(tl[ty:ty+h,tx:tx+w].flatten().tolist())-{-1}
                        if len(lv)>1:continue
                        if best is None or w*h>best[0]*best[1]:best=(w,h)
                w,h=best;cov[ty:ty+h,tx:tx+w]=True;pieces.append((tx,ty,w,h,int(tl[ty,tx])))
    tiles=bytearray();sprites=[]
    for tx,ty,w,h,line in pieces:
        t=len(tiles)//32
        for cx in range(w):
            for cy in range(h):
                blk=nib[(ty+cy)*8:(ty+cy)*8+8,(tx+cx)*8:(tx+cx)*8+8]
                tiles+=bytes((blk[:,0::2]<<4|blk[:,1::2]).astype(np.uint8).flatten())
        sprites.append((tx*8,ty*8,t,line<<5,(w-1)*4+(h-1)))
    return dict(tiles=bytes(tiles),sprites=sprites,W=Wp,H=Hp,line=','.join(str(x) for x in sorted(set(s[3]>>5 for s in sprites))),ntiles=len(tiles)//32,H0=H,W0=W)
def unpack(pk):
    tiles=pk['tiles'];c=np.zeros((pk['H'],pk['W']),np.uint8)
    for x,y,t,p,s in pk['sprites']:
        w,h=DIM[s&15];tl=np.zeros((h*8,w*8),np.uint8);idx=t*32
        for cx in range(w):
            for cy in range(h):
                raw=np.frombuffer(tiles[idx:idx+32],np.uint8);idx+=32
                px=np.stack([raw>>4,raw&15],1).reshape(8,8);tl[cy*8:cy*8+8,cx*8:cx*8+8]=px
        hf=(p>>3)&1;vf=(p>>4)&1
        if hf:tl=tl[:,::-1]
        if vf:tl=tl[::-1]
        m=tl>0;sub=c[y:y+h*8,x:x+w*8];sub[m]=tl[m]+16*((p>>5)&3)
    return c
def sprite_bytes(pk):return b''.join(struct.pack('>hhHBB',x,y,t,p,s) for x,y,t,p,s in pk['sprites'])
def roundtrip(idx):
    pk=pack(idx);u=unpack(pk);H,W=idx.shape
    return bool((u[:H,:W]==idx).all() and (u[H:]==0).all() and (u[:,W:]==0).all()),pk
