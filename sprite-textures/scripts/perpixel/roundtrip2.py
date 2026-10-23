# Extract Leafs home / Rangers away into the per-pixel map from frames 370+889, re-apply to test frames, diff.
import sys,json,collections,numpy as np;sys.path.insert(0,'.');sys.path.insert(0,__import__('os').path.dirname(__import__('os').path.abspath(__file__)))
from PIL import Image,ImageDraw
from ppmap import *
from lib import spritepal,D,toimg
M={tuple(k.split('|')):v for k,v in json.load(open('poc2/measure.json')).items()}
# ---- layout: one column strip per (part,side,half); bands stacked top->bottom in chain order; strips packed left->right
ORDER=[('helmet','-'),('torso','-'),('sleeve','R'),('sleeve','L'),('pants','-'),('sock','R'),('sock','L')]
L={};x=0;H_=0;strips=[]
for pn,sd in ORDER:
    for half in('front','back'):
        y=0;w=max(M[k][1] for k in M if k[:3]==(pn,sd,half))
        for b in CHAIN[pn]:
            k=(pn,sd,half,b)
            if k in M:L[k]=(x,y,M[k][1],M[k][0]);y+=M[k][0]
        strips.append((pn,sd,half,x,w,y));x+=w;H_=max(H_,y)
L['crest']=(x,0,5,4);x+=5;H_=max(H_,4);TW,TH=x,H_
def tpos(k):
    if k[0]=='crest':x0,y0,_,_=L['crest'];return x0+k[2],y0+k[1]
    x0,y0,w,h=L[k[:4]];assert k[5]<w and k[4]<h,k;return x0+k[5],y0+k[4]
TEAMS=dict(leafs_home=('HOME','tor'),rangers_away=('AWAY','nyr'))
import os;SRC=[int(x) for x in os.environ.get('SRC','370,889').split(',')];TAG=os.environ.get('TAG','');TEST=[370,889,897,42,47,52,57,62,67,72,77]
MED={};[MED.__setitem__(fam(int(k))[0],int(k)) for k in ZN if fam(int(k))[1]=='medium'];MED['pants']=180;MED['helmet']=190
A={n:address(n) for n in set(SRC+TEST)}
rep={};S=8
for key,(src,code) in TEAMS.items():
    t=next(q for q in json.load(open(D+src+'.json')) if q['code']==code);sp=spritepal(t)
    TEX=np.zeros((TH,TW,3),np.uint8);have=np.zeros((TH,TW),bool);LUT={};coll=0
    for n in SRC:
        p,a,_=A[n]
        for (y,x),k in a.items():
            i=int(p[y,x]);f,c=fam(i);base=sp[MED[f]] if c in('light','dark') else sp[i]
            u,v=tpos(k)
            if have[v,u] and (TEX[v,u]!=base).any():coll+=1
            TEX[v,u]=base;have[v,u]=True
            if c in('light','dark'):LUT[(f,c)]=tuple(sp[i])
    raw=TEX.copy();raw[~have]=(255,0,255)
    # unseen texels inside an observed band block take that block's colour (block == one colour zone); reported separately
    filled=TEX.copy();fill=np.zeros_like(have)
    for k,(x0,y0,w,h) in L.items():
        hb=have[y0:y0+h,x0:x0+w]
        if k!='crest' and hb.any() and not hb.all():
            cols=np.unique(TEX[y0:y0+h,x0:x0+w][hb],axis=0);assert len(cols)==1,(k,cols)
            blk=filled[y0:y0+h,x0:x0+w];blk[~hb]=cols[0];fill[y0:y0+h,x0:x0+w]|=~hb
    Image.fromarray(raw).save(f'poc2/tex_{key}{TAG}_raw.png');Image.fromarray(filled).save(f'poc2/tex_{key}{TAG}_filled.png')
    np.save(f'poc2/tex_{key}{TAG}_have.npy',have)
    for n in TEST:
        p,a,info=A[n];G=sp[p].copy();Rr=G.copy();why=collections.Counter();usedfill=0
        for (y,x),k in a.items():
            i=int(p[y,x]);f,c=fam(i);u,v=tpos(k)
            if not have[v,u] and not fill[v,u]:why[('no texel: block never seen in 370/889',k[0] if k[0]=='crest' else '|'.join(k[:4]))]+=1;Rr[y,x]=(255,0,255);continue
            usedfill+=int(fill[v,u]);b=filled[v,u]
            if c in('light','dark'):
                if (f,c) not in LUT:why[('no shade entry',f+' '+c)]+=1;Rr[y,x]=(255,0,255);continue
                b=LUT[(f,c)] if tuple(b)==tuple(sp[MED[f]]) else b
            Rr[y,x]=b
        vis=p!=255;dif=(np.abs(G.astype(int)-Rr.astype(int)).sum(2)>0)&vis
        rep[f'{key}_{n}']=dict(diff=int(dif.sum()),visible=int(vis.sum()),mapped=len(a),from_filled_texels=usedfill,texel_collisions=coll,reasons={f'{a_}: {b_}':v for (a_,b_),v in why.items()},**info)
        rep[f'{key}_{n}']['_img']=(G,Rr,dif,vis)
    rep[key+'_tex']=(raw,filled)
