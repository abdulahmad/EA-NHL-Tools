# v6 gear (pad back added, mask chin orange, blocker+mask symmetric): Fuhr pads/blocker/catcher/mask, 3 gloves, McDavid stick -- measured flats, on-sprite grids, ref|atlas|flat sheets
import build_v4 as BV,jerseys,measure_ref as M,json
from build_v4 import *
from v4_run import grid_px,row_sheet,stack,compare_sheet,fit,anchored
O='v7/'
import build_v6 as B6,build_v7 as B7;ATLAS['pad_b']=(288,368,96,128);G,P=B7.build_gear();json.dump({**G['_stick_info']},open(O+'stick_deglare.json','w'))
Image.fromarray(G['_stick_deglared']).save(O+'local_stick_deglared.png')   # derived from photo: local only (gitignored)
for nm,a in G.items():
    if not nm.startswith('_'):Image.fromarray(a).save(O+f'tex_gear_{nm}.png')
def team_atlas(k):
    s,F=BV.build_team(k);jerseys.D[k]=as_D(k,s);return atlas_from(F),Image.fromarray(F['crest'])
def paste(A,nm,a):x,y,w,h=ATLAS[nm];A.paste(Image.fromarray(a).resize((w,h),Image.NEAREST),(x,y))
def gref(nm):
    if nm=='pad_b':f,box=B6.PAD_BACK;return Image.open(M.R+f).convert('RGB').crop(box).transpose(Image.ROTATE_270)
    f,box,_,_,_=M.GEAR[nm];im=Image.open(M.R+f).convert('RGB');return im.crop(box) if box else im
# Fuhr goalie
A,crest=team_atlas('thrashers_home');sp=spritepal(team('edm'))
for nm in ('pad','pad_b','blocker','catcher','goalie_mask'):paste(A,nm,G[nm])
FR=[407,410,413,416,419,422,425,428,408,411,447,449,519,521,471,1000];ims=[];an=[]
for n in FR:
    p,part,U,V,Rg=solve(n);m=p!=255;has=Rg!='';o=sp[p].astype(float);sh=shade_of(p)[...,None];o[has]=(sample(A,p,U,V,Rg)*sh)[has]
    ims.append(toimg(np.clip(o,0,255),m,6));an.append((H[n-1][4],H[n-1][5]))
anchored(ims,an,8,scale=6).save(O+'fuhr_grid_v7.png')
row_sheet([grid_px(G[n],label=f'{n} {G[n].shape[1]}x{G[n].shape[0]}') for n in ('pad','pad_b','blocker','catcher','goalie_mask')]).save(O+'fuhr_flat_v7.png')
compare_sheet('Grant Fuhr goalie gear (measured)',[(n,gref(n),A.crop((ATLAS[n][0],ATLAS[n][1],ATLAS[n][0]+ATLAS[n][2],ATLAS[n][1]+ATLAS[n][3])),G[n]) for n in ('pad','pad_b','blocker','catcher','goalie_mask')]).save(O+'fuhr_compare.png')
# gloves
PAIR={'glove_ottawa':'blackhawks_alt','glove_redblack':'panthers_home','glove_edmonton':'thrashers_home'}
FRg=[13,17,33,221,265,339,343,630];rows=[];an=[];spt=spritepal(team('tor'));cmp=[]
for g,jk in PAIR.items():
    A,crest=team_atlas(jk);paste(A,'glove',G[g])
    for n in FRg:im,_=render3(n,A,crest,spt,jk,scale=6,pixcrest='cap');rows.append(im);an.append((H[n-1][4],H[n-1][5]))
    x,y,w,h=ATLAS['glove'];cmp.append((g,gref(g),A.crop((x,y,x+w,y+h)),G[g]))
anchored(rows,an,len(FRg),scale=6).save(O+'gloves_grid_v7.png')
row_sheet([grid_px(G[g],label=f'{g} 6x7') for g in PAIR]).save(O+'gloves_flat_v7.png');compare_sheet('Gloves (measured, cuff=top)',cmp).save(O+'gloves_compare.png')
# stick
A,crest=team_atlas('wild_home');paste(A,'stick',G['stick'])
FRs=[1,9,17,25,33,41,49,57,100,200,300,13,221,343,889,897];ims=[];an=[]
for n in FRs:im,_=render3(n,A,crest,spt,'wild_home',scale=6,pixcrest='cap');ims.append(im);an.append((H[n-1][4],H[n-1][5]))
anchored(ims,an,8,scale=6).save(O+'stick_grid_v7.png')
ref=Image.open(M.R+M.STICK2['file']).convert('RGB');deg=Image.fromarray(G['_stick_deglared'])
st=Image.fromarray(G['stick']).resize((24,26*16),Image.NEAREST);d=ImageDraw.Draw(st)
for i in range(0,st.height,16):d.line((0,i,24,i),fill=(0,0,0))
cells=[]
for t,im in (('REFERENCE (local photo)',fit(ref,416)),('DE-GLARED (shaft highlights -> base)',fit(deg,416)),('FLAT stick 1x26 (knob top)',st)):
    c=Image.new('RGB',(max(im.width,200)+20,im.height+24),(40,40,40));c.paste(im,((c.width-im.width)//2,22));ImageDraw.Draw(c).text((6,4),t,fill=(255,255,0));cells.append(c)
row_sheet(cells,bg=(40,40,40)).save(O+'local_stick_compare.png')   # contains the photo -> local only
row_sheet([cells[2]]).save(O+'stick_flat_v7.png')
print('gear done',G['_stick_info'])
