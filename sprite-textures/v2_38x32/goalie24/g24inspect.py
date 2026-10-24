# LOCAL ONLY: g24 inspection sheets for SPAgglover -> /workspace/preview_v2/goalie24/inspect_<k>.png
# CLEAN (chi_away colours) | LABELS (part letter per cell), LARGE axis numbers every 5 cells. Needs /tmp/g24_seg.json.
import sys,os,json
HH=os.path.dirname(os.path.abspath(__file__));sys.path.insert(0,HH+'/../goalie17')
from g17inspect import *
from g24seg import GROUP
OUT='/workspace/preview_v2/goalie24/';os.makedirs(OUT,exist_ok=True)
S=json.load(open('/tmp/g24_seg.json'));t=[t for t in TEAMS if t[0]=='chi_away'][0];sp=spal(t[1],t[2])
def box(p):ys,xs=np.nonzero(p!=255);return ys.min(),xs.min(),ys.max()+1,xs.max()+1
def pan(p,lab,kind,title,ring=()):
    a,b,c,e=box(p);z=min(18,440//(e-b),600//(c-a));AX=46;TT=36
    im=Image.new('RGB',(490,TT+AX+(c-a)*z+6));d=ImageDraw.Draw(im);f=F_(22);fl=F_(max(10,z-6))
    d.text((4,2),title,font=F_(24),fill=(255,255,0))
    for x in range(b,e):
        if x%5==0:d.text((AX+(x-b)*z+z//2,TT+AX//2),str(x),font=f,fill=(255,255,255),anchor='mm')
    for y in range(a,c):
        if y%5==0:d.text((AX//2-2,TT+AX+(y-a)*z+z//2),str(y),font=f,fill=(255,255,255),anchor='mm')
    for y in range(a,c):
        for x in range(b,e):
            r=[AX+(x-b)*z,TT+AX+(y-a)*z,AX+(x-b)*z+z-1,TT+AX+(y-a)*z+z-1]
            if p[y,x]==255:d.rectangle(r,outline=(35,35,35));continue
            if kind=='clean':d.rectangle(r,fill=tuple(int(k) for k in sp[int(p[y,x])]),outline=(60,60,60));continue
            L=int(lab[y,x]);cc=COL.get(L,(0,0,0));d.rectangle(r,fill=cc,outline=(255,255,255) if L==STICK else (20,20,20))
            d.text(((r[0]+r[2])/2,(r[1]+r[3])/2),LET.get(L,'?'),font=fl,fill=tc(cc),anchor='mm')
    for y,x in ring:X=AX+(x-b)*z;Y=TT+AX+(y-a)*z;d.rectangle([X-3,Y-3,X+z+2,Y+z+2],outline=(255,255,0),width=4)
    return im
def page(fr,fn,head):
    rows=[]
    for n in fr:
        p=frame(n);lab=np.array(S[str(n)]['lab']);L=pan(p,lab,'clean','%d clean'%n);R=pan(p,lab,'lab','%d labels'%n)
        r=Image.new('RGB',(1000,max(L.height,R.height)));r.paste(L,(0,0));r.paste(R,(510,0));rows.append(r)
    lg=legend(1000);im=Image.new('RGB',(1000,44+lg.height+sum(r.height+10 for r in rows)));ImageDraw.Draw(im).text((6,6),head,font=F_(26),fill=(255,255,255))
    im.paste(lg,(0,44));y=44+lg.height
    for r in rows:im.paste(r,(0,y));y+=r.height+10
    im.save(OUT+fn);print(OUT+fn,im.size)
if __name__=='__main__':
    for k in range(0,len(GROUP),2):page(GROUP[k:k+2],'inspect_%d.png'%(k//2+1),'SPAgglover (glove save R)  page %d/4'%(k//2+1))
