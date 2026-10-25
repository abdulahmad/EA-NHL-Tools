from conv import *
FG[46]=5
import pickle,json
rf,imap=pickle.load(open('/tmp/snes_rf.pkl','rb'));data=pickle.load(open('/tmp/snes_pairs.pkl','rb'))
from scipy.ndimage import binary_dilation
def convert(S):
    X,_=feats(S);m=binary_dilation(S>0,iterations=2).ravel();o=np.zeros(S.size,int);o[m]=rf.predict(X[m]);o=o.reshape(S.shape);keep=(S>0)&(o==0);o[keep]=[imap.get(int(v),int(v)) for v in S[keep]];return o
BG=(60,60,60)
def tile(rgb,k):
    return Image.fromarray(rgb).resize((rgb.shape[1]*k,rgb.shape[0]*k),0)
def sheet(items,title,path,cols,k=3,note=''):
    # items: (label, [arrays rgb]) ; two blocks side by side
    cw=max(max(a.shape[1] for a in arrs) for _,arrs in items)*k+14
    ch=max(max(a.shape[0] for a in arrs) for _,arrs in items)*k+10
    lw=120;nb=2 if len(items)>4 else 1;per=-(-len(items)//nb)
    W=nb*(lw+3*cw)+20;H=110+per*ch+60
    im=Image.new('RGB',(W,H),(20,20,20));d=ImageDraw.Draw(im)
    d.text((10,8),title,fill='white',font=font(22))
    for b in range(nb):
        x0=10+b*(lw+3*cw)
        for c,h in enumerate(cols):
            cx=x0+lw+c*cw+cw//2;d.text((cx,60),h,fill='white',font=font(17),anchor='mm');d.line((x0+lw+c*cw+4,74,x0+lw+(c+1)*cw-4,74),fill='white',width=2)
        for r,(lab,arrs) in enumerate(items[b*per:(b+1)*per]):
            y=84+r*ch;d.multiline_text((x0,y+ch//2-25),lab,fill='white',font=font(15))
            for c,a in enumerate(arrs):
                t=tile(a,k);im.paste(t,(x0+lw+c*cw+(cw-t.width)//2,y+(ch-t.height)//2))
    d.text((10,H-40),note,fill=(230,230,230),font=font(14))
    im.save(path);print(path,im.size)
crop=lambda a:a[np.ix_((a>0).any(1),(a>0).any(0))] if (a>0).any() else a
# validation: one held-out skatewp frame per direction (frames 2-41 = 8 dirs x 5)
V=json.load(open('validation.json'))['per'];bydir={}
for s,g,grp,iou,b,r in V:
    if grp=='skatewp':bydir.setdefault((s-2)//5,(s,g,r))
items=[]
for dr in sorted(bydir):
    s,g,r=bydir[dr];S,G,_,_=data[(s,g)]
    items.append((f'dir {dr+1}\nS{s}/G{g}\nfam {r[2]:.0%}',[rgbS(crop(A["S94"][s])),rgbG(crop(convert(S))),rgbG(crop(A['G94'][g]))]))
sheet(items,'Held-out skatewp, all 8 directions (Leafs home)','/workspace/snesredraw/val_skatewp.png',['94 SNES','converted','real 94G'],
      note='fam = colour-family agreement vs real 94G. Grey = transparent. No highlight overlays.')
ex=[(196,192),(527,36),(800,800)]
items=[]
for s,g in ex:
    S=scale(A['S94'][s]);items.append((f'S{s}\nnearest\nG{g}',[rgbS(crop(A['S94'][s])),rgbG(crop(convert(S))),rgbG(crop(A['G94'][g]))]))
sheet(items,'SNES-only frames converted to 94G style','/workspace/snesredraw/exclusives.png',['94 SNES','converted','nearest 94G pose'],k=4,
      note='Nearest pose is from the census (no true match exists).')
