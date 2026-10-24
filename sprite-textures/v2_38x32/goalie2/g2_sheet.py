import sys,os,pickle,json,numpy as np
os.chdir('/workspace/preview_back/root/sprite-textures/out');sys.path.insert(0,'../scripts')
import uv;uv.WRAP_LIMBS=uv.SIDE_FIX=uv.FRONT_SMOOTH=uv.GLOVE_UV=uv.PAD_UV=True;uv.ELEV=40
from lib import act,D
from PIL import Image,ImageDraw,ImageFont
FRG=[413,416,422,428,449,519,980,1000];P=['padL','padR','goalie_mask','blocker','catcher']
GL={'padL':(0,0,9,21),'padR':(9,0,10,21),'blocker':(19,0,10,10),'catcher':(19,10,10,10),'goalie_mask':(29,0,7,6)}
K={p:pickle.load(open(f'/tmp/g2_{p}.pkl','rb')) for p in P};J={p:json.load(open(f'/workspace/preview_v2/goalie/g2_{p}.json')) for p in P}
def spal(f,c):
    t=next(t for t in json.load(open(D+f)) if t['code']==c);p=act.copy().astype(int);p[128:192]=np.array(t['colors'])*4;return p[np.array(t['map'])]
sp=spal('HOME.json','chi')
TEX=os.environ.get('TEX')
if TEX:tex=np.asarray(Image.open(TEX).convert('RGB')).copy()
else:
    tex=np.zeros((32,38,3),np.uint8);tex[:]=(252,0,252)
    HUE={'padL':(255,170,0),'padR':(80,140,255),'blocker':(255,170,0),'catcher':(80,140,255),'goalie_mask':(255,170,0)}
    for k,(a,b,w,h) in GL.items():
        for yy in range(b,b+h):
            for xx in range(a,a+w):l=0.35+0.65*(((xx-a)*5+(yy-b)*3)%9)/8;tex[yy,xx]=(np.array(HUE[k])*l).astype(np.uint8) if (xx+yy)%2 else (int(255*l),)*3
    tex[0,36]=(255,255,255)
TITLE=os.environ.get('TITLE','GOALIE pass 2: pads L/R + cage texel');OUT=os.environ.get('OUT','/workspace/preview_v2/goalie/g2_sheet.png')
F=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',18);Fs=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',14)
z=8;T=Image.fromarray(tex[:21]).resize((38*z,21*z),Image.NEAREST);d=ImageDraw.Draw(T)
for k,(a,b,w,h) in GL.items():d.rectangle([a*z,b*z,(a+w)*z-1,(b+h)*z-1],outline=(255,255,255),width=2)
for k,(a,b) in {'PAD L':(0,19),'PAD R':(9,19),'BLOCKER':(19,8),'CATCHER':(19,18),'MASK':(29,5)}.items():d.text((a*z+2,b*z-4),k,fill='white',font=Fs,stroke_width=2,stroke_fill='black')
d.rectangle([36*z,0,37*z-1,z-1],outline=(255,230,0),width=2);d.text((30*z,6*z+4),'CAGE ^',fill=(255,230,0),font=Fs,stroke_width=2,stroke_fill='black')
S={n:uv.solve(n)[0] for n in FRG};sc=2;fh=max(S[n].shape[0] for n in FRG)*sc
W=1000;cols=4;X0=T.width+14;fw=(W-X0)//cols
H=40+2*(3*(fh+4)+24)+10;Im=Image.new('RGB',(W,max(H,T.height+200)),(40,40,40));d=ImageDraw.Draw(Im)
tot={p:sum(J[p]['control_px_wrong'].values()) for p in P}
d.text((6,6),TITLE+(f'   control wrong px (5 teams): {sum(tot.values())}' if not TEX else ''),fill='white',font=F)
Im.paste(T,(6,40));y=40+T.height+8
L=os.environ.get('NOTES')
lines=L.split('|') if L else ['padL / padR shared texels',f"  (8 frames): {sum(s['shared'] for s in J['padL']['stats'].values())} / {sum(s['shared'] for s in J['padR']['stats'].values())}",'  (single pad block: 181)','mask 3 px wrong -> 0','pad 9-10 px wrong -> 0','rows per frame: in-game /','test colours / diff (yellow)']
for s_ in lines:d.text((6,y),s_,fill='white',font=Fs);y+=18
for i,n in enumerate(FRG):
    p=S[n];m=p!=255;a=np.zeros(p.shape+(3,),np.uint8);a[:]=40;a[m]=sp[p[m]];b=(a*0.3).astype(np.uint8) if not TEX else a.copy();c=(a*0.25).astype(np.uint8)
    for k in P:
        for q,(xx,yy) in K[k]['A'][n].items():b[q]=tex[yy,xx]
        for q in K[k]['BAD'][n]:c[q]=(255,230,0)
    x0=X0+(i%cols)*fw;y0=40+(i//cols)*(3*(fh+4)+24)
    bad=sum(len(K[k]['BAD'][n]) for k in P);d.text((x0,y0),f'{n}: {bad} wrong' if not TEX else f'{n}',fill='white',font=Fs)
    ims=(a,b,c) if not TEX else (a,b)
    for j,im in enumerate(ims):Im.paste(Image.fromarray(im).resize((p.shape[1]*sc,p.shape[0]*sc),Image.NEAREST),(x0,y0+20+j*(fh+4)))
Im.save(OUT)
if not TEX:Image.fromarray(tex).save('/workspace/preview_v2/goalie/goalie_test_texture_v2.png')
print(Im.size,tot)
