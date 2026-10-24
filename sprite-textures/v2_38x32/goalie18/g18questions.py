# LOCAL ONLY: question sheet -> /workspace/preview_v2/goalie18/questions.png (run from goalie12)
import sys;sys.argv=['x'];sys.path.insert(0,'../goalie17')
from g17inspect import *
GREEN538=[(17,10),(17,11),(17,12),(18,9),(18,10),(18,11),(18,12),(18,13),(19,8),(19,9),(19,10),(19,11),(19,12),(19,13),(20,8),(20,9),(20,10),(20,11),(20,12),(21,9),(21,10),(21,11),(22,10)]
sys.path.insert(0,'../goalie18')
OUT='/workspace/preview_v2/goalie18/';os.makedirs(OUT,exist_ok=True)
t=[t for t in TEAMS if t[0]=='chi_away'][0];sp=spal(t[1],t[2])
l538=np.array(S['538']['lab']);G=set(GREEN538)
q3=[(int(x),int(y)) for y,x in np.argwhere(l538==BLOCK) if (int(x),int(y)) not in G]
print('538 non-green old B',q3)
Q=[(980,[(x,y) for x in (13,14,15) for y in (19,20,21)],'Q1  frame 980: are the ringed pixels RIGHT pad or LEFT pad?'),
   (1044,[(9,24)],'Q2  frame 1044: which part is the ringed pixel (x9, y24)? (pad, skate, stick, body...)'),
   (538,q3,'Q3  frame 538: ringed = old blocker cells you did NOT colour green.  I made them body.\nAre they body, right pad or stick?')]
def crop(n,pts,ring):
    p=frame(n);xs=[a for a,b in pts];ys=[b for a,b in pts]
    b0=max(0,min(xs)-5);e0=min(p.shape[1],max(xs)+6);a0=max(0,min(ys)-5);c0=min(p.shape[0],max(ys)+6)
    z=min(30,440//(e0-b0+1));im=panel(p,None,sp,(a0,b0,c0,e0),z,'clean','ringed' if ring else 'clean');d=ImageDraw.Draw(im)
    if ring:
        for x,y in pts:r=[36+(x-b0)*z,66+(y-a0)*z];d.rectangle([r[0]-2,r[1]-2,r[0]+z+1,r[1]+z+1],outline=(255,255,0),width=4)
    return im
rows=[]
for n,pts,txt in Q:
    A=crop(n,pts,0);B=crop(n,pts,1);r=Image.new('RGB',(1000,60+max(A.height,B.height)),(0,0,0))
    ImageDraw.Draw(r).multiline_text((6,4),txt,font=F_(20),fill=(255,255,255));r.paste(A,(0,60));r.paste(B,(A.width+20,60));rows.append(r)
im=Image.new('RGB',(1000,sum(r.height for r in rows)+20*len(rows)),(0,0,0));y=0
for r in rows:im.paste(r,(0,y));y+=r.height+20
im.save(OUT+'questions.png');print(im.size)
