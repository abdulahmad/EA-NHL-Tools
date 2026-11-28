import struct,numpy as np
DIM=[(1,1),(1,2),(1,3),(1,4),(2,1),(2,2),(2,3),(2,4),(3,1),(3,2),(3,3),(3,4),(4,1),(4,2),(4,3),(4,4)]
def load(root):
  g=root+'/Graphics/'
  import os
  mid=open(g+'SpritePalette.bin','rb').read() if os.path.exists(g+'SpritePalette.bin') else b''
  b=open(g+'Sprites.bin','rb').read()+open(g+'Spritetiles.bin','rb').read()+mid+open(g+'frameSprData.bin','rb').read()
  return b
def nframes(b):
  L=struct.unpack('>I',b[4:8])[0]; ft=L
  lead=struct.unpack('>H',b[ft:ft+2])[0]==0
  if lead: ft+=2
  first=struct.unpack('>H',b[ft:ft+2])[0]
  return L,ft,(first-(2 if lead else 0))//2 if lead else first//2
def decode(b,i1,fmt='94'):
  """i1 = Genesis frame number from 1"""
  L,ft,_=nframes(b); i=i1-1 if fmt=='94' else i1
  o=struct.unpack('>H',b[ft+2*i:ft+2*i+2])[0]+L
  nw=(struct.unpack('>H',b[ft:ft+2])[0])//2
  o2=struct.unpack('>H',b[ft+2*i+2:ft+2*i+4])[0]+L if (fmt=='94' or i+1<nw) else len(b)
  sp=[]
  for k in range((o2-o)//8):
    if fmt=='94':
      x,y,t,p,s=struct.unpack('>hhHBB',b[o+8*k:o+8*k+8]);w,h=DIM[s&15]
      sp.append((x,y,t,(p>>4)&1,(p>>3)&1,(p>>5)&3,w,h))
    else:   # native VDP attribute entry: y, size|link, tile word (pri/pal/vf/hf/tile), x
      y,sl,tw,x=struct.unpack('>hHHh',b[o+8*k:o+8*k+8]);w,h=DIM[(sl>>8)&15]
      sp.append((x,y,(tw&0x7ff)|((sl>>12)<<11),(tw>>12)&1,(tw>>11)&1,(tw>>13)&3,w,h))
  if not sp: return None
  x0=min(s[0] for s in sp);y0=min(s[1] for s in sp)
  W=max(s[0]+s[6]*8 for s in sp)-x0;H=max(s[1]+s[7]*8 for s in sp)-y0
  c=np.zeros((H,W),np.uint8);T=10
  for x,y,t,vf,hf,pi,w,h in sp:
    tl=np.zeros((h*8,w*8),np.uint8);idx=T+t*32
    for cx in range(w):
      for cy in range(h):
        raw=np.frombuffer(b[idx:idx+32],np.uint8);idx+=32
        if len(raw)<32: continue
        tl[cy*8:cy*8+8,cx*8:cx*8+8]=np.stack([raw>>4,raw&15],1).reshape(8,8)
    if hf: tl=tl[:,::-1]
    if vf: tl=tl[::-1]
    m=tl>0;sub=c[y-y0:y-y0+h*8,x-x0:x-x0+w*8];sub[m]=tl[m]+16*pi
  return dict(img=c,x0=int(x0),y0=int(y0),pals=sorted({s[5] for s in sp}),nsp=len(sp))
