# Automated stripe checks (Abdul pt784u) + skeleton overlays. Usage (from sprite-textures/out):
#   PYTHONPATH=../scripts python3 ../scripts/playerlayout/stripe_checks_v5.py <out>/v5/frames [before frames_v5.json]
# Checks per frame on the pixel->texel map (texel row v, figure column w = u front / 27-u back):
#  kink     : a scan line through a segment (torso: each column top->bottom; arm: each line along its dominant axis) whose texel-row
#             sequence reverses direction (goes 9,10,12,11 ...) or (torso) steps back up. A clean stripe never wiggles.
#  run>1    : two adjacent pixels on such a scan line with the same texel row, for rows WE choose (jersey 9-13, upper arm 8-11, forearm
#             15-17). Split into 'capacity' (the segment is longer than the template rows, row clamped at 9/13/8/11/15/17) and 'other'.
#  contiguity red flag: 4-neighbour sprite pixels of the same body segment whose texels are > 2 apart in v or w (a run of skipped
#             texels). Seams between figures (front/back/side panel) are listed separately.
import sys,os,json,runpy,collections,numpy as np
from PIL import Image,ImageDraw,ImageFont
H=os.path.dirname(os.path.abspath(__file__));OUT=sys.argv[1];BEFORE=sys.argv[2] if len(sys.argv)>2 else None
sys.argv=['x','/tmp/_v5chk',os.path.join(os.path.dirname(OUT),'textures')];G=runpy.run_path(f'{H}/frames_v5.py')
SEGS,MAPS,FRAMES,DIRS,TF=G['SEGS'],G['MAPS'],G['FRAMES'],G['DIRS'],G['TF'];import seg_v5 as S
ONE=lambda f:f not in('jersey','upper arm','forearm','gear','skin','helmet') and not f.startswith('pants') and not f.startswith('socks')
CHOSEN={'jersey':(9,13),'upper arm':(8,11),'forearm':(15,17)}
def wv(uv):
    u,v=uv;return ('F',u,v) if u<14 else ('B',27-u,v) if u<28 else ('S',u,v)
def lines(P,ids,fam,geo=None):
    """scan lines through the pixels of part ids: torso columns; arms along the dominant axis of the segment."""
    px=[p for p,i in P.items() if i in ids]
    if not px:return []
    ys=[p[0] for p in px];xs=[p[1] for p in px]
    horiz=bool(geo and geo.get('scan')=='rows')
    L=collections.defaultdict(list)
    for p in px:L[p[0] if horiz else p[1]].append(p)
    out=[]
    for k,ps in L.items():
        ps.sort(key=lambda p:p[1] if horiz else p[0]);run=[ps[0]]
        for a,b in zip(ps,ps[1:]):
            if (b[1]-a[1] if horiz else b[0]-a[0])==1:run.append(b)
            else:out.append(run);run=[b]
        out.append(run)
    return out
SEGIDS={'torso':{2,3},'R upper arm':{4},'L upper arm':{5},'R lower arm':{6},'L lower arm':{7}}
def check(n,A):
    sg=SEGS[n];P,fam=sg['part'],sg['fam'];R=dict(kink_forced=0,kink=0,run_capacity=0,run_other=0,red_flags=0,seams=0,kink_at=[],run_at=[],flag_at=[])
    for nm,ids in SEGIDS.items():
        for ln in lines(P,ids,fam,sg['geo'].get(nm)):
            ln=[p for p in ln if p in A]
            vs=[A[p][1] for p in ln];d=[b-a for a,b in zip(vs,vs[1:]) if b!=a]
            rev=sum(1 for a,b in zip(d,d[1:]) if (a>0)!=(b>0))+(sum(1 for t in d if t<0) if nm=='torso' else 0)
            if rev:   # forced = every reversing pixel's family has texels on ONE row only (yoke/waist/arm stripe/crest index): game-zone scatter
                fx=[fam[p] for p in ln];mid=[i for i in range(1,len(vs)) if vs[i]!=vs[i-1]]
                forced=all(ONE(fx[i]) or ONE(fx[i-1]) for i in mid if i>=1 and ((vs[i]<vs[i-1]) if nm=='torso' else True))
                R['kink_forced' if forced else 'kink']+=1;R['kink_at'].append([nm,[list(p) for p in ln],vs,fx,'forced' if forced else 'mapping'])
            for a,b in zip(ln,ln[1:]):
                f=fam[a]
                if A[a][1]==A[b][1] and fam[b]==f and f in CHOSEN:
                    cap=A[a][1] in CHOSEN[f];R['run_capacity' if cap else 'run_other']+=1;R['run_at'].append([nm,list(a),list(b),A[a][1],'capacity' if cap else 'other'])
    for (y,x),uv in A.items():
        for b in ((y+1,x),(y,x+1)):
            if b not in A or P.get(b)!=P.get((y,x)) or P.get(b) in(0,1,16,10,11,12,13,14,15,17,8,9):continue   # torso + arms (textured stripes)
            fa,wa,va=wv(uv);fb,wb,vb=wv(A[b])
            if fa!=fb:R['seams']+=1;continue
            if abs(wa-wb)>2 or abs(va-vb)>2:R['red_flags']+=1;R['flag_at'].append([list((y,x)),list(b),list(uv),list(A[b])])
    return R
