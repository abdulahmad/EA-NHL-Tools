# sequential first pass: socks, helmet, skates, gloves, stick. usage: python3 parts.py <part>
import os,sys,json,collections,numpy as np
from PIL import Image,ImageDraw,ImageFont
P=sys.argv[1];ORDER=['socks','helmet','skates','gloves','stick']
os.environ['PARTS']=','.join(ORDER[:ORDER.index(P)+1]-{'stick'} if False else [x for x in ORDER[:ORDER.index(P)+1] if x!='stick'])
s=open('/workspace/preview_v2/mapped/v2map3.py').read();s=s[:s.index('# ---- verification')];NS={};exec(s,NS)
sys.path.insert(0,'/workspace/preview_v2/mapped');import ctrl
TF,MAPS,FR,A2,NZ,G,DIAG=NS['TF'],NS['MAPS'],NS['FR'],NS['A2'],NS['NZ'],NS['G'],NS['DIAG']
TEAMS=[('HOME.json','tor'),('AWAY.json','nyr'),('HOME.json','chi'),('AWAY.json','chi'),('HOME.json','mtl')]
STICKIDX=136;SZ=[(x,0) for x in range(14,27)]+[(x,1) for x in range(14,27)]   # stick zone: magenta rows 0-1, cols 14-26
def stickmap(n):
    q,A,LEV,fx=MAPS[n];ps=[p for p in fx if q[p]==STICKIDX]
    if not ps:return {}
    a=np.array(ps,float);c=a.mean(0);u,s_,vt=np.linalg.svd(a-c);ax=vt[0];t=(a-c)@ax;pp=(a-c)@vt[1]
    gl=[p for p,o in A.items() if TF[o]=='gear' and NS['ozone'](*o) in('FR','FL','BL','BR')]
    if gl and np.linalg.norm(np.mean(gl,0)-a[t.argmax()])<np.linalg.norm(np.mean(gl,0)-a[t.argmin()]):t=-t   # t=0 at hand end
    steps=sorted(set(np.round(t).astype(int)));L=len(steps);out={}
    # columns along length: centre-contiguous if L<=13 else stretch evenly
    col={st:(14+(13-L)//2+i if L<=13 else 14+min(12,int(i*13/L))) for i,st in enumerate(steps)}
    byst=collections.defaultdict(list)
    for i,p in enumerate(ps):byst[int(round(t[i]))].append((abs(pp[i]),p))
    for st,l in byst.items():
        for k,(_,p) in enumerate(sorted(l)):out[p]=(col[st],min(k,1))   # lane 0 = central px, lane 1 = 2nd px (thick parts)
    return out
STK={n:stickmap(n) for n in FR} if P=='stick' else {}
def cat(n,p):
    A=MAPS[n][1]
    if p in A:return NS['category'](TF[A[p]],NS['ozone'](*A[p]))
    return 'stick' if p in STK.get(n,{}) else None
# ---- control diff (all pixels) for 5 teams; stick rendered from its texels
res={};IM={}
for t in TEAMS:
    o,ims,T=ctrl.diff(NS,A2,t);sp=G['ALLP'][t]
    for n in FR:
        cb,bad=ims[n]
        for p,(x,v) in STK.get(n,{}).items():
            cb[p]=sp[STICKIDX]   # control texture stick texel colour = game index 136 (flat, no shading in game)
        o[n]['part_diff']=sum(1 for p in bad if cat(n,p)==P)
    res[' '.join(t)]=o;IM[t]=ims
tot={k:sum(v['diff'] for v in o.values()) for k,o in res.items()};ptot={k:sum(v['part_diff'] for v in o.values()) for k,o in res.items()}
# ---- part stats
st={};fam_bad=0;zone_bad=0
for n in FR:
    q,A,LEV,fx=MAPS[n];m=STK[n] if P=='stick' else {p:A2[n][p] for p in A if cat(n,p)==P}
    for p,tx in m.items():
        if P!='stick':
            f=TF[A[p]];fam_bad+=NS['FAM2'].get(tx)!=f;zone_bad+=NZ.get(tx)!=NS['ozone'](*A[p])
    cn=collections.Counter(m.values())
    st[n]=dict(px=len(m),texels=len(cn),shared=sum(1 for c in cn.values() if c>1),dup_px=len(m)-len(cn))
zone_tex=SZ if P=='stick' else sorted({tx for n in FR for p,tx in A2[n].items() if cat(n,p)==P})
used=set(tx for n in FR for tx in (STK[n].values() if P=='stick' else [A2[n][p] for p in A2[n] if cat(n,p)==P]))
# gear shade consistency: is in-game gear index a function of shade level? (needed for texture-driven gloves/skates)
gcons=None
if P in('skates','gloves'):
    mp=collections.defaultdict(collections.Counter)
    for n in FR:
        q,A,LEV,fx=MAPS[n]
        for p in A:
            if cat(n,p)==P:mp[LEV[p]][int(q[p])]+=1
    gcons={str(k):dict(v) for k,v in sorted(mp.items())}
R=dict(part=P,parts_enabled=os.environ['PARTS'],control_total=tot,control_part=ptot,stats=st,family_mismatch=fam_bad,zone_mismatch=zone_bad,zone_texels=len(zone_tex),texels_used_any_frame=len(used),fallbacks={str(k):v for k,v in NS['FALLBACK'].items()},gear_level_to_index=gcons)
json.dump(R,open(f'/workspace/preview_v2/mapped/part_{P}.json','w'),indent=1,default=str)
print(json.dumps({k:R[k] for k in R if k!='stats'},default=str));print({n:v for n,v in st.items()})
# ---- sheet: left = part test texture (zone bright, rest dim, used texels boxed); rows: in-game | v2 (texel-ID colours on part px) | diff yellow (union of 5 teams)
F=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',18);BG=(40,40,40)
tex=DIAG.astype(int).copy()
if P in('skates','gloves','stick'):   # gear/stick have no stripe colours: give the zone a luminance+hue test pattern
    for (x,v) in zone_tex:tex[v,x]=(40+215*((x*7+v*3)%9)//8,)*3 if (x+v)%2 else (255,170-15*(x%8),0)
show=(tex*0.3).astype(np.uint8)
for (x,v) in zone_tex:show[v,x]=tex[v,x]
ti=Image.fromarray(show).resize((38*6,32*6),Image.NEAREST);d=ImageDraw.Draw(ti)
for (x,v) in used:d.rectangle([x*6,v*6,x*6+5,v*6+5],outline=(255,255,255))
team=TEAMS[0];sp=G['ALLP'][team];sc=2;h=max(MAPS[n][0].shape[0] for n in FR);w=max(MAPS[n][0].shape[1] for n in FR)+4
W=ti.width+16+len(FR)*(w*sc);W2=min(W,1000);H=34+3*(h*sc+26)+10
S=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(S)
d.text((6,6),f"{P.upper()}  control diff (5 teams, all px): {sum(tot.values())}   part px wrong: {sum(ptot.values())}",fill='white',font=F)
S.paste(ti,(4,40));d.text((4,40+ti.height+6),'test texture',fill='white',font=F);d.text((4,40+ti.height+28),'boxed = used',fill='white',font=F)
for r,name in enumerate(['in-game (Leafs)','v2: part px = test tex','diff, 5 teams']):
    y=34+r*(h*sc+26)
    for i,n in enumerate(FR):
        q,A,LEV,fx=MAPS[n];fh,fw=q.shape;a=np.zeros((fh,fw,3),np.uint8);a[:]=BG;m=q!=255
        for yy,xx in zip(*np.nonzero(m)):a[yy,xx]=sp[q[yy,xx]]
        if r==1:
            a=(a*0.35).astype(np.uint8)
            mm=STK[n] if P=='stick' else {p:A2[n][p] for p in A if cat(n,p)==P}
            for p,(x,v) in mm.items():a[p]=tex[v,x]
        if r==2:
            a=(a*0.25).astype(np.uint8)
            for t in TEAMS:
                for p in IM[t][n][1]:a[p]=(255,255,0)
        x0=ti.width+16+i*w*sc;S.paste(Image.fromarray(a).resize((fw*sc,fh*sc),Image.NEAREST),(x0,y+24))
        if r==0:d.text((x0,y+2),str(n),fill='white',font=F)
    d.text((ti.width+16,y+24+h*sc-4),'' ,fill='white')
lab=Image.new('RGB',(W,0))
S2=Image.new('RGB',(W,H+3*24),BG);S2.paste(S,(0,0));d=ImageDraw.Draw(S2)
for r,name in enumerate(['row 1: in-game (Leafs)','row 2: v2, part pixels in test-texture colours','row 3: diff vs in-game, yellow = wrong (5 teams)']):d.text((6,H+r*24),name,fill='white',font=F)
if W>1000:S2=S2.resize((1000,int(S2.height*1000/W)),Image.NEAREST)
S2.save(f'/workspace/preview_v2/mapped/part_{P}.png');print('sheet',S2.size)
