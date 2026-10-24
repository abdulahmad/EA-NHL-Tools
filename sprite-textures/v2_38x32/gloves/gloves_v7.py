# Glove colours v7: deep purple (70,0,120) + lime (170,255,0) replace baby blue + red (still blended in). Glove mask = v6 (stick excluded).
# Glove colours v6: v5 colours, recolour restricted to glove pixels (stick blade / butt end excluded, Abdul pt863u).
# Glove pixel = index-0 pixel of the old glove set within 2 px (8-connected, through the set) of a jersey/arm pixel; index-0 runs
# attached only to the stick shaft (136) are the blade or butt end and keep their game colour.
# Glove colours v5 (Abdul pt861u: baby blue + red). Was: glove colour options v4 (Abdul pt860u: option A sky blue was liked but a colour-blind nightmare). Maximise luminance contrast
# of the glove colours against the black sprite outline AND against the orange. Same mapping as gloves_tex.py / gloves_v3.py.
import os,sys,pickle,json,numpy as np
from PIL import Image,ImageDraw,ImageFont
V='/workspace/EA-NHL-Tools/sprite-textures/textures/v12/';O='/workspace/preview_v2/gloves/'
ARM={'FR':(0,False),'FL':(16,True),'BL':(20,False),'BR':(34,True)}
NAVY,OR,BLACK,WHITE,DARK,DOR=(0,28,65),(255,77,0),(0,0,0),(255,255,255),(40,40,40),(215,65,0)
def lum(c):
    f=lambda v:(v/255/12.92) if v/255<=0.04045 else ((v/255+0.055)/1.055)**2.4
    r,g,b=map(f,c);return 0.2126*r+0.7152*g+0.0722*b
cr=lambda a,b:round((max(lum(a),lum(b))+.05)/(min(lum(a),lum(b))+.05),2)
g=np.asarray(Image.open(V+'tex_gear_glove_edmonton.png').convert('RGB'));base=g[np.ix_([1,4,7],[0,1,3,4])].copy()
nav=np.all(base==NAVY,2);ora=np.all(base==OR,2)
BABY,RED=(70,0,120),(170,255,0)   # v7 (Abdul via parent): deep purple + lime
A=base.copy();A[nav]=BABY;A[ora]=RED

OPT={'PL':('deep purple + lime',A,[('purple','black',BABY,BLACK),('lime','black',RED,BLACK),('purple','lime',BABY,RED)])}
REF=dict(navy_black=cr(NAVY,BLACK),sky_black=cr((140,210,255),BLACK),sky_orange=cr((140,210,255),OR),orange_black=cr(OR,BLACK))
K=pickle.load(open('/tmp/glove4_1.pkl','rb'));sp=K['sp']
from scipy import ndimage as ndi
def glove_only(n,R=2):
    q=K['MAPS'][n][0];G=np.zeros(q.shape,bool)
    for p in K['gl'][n]:G[p]=True
    J=ndi.binary_dilation((q>=128)&(q<=191)&~np.isin(q,[134,135,136]),np.ones((3,3)));cur=G&J;keep=cur.copy()
    for _ in range(R):cur=ndi.binary_dilation(cur,np.ones((3,3)))&G;keep|=cur
    return [p for p in K['gl'][n] if keep[p]],[p for p in K['gl'][n] if not keep[p]]
GO={n:glove_only(n) for n in K['FR']};STK={}
F=lambda z:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',z)
J={'reference':REF}
for L,(name,blk,pairs) in OPT.items():
    T=np.zeros((32,38,3),np.uint8);T[:]=(252,0,252)
    for z,(x0,mir) in ARM.items():T[18:21,x0:x0+4]=blk[:,::-1] if mir else blk
    Image.fromarray(T).save(O+f'glove_v7{L}_v2block.png')
    J[L]=dict(name=name,colours={'purple':BABY,'lime':RED},contrast={f'{a} vs {b}':cr(c1,c2) for a,b,c1,c2 in pairs})
    W=1000;Im=Image.new('RGB',(W,1300),(40,40,40));d=ImageDraw.Draw(Im)
    d.text((10,0),'',fill=(255,230,0),font=F(80));d.text((90,4),f'GLOVES v7: DEEP PURPLE + LIME',fill='white',font=F(40))
    t=[f'{a} vs {b} {cr(c1,c2)}:1' for a,b,c1,c2 in pairs];d.text((90,58),'   '.join(t[:3]),fill=(255,230,0),font=F(15));d.text((90,76),'   '.join(t[3:]),fill=(255,230,0),font=F(15))
    d.text((150,82),'A = in-game, B = glove texture.  Swatch: 4x3 glove block (cuff / palm / fingers)',fill='white',font=F(15))
    Im.paste(Image.fromarray(blk).resize((4*30,3*30),Image.NEAREST),(10,100))
    frames=[(n,K['MAPS'][n][0],{p:K['A2'][n][p] for p in GO[n][0]}) for n in K['FR']]
    sc=4;x0=150;x,y,rh=x0,100,0
    for n,q,mp in frames:
        m=q!=255;a=np.zeros(q.shape+(3,),np.uint8);a[:]=40;a[m]=sp[q[m]];b=a.copy()
        for p,(tx,tv) in mp.items():b[p]=T[tv,tx]
        w,h=q.shape[1]*sc,q.shape[0]*sc
        if x+2*w+12>W:x=x0;y+=rh+8;rh=0
        if x==x0:Im.paste(Image.fromarray(blk).resize((4*30,3*30),Image.NEAREST),(10,y+22))
        d.text((x,y),f'{n}',fill='white',font=F(16));d.text((x+w-14,y-4),'A',fill=(255,230,0),font=F(24));d.text((x+2*w-10,y-4),'B',fill=(255,230,0),font=F(24))
        Im.paste(Image.fromarray(a).resize((w,h),Image.NEAREST),(x,y+22));Im.paste(Image.fromarray(b).resize((w,h),Image.NEAREST),(x+w+4,y+22))
        st=set(map(tuple,np.argwhere(q==136)))|set(GO[n][1]);STK[n]=dict(stick_px=len(st),stick_changed=int(sum((a[p]!=b[p]).any() for p in st)),glove_px=len(GO[n][0]),excluded=len(GO[n][1]))
        x+=2*w+16;rh=max(rh,h+22)
    Im=Im.crop((0,0,W,y+rh+10));Im.save(O+f'glove_v7{L}_sheet.png');print(L,Im.size,J[L]['contrast'])
J['stick_check']=STK;print(STK);json.dump(J,open(O+'glove_v7_contrast.json','w'),indent=1);print(REF)