AFTER={n:MAPS[n][1] for n in FRAMES}
res={'after':{n:check(n,AFTER[n]) for n in FRAMES}}
if BEFORE:
    bj=json.load(open(BEFORE))['maps'];res['before']={n:check(n,{(int(k.split(',')[1]),int(k.split(',')[0])):tuple(v) for k,v in bj[str(n)].items()}) for n in FRAMES}
json.dump(res,open(f'{OUT}/stripe_checks_v5.json','w'),indent=1,default=int)
for t in res:
    print(t,{n:(r['kink'],r['kink_forced'],r['run_other'],r['run_capacity'],r['red_flags']) for n,r in res[t].items()},'totals kink/kink_forced/run_other/run_capacity/red_flags',
          [sum(r[k] for r in res[t].values()) for k in('kink','kink_forced','run_other','run_capacity','red_flags')])
# ---- stretch math (PROPOSAL ONLY, NOT applied - Abdul: no stretching without approval): geometric rows a segment spans in the sprite
# vs the template rows it has. need>have = rows clamped (repeated) at the end of the template range; factor = have/need would remove them.
SP={}
for n in FRAMES:
    sg=SEGS[n];fam=sg['fam'];o={}
    jr=[r for p,r in sg['trow'].items() if fam[p]=='jersey']
    if jr:o['jersey']=dict(sprite_rows=[min(jr),max(jr)],need=max(jr)-min(jr)+1,have=5,template_rows=[9,13])
    for k,g in sg['geo'].items():
        if 'raw_rows' in g:lo,hi=g['raw_rows'];o[k]=dict(sprite_rows=[lo,hi],need=hi-lo+1,have=g['template_rows'][1]-g['template_rows'][0]+1,template_rows=g['template_rows'])
    for k,v in o.items():v['factor']=round(v['have']/v['need'],2) if v['need']>v['have'] else 1.0
    SP[n]=o