json.dump(dict(size=[TW,TH],layout={('|'.join(k) if isinstance(k,tuple) else k):v for k,v in L.items()}),open('poc2/layout.json','w'),indent=0)
print('texture',TW,'x',TH)
# ---- compare sheets: game | texture->frame | diff ; each sprite centred in its column
for key in TEAMS:
    cells=[]
    for n in TEST:
        r=rep[f'{key}_{n}'];G,Rr,dif,vis=r['_img'];dm=np.zeros(G.shape);dm[vis]=(70,70,70);dm[dif]=(255,0,0)
        cells.append((f"{n} d{r['dir']} {r['facing']}{' (source)' if n in SRC else ''} diff={r['diff']}",[toimg(G.astype(float),vis,S),toimg(Rr.astype(float),vis,S),toimg(dm,vis,S)]))
    cw=max(i.width for _,c in cells for i in c)+24;rh=max(i.height for _,c in cells for i in c)+34
    O=Image.new('RGB',(cw*3,rh*len(cells)+24),(20,20,20));d=ImageDraw.Draw(O)
    for j,h in enumerate(['game render',f'{key} per-pixel texture (from '+'+'.join(map(str,SRC))+') -> frame','diff (red)']):d.text((j*cw+10,6),h,fill=(255,255,0))
    for k,(t_,c) in enumerate(cells):
        y=24+k*rh;d.text((6,y+2),t_,fill=(255,255,255))
        for j,i in enumerate(c):O.paste(i,(j*cw+(cw-i.width)//2,y+26+(rh-34-i.height)//2))
    O.save(f'poc2/compare_{key}{TAG}.png')
    raw,filled=rep[key+'_tex'];Z=12
    for nm,img in (('raw',raw),('filled',filled)):
        I=Image.fromarray(img).resize((TW*Z,TH*Z),Image.NEAREST);d=ImageDraw.Draw(I)
        for k,(x0,y0,w,h) in L.items():d.rectangle([x0*Z,y0*Z,(x0+w)*Z-1,(y0+h)*Z-1],outline=(255,255,0))
        for pn,sd,half,x0,w,h in strips:d.text((x0*Z+2,TH*Z-12),f'{pn}{sd if sd!="-" else ""} {half[0]}',fill=(255,255,255))
        I.save(f'poc2/tex_{key}{TAG}_{nm}_x{Z}.png')
out={k:{a:b for a,b in v.items() if a!='_img'} for k,v in rep.items() if not k.endswith('_tex')}
json.dump(out,open(f'poc2/report{TAG}.json','w'),indent=1,default=int)
for k,v in out.items():print(k,v['diff'],v['mapped'],v['from_filled_texels'],v['reasons'])
