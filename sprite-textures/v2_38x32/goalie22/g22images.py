# LOCAL ONLY: before (g21) / after (g22) strict-error sheets -> /workspace/preview_v2/goalie22/errors_<k>.png
# Each row: the whole goalie (original colours) twice; strict pad-mapping errors ringed in thick bright yellow (left g21, right g22).
import sys,os,json
HH=os.path.dirname(os.path.abspath(__file__));sys.path.insert(0,HH+'/../goalie17')
from g17inspect import *
from g15pad import why
OUT='/workspace/preview_v2/goalie22/';os.makedirs(OUT,exist_ok=True)
t=[t for t in TEAMS if t[0]=='chi_away'][0];sp=spal(t[1],t[2])
A=json.load(open(HH+'/../goalie21/g21_pads.json'))['frames'];B=json.load(open(HH+'/g22_pads.json'))['frames']
def errs(D,n,p):
    return [tuple(map(int,k.split(','))) for r in D[str(n)] for k,v in r['map'].items() if why(p,tuple(map(int,k.split(','))),tuple(v) if v else None)!='ok']
def pan(n,E,title):
    p=frame(n);ys,xs=np.nonzero(p!=255);box=(ys.min(),xs.min(),ys.max()+1,xs.max()+1);z=min(13,440//(box[3]-box[1]))
    im=panel(p,None,sp,box,z,'clean',title);d=ImageDraw.Draw(im)
    for y,x in E:X=36+(x-box[1])*z;Y=66+(y-box[0])*z;d.rectangle([X-3,Y-3,X+z+2,Y+z+2],outline=(255,255,0),width=4)
    return im
FR=[n for n in FRAMES13 if errs(A,n,frame(n)) or errs(B,n,frame(n))]
pages=[FR[i:i+4] for i in range(0,len(FR),4)]
for k,pg in enumerate(pages):
    rows=[]
    for n in pg:
        p=frame(n);ea=errs(A,n,p);eb=errs(B,n,p)
        L=pan(n,ea,'%d BEFORE g21: %d errors'%(n,len(ea)));R=pan(n,eb,'%d AFTER g22: %d errors'%(n,len(eb)))
        r=Image.new('RGB',(1000,max(L.height,R.height)),(0,0,0));r.paste(L,(0,0));r.paste(R,(500,0));rows.append(r)
    hdr=Image.new('RGB',(1000,40));ImageDraw.Draw(hdr).text((6,6),'Pad mapping errors ringed in yellow (page %d/%d)'%(k+1,len(pages)),font=F_(24),fill=(255,255,255))
    im=Image.new('RGB',(1000,40+sum(r.height+10 for r in rows)));im.paste(hdr,(0,0));y=40
    for r in rows:im.paste(r,(0,y));y+=r.height+10
    im.save(OUT+'errors_%d.png'%(k+1));print(OUT+'errors_%d.png'%(k+1),im.size)
