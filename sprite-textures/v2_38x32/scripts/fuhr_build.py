# Fuhr (Buffalo, KEY.DB: team idx 1, #31, G) gear texture in the draft goalie layout + mapping onto 8 goalie frames
import sys,json,numpy as np
from PIL import Image,ImageDraw,ImageFont
src=open('/workspace/preview_v2/goalie/gmap.py').read();src=src[:src.index('# test texture')]
PARTS=['goalie_mask','blocker','pad','catcher'];RUN={}
for P in PARTS:
    sys.argv=['x',P];g={'__name__':'gm'};exec(src,g);RUN[P]=g
g0=RUN['pad'];spal,lev_idx,SH,S,FRG,GL=g0['spal'],g0['lev_idx'],g0['SH'],g0['S'],g0['FRG'],g0['GL']
OUT={}
for team in [('HOME.json','buf'),('AWAY.json','buf')]:
    sp=spal(*team);tex=np.zeros((32,38,3),np.uint8);tex[:]=(252,0,252)
    for P in PARTS:
        for (x,y),f in RUN[P]['FAMG'].items():
            sh='medium' if not f.startswith('idx') else '';tex[y,x]=sp[lev_idx(f,'medium',0)]
    tag=team[0][:4].lower();Image.fromarray(tex).save(f'fuhr_texture_{tag}.png')
    rend={};diff={}
    for n in FRG:
        p=S[n][0];m=p!=255;a=np.zeros(p.shape+(3,),np.uint8);a[:]=(40,40,40);a[m]=sp[p[m]];b=a.copy();bad=[]
        for P in PARTS:
            for q,tx in RUN[P]['A'][n].items():
                i=int(p[q]);c=sp[lev_idx(RUN[P]['FAMG'][tx],SH(i),i)];b[q]=c
                if tuple(c)!=tuple(sp[i]):bad.append(q)
        rend[n]=(a,b,bad);diff[n]=len(bad)
    OUT[tag]=(tex,rend,diff);print(tag,'diff',diff,'total',sum(diff.values()),'gear px',sum(sum(len(RUN[P]['A'][n]) for P in PARTS) for n in FRG))
# sheet (home): texture x14 with zone labels left; frames: in-game | Fuhr texture mapped | diff (yellow on dim)
F=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',18);Fs=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',15)
tex,rend,diff=OUT['home'];z=7;T=Image.fromarray(tex).resize((38*z,32*z),Image.NEAREST);d=ImageDraw.Draw(T)
for k,(x,y,w,h) in GL.items():
    d.rectangle([x*z,y*z,(x+w)*z-1,(y+h)*z-1],outline=(255,255,255),width=2)
    lab={'goalie_mask':'MASK','blocker':'BLOCKER','catcher':'CATCHER','pad':'PAD'}[k]
    tw=d.textlength(lab,font=Fs);d.rectangle([x*z+2,(y+h)*z-20,x*z+6+tw,(y+h)*z-3],fill=(0,0,0));d.text((x*z+4,(y+h)*z-20),lab,fill='white',font=Fs)
sc=3;fw=max(S[n][0].shape[1] for n in FRG)*sc+14;fh=max(S[n][0].shape[0] for n in FRG)*sc
cols=4;L=T.width+16;W=L+cols*fw;rows=len(FRG)//cols;bh=3*(fh+24)+28
H=max(40+T.height+120,40+rows*bh)
Im=Image.new('RGB',(W,H),(40,40,40));d=ImageDraw.Draw(Im)
d.text((6,6),f"GRANT FUHR (Buffalo home palette)  gear px wrong: {sum(diff.values())}",fill='white',font=F)
Im.paste(T,(6,40));y=40+T.height+8
for s in ['texture x7 (38x32 goalie)','magenta = unused','rows per frame: in-game /','Fuhr texture mapped /','diff: yellow = wrong']:d.text((6,y),s,fill='white',font=Fs);y+=20
for i,n in enumerate(FRG):
    a,b,bad=rend[n];c=(a*0.25).astype(np.uint8)
    for q in bad:c[q]=(255,255,0)
    x=L+(i%cols)*fw;y0=40+(i//cols)*bh;d.text((x,y0-4),f'{n}: {diff[n]} wrong',fill='white',font=Fs)
    for r,im in enumerate([a,b,c]):Im.paste(Image.fromarray(im).resize((im.shape[1]*sc,im.shape[0]*sc),Image.NEAREST),(x,y0+20+r*(fh+8)))
if W>1000:Im=Im.resize((1000,int(H*1000/W)),Image.NEAREST)
Im.save('/workspace/preview_v2/goalie/fuhr_sheet.png');print(Im.size)
Image.fromarray(tex).resize((38*10,32*10),Image.NEAREST).save('fuhr_texture_home_x10.png')
