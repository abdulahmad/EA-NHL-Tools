import sys,numpy as np;from PIL import Image,ImageDraw,ImageFont;sys.path.insert(0,'/workspace/preview_v2/mapped')
from ctrlsheet import load;import ctrl
F=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',20);BG=(40,40,40)
Tex=np.array(Image.open('/workspace/preview_v2/raw/stripe_diagnostic_v2.png').convert('RGB')).astype(int)
cols=[]
for tag,f in [('BEFORE (best-fit offset)','/workspace/preview_v2/mapped/v2map.py'),('AFTER (centre-contiguous)','/workspace/preview_v2/mapped/v2map2.py')]:
    NS=load(f);G=NS['G'];team=('AWAY.json','chi');sp=G['ALLP'][team];R=G['ramps'](sp)
    A2=NS['A2'][897];cb=ctrl.render(NS,897,A2,Tex,R,sp);q=NS['MAPS'][897][0];h,w=q.shape
    a=np.zeros((h,w,3),np.uint8);a[:]=BG;m=(cb>=0).all(2);a[m]=cb[m]
    spr=Image.fromarray(a).resize((w*8,h*8),Image.NEAREST)
    used=set(A2.values());t=(Tex*0.3).astype(np.uint8)
    for (x,v) in used:t[v,x]=Tex[v,x]
    tim=Image.fromarray(t).resize((38*10,32*10),Image.NEAREST);d=ImageDraw.Draw(tim)
    for (x,v) in used:d.rectangle([x*10,v*10,x*10+9,v*10+9],outline=(255,255,255))
    cols.append((tag,spr,tim,len(used)))
W=2*max(cols[0][2].width,cols[0][1].width)+30;H=40+cols[0][1].height+40+cols[0][2].height+40
S=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(S)
for i,(tag,spr,tim,nu) in enumerate(cols):
    x=10+i*(W//2);d.text((x,8),tag,fill='white',font=F);S.paste(spr,(x,40));y=40+spr.height+8
    d.text((x,y),f'texels used: {nu} (bright, boxed)',fill='white',font=F);S.paste(tim,(x,y+30))
S.save('/workspace/preview_v2/mapped/anthem_897_centre_rule.png');print(S.size)
