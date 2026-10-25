import sys,os,glob,pickle,struct,numpy as np
from PIL import Image
sys.path.insert(0,'/workspace/preview_v2/platform_unique');sys.path.insert(0,'.')
from gdec import dec_blob,decode
from load import topix
def g92():
    out={}
    for f in glob.glob('g92/Extracted/Sprites.anim/*.bmp'):
        out[int(os.path.basename(f)[:-4])]=np.array(Image.open(f)).astype(int)
    return out
def g93():
    fr=dec_blob(open('/workspace/NHLPA93Genesis/Extracted/Graphics/Sprites.anim','rb').read(),0)
    return {i+1:a.astype(int) for i,a in enumerate(fr) if a is not None}
def g94():
    b=open('/workspace/NHL94Genesis/lst/nhl94.bin','rb').read()
    fr=decode(b,0x5DE84,0x9E726)
    return {i+1:a.astype(int) for i,a in enumerate(fr) if a is not None}
def s94():
    S=pickle.load(open('/workspace/preview_v2/platform_unique/snes94.pkl','rb'))
    return {i+1:topix(p)[0] for i,p in enumerate(S) if p}
def s93():
    import importlib.util as U;sp=U.spec_from_file_location('sg93','/workspace/n93s/tools/snesgfx.py');T=U.module_from_spec(sp);sp.loader.exec_module(T)
    out={}
    for st in T.sprite_sets():
        tiles=open(os.path.join(T.SPRITES,'set%02d.chr'%st['n']),'rb').read();pcs=open(os.path.join(T.SPRITES,'set%02d.pieces'%st['n']),'rb').read()
        for i in range(st['frames']):
            pts=[]
            for x0,y0,t,pal,size,hf,vf in reversed(T.frame_pieces(st,pcs,i)):
                for y in range(size):
                    for x in range(size):
                        c=T.tile_pixel(tiles,t+(y>>3)*16+(x>>3),x&7,y&7)
                        if c:pts.append((y0+(size-1-y if vf else y),x0+(size-1-x if hf else x),c+16*pal))
            if pts:
                d={};[d.__setitem__((p[0],p[1]),p[2]) for p in pts];a,_=topix([(k[0],k[1],v) for k,v in d.items()]);out[st['base']+i]=(a,st['n'])
    return out
def pc():
    sys.path.insert(0,'/workspace/EA-NHL-Tools/sprite-textures/scripts');import lib
    return {n:lib.frame(n).astype(int) for n in range(1,len(lib.H)+1)}
if __name__=='__main__':
    A={'G92':g92(),'G93':g93(),'G94':g94(),'S94':s94(),'PC':pc()}
    s=s93();A['S93']={k:v[0] for k,v in s.items()};S93SET={k:v[1] for k,v in s.items()}
    pickle.dump((A,S93SET),open('all.pkl','wb'))
    from collections import Counter
    for k,v in A.items():
        c=Counter(int(x) for a in v.values() for x in np.unique(a));print(k,len(v),min(v),max(v),sorted(c)[:6],sorted(c)[-6:])
