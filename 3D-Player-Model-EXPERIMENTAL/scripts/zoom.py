import sys,json,numpy as np
from tex3 import *
F=json.load(open(sys.argv[1]));M=np.load(sys.argv[2]);pal=spritepal(team('tor'));V=load(F['frames']);tiles=[]
for n in (370,185,313,289):
    i=F['frames'].index(n);v=V[i];d=F['dirs'][i];p=v['p'];a=np.zeros(p.shape+(3,),np.uint8);a[:]=BG;a[v['fg']]=np.clip(pal[FLAT[p[v['fg']]]],0,255)
    mm=model(np.array(F['xv'][i]),0.3,F['stick'][i]);N0=int((mm[3]!=C['stick']).sum());ci=np.concatenate([M['col'][:N0],np.where(mm[4][N0:]==mm[4].max(),0,136)])
    b=splat(mm[2],ci,d,25,v['a'],F['offs'][i],p.shape,pal);t=np.concatenate([a,np.full((p.shape[0],1,3),20,np.uint8),b],1);tiles.append(Image.fromarray(t).resize((t.shape[1]*10,t.shape[0]*10),Image.NEAREST))
W=sum(t.width+10 for t in tiles);im=Image.new('RGB',(W,max(t.height for t in tiles)),(20,20,20));x=0
for t in tiles:im.paste(t,(x,0));x+=t.width+10
im.save(sys.argv[3])
