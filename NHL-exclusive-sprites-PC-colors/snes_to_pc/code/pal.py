import numpy as np
def snes_pal(path='/workspace/NHL94SNES/Extracted/data/gfx/Pals/BOSh.pal'):
    P=np.zeros((256,3),int)
    def rd(f,base):
        d=open(f,'rb').read()
        for i in range(len(d)//2):
            x=int.from_bytes(d[2*i:2*i+2],'little');P[base+i]=((x&31)*255//31,((x>>5)&31)*255//31,((x>>10)&31)*255//31)
    rd('/workspace/NHL94SNES/Extracted/data/gfx/Pals/RinkPalette.pal',0);rd(path,32);return P
def gen_pal(path='/workspace/NHL94Genesis/Extracted/NHL94/Graphics/Pals/BOSh.pal'):
    d=open(path,'rb').read();P=np.zeros((256,3),int)
    for i in range(16):
        x=int.from_bytes(d[2*i:2*i+2],'big');P[32+i]=((x&14)*18,((x>>4)&14)*18,((x>>8)&14)*18)
    return P
SPB=snes_pal();GPB=gen_pal()
BG=(168,196,214)
def paint(a,P,empty=0):
    o=np.zeros(a.shape+(3,),np.uint8);o[:]=BG;m=a!=empty;o[m]=P[a[m]];return o
