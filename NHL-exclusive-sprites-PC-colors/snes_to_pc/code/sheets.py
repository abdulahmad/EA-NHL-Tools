import sys;sys.path.insert(0,'/workspace/snes-to-pc')
from s2g import *
from pal import SPB,GPB,BG
from pcexp import *
import percolor,pickle,json,os
from PIL import Image,ImageDraw,ImageFont
OUT='/workspace/snes-to-pc/out/'
FB=lambda n:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',n)
INK=(15,15,25);PAPER=(250,250,252);LINE=(60,60,80)
def img(a,P,empty):
    o=np.zeros(a.shape+(3,),np.uint8);o[:]=BG;m=(a!=empty)&(a>=0);o[m]=P[np.clip(a[m],0,255)];return Image.fromarray(o)
def sheet(rows,cols,title,path,legend_frames,W=1000,labw=118):
    """rows: list of (label, [arrays per col])  cols: list of (letter, caption, palette, empty)"""
    n=len(cols);cw=(W-labw-8)//n
    mw=max(a.shape[1] for _,arrs in rows for a in arrs);z=max(1,min(5,cw//(mw+1)))
    hdr=118;rowh=[max(max(a.shape[0] for a in arrs)*z+16,88) for _,arrs in rows]
    # legend
    gl=sorted({int(v) for _,arrs in rows for v in np.unique(arrs[1]) if v>0})   # genesis style slots (col B)
    fams={}
    for _,arrs in rows:
        c=arrs[2]
        for v in np.unique(c[c!=255]):
            f=percolor.lab(int(v));fams.setdefault(f,collections.Counter())[int(v)]+=int((c==v).sum())
    legH=200+ (18*((len(fams)+2)//3))
    H=hdr+sum(rowh)+legH
    im=Image.new('RGB',(W,H),PAPER);dr=ImageDraw.Draw(im)
    dr.text((8,6),title,fill=INK,font=FB(18))
    for j,(L,cap,pal,emp) in enumerate(cols):
        x0=labw+j*cw
        dr.text((x0+cw//2-22,26),L,fill=INK,font=FB(60))
        dr.text((x0+4,92),cap,fill=INK,font=FB(12))
    dr.line((0,hdr-4,W,hdr-4),fill=LINE,width=2)
    y=hdr
    for (lab,arrs),rh in zip(rows,rowh):
        dr.text((6,y+rh//2-22),lab[0],fill=INK,font=FB(14));dr.text((6,y+rh//2-4),lab[1],fill=INK,font=FB(11))
        for q,t_ in enumerate(lab[2:]):dr.text((6,y+rh//2+12+q*13),t_,fill=INK,font=FB(10))
        for j,(a,(L,cap,pal,emp)) in enumerate(zip(arrs,cols)):
            t=img(a,pal,emp).resize((a.shape[1]*z,a.shape[0]*z),Image.NEAREST)
            x0=labw+j*cw;im.paste(t,(x0+(cw-t.width)//2,y+(rh-t.height)//2))
        dr.line((0,y+rh,W,y+rh),fill=(190,190,205));y+=rh
    # legend
    dr.rectangle((0,y,W,H),fill=(235,235,242));dr.text((8,y+6),'PALETTE LEGEND (Boston home)  zoom x%d'%z,fill=INK,font=FB(14))
    dr.text((8,y+28),'B = Genesis slot numbers used here (swatch + number). Slot 34 outline, 38/39 skin, 46 stick, 47 ice.',fill=INK,font=FB(12))
    xx=8;yy=y+50
    for v in gl:
        dr.rectangle((xx,yy,xx+22,yy+22),fill=tuple(int(c) for c in GPB[v]),outline=INK,width=2);dr.text((xx+3,yy+25),str(v),fill=INK,font=FB(11));xx+=38
        if xx>W-40:xx=8;yy+=40
    yy+=48;dr.text((8,yy),'C / E = 95 PC zone names (swatch = most used index of that zone on this sheet)',fill=INK,font=FB(12));yy+=20
    items=sorted(fams.items());col=0
    for k,(f,c) in enumerate(items):
        v=c.most_common(1)[0][0];cx=8+(k%3)*330;cy=yy+(k//3)*18
        dr.rectangle((cx,cy,cx+16,cy+14),fill=tuple(int(q) for q in BOS[v]),outline=INK,width=2);dr.text((cx+22,cy),f'{f} (#{v})',fill=INK,font=FB(11))
    im=im.crop((0,0,W,max(yy+18*((len(items)+2)//3)+10,0)+0));im.save(path);print(path,im.size);return im
import collections
rows=pickle.load(open(OUT+'rows.pkl','rb'))
COLS3=[('A','94 SNES (BOS)',SPB,0),('B','Genesis style',GPB,0),('C','95 PC style (BOS)',BOS,255)]
def r3(f):r=rows[f];return ((f'S{f}',r['label']),[r['S'],r['B'],r['C']])
order=list(rows)
groups=[('sheet1_skaters_boards',order[0:4]),('sheet2_skaters_crosscheck_benchcheck_stanley_pump',order[4:8]),('sheet3_skaters_celebrate_skate_stumble',order[8:11]),('sheet4_goalies_a',order[11:14]),('sheet5_goalies_b',order[14:16])]
for k,(nm,ch) in enumerate(groups):
    sheet([r3(f) for f in ch],COLS3,f'SNES-exclusive 94 -> Genesis style -> 95 PC zones ({k+1}/{len(groups)})',OUT+'sheets/'+nm+'.png',None)

# ---- check sheet
import pickle
per=pickle.load(open(OUT+'../oof_eval_per.pkl','rb'));OOF=pickle.load(open(OUT+'../oof_B.pkl','rb'))
PR=percolor.PR
from pcexp import convert_93,spit_rt,png_rt
import pandas as pd
m=pd.read_csv('/workspace/snes-to-pc/../snes-style-compare/measurements.csv').set_index('s94')
CK=[86,250,321,489,667,167]
crow=[];CKO={}
for f in CK:
    p=per[f];g=p['g'];G=A['G94'][g].astype(int);S=A['S94'][f];B=OOF[f];C=convert_93(B).astype(np.int16);E=AP['PC'][p['pc']+1]
    ok=(spit_rt(C),png_rt(C,OUT+f'check_pc_idx/s94_{f}_pc_idx.png') if os.path.isdir(OUT+'check_pc_idx') or os.makedirs(OUT+'check_pc_idx') is None else 0)
    np.save(OUT+f'check_pc_idx/s94_{f}_g94style.npy',B);np.save(OUT+f'check_pc_idx/s94_{f}_pcidx.npy',C)
    CKO[f]=dict(g94=g,pc=p['pc'],label=m.loc[f,'label'],s2g=p['s2g'],e2e=p['e2e'],g2pc=p['g2pc'],hyb=p['hyb'],rt=ok)
    e=p['e2e'];lab=(f'S{f}->G{g}',m.loc[f,'label'],'B/D idx %d%%'%round(100*p['s2g']['exact_union']),'C/E col %d%%'%round(100*e[0]/e[3]),'D/E col %d%%'%round(100*p['g2pc'][0]/p['g2pc'][3]))
    crow.append((lab,[S,B,C,G,E]))
COLS5=[('A','94 SNES',SPB,0),('B','Genesis style',GPB,0),('C','95 PC style',BOS,255),('D','real 94G',GPB,0),('E','real 95 PC',BOS,255)]
sheet(crow[:3],COLS5,'CHECK: matched SNES frames with real 94G and 95 PC (1/2)',OUT+'sheets/check1_skaters.png',None)
sheet(crow[3:],COLS5,'CHECK: matched SNES frames with real 94G and 95 PC (2/2)',OUT+'sheets/check2_skater_goalies.png',None)
json.dump({str(k):{kk:vv for kk,vv in v.items()} for k,v in CKO.items()},open(OUT+'../check_frames.json','w'),indent=1,default=lambda o:o.item() if hasattr(o,'item') else str(o))
