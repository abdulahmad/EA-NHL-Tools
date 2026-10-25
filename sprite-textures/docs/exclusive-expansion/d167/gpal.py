import numpy as np
def gpal(path='/workspace/NHL94Genesis/Extracted/NHL94/Graphics/Pals/TORh.pal'):
  d=open(path,'rb').read();w=[int.from_bytes(d[i:i+2],'big') for i in range(0,32,2)]
  P=np.zeros((256,3),int)
  for i,x in enumerate(w):P[32+i]=((x&14)*18,((x>>4)&14)*18,((x>>8)&14)*18)
  return P.clip(0,255)
GP=gpal();CID={}
for i in range(33,48):CID.setdefault(tuple(GP[i]),i)
def col(i):return CID[tuple(GP[i])] if i>=32 else i   # canonical index per distinct colour
