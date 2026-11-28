import sys;sys.path.insert(0,'/workspace/snes-to-pc')
from s2g import A
import numpy as np,pickle,json,os,re,collections,pandas as pd
from pal import SPB,GPB,BG
from pcexp import BOS
import percolor
from PIL import Image,ImageDraw,ImageFont
OUT='/workspace/snes-to-pc/out/all/'
FB=lambda n:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',n)
INK=(15,15,25);PAPER=(250,250,252);LINE=(60,60,80)
res=pickle.load(open(OUT+'res.pkl','rb'));L=pd.read_csv('/workspace/snes-to-pc/out/snes_exclusive_list.csv')
def img(a,P,empty):
    o=np.zeros(a.shape+(3,),np.uint8);o[:]=BG;m=(a!=empty)&(a>=0);o[m]=P[np.clip(a[m],0,255)];return Image.fromarray(o)
W=1000;labw=150;Z=3;cw=(W-labw-8)//3;HDR=118;MAXH=1500
COLS=[('A','94 SNES (BOS)',SPB,0),('B','Genesis style',GPB,0),('C','95 PC style (BOS)',BOS,255)]
def legend(rows,y0,im,dr):
    gl=sorted({int(v) for r in rows for v in np.unique(r['B']) if v>0});fams={}
    for r in rows:
        c=r['C']
        for v in np.unique(c[c!=255]):fams.setdefault(percolor.lab(int(v)),collections.Counter())[int(v)]+=int((c==v).sum())
    dr.rectangle((0,y0,W,im.height),fill=(235,235,242));dr.text((8,y0+4),'PALETTE LEGEND (Boston home), zoom x%d.  CLEAR = no match in 94G or 95 PC.  AMBIG = possible redraw (best-match scores shown).'%Z,fill=INK,font=FB(11))
    dr.text((8,y0+22),'B = Genesis slot number (34 outline, 38/39 skin, 46 stick, 47 ice)',fill=INK,font=FB(11))
    xx=8;yy=y0+40
    for v in gl:
        dr.rectangle((xx,yy,xx+18,yy+18),fill=tuple(int(c) for c in GPB[v]),outline=INK,width=2);dr.text((xx+2,yy+20),str(v),fill=INK,font=FB(10));xx+=32
    yy+=44;dr.text((8,yy),'C = 95 PC zone (swatch = most used index of that zone on this sheet)',fill=INK,font=FB(11));yy+=16
    for k,(f,c) in enumerate(sorted(fams.items())):
        v=c.most_common(1)[0][0];cx=8+(k%4)*248;cy=yy+(k//4)*16
        dr.rectangle((cx,cy,cx+14,cy+12),fill=tuple(int(q) for q in BOS[v]),outline=INK,width=2);dr.text((cx+19,cy),f'{f} #{v}',fill=INK,font=FB(10))
def legh(rows):
    fams=set()
    for r in rows:
        for v in np.unique(r['C'][r['C']!=255]):fams.add(percolor.lab(int(v)))
    gl=len({int(v) for r in rows for v in np.unique(r['B']) if v>0})
    return 40+44+16+16*((len(fams)+3)//4)+12
def render(rows,title,path):
    rowh=[max(max(r['S'].shape[0],r['B'].shape[0],r['C'].shape[0])*Z+14,98) for r in rows]
    H=HDR+sum(rowh)+legh(rows)+4
    im=Image.new('RGB',(W,H),PAPER);dr=ImageDraw.Draw(im);dr.text((8,6),title,fill=INK,font=FB(17))
    for j,(Lt,cap,_,_) in enumerate(COLS):
        x0=labw+j*cw;dr.text((x0+cw//2-22,24),Lt,fill=INK,font=FB(60));dr.text((x0+4,94),cap,fill=INK,font=FB(12))
    dr.line((0,HDR-4,W,HDR-4),fill=LINE,width=2);y=HDR
    for r,rh in zip(rows,rowh):
        cy=y+40
        dr.text((6,y+4),f"S{r['f']}",fill=INK,font=FB(14));dr.text((6,y+22),r['label'],fill=INK,font=FB(11))
        if r['clear']:dr.rectangle((6,cy,60,cy+16),fill=(255,255,255),outline=INK,width=2);dr.text((10,cy+1),'CLEAR',fill=INK,font=FB(11))
        else:dr.rectangle((6,cy,60,cy+16),fill=INK);dr.text((9,cy+1),'AMBIG',fill=(255,255,255),font=FB(11))
        dr.text((6,cy+20),f"G94 {r['gs']:.2f}",fill=INK,font=FB(10));dr.text((6,cy+32),f"PC  {r['ps']:.2f}",fill=INK,font=FB(10))
        if r['note']:dr.text((6,cy+46),r['note'],fill=INK,font=FB(10))
        for j,((Lt,cap,pal,emp),k) in enumerate(zip(COLS,'SBC')):
            a=r[k];t=img(a,pal,emp).resize((a.shape[1]*Z,a.shape[0]*Z),Image.NEAREST);x0=labw+j*cw
            im.paste(t,(x0+(cw-t.width)//2,y+(rh-t.height)//2))
        dr.line((0,y+rh,W,y+rh),fill=(190,190,205));y+=rh
    legend(rows,y,im,dr);im.save(path);return im.size
NOTE={**{f:'REFEREE: B/C n/a' for f in (429,430,431,432)},**{f:'CUP: B/C n/a' for f in (225,226,227,228,229,232)}}
data=[]
for r in L[L.category!='nonplayer'].itertuples():
    f=int(r.frame)
    if f not in res:continue
    x=res[f];base=re.sub(r'\+\d+$','',r.label)
    data.append(dict(note=NOTE.get(f,''),f=f,cat=r.category,label=r.label,base=base,clear=(r.G94_class=='none' and r.PC_class=='none'),gs=float(r.G94_score),ps=float(r.PC_score),**{k:x[k] for k in 'SBC'}))
groups=collections.OrderedDict()
for d in sorted(data,key=lambda d:({'player':0,'celebration':1,'goalie':2}[d['cat']],d['base'],d['f'])):groups.setdefault((d['cat'],d['base']),[]).append(d)
manifest=[];n=0
def pages(rows):
    pg=[];cur=[];h=HDR+legh(rows)+60
    for r in rows:
        rh=max(max(r['S'].shape[0],r['B'].shape[0],r['C'].shape[0])*Z+14,98)
        if cur and h+rh>MAXH:pg.append(cur);cur=[];h=HDR+legh(rows)+60
        cur.append(r);h+=rh
    if cur:pg.append(cur)
    return pg
# merge tiny groups of the same category to cut sheet count
merged=collections.OrderedDict()
for (cat,base),rows in groups.items():merged[(cat,base)]=rows
cur_cat=None;buf=[];bufname=[]
sheets=[]
def flush():
    global buf,bufname
    if buf:sheets.append((cur_cat,list(bufname),list(buf)));buf=[];bufname=[]
for (cat,base),rows in merged.items():
    if cat!=cur_cat:flush();cur_cat=cat
    if len(buf)+len(rows)>7 and buf:flush()
    buf+=rows;bufname.append(base)
flush()
for cat,names,rows in sheets:
    for pgi,pg in enumerate(pages(rows)):
        n+=1;nm=f"all{n:02d}_{cat}_{'-'.join(names[:3])}{'+' if len(names)>3 else ''}.png".replace('+.','.')
        title=f"SNES-exclusive {cat}: "+', '.join(names)+f"  (sheet {n})"
        sz=render(pg,title[:95],OUT+'sheets/'+nm);print(nm,sz,len(pg))
        for r in pg:manifest.append(dict(frame=r['f'],category=cat,label=r['label'],status='clear' if r['clear'] else 'ambiguous',note=r['note'],g94_score=r['gs'],pc_score=r['ps'],sheet=nm))
pd.DataFrame(manifest).to_csv(OUT+'manifest.csv',index=False);print('sheets',n,'frames',len(manifest))
