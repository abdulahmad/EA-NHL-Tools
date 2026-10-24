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
BABY,RED=(170,215,255),(210,0,0)
A=base.copy();A[nav]=BABY;A[ora]=RED
# RED chosen so red-vs-black ~= red-vs-baby-blue (max of the min pair): 3.74 vs 3.71
OPT={'BR':('baby blue + red',A,[('baby blue','black',BABY,BLACK),('red','black',RED,BLACK),('baby blue','red',BABY,RED)])}
REF=dict(navy_black=cr(NAVY,BLACK),sky_black=cr((140,210,255),BLACK),sky_orange=cr((140,210,255),OR),orange_black=cr(OR,BLACK))
K=pickle.load(open('/tmp/glove4_1.pkl','rb'));sp=K['sp']
F=lambda z:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',z)
J={'reference':REF}
for L,(name,blk,pairs) in OPT.items():
    T=np.zeros((32,38,3),np.uint8);T[:]=(252,0,252)
    for z,(x0,mir) in ARM.items():T[18:21,x0:x0+4]=blk[:,::-1] if mir else blk
    Image.fromarray(T).save(O+f'glove_v5{L}_v2block.png')
    J[L]=dict(name=name,colours={'baby blue':BABY,'red':RED},contrast={f'{a} vs {b}':cr(c1,c2) for a,b,c1,c2 in pairs})
    W=1000;Im=Image.new('RGB',(W,1300),(40,40,40));d=ImageDraw.Draw(Im)
    d.text((10,0),'',fill=(255,230,0),font=F(80));d.text((90,4),f'GLOVES: BABY BLUE + RED',fill='white',font=F(40))
    t=[f'{a} vs {b} {cr(c1,c2)}:1' for a,b,c1,c2 in pairs];d.text((90,58),'   '.join(t[:3]),fill=(255,230,0),font=F(15));d.text((90,76),'   '.join(t[3:]),fill=(255,230,0),font=F(15))
    d.text((150,82),'A = in-game, B = glove texture.  Swatch: 4x3 glove block (cuff / palm / fingers)',fill='white',font=F(15))
    Im.paste(Image.fromarray(blk).resize((4*30,3*30),Image.NEAREST),(10,100))
    frames=[(n,K['MAPS'][n][0],{p:K['A2'][n][p] for p in K['gl'][n]}) for n in K['FR']]
    sc=4;x0=150;x,y,rh=x0,100,0
    for n,q,mp in frames:
        m=q!=255;a=np.zeros(q.shape+(3,),np.uint8);a[:]=40;a[m]=sp[q[m]];b=a.copy()
        for p,(tx,tv) in mp.items():b[p]=T[tv,tx]
        w,h=q.shape[1]*sc,q.shape[0]*sc
        if x+2*w+12>W:x=x0;y+=rh+8;rh=0
        d.text((x,y),f'{n}',fill='white',font=F(16))
        Im.paste(Image.fromarray(a).resize((w,h),Image.NEAREST),(x,y+22));Im.paste(Image.fromarray(b).resize((w,h),Image.NEAREST),(x+w+4,y+22))
        x+=2*w+16;rh=max(rh,h+22)
    Im=Im.crop((0,0,W,y+rh+10));Im.save(O+f'glove_v5{L}_sheet.png');print(L,Im.size,J[L]['contrast'])
json.dump(J,open(O+'glove_v5_contrast.json','w'),indent=1);print(REF)
