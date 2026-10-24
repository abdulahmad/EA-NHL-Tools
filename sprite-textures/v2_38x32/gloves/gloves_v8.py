# Glove sheets v8: fixed-grid layout (Abdul pt866u: align the columns). Every frame gets an identical cell (max frame w x h at x3),
# sprite bottom-aligned + horizontally centred; 3 pairs per row = 6 fixed columns A|B A|B A|B so all A's and all B's line up.
# Renders v7 deep purple + lime (glove_v7PL_*) and v8 lighter violet (150,90,255) + lime (glove_v8VL_*). Glove mask = v6/v7 (stick excluded).
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
VIO=(150,90,255);Bv=base.copy();Bv[nav]=VIO;Bv[ora]=RED

OPT={'PL':('v7','DEEP PURPLE + LIME',A,BABY,[('purple','black',BABY,BLACK),('lime','black',RED,BLACK),('purple','lime',BABY,RED)]),
     'VL':('v8','LIGHT VIOLET + LIME',Bv,VIO,[('violet','black',VIO,BLACK),('lime','black',RED,BLACK),('violet','lime',VIO,RED)])}
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
for L,(ver,name,blk,c1st,pairs) in OPT.items():
    T=np.zeros((32,38,3),np.uint8);T[:]=(252,0,252)
    for z,(x0,mir) in ARM.items():T[18:21,x0:x0+4]=blk[:,::-1] if mir else blk
    Image.fromarray(T).save(O+f'glove_{ver}{L}_v2block.png')
    J[L]=dict(name=name,file=f'glove_{ver}{L}',colours={pairs[0][0]:c1st,'lime':RED},contrast={f'{a} vs {b}':cr(c1,c2) for a,b,c1,c2 in pairs})
    sc=3;frames=[(n,K['MAPS'][n][0],{p:K['A2'][n][p] for p in GO[n][0]}) for n in K['FR']]
    CW=max(q.shape[1] for _,q,_ in frames)*sc;CH=max(q.shape[0] for _,q,_ in frames)*sc
    PG,GG,LH,X0,NP=6,30,30,145,3;PW=2*CW+PG;rows=(len(frames)+NP-1)//NP;Y0=128
    W=X0+NP*PW+(NP-1)*GG+10;H=Y0+rows*(LH+CH+16)+4
    Im=Image.new('RGB',(W,H),(40,40,40));d=ImageDraw.Draw(Im)
    d.text((10,4),f'GLOVES {ver}: {name}',fill='white',font=F(34))
    d.text((10,50),'Contrast: '+'   '.join(f'{a} vs {b} {cr(c1,c2)}:1' for a,b,c1,c2 in pairs),fill=(255,230,0),font=F(17))
    d.text((10,76),f'{pairs[0][0]} {c1st}  lime {RED}.  A = in-game, B = glove texture.  Grid cell {CW}x{CH} (x{sc}).',fill='white',font=F(14))
    d.text((10,96),'Swatch (left): 4x3 glove block (cuff / palm / fingers)',fill='white',font=F(14))
    for k,(n,q,mp) in enumerate(frames):
        r,c=divmod(k,NP);x=X0+c*(PW+GG);y=Y0+r*(LH+CH+16)
        if c==0:Im.paste(Image.fromarray(blk).resize((4*30,3*30),Image.NEAREST),(10,y+LH+(CH-90)//2))
        m=q!=255;a=np.zeros(q.shape+(3,),np.uint8);a[:]=40;a[m]=sp[q[m]];b=a.copy()
        for p,(tx,tv) in mp.items():b[p]=T[tv,tx]
        w,h=q.shape[1]*sc,q.shape[0]*sc
        d.rectangle([x-1,y+LH-1,x+PW,y+LH+CH],outline=(80,80,80))
        d.line([x+CW+PG//2,y+LH,x+CW+PG//2,y+LH+CH],fill=(80,80,80))
        d.text((x+PW//2-20,y),f'#{n}',fill='white',font=F(20))
        d.text((x+4,y),'A',fill=(255,230,0),font=F(26));d.text((x+PW-22,y),'B',fill=(255,230,0),font=F(26))
        ox,oy=(CW-w)//2,CH-h
        Im.paste(Image.fromarray(a).resize((w,h),Image.NEAREST),(x+ox,y+LH+oy));Im.paste(Image.fromarray(b).resize((w,h),Image.NEAREST),(x+CW+PG+ox,y+LH+oy))
        st=set(map(tuple,np.argwhere(q==136)))|set(GO[n][1]);STK.setdefault(L,{})[n]=dict(stick_px=len(st),stick_changed=int(sum((a[p]!=b[p]).any() for p in st)),glove_px=len(GO[n][0]),excluded=len(GO[n][1]))
    Im.save(O+f'glove_{ver}{L}_sheet.png');print(L,Im.size,J[L]['contrast'],'stick changed',sum(v['stick_changed'] for v in STK[L].values()))
J['stick_check']=STK;json.dump(J,open(O+'glove_v8_contrast.json','w'),indent=1);print(REF)
