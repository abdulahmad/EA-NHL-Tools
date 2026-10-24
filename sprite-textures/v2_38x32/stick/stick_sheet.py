import json,collections,numpy as np
from PIL import Image,ImageDraw,ImageFont
S={k:v for k,v in json.load(open('stick_stats.json')).items() if not v['goalie']};N=len(S)
F=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',20);Fs=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',15)
W=1000;Im=Image.new('RGB',(W,900),(40,40,40));d=ImageDraw.Draw(Im)
d.text((10,8),f'STICK PIXELS, all {N} skater frames with a stick (index 136)',fill='white',font=F)
def hist(x,y,w,h,key,title,mark=None):
    c=collections.Counter(int(round(S[k][key])) for k in S);mx=max(c.values());ks=range(0,max(c)+1);bw=w/len(ks)
    d.text((x,y),title,fill='white',font=Fs)
    for i,k in enumerate(ks):
        v=c.get(k,0);bh=int((h-70)*v/mx);col=(255,230,0) if mark and mark(k) else (120,170,255)
        d.rectangle([x+i*bw+1,y+h-20-bh,x+(i+1)*bw-2,y+h-20],fill=col)
        if len(ks)<=8 or k%5==0:d.text((x+i*bw+2,y+h-18),str(k),fill='white',font=Fs)
        if len(ks)<=8 and v:d.text((x+i*bw+2,y+h-38-bh),str(v),fill='white',font=Fs)
hist(10,40,600,260,'length','Stick length (px along shaft)  yellow = longer than 13-col strip',lambda k:k>13)
hist(640,40,340,260,'blade_w','Blade width (max px across, last 4 steps)',lambda k:k>2)
hist(10,320,300,220,'shaft_med','Shaft thickness (median)',lambda k:k>1)
hist(340,320,300,220,'shaft_max','Shaft thickness (max)',lambda k:k>2)
ln=np.array([S[k]['length'] for k in S]);bw_=np.array([S[k]['blade_w'] for k in S])
# mock textures
def strip(rows,cols,blade):
    z=22;a=np.full((rows,cols,3),40,np.uint8)
    for x in range(cols):
        for r in range(rows):a[r,x]=(200,200,200) if r<2 else (40,40,40)
    for x in range(cols-blade,cols):
        for r in range(rows):a[r,x]=(255,230,0)
    im=Image.fromarray(a).resize((cols*z,rows*z),Image.NEAREST);dd=ImageDraw.Draw(im)
    for x in range(cols+1):dd.line([x*z,0,x*z,rows*z],fill=(20,20,20))
    for r in range(rows+1):dd.line([0,r*z,cols*z,r*z],fill=(20,20,20))
    return im
y=560
d.text((10,y),'A current: 13 cols x 2 rows (rows 0-1, cols 14-26)',fill='white',font=Fs);Im.paste(strip(2,13,0),(10,y+20))
d.text((10,y+80),'B mock (NOT applied): blade end gets a 3rd row on its last 3 cols (yellow)',fill='white',font=Fs);Im.paste(strip(3,13,3),(10,y+100))
lines=[f'Blade width: 1 px {sum(bw_==1)}, 2 px {sum(bw_==2)}, 3 px {sum(bw_==3)} frames ({100*np.mean(bw_<=2):.0f}% fit in 2 rows).',
       f'Shaft is 1 px thick in {sum(1 for k in S if round(S[k]["shaft_med"])<=1)}/{N} frames.  Length: median {int(np.median(ln))}, p90 {int(np.percentile(ln,90))}, max {ln.max()}.',
       f'Longer than 13 cols (stretch shares texels): {sum(ln>13)}/{N} frames ({100*np.mean(ln>13):.0f}%).',
       'Recommendation: blade does NOT need more rows (2 rows cover 96%). If anything, length matters',
       'more: 13 cols cover the median; ~20 cols would cover p90. Only add the 3rd blade row (B) if',
       'the 3-px blades (4% of frames) look wrong in renders.']
yy=y+180
for s_ in lines:d.text((10,yy),s_,fill='white',font=Fs);yy+=20
Im=Im.crop((0,0,W,yy+10));Im.save('stick_analysis.png');print(Im.size,sum(ln>13),sum(ln>20),N)
