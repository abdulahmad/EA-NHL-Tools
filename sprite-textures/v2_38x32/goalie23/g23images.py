# LOCAL ONLY: before (g22) / after (g23) strict pad-error sheets, large axis numbers -> /workspace/preview_v2/goalie23/errors_<k>.png
import sys,os,json
HH=os.path.dirname(os.path.abspath(__file__));sys.path.insert(0,HH+'/../goalie17')
from g17inspect import *
from g15pad import why
OUT='/workspace/preview_v2/goalie23/';os.makedirs(OUT,exist_ok=True)
t=[t for t in TEAMS if t[0]=='chi_away'][0];sp=spal(t[1],t[2])
A=json.load(open(HH+'/../goalie22/g22_pads.json'))['frames'];B=json.load(open(HH+'/g23_pads.json'))['frames']
def errs(D,n,p):return [tuple(map(int,k.split(','))) for r in D[str(n)] for k,v in r['map'].items() if why(p,tuple(map(int,k.split(','))),tuple(v) if v else None)!='ok']
def pan(n,E,title):
    p=frame(n);ys,xs=np.nonzero(p!=255);a,b,c,e=ys.min(),xs.min(),ys.max()+1,xs.max()+1;z=min(16,450//(e-b),560//(c-a));AX=44;TT=34
    im=Image.new('RGB',(AX+(e-b)*z+6,TT+AX+(c-a)*z+6));d=ImageDraw.Draw(im);f=F_(20)
    d.text((4,2),title,font=F_(22),fill=(255,255,0))
    for x in range(b,e):
        if x%5==0:d.text((AX+(x-b)*z+z//2,TT+AX//2),str(x),font=f,fill=(255,255,255),anchor='mm');d.line([AX+(x-b)*z+z//2,TT+AX-6,AX+(x-b)*z+z//2,TT+AX-1],fill=(255,255,255),width=2)
    for y in range(a,c):
        if y%5==0:d.text((AX//2-2,TT+AX+(y-a)*z+z//2),str(y),font=f,fill=(255,255,255),anchor='mm')
    for y in range(a,c):
        for x in range(b,e):
            r=[AX+(x-b)*z,TT+AX+(y-a)*z,AX+(x-b)*z+z-1,TT+AX+(y-a)*z+z-1]
            d.rectangle(r,fill=(0,0,0) if p[y,x]==255 else tuple(int(k) for k in sp[int(p[y,x])]),outline=(45,45,45))
    for y,x in E:X=AX+(x-b)*z;Y=TT+AX+(y-a)*z;d.rectangle([X-3,Y-3,X+z+2,Y+z+2],outline=(255,255,0),width=4)
    return im
FR=[n for n in FRAMES13 if errs(A,n,frame(n))]
pages=[FR[i:i+3] for i in range(0,len(FR),3)]
for k,pg in enumerate(pages):
    rows=[]
    for n in pg:
        p=frame(n);ea=errs(A,n,p);eb=errs(B,n,p)
        L=pan(n,ea,'%d BEFORE (g22): %d'%(n,len(ea)));R=pan(n,eb,'%d AFTER (g23): %d'%(n,len(eb)))
        r=Image.new('RGB',(1000,max(L.height,R.height)));r.paste(L,(0,0));r.paste(R,(500,0));rows.append(r)
    hdr=Image.new('RGB',(1000,44));ImageDraw.Draw(hdr).text((6,6),'Strict pad errors ringed yellow  (page %d/%d)'%(k+1,len(pages)),font=F_(26),fill=(255,255,255))
    im=Image.new('RGB',(1000,44+sum(r.height+12 for r in rows)));im.paste(hdr,(0,0));y=44
    for r in rows:im.paste(r,(0,y));y+=r.height+12
    im.save(OUT+'errors_%d.png'%(k+1));print(OUT+'errors_%d.png'%(k+1),im.size)
