from jerseys import *
from lib import H
FR=[1,9,17,25,33,41,49,57,100,200,300,889,897,1080,409,980]
SUM=[1,17,33,100,889,409]
sp=spritepal(team('tor'));anc={n:(H[n-1][4],H[n-1][5]) for n in FR}
cache={};log=[]
for k in D:
    A,cr=build(k);A.save(J+f'{k}_atlas.png');ims=[];cc=[]
    for n in FR:
        im,c=render(n,A,cr,sp);ims.append(im);cc.append(int(c));cache[(k,n)]=im
    anchored(ims,[anc[n] for n in FR],8).save(J+f'{k}_grid.png')
    log.append((k,dict(zip(FR,cc))))
cols=[];sc=5
thumbs=[Image.open(R0+D[k]['ref']).convert('RGB') for k in D]
th=[t.resize((int(t.width*200/t.height),200)) if t.height>t.width*1.5 else t.resize((300,int(300*t.height/t.width))) for t in thumbs]
imgs=[];an=[]
for n in SUM:
    for k in D: imgs.append(cache[(k,n)]);an.append(anc[n])
g=anchored(imgs,an,6)
# column widths of g: recompute to place thumbs
cw=[max(max(an[i][0] for i in range(c,len(imgs),6))*sc,0)+max(imgs[i].width-an[i][0]*sc for i in range(c,len(imgs),6))+6 for c in range(6)]
cw=[max(cw[c],th[c].width+8) for c in range(6)]
# rebuild with forced width: pad sprites via simple per-column paste
TH=max(t.height for t in th)+30
S=Image.new('RGB',(sum(cw),TH+g.height),(20,20,20));d=ImageDraw.Draw(S);x=0
gx=0;gcw=[max(an[i][0] for i in range(c,len(imgs),6))*sc+max(imgs[i].width-an[i][0]*sc for i in range(c,len(imgs),6))+6 for c in range(6)]
for c,k in enumerate(D):
    S.paste(th[c],(x+(cw[c]-th[c].width)//2,4));d.text((x+4,TH-22),D[k]['name'],fill=(230,230,230))
    S.paste(g.crop((gx,0,gx+gcw[c],g.height)),(x+(cw[c]-gcw[c])//2,TH));x+=cw[c];gx+=gcw[c]
S.save(J+'00_summary_all6.png')
json.dump(log,open(J+'crest_pixel_counts.json','w'),indent=1)
