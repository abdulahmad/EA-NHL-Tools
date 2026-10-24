# LOCAL ONLY: per-frame coordinate inspection sheets -> /workspace/preview_v2/goalie20/inspect_<team>_<frame>.png
# Each sprite px = up to 20 screen px. CLEAN panel (original colours, thin grid) and LABELS panel (part letter in every
# cell, Okabe-Ito colours) with x numbers along the top and y numbers down the left of both. Labels = raw g20 segmentation.
import sys,os,json
H=os.path.dirname(os.path.abspath(__file__))
for d in ('','/../goalie16','/../goalie15','/../goalie14','/../goalie12'):sys.path.insert(0,H+d)
from g14seg import *
from g10c_images import F_
from PIL import Image,ImageDraw
OUT='/workspace/preview_v2/goalie20/';os.makedirs(OUT,exist_ok=True)
S=json.load(open('/tmp/g20_seg.json'))
COL={BODY:(110,110,110),MASK:(255,255,255),CATCH:(25,35,120),BLOCK:(230,159,0),STICK:(0,0,0),PADL:(86,180,233),PADR:(240,228,66),SKATE:(204,121,167),SHADOW:(45,45,45)}
LET={BODY:'b',MASK:'M',CATCH:'C',BLOCK:'B',STICK:'S',PADL:'L',PADR:'R',SKATE:'K',SHADOW:'s'}
NAME={BODY:'body',MASK:'mask',CATCH:'catcher',BLOCK:'blocker',STICK:'stick',PADL:'pad LEFT',PADR:'pad RIGHT',SKATE:'skate',SHADOW:'shadow/spray'}
def tc(c):return (0,0,0) if 0.3*c[0]+0.59*c[1]+0.11*c[2]>120 else (255,255,255)
def panel(p,lab,sp,box,z,kind,title):
    a,b,c,e=box;AX=36;TT=30;im=Image.new('RGB',(AX+(e-b)*z+4,TT+AX+(c-a)*z+4),(0,0,0));d=ImageDraw.Draw(im);f=F_(13);fl=F_(max(10,z-5))
    d.text((AX,2),title,font=F_(20),fill=(255,255,0))
    for x in range(b,e):d.text((AX+(x-b)*z+z//2,TT+AX//2),str(x),font=f,fill=(255,255,255),anchor='mm')
    for y in range(a,c):d.text((AX//2,TT+AX+(y-a)*z+z//2),str(y),font=f,fill=(255,255,255),anchor='mm')
    for y in range(a,c):
        for x in range(b,e):
            r=[AX+(x-b)*z,TT+AX+(y-a)*z,AX+(x-b)*z+z-1,TT+AX+(y-a)*z+z-1]
            if p[y,x]==255:d.rectangle(r,outline=(40,40,40));continue
            if kind=='clean':d.rectangle(r,fill=tuple(int(k) for k in sp[int(p[y,x])]),outline=(60,60,60));continue
            L=int(lab[y,x]);cc=COL.get(L,(0,0,0));d.rectangle(r,fill=cc,outline=(255,255,255) if L==STICK else (20,20,20))
            d.text(((r[0]+r[2])/2,(r[1]+r[3])/2),LET.get(L,'?'),font=fl,fill=tc(cc),anchor='mm')
    return im
def legend(W):
    im=Image.new('RGB',(W,70),(0,0,0));d=ImageDraw.Draw(im);f=F_(16);x=6;y=6
    for L in (BODY,MASK,CATCH,BLOCK,STICK,PADL,PADR,SKATE,SHADOW):
        t='%s = %s'%(LET[L],NAME[L]);w=d.textlength(t,font=f)+40
        if x+w>W:x=6;y+=30
        d.rectangle([x,y,x+24,y+24],fill=COL[L],outline=(255,255,255));d.text((x+12,y+12),LET[L],font=f,fill=tc(COL[L]),anchor='mm')
        d.text((x+30,y+3),NAME[L],font=f,fill=(255,255,255));x+=w
    return im
def run(team,f_,c_,nm):
    sp=spal(f_,c_);out=[]
    for n in FRAMES13:
        p=frame(n);lab=np.array(S[str(n)]['lab']);ys,xs=np.nonzero(p!=255);box=(ys.min(),xs.min(),ys.max()+1,xs.max()+1);w=box[3]-box[1]
        z=min(20,(1000-2*40-10)//(2*w));side=z>=14
        if not side:z=min(20,(1000-40)//w)
        d=GF[n][0][1];A=panel(p,lab,sp,box,z,'clean','%d d%d CLEAN'%(n,d));B=panel(p,lab,sp,box,z,'lab','%d LABELS (g20)'%n)
        W=max(1000 if side else A.width,A.width*2+10 if side else A.width);W=min(W,1000)
        hdr=Image.new('RGB',(W,40),(0,0,0));ImageDraw.Draw(hdr).text((6,6),'%s  frame %d  (x across top, y down left)'%(nm,n),font=F_(24),fill=(255,255,255))
        lg=legend(W)
        if side:im=Image.new('RGB',(W,40+A.height+70),(0,0,0));im.paste(A,(0,40));im.paste(B,(A.width+10,40))
        else:im=Image.new('RGB',(W,40+A.height+10+B.height+70),(0,0,0));im.paste(A,(0,40));im.paste(B,(0,50+A.height))
        im.paste(hdr,(0,0));im.paste(lg,(0,im.height-70));fn=OUT+'inspect_%s_%d.png'%(team,n);im.save(fn);out.append((fn,im.size))
    return out
if __name__=='__main__':
    for t in TEAMS:
        if t[0]=='chi_away':
            for r in run(*t):print(*r)
