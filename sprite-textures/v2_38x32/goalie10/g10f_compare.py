# Goalie v10f (Abdul pt876u): where the Fuhr art goes. Original art with crop boxes | hi-res A/B (art crops placed in
# the region shapes before downsampling) | texel-res A/B (as used in g10e_opt*_fuhr) blown up nearest-neighbour. Local only.
from g10e_images import *
OC={'BACK':(0,200,255),'CUFF':(255,150,0),'PALM':(255,255,0),'POCKET':(255,0,255),'WEB':(255,255,255),'TRIM':(225,30,40)}
S=20
def box(d,r,c,t,lbl=True):
    d.rectangle(r,outline=(0,0,0),width=7);d.rectangle(r,outline=c,width=3)
    if lbl:d.text((r[0]+5,r[1]+3),t,font=F_(16),fill=c,stroke_width=3,stroke_fill=(0,0,0))
def hires(o):
    T,_=OPT[o];R=regions(o);_,bb=paint(o,'fuhr');w=23;im=Image.new('RGB',(w*S,9*S),(25,25,25))
    for (r,s),(a,b,c_,e) in bb.items():
        if r=='TRIM':continue
        a0=CROP[r];W,H=(e-b+1)*S,(c_-a+1)*S;cr=ART.crop(a0).resize((W,H),Image.LANCZOS)
        M=Image.new('L',(W,H),0);dm=ImageDraw.Draw(M)
        for (y,x),rr in np.ndenumerate(R):
            if rr==r and a<=y<=c_ and b<=x<=e:dm.rectangle([(x-b)*S,(y-a)*S,(x-b+1)*S-1,(y-a+1)*S-1],fill=255)
        im.paste(cr,(b*S,(a-24)*S),M)
    # outlying cells (B oval right edge cuff/stripe) and trim: flat
    d=ImageDraw.Draw(im);Pn,_=paint(o,'fuhr')
    for (y,x),rr in np.ndenumerate(R):
        if rr=='TRIM' or (rr and o=='B' and x-12>=9):d.rectangle([x*S,(y-24)*S,(x+1)*S-1,(y-23)*S-1],fill=Pn[(y,x)] if rr!='TRIM' else OC['TRIM'])
    return im,bb
def lores(o):
    Pn,bb=paint(o,'fuhr');im=Image.new('RGB',(23*S,9*S),(25,25,25));d=ImageDraw.Draw(im)
    for (y,x),c in Pn.items():d.rectangle([x*S,(y-24)*S,(x+1)*S-1,(y-23)*S-1],fill=c)
    return im,bb
def outl(im,bb):
    d=ImageDraw.Draw(im)
    for (r,s),(a,b,c_,e) in bb.items():
        if r!='TRIM':box(d,[b*S,(a-24)*S,(e+1)*S-1,(c_-23)*S-1],OC[r],r)
    return im
def main():
    W=1000;G=40;art=ART.resize((512,432),Image.LANCZOS);da=ImageDraw.Draw(art)
    for r,a in CROP.items():box(da,[a[0]*2,a[1]*2,a[2]*2,a[3]*2],OC[r],r)
    pan=[]
    for o in 'AB':
        h,bb=hires(o);l,_=lores(o);pan.append((o,outl(h,bb),outl(l,bb)))
    H=60+432+40+2*(9*S+80)+70;im=Image.new('RGB',(W,H),(0,0,0));d=ImageDraw.Draw(im)
    d.text((8,6),'1  Original Grant Fuhr art - crop box per texture region',font=F_(24),fill=(255,255,255))
    im.paste(art,(8,44))
    lx=540;ly=50
    for i,t in enumerate(['Each coloured box = the art area','squeezed into that region:']+['  %s'%r for r in CROP]+['TRIM (147/148 texels) is not','cropped: flat red 225,30,40','','Texel = 20x20 display px in 2-5.','Hi-res = crop resized to the region','then masked to its texels.','Sprite-size = 1 art sample per texel','(colour at texel centre).']):
        c=OC.get(t.strip(),(255,255,255));d.text((lx,ly+i*24),t,font=F_(18),fill=c)
    y=44+432+20
    for k,(o,h,l) in enumerate(pan):
        n1,n2=(2,4) if o=='A' else (3,5)
        nm='A: v4 rectangle' if o=='A' else 'B: back rect + front oval'
        d.text((8,y),'%d  Option %s HI-RES'%(n1,nm),font=F_(20),fill=(255,255,255));d.text((8+h.width+G,y),'%d  Option %s SPRITE-SIZE (x20)'%(n2,o),font=F_(20),fill=(255,255,255))
        im.paste(h,(8,y+30));im.paste(l,(8+h.width+G,y+30));y+=30+h.height+40
    im=im.crop((0,0,W,y));im.save(OUT+'g10f_fuhr_compare.png');print(im.size)
if __name__=='__main__':main()
