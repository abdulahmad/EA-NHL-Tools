from PIL import Image,ImageDraw
import numpy as np
from uv import ATLAS
COL={'torso_front':(230,230,230),'torso_back':(210,210,230),'sleeve':(225,225,235),'sleeve_b':(215,215,230),'pants':(40,40,160),'sock':(230,230,230),'sock_b':(215,215,230),'helmet':(240,240,240),'glove':(200,30,30),'skate':(30,30,30),'goalie_mask':(240,200,0),'pad':(250,140,20),'blocker':(200,30,160),'catcher':(20,170,60)}
def region(nm,kind,w,h):
    if kind=='uv':
        a=np.zeros((h,w,3),np.uint8);a[...,0]=np.linspace(0,255,w)[None];a[...,1]=np.linspace(0,255,h)[:,None];a[...,2]=60;return Image.fromarray(a)
    if kind=='checker':
        yy,xx=np.mgrid[0:h,0:w];c=((xx*4//w)+(yy*4*w//h//w if False else (yy*max(2,round(4*h/w))//h)))%2
        a=np.where(c[...,None]==0,[240,240,240],[30,30,200]).astype(np.uint8);return Image.fromarray(a)
    im=Image.new('RGB',(w,h),COL[nm]);d=ImageDraw.Draw(im)
    if kind=='candy' and nm.split('_')[0] in ('torso','sleeve','sock'):
        step=max(w,h)//5
        for k in range(-2*h,2*w,step):d.polygon([(k,h),(k+step//2,h),(k+step//2+h,0),(k+h,0)],fill=(200,20,40))
    if kind=='design':
        if nm.startswith('torso'):
            d.rectangle([0,int(h*.45),w,int(h*.52)],fill=(20,40,170));d.rectangle([0,int(h*.80),w,int(h*.94)],fill=(20,40,170))
        if nm.startswith('sleeve'): d.rectangle([0,int(h*.42),w,int(h*.68)],fill=(20,40,170))
        if nm.startswith('sock'): d.rectangle([0,int(h*.4),w,int(h*.7)],fill=(20,40,170))
    return im
def base(kind):
    im=Image.new('RGB',(512,512),(25,25,25))
    for nm,(x,y,w,h) in ATLAS.items(): im.paste(region(nm,kind,w,h),(x,y))
    return im
def labelled(im):
    im=im.copy();d=ImageDraw.Draw(im)
    for nm,(x,y,w,h) in ATLAS.items():
        d.rectangle([x,y,x+w-1,y+h-1],outline=(255,255,0))
        for t in (0.25,0.5,0.75):d.line([x+int(w*t),y,x+int(w*t),y+h-1],fill=(255,255,0));d.line([x,y+int(h*t),x+w-1,y+int(h*t)],fill=(255,255,0))
        d.rectangle([x+1,y+1,x+6*len(nm)+3,y+11],fill=(0,0,0));d.text((x+3,y+1),nm,fill=(255,255,255))
    d.text((340,470),'U ->  (left..right of part)',fill=(255,255,255));d.text((340,484),'V down (neck/shoulder/waist -> end)',fill=(255,255,255))
    return im
