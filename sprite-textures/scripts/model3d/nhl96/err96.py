"""Render a coloured voxel model at the 8 game angles and count wrong pixels against the sprites."""
import numpy as np,sys,pickle
from PIL import Image
from hull96 import *
STK=[157,158,159,148,149,150]
def rend(V,d,phi,pts,col):
    v=V[d];sx,sy,dp=proj(pts[:,0],pts[:,1],pts[:,2],d,phi);px=np.floor(sx+v['xo']).astype(int);py=np.floor(sy+v['yo']).astype(int)
    ok=(px>=0)&(px<v['w'])&(py>=0)&(py<v['h']);o=np.flatnonzero(ok);o=o[np.argsort(-dp[o])];im=np.full((v['h'],v['w']),255,np.uint8);im[py[o],px[o]]=col[o];return im
def errors(V,phi,pts,col,pal):
    out=[]
    for d,v in enumerate(V):
        im=rend(V,d,phi,pts,col);sp=FL[v['p']];stick=np.isin(v['p'],STK);body=(sp!=255)&~stick;mod=im!=255
        miss=body&~mod;extra=mod&(sp==255);both=body&mod;wrong=both&(pal[im].astype(int)-pal[sp].astype(int)).any(-1)
        out.append(dict(body=int(body.sum()),miss=int(miss.sum()),extra=int(extra.sum()),wrong=int(wrong.sum()),im=im))
    return out
def sheet(V,phi,pts,col,pal,fn,sc=4):
    p2=pal.copy();p2[255]=(40,90,60);E=errors(V,phi,pts,col,pal);rows=[[],[],[]]
    for d,v in enumerate(V):
        def tile(a):
            t=np.full((72,64),255,np.uint8);t[:min(72,a.shape[0]),:min(64,a.shape[1])]=a[:72,:64];return t
        sp=tile(FL[v['p']]);im=tile(E[d]['im']);stick=np.isin(tile(v['p']),STK);df=np.zeros((72,64,3),np.uint8);df[:]=(25,25,25)
        bad=((p2[sp].astype(int)-p2[im].astype(int)).any(-1))&~stick;df[(sp!=255)&~bad]=(90,90,90);df[bad]=(255,40,40)
        rows[0].append(p2[sp]);rows[1].append(p2[im]);rows[2].append(df)
    Image.fromarray(np.kron(np.concatenate([np.concatenate(r,1) for r in rows],0),np.ones((sc,sc,1),np.uint8))).save(fn);return E
def report(E):
    for d,e in enumerate(E):print(d,'body',e['body'],'miss',e['miss'],'extra',e['extra'],'wrong colour',e['wrong'],'total %.1f%%'%(100*(e['miss']+e['extra']+e['wrong'])/e['body']))
    t=sum(e['miss']+e['extra']+e['wrong'] for e in E);print('mean wrong pixels per frame %.1f of %.0f (%.1f%%)'%(t/8,np.mean([e['body'] for e in E]),100*t/sum(e['body'] for e in E)))
