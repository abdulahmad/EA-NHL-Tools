# LOCAL ONLY renders -> /workspace/preview_v2/goalie12/g12_pads_{before,after}_<team>.png (Option A pads == Option B pads)
import sys,os,json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from g12pad import *
from g11_images import tex_rgb
from g10c_images import F_
OUT='/workspace/preview_v2/goalie12/';BG=(70,70,70)
def maps():
    R={}
    for n in PADFRAMES:
        p=frame(n);old=map_frame(n,'A')[0];pix=set();new={}
        for g,q in pad_parts(n):
            qq=[c for c in q if is_pad(int(p[c]))];pix|=set(qq)
            t,k,mir,M,TP=solve(p,qq)
            for c in qq:
                tt=M.get(c);v=int(TP[tt]) if tt and TP[tt]!=TRANS else None;new[c]=(v,classify(p,c,tt,TP))
        bef={c:(old[c][0],old[c][1]) for c in pix if c in old}
        R[n]=(pix,bef,new);print(n,flush=True)
    return R
def draw(n,sp,pix,m,z,err,before):
    p=frame(n);ys=[y for y,x in pix];xs=[x for y,x in pix];a,b,c_,e=min(ys)-1,min(xs)-1,max(ys)+2,max(xs)+2
    im=Image.new('RGB',((e-b)*z,(c_-a)*z),BG);d=ImageDraw.Draw(im);bad=0
    for y in range(a,c_):
        for x in range(b,e):
            if not(0<=y<p.shape[0] and 0<=x<p.shape[1]):continue
            s=int(p[y,x])
            if s==255:continue
            cc=tuple(sp[s]);wrong=False
            if m is not None and (y,x) in pix:
                v,l=m.get((y,x),(None,'none'))
                if before:wrong=l in('exp1','exp2','diff') or l=='none'
                else:wrong=l!='ok'
                if v is not None and l not in('shade','outzone'):cc=tuple(sp[s]) if (v==WHITE and s in g10match.WHITESET) else tuple(sp[181 if v==WHITE else v])
            r=[(x-b)*z,(y-a)*z,(x-b)*z+z-1,(y-a)*z+z-1];d.rectangle(r,fill=tuple(int(k) for k in cc))
            if err and wrong:bad+=1;d.rectangle(r,outline=(255,255,255),width=2);d.rectangle([r[0]+2,r[1]+2,r[2]-2,r[3]-2],outline=(0,0,0),width=1)
    return im,bad
def sheet(R,tag,f,c,nm,before):
    sp=spal(f,c);z=7;tex=tex_rgb('A',sp,8).crop((0,9*8,13*8,23*8));LW=tex.width+14;W=1000;colw=(W-LW)//3
    lab='BEFORE (v12 mapping)' if before else 'AFTER (cylinder per-row UV)'
    hd=('ORIGINAL\n95 PC PALETTE','%s\nTEXTURE APPLIED'%lab,'%s\nERRORS MARKED'%lab)
    rows=[]
    for n in PADFRAMES:
        pix,bef,new=R[n];m=bef if before else new
        i0,_=draw(n,sp,pix,None,z,0,before);i1,_=draw(n,sp,pix,m,z,0,before);i2,bad=draw(n,sp,pix,m,z,1,before);rows.append((n,bad,[i0,i1,i2]))
    rh=[max(i.height for i in ims)+30 for _,_,ims in rows];H=60+sum(rh)+(len(rows)//4+1)*60+40
    im=Image.new('RGB',(W,H),(0,0,0));d=ImageDraw.Draw(im)
    tot=sum(b for _,b,_ in rows)
    d.text((6,6),'%s pads - %s - strict errors %d'%(nm,lab,tot),font=F_(22),fill=(255,255,255))
    d.text((4,44),'pad texture\n(front | strip)',font=F_(14),fill=(255,255,0));im.paste(tex,(4,84))
    y=44;cols=((255,255,255),(255,255,0),(0,220,255))
    for i,((n,bad,ims),h) in enumerate(zip(rows,rh)):
        if i%4==0:
            for k,t in enumerate(hd):d.text((LW+k*colw+2,y),t,font=F_(17),fill=cols[k],spacing=2)
            y+=60
        d.text((LW+2,y),'%d d%d %s'%(n,GF[n][0][1],orient(n)),font=F_(16),fill=(255,255,255))
        d.text((LW+2*colw+2,y),'strict errors %d'%bad,font=F_(16),fill=(0,220,255))
        for k,ii in enumerate(ims):im.paste(ii,(LW+k*colw+2,y+24))
        y+=h
    d.text((LW,H-34),'white box = strict error on a pad px (before: shade px not counted by old\nmatcher; after: shading counts as gear, D98)',font=F_(13),fill=(255,255,255))
    fn=OUT+'g12_pads_%s_%s.png'%('before' if before else 'after',tag);im.save(fn);print(fn,im.size,tot,flush=True)
if __name__=='__main__':
    R=maps()
    for t in TEAMS[:2]:
        for b in (1,0):sheet(R,*t,b)
