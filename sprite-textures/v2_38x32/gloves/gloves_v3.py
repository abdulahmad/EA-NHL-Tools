# Brighter / high-contrast glove test textures (Abdul pt859u). Same mapping as gloves_tex.py (D27 4-wide block, D33 picks).
import os,sys,pickle,numpy as np
from PIL import Image,ImageDraw,ImageFont
V='/workspace/EA-NHL-Tools/sprite-textures/textures/v12/';O='/workspace/preview_v2/gloves/'
ARM={'FR':(0,False),'FL':(16,True),'BL':(20,False),'BR':(34,True)}
NAVY,SKY,BLUE,WHITE=(0,28,65),(140,210,255),(0,120,255),(255,255,255)
def lum(c):
    f=lambda v:(v/255/12.92) if v/255<=0.04045 else ((v/255+0.055)/1.055)**2.4
    r,g,b=map(f,c);return 0.2126*r+0.7152*g+0.0722*b
cr=lambda a,b:round((max(lum(a),lum(b))+.05)/(min(lum(a),lum(b))+.05),2)
g=np.asarray(Image.open(V+'tex_gear_glove_edmonton.png').convert('RGB')).copy()
s=g[np.ix_([1,4,7],[0,1,3,4])].copy();s[np.all(s==NAVY,2)]=SKY          # A: Edmonton with navy -> sky blue
chk=np.array([[WHITE if (x+y)%2==0 else BLUE for x in range(4)] for y in range(3)],np.uint8)   # B: white/blue checker
VAR={'brightblue':(s,f'Edmonton, navy -> sky blue {SKY}: vs black outline {cr(SKY,(0,0,0))}:1 (navy {cr(NAVY,(0,0,0))}:1), vs orange {cr(SKY,(255,77,0))}:1'),
     'hc_check':(chk,f'checker white / blue {BLUE}: contrast {cr(WHITE,BLUE)}:1, blue vs black {cr(BLUE,(0,0,0))}:1, no red/green')}
K=pickle.load(open('/tmp/glove4_1.pkl','rb'));sp=K['sp']
B=lambda z:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',z)
for name,(blk,note) in VAR.items():
    T=np.zeros((32,38,3),np.uint8);T[:]=(252,0,252)
    for z,(x0,mir) in ARM.items():T[18:21,x0:x0+4]=blk[:,::-1] if mir else blk
    Image.fromarray(T).save(O+f'glove_{name}_v2block.png')
    crop=T[17:22].copy();crop[np.all(crop==(252,0,252),2)]=(30,30,30);TC=Image.fromarray(crop).resize((38*5,5*5),Image.NEAREST)
    frames=[(n,K['MAPS'][n][0],{p:K['A2'][n][p] for p in K['gl'][n]}) for n in K['FR']]
    W=1000;Im=Image.new('RGB',(W,1400),(40,40,40));d=ImageDraw.Draw(Im)
    d.text((10,6),f'PLAYER GLOVE TEST: {name.upper()}',fill='white',font=B(24));d.text((10,38),note,fill=(255,230,0),font=B(14))
    d.text((10,60),'A = in-game   B = glove texture applied   (left: texture rows 17-21, FR | FL BL | BR)',fill=(255,230,0),font=B(16))
    sc=4;x0=210;x,y,rh=x0,90,0;rowstarts=[90]
    for n,q,mp in frames:
        m=q!=255;a=np.zeros(q.shape+(3,),np.uint8);a[:]=40;a[m]=sp[q[m]];b=a.copy()
        for p,(tx,tv) in mp.items():b[p]=T[tv,tx]
        w,h=q.shape[1]*sc,q.shape[0]*sc
        if x+2*w+12>W:x=x0;y+=rh+8;rh=0;rowstarts.append(y)
        d.text((x,y),f'{n}',fill='white',font=B(16));d.text((x,y+18),'A',fill=(255,230,0),font=B(26));d.text((x+w+4,y+18),'B',fill=(255,230,0),font=B(26))
        Im.paste(Image.fromarray(a).resize((w,h),Image.NEAREST),(x,y+48));Im.paste(Image.fromarray(b).resize((w,h),Image.NEAREST),(x+w+4,y+48))
        x+=2*w+16;rh=max(rh,h+48)
    for ys in rowstarts:Im.paste(TC,(8,ys+48))
    Im=Im.crop((0,0,W,y+rh+10));Im.save(O+f'glove_{name}_sheet.png');print(name,Im.size,note)
