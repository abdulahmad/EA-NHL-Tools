# Layout v6 diagram + default texture (CHI HOME colours) at 24x, block names, mask wrap strip angles.
import sys,os,pickle,numpy as np;from PIL import Image,ImageDraw,ImageFont
K=pickle.load(open('/tmp/g6_canon.pkl','rb'));GL,ST=K['GL'],K['CAGE']
tex=np.asarray(Image.open('/workspace/preview_v2/goalie6/default_gear_chi_home.png').convert('RGB'))
B=lambda s:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',s)
z=24;W=38*z+20;H=32*z+150
NAME={'padF_L':'PAD FRONT\nR leg','padF_R':'PAD FRONT\nL leg','padB_L':'PAD BACK\nL leg','padB_R':'PAD BACK\nR leg','blocker':'BLOCKER','catcher':'CATCHER','mask':'MASK wrap strip'}
for mode in ('layout','texture'):
    Im=Image.new('RGB',(W,H),(30,30,30));d=ImageDraw.Draw(Im)
    d.text((10,6),'Goalie gear layout v6 (38x32)' if mode=='layout' else 'Default gear texture v6 (CHI HOME colours)',fill='white',font=B(28))
    d.text((10,44),'pads: col = angle around leg, row = knee->toe | mask: col = angle around head (front centred) | gloves: box',fill=(255,230,0),font=B(15))
    ox,oy=10,80
    if mode=='texture':
        t=tex.copy();Im.paste(Image.fromarray(t).resize((38*z,32*z),Image.NEAREST),(ox,oy))
    for k,(x,y,w,h) in GL.items():
        r=[ox+x*z,oy+y*z,ox+(x+w)*z-1,oy+(y+h)*z-1]
        if mode=='layout':d.rectangle(r,fill=(70,70,70),outline='white',width=3);d.multiline_text(((r[0]+r[2])/2,(r[1]+r[3])/2),NAME[k]+f'\n{w}x{h}',fill='white',font=B(20),anchor='mm',align='center')
        else:d.rectangle(r,outline=(255,230,0),width=3)
    x,y=GL['mask'][:2]
    for j,(c,lab) in enumerate(((0,'back'),(3,'R side'),(6,'FRONT'),(9,'L side'),(12,'back'))):
        cx=ox+(x+c)*z
        d.line([cx,oy+y*z,cx,oy+(y+7)*z+6+18*(j%2)],fill=(255,230,0),width=2)
        d.text((cx+3,oy+(y+7)*z+4+18*(j%2)),lab,fill=(255,230,0),font=B(14))
    r=[ox+ST[0]*z,oy+ST[1]*z,ox+ST[0]*z+z-1,oy+ST[1]*z+z-1];d.rectangle(r,outline=(255,120,220) if mode=='layout' else (255,230,0),width=3);d.text((r[2]+4,r[1]),'strap 135',fill='white',font=B(14))
    if Im.width>1000:Im=Im.resize((1000,int(Im.height*1000/Im.width)),Image.NEAREST)
    Im.save(f'/workspace/preview_v2/goalie6/{"goalie_layout_v6" if mode=="layout" else "default_gear_texture_v6_big"}.png');print(Im.size)
