import sys;sys.path.insert(0,'.')
from PIL import Image,ImageDraw,ImageFont
import numpy as np
FB=lambda s:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',s)
ICE=(168,196,214);BG=(28,28,28);W=1000
def paint(idx,rgb,ice=ICE,transp=(255,0)):
    o=np.zeros(idx.shape+(3,),np.uint8);o[:]=ice
    m=~np.isin(idx,transp);o[m]=rgb[idx[m]];return o
def up(a,s):return Image.fromarray(a).resize((a.shape[1]*s,a.shape[0]*s),Image.NEAREST)
def legend(rgb,items,title,cols=8):
    """items: [(idx,label)] -> strip image W wide"""
    sw=W//cols;rows=(len(items)+cols-1)//cols;rh=64
    im=Image.new('RGB',(W,rows*rh+34),BG);d=ImageDraw.Draw(im);d.text((8,4),title,font=FB(20),fill=(255,255,255))
    for i,(k,lab) in enumerate(items):
        x=(i%cols)*sw+6;y=30+(i//cols)*rh
        d.rectangle([x,y,x+sw-14,y+26],fill=tuple(int(v) for v in rgb[k]),outline=(255,255,255),width=2)
        d.text((x,y+30),lab,font=FB(15),fill=(255,255,255))
    return im
def pages(title,cells,scale,leg,stem,maxh=1150,sub='A = 95 PC original (BOS home)     B = Genesis backport (BOS home)',letters='AB'):
    """cells: dict(label,tag,a,b) a,b = RGB arrays. Layout: A and B columns side by side per cell, cells flow left to right."""
    HEAD=70;laid=[]
    for c in cells:
        ims=[up(x,scale) for x in c['imgs']];cw=max(max(i.width for i in ims),30);nc=len(ims)
        c['ims']=ims;c['cw']=cw;c['w']=nc*cw+(nc-1)*10+12;c['h']=max(i.height for i in ims)+54+(22 if c.get('tag') else 0)
        c['ih']=max(i.height for i in ims)
    lines=[];line=[];x=8;rh=0
    for c in cells:
        if x+c['w']>W-8 and line:lines.append((line,rh));line=[];x=8;rh=0
        line.append((x,c));x+=c['w']+10;rh=max(rh,c['h'])
    if line:lines.append((line,rh))
    out=[];pg=[];hh=0
    for ln in lines:
        if pg and HEAD+hh+ln[1]+10+leg.height>maxh:out.append(pg);pg=[];hh=0
        pg.append(ln);hh+=ln[1]+10
    if pg:out.append(pg)
    files=[]
    for pi,pg in enumerate(out):
        H=HEAD+sum(l[1]+10 for l in pg)+leg.height+4
        P=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(P)
        d.rectangle([0,0,W,HEAD-8],fill=(0,0,0))
        d.text((8,4),f'{title}  ({pi+1}/{len(out)})',font=FB(26),fill=(255,255,255))
        d.text((8,36),sub,font=FB(18),fill=(255,230,120))
        y=HEAD
        for line,rh in pg:
            for x,c in line:
                d.rectangle([x-2,y-2,x+c['w']-4,y+c['h']+2],fill=(50,50,50))
                d.text((x+4,y),c['label'],font=FB(20),fill=(255,255,255))
                ty=y+26
                if c.get('tag'):
                    tw=d.textlength(c['tag'],font=FB(15));d.rectangle([x+4,ty,x+8+tw,ty+19],fill=(255,210,0));d.text((x+6,ty+1),c['tag'],font=FB(15),fill=(0,0,0));ty+=22
                for j,im in enumerate(c['ims']):
                    L=letters[j];cx=x+6+j*(c['cw']+10)
                    d.rectangle([cx,ty,cx+c['cw']-1,ty+c['ih']-1],fill=ICE)
                    P.paste(im,(cx+(c['cw']-im.width)//2,ty+(c['ih']-im.height)))
                    d.text((cx+3,ty+c['ih']+2),L,font=FB(22),fill=(255,255,255),stroke_width=2,stroke_fill=(0,0,0))
            y+=rh+10
        P.paste(leg,(0,H-leg.height))
        fn=f'{stem}_{pi+1:02d}.png';P.save(fn);files.append(fn)
    return files
