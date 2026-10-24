# Skate texture v1: dedicated texel families per in-game skate index (0 boot black, 8 boot grey, 28 blade steel-blue, 31 blade dark, 1 highlight white)
import os,sys,collections,json,numpy as np
os.environ['PARTS']='socks,helmet,gloves'          # skates handled here
s=open('/workspace/preview_v2/mapped/v2map3.py').read();s=s[:s.index('# ---- verification')];NS={};exec(s,NS)
sys.path.insert(0,'/workspace/preview_v2/mapped');import ctrl
from PIL import Image,ImageDraw,ImageFont
G,MAPS,TF,FR,A2,NZ,FAM2=NS['G'],NS['MAPS'],NS['TF'],NS['FR'],NS['A2'],NS['NZ'],NS['FAM2'];oz=NS['ozone']
PAT={28:[None,0,0,0],29:[1,0,0,8],30:[0,0,8,28],31:[None,31,28,None]}   # per foot, foot cols base..base+3
SKF={}
for z,off in (('legF',0),('legB',20)):
    for base in (4,11):
        for v,pat in PAT.items():
            for i,ix in enumerate(pat if base==4 else pat[::-1]):   # right foot mirrored
                t=(base+off+i,v)
                if ix is not None:assert FAM2.get(t)=='gear' and NZ[t]==z,t;SKF[t]=ix
assert set(SKF)=={t for t,f in FAM2.items() if f=='gear' and NZ.get(t) in('legF','legB')}
def tg(z,v,ix):
    for dv in (0,1,-1,2,-2,3,-3):
        ts=sorted(x for (x,vv),i in SKF.items() if vv==v+dv and i==ix and NZ[(x,vv)]==z)
        if ts:return ts,v+dv,dv
STRETCH=collections.Counter();FB=collections.Counter()
for n in FR:
    q,A,L,fx=MAPS[n];grp=collections.defaultdict(list)
    for p,(u,v) in A.items():
        if TF[(u,v)]=='gear' and oz(u,v) in('legF','legB'):grp[(oz(u,v),v,int(q[p]))].append(p)
    for (z,v,ix),ps in grp.items():
        ts,tv,dv=tg(z,v,ix);FB[dv!=0]+=len(ps)
        xs=np.array([p[1] for p in ps]);us=np.array([A[p][0] for p in ps])
        sg=1 if len(ps)<3 or np.std(xs)==0 or np.std(us)==0 or np.corrcoef(xs,us)[0,1]>=0 else -1
        ps.sort(key=lambda p:(A[p][0],sg*p[1],p[0]));m,nT=len(ps),len(ts)
        if m<=nT:
            o=(nT-m)//2
            for i,p in enumerate(ps):A2[n][p]=(ts[o+i],tv)
        else:
            STRETCH[(z,ix)]+=1;per=[m//nT]*nT
            for k in sorted(range(nT),key=lambda j:abs(j-(nT-1)/2))[:m-sum(per)]:per[k]+=1
            k=0
            for j,c in enumerate(per):
                for _ in range(c):A2[n][ps[k]]=(ts[j],tv);k+=1
TEAMS=[('HOME.json','tor'),('AWAY.json','nyr'),('HOME.json','chi'),('AWAY.json','chi'),('HOME.json','mtl')]
def skin(team,real=False):
    o,ims,T=ctrl.diff(NS,A2,team);sp=G['ALLP'][team];T=T.copy()
    REAL={0:(18,18,20),8:(60,60,64),28:(176,180,190),31:(110,112,120),1:(240,240,244)}
    for (x,v),ix in SKF.items():T[v,x]=REAL[ix] if real else sp[ix]
    return o,ims,T,sp
RES={};SKD={}
for team in TEAMS:
    o,ims,T,sp=skin(team);sd={}
    for n in FR:
        q,A,L,fx=MAPS[n];cb,_=ims[n];bad=0
        for p,(u,v) in A.items():
            if TF[(u,v)]=='gear' and oz(u,v) in('legF','legB'):
                x,vv=A2[n][p];cb[p]=T[vv,x];bad+=tuple(cb[p])!=tuple(sp[q[p]])
        sd[n]=bad
    RES[team]={n:o[n]['diff'] for n in FR};SKD[team]=sd
print('ctrl',RES);print('skate',SKD);print('stretch',dict(STRETCH),'fallback px',dict(FB))
OUT='/workspace/preview_v2/skates'
_,_,Tt,_=skin(('HOME.json','chi'));_,_,Tr,_=skin(('HOME.json','chi'),True)
for nm,T in (('test',Tt),('realistic',Tr)):
    full=np.full((32,38,3),252,np.uint8);full[:,:,1]=0
    for (x,v) in SKF:full[v,x]=T[v,x]
    Image.fromarray(full).save(f'{OUT}/skate_texture_{nm}.png')
json.dump(dict(pattern={str(k):v for k,v in PAT.items()},families={f'{x},{v}':i for (x,v),i in SKF.items()},ctrl=str(RES),skate=str(SKD)),open(f'{OUT}/skate_layout.json','w'),indent=1)
# sheet: texture left, frames + diff (yellow on dim) right, chicago home
F=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',18);Fs=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',14)
o,ims,T,sp=skin(('HOME.json','chi'))
for n in FR:
    q,A,L,fx=MAPS[n];cb,_=ims[n]
    for p,(u,v) in A.items():
        if TF[(u,v)]=='gear' and oz(u,v) in('legF','legB'):x,vv=A2[n][p];cb[p]=T[vv,x]
