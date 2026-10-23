# v4 driver: flats + atlases + grids + comparison sheets + metrics
import build_v4 as BV,json,glob,numpy as np
from build_v4 import *
import jerseys,measure_ref as M
O='v4/'
FR=[1,9,17,25,33,41,49,57,100,200,300,889,897,1080,409,980]
sp=spritepal(team('tor'));anc=lambda n:(H[n-1][4],H[n-1][5])
def grid_px(a,S=14,label=''):
    im=Image.fromarray(a).resize((a.shape[1]*S,a.shape[0]*S),Image.NEAREST);d=ImageDraw.Draw(im)
    for x in range(0,im.width,S):d.line((x,0,x,im.height),fill=(0,0,0))
    for y in range(0,im.height,S):d.line((0,y,im.width,y),fill=(0,0,0))
    c=Image.new('RGB',(max(im.width,100),im.height+18),(30,30,30));c.paste(im,((c.width-im.width)//2,18));ImageDraw.Draw(c).text((2,3),label,fill=(240,240,240));return c
def row_sheet(cells,pad=12,bg=(30,30,30)):
    W=sum(c.width for c in cells)+pad*(len(cells)+1);Hh=max(c.height for c in cells)+2*pad;S=Image.new('RGB',(W,Hh),bg);x=pad
    for c in cells:S.paste(c,(x,(Hh-c.height)//2));x+=c.width+pad
    return S
def stack(rows,bg=(30,30,30)):
    W=max(r.width for r in rows);S=Image.new('RGB',(W,sum(r.height for r in rows)),bg);y=0
    for r in rows:S.paste(r,((W-r.width)//2,y));y+=r.height
    return S
def fit(im,h):return im.resize((max(1,round(im.width*h/im.height)),h),Image.LANCZOS)
def compare_sheet(title,rows,H_=260):
    """rows: [(label, ref PIL, atlas PIL, flat ndarray)] -> 3 centred columns REFERENCE | ATLAS (512) | FLAT."""
    cells=[[fit(r,H_),fit(a,H_),Image.fromarray(f).resize((max(1,round(f.shape[1]*H_/f.shape[0])),H_),Image.NEAREST)] for _,r,a,f in rows]
    CW=[max(c[i].width for c in cells)+40 for i in range(3)];S=Image.new('RGB',(150+sum(CW),40+len(rows)*(H_+34)),(40,40,40));d=ImageDraw.Draw(S)
    d.text((8,10),title,fill='white');x=150
    for i,t in enumerate(['REFERENCE (local photo)','ATLAS 512 (measured spec)','FLAT @ sprite capacity']):d.text((x+(CW[i]-len(t)*6)//2,10),t,fill=(255,255,0));x+=CW[i]
    for r,(lab,_,_,f) in enumerate(rows):
        y=40+r*(H_+34);d.text((8,y+H_//2),f'{lab}\n{f.shape[1]}x{f.shape[0]}',fill='white');x=150
        for i,im in enumerate(cells[r]):S.paste(im,(x+(CW[i]-im.width)//2,y+14));x+=CW[i]
    return S
CROPS={'torso_front':(105,0,222,130),'torso_back':(240,40,360,175),'sleeve':(330,50,430,135),'sock':(58,82,96,196)}
TCROPS={'torso_front':(30,30,84,90),'torso_back':(30,30,84,90),'sleeve':(30,32,48,86),'sock':(44,116,62,166)}
if __name__=='__main__':
    mets={};cache={}
    for k in jerseys.D:
        s,F=BV.build_team(k);_,Fh=BV.build_team(k,hi=True)
        A=atlas_from(F);Ah=atlas_from(dict(Fh,torso_front_crest=None) if False else Fh)
        # hi-res atlas: paste crest (LANCZOS-free, nearest) at measured V on the front torso
        x,y,w,h=ATLAS['torso_front'];cr=Image.fromarray(F['crest']);cw=int(w*.42);ch=round(cw*cr.height/cr.width)
        Ah.paste(cr.resize((cw,ch),Image.NEAREST),(x+(w-cw)//2,y+int(s['crest']['v_centre']*h-ch/2)))
        A.save(O+f'{k}_cap_atlas.png');Ah.save(O+f'{k}_atlas.png')
        jerseys.D[k]=as_D(k,s);crest=Image.fromarray(F['crest'])
        sheet=[grid_px(F['torso_front_crest'],label='torso_front 12x15'),grid_px(F['torso_back'],label='torso_back 12x15'),grid_px(F['crest'],label=f"crest {F['crest'].shape[1]}x{F['crest'].shape[0]}"),
               grid_px(F['sleeve'],label='sleeve 8x14'),grid_px(F['sock'],label='sock 6x10'),grid_px(F['pants'],label='pants 14x9'),grid_px(F['helmet'],label='helmet 6x6'),grid_px(F['glove'],label='glove 6x7')]
        row_sheet(sheet).save(O+f'{k}_flat.png')
        for nm in ('torso_front_crest','torso_back','sleeve','sock','crest','pants'):Image.fromarray(F[nm]).save(O+f'tex_{k}_{nm}.png')
        ims=[]
        for n in FR:im,_=render3(n,A,crest,sp,k,pixcrest='cap');ims.append(im);cache[(k,n)]=im
        anchored(ims,[anc(n) for n in FR],8).save(O+f'{k}_grid_v4.png')
        ref=Image.open('jerseys/ref/'+jerseys.D[k]['ref']).convert('RGB');C=TCROPS if k=='thrashers_home' else CROPS;dy=0 if k=='thrashers_home' else M.DY[k]
        sh=lambda b:(b[0],b[1]+dy,b[2],b[3]+dy)
        rows=[(nm,ref.crop(sh(C[nm])),Ah.crop((ATLAS[nm][0],ATLAS[nm][1],ATLAS[nm][0]+ATLAS[nm][2],ATLAS[nm][1]+ATLAS[nm][3])),F['torso_front_crest' if nm=='torso_front' else nm]) for nm in C]
        rows.append(('crest',ref.crop(s['crest']['box']),ref.crop(s['crest']['box']),F['crest']))
        compare_sheet(jerseys.D[k]['name'],rows).save(O+f'{k}_compare.png')
    json.dump({},open(O+'.done','w'))
