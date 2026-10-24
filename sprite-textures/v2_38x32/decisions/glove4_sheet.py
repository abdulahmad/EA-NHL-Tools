import json,pickle,collections,numpy as np
from PIL import Image,ImageDraw,ImageFont
F=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',20);Fs=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',15)
R=[json.load(open(f'glove4_{w}.json')) for w in (0,1)];K=[pickle.load(open(f'/tmp/glove4_{w}.pkl','rb')) for w in (0,1)]
def strip(FAM2,steal):
    z=24;a=np.full((7,38,3),40,np.uint8)
    for (x,v),f in FAM2.items():
        if 16<=v<=22:a[v-16,x]=(255,215,0) if f=='gear' else (90,90,110) if f.startswith('pants') else (70,70,70)
    im=Image.fromarray(a).resize((38*z,7*z),Image.NEAREST);d=ImageDraw.Draw(im)
    for x in range(39):d.line([x*z,0,x*z,7*z],fill=(30,30,30))
    for (x,v) in steal:d.rectangle([x*z,(v-16)*z,x*z+z-1,(v-16)*z+z-1],outline=(255,255,255),width=3)
    return im
W=38*24+20;Im=Image.new('RGB',(W,820),(40,40,40));d=ImageDraw.Draw(Im)
d.text((10,8),'GLOVE BLOCK 3 -> 4 COLUMNS (rows 18-20, 38 wide kept)',fill='white',font=F)
steal=[(3,v) for v in (18,19,20)]+[(34,v) for v in (18,19,20)]
y=44
for i,(lab,st) in enumerate((('A  BEFORE: FR cols 0-2, BR cols 35-37 (3 wide)',[]),('B  AFTER: FR cols 0-3, BR cols 34-37 (4 wide); white = taken from pants',steal))):
    d.text((10,y),lab,fill='white',font=Fs);Im.paste(strip(K[i]['FAM2'],st),(10,y+20));d.text((10,y+20+170),'rows 16-22   yellow = glove texel, blue-grey = pants',fill=(200,200,200),font=Fs);y+=225
y+=5;d.text((10,y),'Per frame: glove px / glove texels used / texels shared by 2+ px   (A -> B)',fill='white',font=Fs);y+=24
for j,n in enumerate(K[0]['FR']):
    a,b=R[0]['glove'][str(n)],R[1]['glove'][str(n)]
    d.text((10+(j%2)*470,y+(j//2)*22),f'{n}: {a[0]} px  {a[1]}->{b[1]} used  {a[2]}->{b[2]} shared',fill=(255,230,0) if b[2]<a[2] else 'white',font=Fs)
y+=6*22+10
ga,gb,pa,pb=R[0]['glove_tot'],R[1]['glove_tot'],R[0]['pants_tot'],R[1]['pants_tot']
for s_ in [f'TOTAL gloves (11 frames): shared texels {ga[2]} -> {gb[2]}  (texels used {ga[1]} -> {gb[1]})',f'Cost, pants rows 18-20: shared texels {pa[2]} -> {pb[2]}  (front 13->12, back 11->10 cols on those rows)',f'Control diff after, 5 teams x 11 frames: {sum(R[1]["ctrl"].values())} px']:d.text((10,y),s_,fill='white',font=Fs);y+=24
Im=Im.crop((0,0,W,y+10));Im.thumbnail((1000,2000));Im.save('glove4_sheet.png');print(Im.size)