z=12;crop=lambda TT:Image.fromarray(np.where(np.isin(np.arange(38),list(range(3,16))+list(range(23,36)))[None,:,None],TT,40).astype(np.uint8)[27:32]).resize((38*z,5*z),Image.NEAREST)
W=1000;Im=Image.new('RGB',(W,700),(40,40,40));d=ImageDraw.Draw(Im)
d.text((6,6),'SKATE TEXTURE v1 - control diff 0 on 11 frames x 5 teams',fill='white',font=F)
NAMES={0:'0 boot',8:'8 boot grey',28:'28 blade',31:'31 blade dk',1:'1 hilite'}
for k,(TT,lab) in enumerate(((T,'test colours (= in-game indices)'),(Tr,'realistic default'))):
    y=40+k*(5*z+50);d.text((6,y),lab+'  rows 27-31',fill='white',font=Fs);Im.paste(crop(TT),(6,y+18))
    dd=ImageDraw.Draw(Im)
    for (x,v),ix in SKF.items():dd.text((6+x*z+1,y+18+(v-27)*z),{0:'0',8:'8',28:'B',31:'D',1:'H'}[ix],fill=(255,230,0),font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',10))
    d.text((6,y+18+5*z+2),'legF (front)'+' '*30+'legB (back)',fill='white',font=Fs)
y=40+2*(5*z+50)
for s_ in ['letters: 0=boot black, 8=boot grey,','B=blade (28), D=blade dark (31),','H=highlight (1)','frames: in-game / v1 skate /','diff (yellow = wrong, none)']:d.text((6,y),s_,fill='white',font=Fs);y+=18
X0=38*z+20;cw=(W-X0)//4;yy=40
for i,n in enumerate(FR):
    q,A,L,fx=MAPS[n];m=q!=255;h,w=q.shape;sc=2
    a=np.zeros((h,w,3),np.uint8);a[:]=40;a[m]=sp[q[m]];cb,_=ims[n];b=a.copy();b[m]=np.clip(cb[m],0,255)
    dm=(a*0.3).astype(np.uint8);bad=m&(np.abs(b.astype(int)-a).sum(2)>0);dm[bad]=(255,230,0)
    x0=X0+(i%4)*cw;y0=yy+(i//4)*215
    d.text((x0,y0),f'{n}: {int(bad.sum())} wrong',fill='white',font=Fs)
    for j,im in enumerate((a,b,dm)):Im.paste(Image.fromarray(im[max(0,h-32):]).resize((w*sc,min(h,32)*sc),Image.NEAREST),(x0,y0+18+j*(64+4)))
Im=Im.crop((0,0,W,yy+3*215));Im.save(f'{OUT}/skate_sheet.png');print(Im.size)
