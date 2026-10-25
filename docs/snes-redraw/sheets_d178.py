import sys
from stages import *
from facing import gdir
from PIL import Image,ImageDraw
from skel_labels import draw_labels
it=dict(name='it5',k=5,snap=True,R=4,dil=2,n=300,leaf=1,head=True,sil=True)
met,convert=run(it);print(met,flush=True)
BPC={1:'#ffffff',2:'#56b4e9',3:'#0072b2',4:'#e69f00',5:'#f0e442',6:'#cc79a7',7:'#9a8cff',8:'#9ad0f0',9:'#5a5a5a',10:'#bdbdbd',11:'#a0662a',12:'#2a2a2a'}
NAMES={1:'head',2:'torso',3:'pelvis',4:'upper arm',5:'forearm',6:'hand',7:'thigh',8:'shin',9:'skate',10:'shaft',11:'blade',12:'other'}
hx=lambda c:tuple(int(c[i:i+2],16) for i in(1,3,5))
def partimg(a,PT,J,k):
    H,W=a.shape;im=Image.new('RGB',(W*k,H*k),(60,60,60));d=ImageDraw.Draw(im)
    for y,x in zip(*np.nonzero(a)):
        p=PT[y,x];c=hx(BPC.get(p%100,'#2a2a2a'));d.rectangle((x*k,y*k,x*k+k-1,y*k+k-1),fill=c)
        if p>=100:d.line((x*k,y*k+k-1,x*k+k-1,y*k),fill=(255,255,255) if p%100 in(9,3,11) else (0,0,0),width=1)
    for p_,q_ in BONES:d.line((J[p_][0]*k,J[p_][1]*k,J[q_][0]*k,J[q_][1]*k),fill=(0,0,0),width=2)
    for v in J.values():d.rectangle((v[0]*k-2,v[1]*k-2,v[0]*k+2,v[1]*k+2),fill=(255,224,0),outline=(0,0,0))
    draw_labels(d,J,BONES,k,W*k,H*k,11)
    return im
def rgbim(rgb,k):return Image.fromarray(rgb).resize((rgb.shape[1]*k,rgb.shape[0]*k),0)
crop=lambda a:a[np.ix_((a>0).any(1),(a>0).any(0))]
def sheet(items,title,cols,path,k=3,note=''):
    CW=[max(ims[c].width for _,ims in items)+16 for c in range(len(cols))];X0=[150+sum(CW[:c]) for c in range(len(cols))];cw=0;ch=max(max(i.height for i in ims) for _,ims in items)+12;lw=150
    W=lw+sum(CW)+10;H=95+len(items)*ch+190
    im=Image.new('RGB',(W,H),(20,20,20));d=ImageDraw.Draw(im);d.text((10,8),title,fill='white',font=font(21))
    for c,h in enumerate(cols):
        cx=X0[c]+CW[c]//2
        for i,hl in enumerate(h.split('|')):d.text((cx,44+i*18),hl,fill='white',font=font(15),anchor='mm')
        d.line((X0[c]+4,72,X0[c]+CW[c]-4,72),fill='white',width=2)
    for r,(lab,ims) in enumerate(items):
        y=82+r*ch;d.multiline_text((8,y+ch//2-30),lab,fill='white',font=font(14))
        for c,t in enumerate(ims):im.paste(t,(X0[c]+(CW[c]-t.width)//2,y+(ch-t.height)//2))
    y=H-125;d.text((10,y),'Legend (parts column): ',fill='white',font=font(14));x=210
    for p in range(1,13):
        if x>W-110:x=10;y+=24
        d.rectangle((x,y+2,x+14,y+16),fill=hx(BPC[p]),outline=(200,200,200));d.text((x+18,y),NAMES[p],fill='white',font=font(13));x+=18+int(d.textlength(NAMES[p],font=font(13)))+12
    y+=26;d.text((10,y),'Diagonal line = right side. Yellow square = joint. Black lines = skeleton.\nNames: yellow = bone, white = joint (same as editor key N).',fill='white',font=font(13))
    d.multiline_text((10,y+40),note,fill=(230,230,230),font=font(13));im.save(path);print(path,im.size)
GL=lambda n:gdir(n)[0]
items=[];seen=set()
for p in sorted(TE,key=lambda p:p['g']):
    if p['grp']!='skatewp':continue
    td=GL(p['g'])
    if td in seen:continue
    seen.add(td);a=A['S94'][p['s']];r=convert(a);G=A['G94'][p['g']];C,_=place(r['O'],G);sc=score(C,G)
    items.append((f"S{p['s']}/G{p['g']}\ndir {td} (pred {r['dir']})\nfam {sc[1]:.0%}\nhead G{r['head']['n'] if r['head'] else '-'}",
        [rgbim(rgbS(a),3),partimg(np.pad(a,6),np.pad(r['PT'],6),{q:(v[0]+6,v[1]+6) for q,v in r['J'].items()},6),rgbim(rgbG(crop(r['O'])),3),rgbim(rgbG(G),3)]))
sheet(items,'D178 held-out skatewp (unseen)',['94 SNES','skeleton|+ parts','converted','real 94G'],'/workspace/snesredraw/d178_val_skatewp.png',
      note='One frame per direction (n-1)//5 that has a 94G skeleton.\nfam = colour-family agreement with real 94G.')
# exclusives: nearest 94G pose = reference only, same facing
GD={n:(GL(n) if GL(n) is not None else int(fclf.predict([feat(g,1)])[0])) for n,g in A['G94'].items() if pl(g)}
items=[];chk=[]
for s in(196,527,800):
    a=A['S94'][s];r=convert(a);Ss=sscale(a)
    cand=[(off_align(Ss,A['G94'][n])[0],n) for n,d in GD.items() if d==r['dir']];iou,n=max(cand)
    chk.append(dict(s=s,dir=r['dir'],ref=n,ref_dir=GD[n],same=GD[n]==r['dir'],disc=r['disc'],head=r['head']))
    items.append((f"S{s}\nfacing dir {r['dir']}\nref G{n} dir {GD[n]}\nhead G{r['head']['n'] if r['head'] else '-'}",
        [rgbim(rgbS(a),3),partimg(np.pad(a,6),np.pad(r['PT'],6),{q:(v[0]+6,v[1]+6) for q,v in r['J'].items()},6),rgbim(rgbG(crop(r['O'])),3),rgbim(rgbG(A['G94'][n]),3)]))
sheet(items,'D178 SNES-only frames (no warp to the reference)',['94 SNES','skeleton|+ parts','converted','94G ref|(same facing)'],'/workspace/snesredraw/d178_exclusives.png',
      note='The 94G reference is only for heads and facing.\nThe converted frame keeps the SNES pose.')
json.dump(dict(metrics=met,exclusive_checks=chk),open('d178_sheet_checks.json','w'),indent=1,default=int);print(chk)
