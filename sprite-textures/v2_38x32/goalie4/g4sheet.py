# usage: g3sheet.py control <teamfile> <code>  |  g3sheet.py art <texture.png> <out.png> <title>
import sys,os,json,pickle,numpy as np
sys.argv0=list(sys.argv);os.chdir('/workspace/preview_back/root/sprite-textures/out');sys.path.insert(0,'../scripts')
from lib import ZN,act,D,frame
from PIL import Image,ImageDraw,ImageFont
K=pickle.load(open(os.environ.get('PKL','/tmp/g4.pkl'),'rb'));A,FAMG,GL,CAGE=K['A'],K['FAMG'],K['GL'],K['CAGE']
FRG=[413,416,422,428,449,519,980,1000]
SH=lambda i:next((w for w in ZN.get(str(i),'').split() if w in('light','dark','medium')),'')
fam=lambda i:' '.join(w for w in ZN[str(i)].split() if w not in('light','dark','medium')) if str(i) in ZN else f'idx{i}'
FIDX={(fam(int(k)),SH(int(k))):int(k) for k in ZN}
def lev_idx(f,lv,q):
    if f.startswith('idx'):return int(f[3:])
    return FIDX.get((f,lv),FIDX.get((f,''),FIDX.get((f,'medium'),q)))
def spal(f,c):
    t=next(t for t in json.load(open(D+f)) if t['code']==c);p=act.copy().astype(int);p[128:192]=np.array(t['colors'])*4;return p[np.array(t['map'])]
B=lambda s:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',s)
mode=sys.argv[1]
if mode=='control':
    tf,code=sys.argv[2],sys.argv[3];sp=spal(tf,code);tag=f"{code}_{tf.split('.')[0].lower()}"
    tex=np.zeros((32,38,3),np.uint8);tex[:]=(252,0,252)
    for t,f in FAMG.items():tex[t[1],t[0]]=sp[lev_idx(f,'medium',0)]
    Image.fromarray(tex).save(f'/workspace/preview_v2/goalie4/default_gear_{tag}.png')
    col=lambda n,q,t,i:sp[lev_idx(FAMG[t],SH(i),i)]
    out=f'/workspace/preview_v2/goalie4/default_gear_control_{tag}.png';title=f'DEFAULT gear (seg v4), {code.upper()} {tf[:4]}'
    sprpal=sp
else:
    tex=np.asarray(Image.open(sys.argv[2]).convert('RGB'));out=sys.argv[3];title=sys.argv[4];sprpal=spal('HOME.json',os.environ.get('ATEAM','chi'))
    col=lambda n,q,t,i:tex[t[1],t[0]]
z=5;T=Image.fromarray(tex).resize((38*z,32*z),Image.NEAREST);d=ImageDraw.Draw(T)
for k,(a,b,w,h) in GL.items():d.rectangle([a*z,b*z,(a+w)*z-1,(b+h)*z-1],outline=(255,255,255),width=1)
d.rectangle([CAGE[0]*z,CAGE[1]*z,CAGE[0]*z+z-1,CAGE[1]*z+z-1],outline=(255,230,0),width=1)
sc=4;fw=max(frame(n).shape[1] for n in FRG)*sc+8;fh=max(frame(n).shape[0] for n in FRG)*sc
X0=T.width+56;W=X0+4*fw;Hb=2*(fh+8)+30;H=56+2*Hb
Im=Image.new('RGB',(W,H),(40,40,40));d=ImageDraw.Draw(Im)
tot=0;cnt={}
for i,n in enumerate(FRG):
    p=frame(n);m=p!=255;a=np.zeros(p.shape+(3,),np.uint8);a[:]=40;a[m]=sprpal[p[m]];b=a.copy()
    for q,t in A[n].items():b[q]=col(n,q,t,int(p[q]))
    cnt[n]=int((a!=b).any(2).sum());tot+=cnt[n]
    bx=i//4;x=X0+(i%4)*fw;y=56+bx*Hb
    d.text((x,y),f'{n}'+(f'  diff {cnt[n]}' if mode=='control' else ''),fill='white',font=B(18))
    for j,im in enumerate((a,b)):Im.paste(Image.fromarray(im).resize((p.shape[1]*sc,p.shape[0]*sc),Image.NEAREST),(x,y+26+j*(fh+8)))
for bx in range(2):
    y=56+bx*Hb;Im.paste(T,(4,y+26))
    for j,L in enumerate('AB'):d.text((T.width+12,y+26+j*(fh+8)+fh//2-24),L,fill=(255,230,0),font=B(44))
d.text((6,4),title+(f'   diff vs in-game: {tot} px' if mode=='control' else ''),fill='white',font=B(22))
d.text((6,32),'A = in-game   B = textured (gear from texture at left)',fill=(255,230,0),font=B(18))
if Im.width>1000:Im=Im.resize((1000,int(Im.height*1000/Im.width)),Image.NEAREST)
Im.save(out);print(out,Im.size,tot,cnt)
