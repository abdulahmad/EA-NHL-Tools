# gloves + stick on 20 extra skater frames (approximate UV-based placement; these frames have no v5 per-texel maps)
import os,sys,collections,numpy as np
os.environ['PARTS']='socks,helmet,skates,gloves'
s=open('/workspace/preview_v2/mapped/v2map3.py').read();s=s[:s.index('# ---- verification')];NS={};exec(s,NS)
sys.path.insert(0,'../scripts');import uv;uv.WRAP_LIMBS=uv.SIDE_FIX=uv.FRONT_SMOOTH=uv.GLOVE_UV=uv.PAD_UV=True;uv.ELEV=40
from jerseys import spritepal,team
from PIL import Image,ImageDraw,ImageFont
FAM2,NZ=NS['FAM2'],NS['NZ']
FRX=[7,16,43,55,85,109,127,172,190,235,250,268,295,307,325,352,367,599,627,931]
ARMS={'FR':(0,3),'FL':(16,19),'BL':(20,23),'BR':(34,37)}
GT={z:{v:[x for x in range(a,b+1) if FAM2.get((x,v))=='gear' and NZ.get((x,v))==z] for v in (18,19,20)} for z,(a,b) in ARMS.items()}
SZ=list(range(14,27))
def place(ps,ts,v,key,out):
    ps=sorted(ps,key=key);m,nT=len(ps),len(ts)
    if m<=nT:
        o=(nT-m)//2
        for i,p in enumerate(ps):out[p]=(ts[o+i],v)
    else:
        per=[m//nT]*nT
        for k in sorted(range(nT),key=lambda j:abs(j-(nT-1)/2))[:m-sum(per)]:per[k]+=1
        k=0
        for j,c in enumerate(per):
            for _ in range(c):out[ps[k]]=(ts[j],v);k+=1
from scipy import ndimage as ndi
def maps(n):
    p,part,U,V,R=uv.solve(n);front=uv.solve.front;out={};T=np.isin(R,['torso_front','torso_back'])
    cx=np.nonzero(T)[1].mean() if T.any() else p.shape[1]/2
    lab,k=ndi.label(R=='glove',np.ones((3,3)))
    for c in range(1,k+1):
        m=lab==c;ys,xs=np.nonzero(m);left=xs.mean()<cx
        z=('FR' if left else 'FL') if front else ('BL' if left else 'BR')   # screen-left = player's right arm when facing camera
        g=collections.defaultdict(list)
        for y,x in zip(ys,xs):g[18+int(round(np.nan_to_num(V[y,x])*2))].append((y,x))
        for v,ps in g.items():place(ps,GT[z][v],v,lambda q:np.nan_to_num(U[q]),out)
    st=[(int(y),int(x)) for y,x in zip(*np.nonzero(p==136))]
    if st:
        a=np.array(st,float);c0=a.mean(0);_,_,vt=np.linalg.svd(a-c0);t=(a-c0)@vt[0];pp=(a-c0)@vt[1]
        gl=np.argwhere(R=='glove')
        if len(gl) and np.linalg.norm(gl.mean(0)-a[t.argmax()])<np.linalg.norm(gl.mean(0)-a[t.argmin()]):t=-t
        steps=sorted(set(np.round(t).astype(int)));L=len(steps)
        col={s_:(14+(13-L)//2+i if L<=13 else 14+min(12,int(i*13/L))) for i,s_ in enumerate(steps)}
        by=collections.defaultdict(list)
        for i,q in enumerate(st):by[int(round(t[i]))].append((abs(pp[i]),q))
        for s_,l in by.items():
            for kk,(_,q) in enumerate(sorted(l)):out[q]=(col[s_],min(kk,1))
    return p,out,front
DIAG=NS['DIAG'].astype(int);tex=DIAG.copy()
zone=[(x,v) for z in GT for v in GT[z] for x in GT[z][v]]+[(x,v) for x in SZ for v in (0,1)]
for (x,v) in zone:tex[v,x]=(40+215*((x*7+v*3)%9)//8,)*3 if (x+v)%2 else (255,170-15*(x%8),0)
sp=spritepal(team('chi'));F=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',18);Fs=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',15)
R={n:maps(n) for n in FRX};used=set(t for n in FRX for t in R[n][1].values())
show=(tex*0.3).astype(np.uint8)
for t in zone:show[t[1],t[0]]=tex[t[1],t[0]]
z=7;T=Image.fromarray(show).resize((38*z,32*z),Image.NEAREST);d=ImageDraw.Draw(T)
for (x,v) in used:d.rectangle([x*z,v*z,x*z+z-1,v*z+z-1],outline=(255,255,255))
d.rectangle([14*z-2,0,27*z+1,2*z+1],outline=(0,200,255),width=2);d.text((14*z,2*z+4),'STICK',fill='white',font=Fs);d.text((2,21*z+4),'GLOVES (rows 18-20)',fill='white',font=Fs)
for half,fr in enumerate([FRX[:10],FRX[10:]]):
    sc=3;fw=56*sc//1+8;cols=5;L=T.width+14;W=L+cols*(min(fw,int((1000-L)/cols)));fw=int((W-L)/cols)
    hh=[max(R[n][0].shape[0] for n in fr[i*cols:(i+1)*cols]) for i in range(2)]
    H=40+sum(2*(h*2+6)+30 for h in hh)+10;H=max(H,40+T.height+140)
    Im=Image.new('RGB',(W,H),(40,40,40));d=ImageDraw.Draw(Im)
    d.text((6,6),f'GLOVES + STICK on extra skater frames ({half+1}/2)',fill='white',font=F);Im.paste(T,(6,40))
    y=40+T.height+8
    for s_ in ['v2 texture x7','bright = glove/stick zones','white box = used','per frame: in-game (top),','glove+stick px in test','colours (bottom)']:d.text((6,y),s_,fill='white',font=Fs);y+=19
    y0=40
    for r in range(2):
        for i,n in enumerate(fr[r*cols:(r+1)*cols]):
            p,mp,front=R[n];m=p!=255;a=np.zeros(p.shape+(3,),np.uint8);a[:]=(40,40,40);a[m]=sp[p[m]];b=(a*0.3).astype(np.uint8)
            for q,(x,v) in mp.items():b[q]=tex[v,x]
            s2=min(2,(fw-6)//p.shape[1]) if p.shape[1]*2>fw-6 else 2;x0=L+i*fw
            d.text((x0,y0),f"{n} {'front' if front else 'back'}",fill='white',font=Fs)
            Im.paste(Image.fromarray(a).resize((p.shape[1]*s2,p.shape[0]*s2),Image.NEAREST),(x0,y0+20))
            Im.paste(Image.fromarray(b).resize((p.shape[1]*s2,p.shape[0]*s2),Image.NEAREST),(x0,y0+20+hh[r]*2+6))
        y0+=2*(hh[r]*2+6)+30
    Im.save(f'/workspace/preview_v2/mapped/gloves_stick_frames_{half+1}.png');print(Im.size)
print({n:(sum(1 for t in R[n][1].values() if t[1]>=18),sum(1 for t in R[n][1].values() if t[1]<=1)) for n in FRX})
