import json,collections,pickle,numpy as np
from PIL import Image,ImageDraw,ImageFont
R={int(k):v for k,v in json.load(open('/tmp/arms.json')).items()}
K=pickle.load(open('/tmp/glove4_0.pkl','rb'));MAPS=K['MAPS'];sp=K['sp'];FAM2=K['FAM2']
F=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',20);Fs=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',15);FB=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',40)
sh=lambda m,n:max(0,min(n,m-n))
summ={}
for v in (11,15):
    rs=R[v];b=sum(sh(r['m'],r['nT']) for r in rs);a=sum(sh(r['m'],r['nT']+1) for r in rs)
    af=sum(sh(r['m'],r['nT']+(r['z'] in('FR','FL'))) for r in rs)
    summ[v]=dict(groups=len(rs),overflow=sum(r['m']>r['nT'] for r in rs),frames=sorted({r['n'] for r in rs if r['m']>r['nT']}),before=b,after_all4=a,after_front_only=af,
                 by_zone=dict(collections.Counter(r['z'] for r in rs if r['m']>r['nT'])))
print(summ);json.dump(summ,open('arms_rows_11_15.json','w'),indent=1)
score=collections.Counter()
for v in (11,15):
    for r in R[v]:score[r['n']]+=sh(r['m'],r['nT'])
pick=[n for n,_ in score.most_common(4)];print(pick)
W=1000;Im=Image.new('RGB',(W,1100),(40,40,40));d=ImageDraw.Draw(Im)
d.text((10,8),'ARM ROWS 11 & 15: where pixels still share texels',fill='white',font=F)
# frames
z=5;x=10;y=44
for n in pick:
    q=MAPS[n][0];m=q!=255;a=np.zeros(q.shape+(3,),np.uint8);a[:]=40;a[m]=sp[q[m]];a=(a*0.3).astype(np.uint8)
    for v in (11,15):
        for r in R[v]:
            if r['n']!=n:continue
            c=collections.Counter(map(tuple,r['tex']))
            for p,t in zip(r['pix'],r['tex']):a[p[0],p[1]]=(255,230,0) if c[tuple(t)]>1 else ((120,170,255) if r['m']>r['nT'] else (150,150,150))
    h,w=q.shape;h2=min(h,40);a=a[:h2]
    Im.paste(Image.fromarray(a).resize((w*z,h2*z),Image.NEAREST),(x,y+22));d.text((x,y),f'{n}: {score[n]} shared',fill='white',font=Fs);x+=w*z+15
y+=22+40*z+8
for s_ in ['yellow = pixel on a texel shared with another pixel (rows 11/15 arm groups)','light blue = rest of an overflowing group,  grey = arm row 11/15 pixel, 1:1']:d.text((10,y),s_,fill='white',font=Fs);y+=20
# texture mocks rows 8-17
def mock(extra):
    zz=24;a=np.full((10,38,3),40,np.uint8)
    for (xx,v),f in FAM2.items():
        if 8<=v<=17:a[v-8,xx]=(150,150,150) if f[0] in'uaf' else (80,80,100)
    for t in extra:a[t[1]-8,t[0]]=(255,230,0)
    im=Image.fromarray(a).resize((38*zz,10*zz),Image.NEAREST);dd=ImageDraw.Draw(im)
    for xx in range(39):dd.line([xx*zz,0,xx*zz,10*zz],fill=(30,30,30))
    for v in (11,15):dd.text((2,(v-8)*zz+2),str(v),fill=(0,0,0),font=Fs)
    return im
y+=10
for lab,ex in (('A',[]),('B',[(4,11),(15,11),(4,15),(15,15)])):
    d.text((10,y),lab,fill=(255,230,0),font=FB);Im.paste(mock(ex).resize((38*22,10*22),Image.NEAREST),(70,y))
    d.text((70+38*22+8,y),'current' if lab=='A' else 'proposed',fill='white',font=Fs);y+=10*22+12
for s_ in [f"B = front arms take the FREE cells col 4 (FR) and col 15 (FL) on rows 11 and 15 only; no torso/canvas change.",
           f"Back arms: no free cell, back needs a whole column (canvas 40 or torso -1).",
           f"Row 11: {summ[11]['overflow']}/{summ[11]['groups']} arm groups overflow, {len(summ[11]['frames'])} frames, shared {summ[11]['before']} -> B {summ[11]['after_front_only']} (all 4 arms: {summ[11]['after_all4']})",
           f"Row 15: {summ[15]['overflow']}/{summ[15]['groups']} arm groups overflow, {len(summ[15]['frames'])} frames, shared {summ[15]['before']} -> B {summ[15]['after_front_only']} (all 4 arms: {summ[15]['after_all4']})",
           "Rows 8-10 and 12-14: 0 overflow.  grey = arm texel, blue-grey = torso, yellow = proposed new cell"]:
    d.text((10,y),s_,fill='white',font=Fs);y+=20
Im=Im.crop((0,0,W,y+8));Im.save('arms_rows_11_15.png');print(Im.size)