json.dump(SP,open(f'{OUT}/stretch_proposal_v5.json','w'),indent=1,default=int)
for n,o in SP.items():print('stretch',n,{k:(v['need'],v['have'],v['factor']) for k,v in o.items() if v['factor']<1})
# ---- overlays
FONT=ImageFont.load_default()
def overlay(n,S_=12):
    sg=SEGS[n];P,J,E=sg['part'],sg['joints'],sg['edges'];q=MAPS[n][0];h,w=q.shape;sp=G['ALLP'][('HOME.json','chi')]
    W=Image.new('RGB',(w*S_*2+30,h*S_+40),(255,255,255));d=ImageDraw.Draw(W)
    d.text((6,4),f'frame {n}  d{DIRS[n]} '+('front' if DIRS[n] in(3,4,5) else 'back' if DIRS[n] in(0,1,7) else 'side'),fill=(0,0,0))
    for k,(ox) in enumerate((0,w*S_+30)):
        for (y,x),i in list(P.items())+[((y,x),17) for (y,x),t in MAPS[n][3].items() if t=='stick']:
            if k==0:c=tuple(int(t*0.45+140) for t in sp[q[y,x]])          # game sprite, washed out under the skeleton
            else:c=(255,255,255) if i in(2,4,5,10,11,14,15) else (170,170,170) if i in(3,6,7,12,13,16) else (90,90,90) if i in(1,8,9) else (210,210,210)
            d.rectangle([ox+x*S_,24+y*S_,ox+x*S_+S_-1,24+y*S_+S_-1],fill=c)
        if k==1:   # part borders (black) + part numbers
            for (y,x),i in P.items():
                for (a,b) in((0,1),(1,0),(0,-1),(-1,0)):
                    if P.get((y+a,x+b),-1)!=i:
                        X0,Y0=ox+x*S_,24+y*S_
                        if b==1:d.line([X0+S_-1,Y0,X0+S_-1,Y0+S_-1],fill=(0,0,0),width=2)
                        if b==-1:d.line([X0,Y0,X0,Y0+S_-1],fill=(0,0,0),width=2)
                        if a==1:d.line([X0,Y0+S_-1,X0+S_-1,Y0+S_-1],fill=(0,0,0),width=2)
                        if a==-1:d.line([X0,Y0,X0+S_-1,Y0],fill=(0,0,0),width=2)
            for i in set(P.values())|{17}:
                px=[p for p,j in P.items() if j==i] or [p for p,t in MAPS[n][3].items() if t=='stick' and i==17]
                if not px or i==0:continue
                cy,cx=np.mean([p[0] for p in px]),np.mean([p[1] for p in px]);p=min(px,key=lambda p:(p[0]-cy)**2+(p[1]-cx)**2)
                X,Y=ox+p[1]*S_+S_//2,24+p[0]*S_+S_//2;t=str(i);tw=d.textlength(t)
                d.rectangle([X-tw/2-2,Y-6,X+tw/2+2,Y+6],fill=(0,0,0));d.text((X-tw/2,Y-5),t,fill=(255,255,0))
        else:      # stickman: thick black line with white core, joints = black/white rings with an R/L letter
            for a,b in E:
                if a in J and b in J:
                    A_=(J[a][0]*S_+S_/2,24+J[a][1]*S_+S_/2);B_=(J[b][0]*S_+S_/2,24+J[b][1]*S_+S_/2)
                    d.line([A_,B_],fill=(0,0,0),width=7);d.line([A_,B_],fill=(255,255,255),width=3)
            for k_,(x,y) in J.items():
                X,Y=x*S_+S_/2,24+y*S_+S_/2;d.ellipse([X-6,Y-6,X+6,Y+6],fill=(0,0,0));d.ellipse([X-3,Y-3,X+3,Y+3],fill=(255,255,255))
                lab=k_[0] if k_[:2] in('R ','L ') else ''
                if lab:d.text((X+6,Y-12),lab,fill=(0,0,0))
    return W
ims=[overlay(n) for n in FRAMES];cols=3;cw=max(i.width for i in ims);ch=max(i.height for i in ims)
leg=' | '.join(f'{k} {v}' for k,v in S.PARTS.items())
SH=Image.new('RGB',(cw*cols,ch*((len(ims)+cols-1)//cols)+70),(255,255,255));dd=ImageDraw.Draw(SH)
dd.text((6,4),'v5 body-part segmentation + stickman (left: skeleton on game sprite, R/L = player side; right: part numbers, black borders)',fill=(0,0,0))
for i in range(0,len(leg),170):dd.text((6,20+i//170*14),leg[i:i+170],fill=(0,0,0))
for i,im in enumerate(ims):SH.paste(im,((i%cols)*cw,70+(i//cols)*ch));im.save(f'{OUT}/skeleton_{FRAMES[i]}.png')
SH.save(f'{OUT}/skeleton_overlay_sheet.png')
json.dump({n:dict(parts={f'{x},{y}':i for (y,x),i in SEGS[n]['part'].items()},joints=SEGS[n]['joints'],torso_geometry=SEGS[n]['geo']) for n in FRAMES},open(f'{OUT}/skeleton_v5.json','w'),indent=1,default=float)
