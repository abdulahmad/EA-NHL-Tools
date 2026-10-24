# LOCAL ONLY: segmentation overlay sheet -> /workspace/preview_v2/goalie14/g14_seg_<team>.png
# Okabe-Ito colours (colour-blind safe, luminance-separated; pads sky-blue vs yellow, never red next to green), one letter
# per part in every cell, skel10 bones drawn as white lines with black outline.
import sys,os,json
H14=os.path.dirname(os.path.abspath(__file__));sys.path.insert(0,H14);sys.path.insert(0,H14+'/../goalie12')
from g14seg import *
from g10c_images import F_
from PIL import Image,ImageDraw
OUT='/workspace/preview_v2/goalie14/';os.makedirs(OUT,exist_ok=True)
S=json.load(open('/tmp/g14_seg.json'));JP=json.load(open(H14+'/g14_pads.json'))['frames']
for n_,v in S.items():   # final legs: pad px that main_body dropped (not mapped, not skate) are body
    keep={tuple(map(int,k.split(','))) for r in JP[n_] for k in r['map']}|{tuple(c) for r in JP[n_] for c in r['skate_px']}
    for y,row in enumerate(v['lab']):
        for x,L in enumerate(row):
            if L in(PADL,PADR,SKATE) and (y,x) not in keep:row[x]=BODY
COL={BG:(0,0,0),BODY:(110,110,110),MASK:(255,255,255),CATCH:(25,35,120),BLOCK:(230,159,0),STICK:(0,0,0),PADL:(86,180,233),PADR:(240,228,66),SKATE:(204,121,167),SHADOW:(35,35,35)}
LET={BODY:'b',MASK:'M',CATCH:'C',BLOCK:'B',STICK:'S',PADL:'L',PADR:'R',SKATE:'K'}
def txtcol(c):return (0,0,0) if sum(c)>330 else (255,255,255)
def panel(n,sp,kind,box,z):
    p=frame(n);lab=np.array(S[str(n)]['lab']);a,b,c_,e=box;im=Image.new('RGB',((e-b)*z,(c_-a)*z),(0,0,0));d=ImageDraw.Draw(im);f=F_(max(8,z-6))
    for y in range(a,c_):
        for x in range(b,e):
            if not(0<=y<p.shape[0] and 0<=x<p.shape[1]) or p[y,x]==255:continue
            r=[(x-b)*z,(y-a)*z,(x-b)*z+z-1,(y-a)*z+z-1];L=int(lab[y,x])
            if kind=='orig':d.rectangle(r,fill=tuple(int(k) for k in sp[int(p[y,x])]));continue
            cc=COL[L];d.rectangle(r,fill=cc)
            if L==STICK:d.rectangle(r,outline=(255,255,255))
            if L in LET:d.text((r[0]+z//2,r[1]+z//2),LET[L],font=f,fill=txtcol(cc) if L!=STICK else (255,255,255),anchor='mm')
    if kind=='seg':
        J=S[str(n)]['joints'];P=lambda k:((J[k][0]-b+.5)*z,(J[k][1]-a+.5)*z)
        for A,B_,_ in BONES:
            if A!=B_:d.line([P(A),P(B_)],fill=(0,0,0),width=5);d.line([P(A),P(B_)],fill=(255,255,255),width=2)
        for k in J:x,y=P(k);d.ellipse([x-4,y-4,x+4,y+4],fill=(255,255,255),outline=(0,0,0),width=2)
    return im
def sheet(tag,f,c,nm,frames,fn):
    sp=spal(f,c);W=1000;colw=W//4;rows=[]
    for n in frames:
        p=frame(n);ys,xs=np.nonzero(p!=255);bx=(ys.min(),xs.min(),ys.max()+1,xs.max()+1);z=max(4,min(14,(colw-10)//(bx[3]-bx[1]),300//(bx[2]-bx[0])))
        rows.append((n,[panel(n,sp,k,bx,z) for k in('orig','seg')]))
    LEG=150;rh=[]
    for i in range(0,len(rows),2):rh.append(max(im.height for _,ims in rows[i:i+2] for im in ims)+36)
    H=60+LEG+sum(rh)+len(rh)*30;im=Image.new('RGB',(W,H),(0,0,0));d=ImageDraw.Draw(im)
    d.text((6,6),'%s - g14 SEGMENTATION (skel10 skeleton + index evidence, smoothed)'%nm,font=F_(22),fill=(255,255,255))
    y=44;items=[(BODY,'b body'),(MASK,'M mask'),(CATCH,'C catcher'),(BLOCK,'B blocker'),(STICK,'S stick shaft+blade'),(PADL,'L pad L'),(PADR,'R pad R'),(SKATE,'K skate'),(SHADOW,'shadow / ice spray')]
    for i,(L,t) in enumerate(items):
        x0=10+(i%3)*330;y0=y+(i//3)*34;d.rectangle([x0,y0,x0+28,y0+28],fill=COL[L],outline=(255,255,255),width=2);d.text((x0+38,y0+2),t,font=F_(20),fill=(255,255,255))
    d.text((10,y+106),'white lines/dots = skel10 bones/joints (ADJ = hand-fit joints, proj = 3D model at the frame facing)',font=F_(15),fill=(255,255,0))
    y=60+LEG
    for i in range(0,len(rows),2):
        for k,(n,ims) in enumerate(rows[i:i+2]):
            x0=k*500;d.text((x0+4,y),'ORIGINAL',font=F_(16),fill=(255,255,255));d.text((x0+colw+4,y),'SEGMENTATION',font=F_(16),fill=(255,255,0))
            d.text((x0+4,y+20),'%d d%d  %s'%(n,GF[n][0][1],S[str(n)]['src']),font=F_(17),fill=(255,255,255))
            im.paste(ims[0],(x0+4,y+46));im.paste(ims[1],(x0+colw+4,y+46))
        y+=rh[i//2]+30
    im.save(fn);print(fn,im.size,flush=True)
if __name__=='__main__':
    for t in TEAMS:sheet(*t,FRAMES13,OUT+'g14_seg_%s.png'%t[0])
