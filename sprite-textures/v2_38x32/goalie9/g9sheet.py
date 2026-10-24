# Contact sheets of the top candidates per piece (local only: they contain game sprite renders). CHI HOME palette.
from g9scan import *
from PIL import Image,ImageDraw,ImageFont
OUT='/workspace/preview_v2/goalie9/';sp=spal('HOME.json','chi')
B=lambda s:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',s)
OUTL=(255,221,0)   # high-luminance yellow, with a black inner/outer rim: readable for all common colour-vision types on white/red gear
NAMES={'padF_L':'PAD FRONT  goalie LEFT','padF_R':'PAD FRONT  goalie RIGHT','padB_L':'PAD BACK  goalie LEFT','padB_R':'PAD BACK  goalie RIGHT',
 'pad_side':'PAD SIDE (near leg)','blocker_face':'BLOCKER FACE','catcher_face':'CATCHER FACE','mask_front':'MASK FRONT','mask_side':'MASK SIDE','mask_back':'MASK BACK'}
CW,CH,K=160,196,6
def cell(c):
    p=frame(c['frame']);h,w=p.shape;S=max(2,min(5,150//max(w,h)))
    o=np.zeros((h,w,3),np.uint8);o[:]=(60,100,70);m=p!=255;o[m]=sp[p[m]]
    im=Image.fromarray(o).resize((w*S,h*S),Image.NEAREST);dr=ImageDraw.Draw(im);Q=set(map(tuple,c['q']))
    for col,wd in (((0,0,0),4),(OUTL,2)):
        for (y,x) in Q:
            for dy,dx,seg in ((-1,0,((x,y),(x+1,y))),(1,0,((x,y+1),(x+1,y+1))),(0,-1,((x,y),(x,y+1))),(0,1,((x+1,y),(x+1,y+1)))):
                if (y+dy,x+dx) not in Q:dr.line([(a*S,b*S) for a,b in seg],fill=col,width=wd)
    return im
def sheet(name,pieces,Rk):
    W=CW*K;Hh=sum(40+CH for _ in pieces);im=Image.new('RGB',(W,Hh),(18,18,18));dr=ImageDraw.Draw(im);y=0
    for pc in pieces:
        dr.text((6,y+6),NAMES[pc],fill=(255,255,255),font=B(24));y+=40
        for i,c in enumerate(Rk[pc][:K]):
            x=i*CW;ci=cell(c);im.paste(ci,(x+(CW-ci.width)//2,y+34+(150-ci.height)//2))
            dr.text((x+4,y),f"{c['frame']} d{c['d']}",fill=(255,221,0),font=B(26))
            dr.text((x+CW-30,y+4),f"#{i+1}",fill=(200,200,200),font=B(16))
            dr.text((x+4,y+CH-18),f"{c['anim'][3:]} {c['px']}px s{c['score']:.2f}",fill=(220,220,220),font=B(12))
        y+=CH
    im.save(OUT+name);print(name,im.size)
if __name__=='__main__':
    Rk=ranked(candidates())
    sheet('g9_pads_chi_home.png',['padF_L','padF_R','padB_L','padB_R','pad_side'],Rk)
    sheet('g9_gloves_chi_home.png',['blocker_face','catcher_face'],Rk)
    sheet('g9_mask_chi_home.png',['mask_front','mask_side','mask_back'],Rk)
