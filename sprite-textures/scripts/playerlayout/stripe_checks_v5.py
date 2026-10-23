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
def TSCAN(n):   # torso scan direction = across the stripes: PCA direction of the waist bands; stripes steeper than 45 deg -> scan rows
    fam=SEGS[n]['fam'];ps=[p for p,f in fam.items() if f.startswith('waist')]
    if len(ps)<3:return {'scan':'columns'}
    Y=np.array(ps,float);Y-=Y.mean(0);w,V=np.linalg.eigh(Y.T@Y);vy,vx=V[:,1]
    return {'scan':'rows'} if abs(vy)>abs(vx) else {'scan':'columns'}
def check(n,A):
    sg=SEGS[n];P,fam=sg['part'],sg['fam'];R=dict(kink_forced=0,kink=0,run_capacity=0,run_other=0,red_flags=0,seams=0,kink_at=[],run_at=[],flag_at=[])
    for nm,ids in SEGIDS.items():
        for ln in lines(P,ids,fam,TSCAN(n) if nm=='torso' else sg['geo'].get(nm)):
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
def torso_extra(n,A):
    """angle smoothness: slope of each torso texel row (per-column mean y, >=3 columns), max |angle change| between adjacent rows;
    jersey run lengths down each column: max run, and 'adjacent doubles' (a 2-px row directly above/below another 2-px row)."""
    P=SEGS[n]['part'];fam=SEGS[n]['fam'];rows=collections.defaultdict(lambda:collections.defaultdict(list))
    for p,(u,v) in A.items():
        if P.get(p) in(2,3) and u<28:rows[v][p[1]].append(p[0])
    ang={}
    for v,cols in rows.items():    # PCA line angle of each texel row's pixels (mod 180)
        ps=[(y,x) for x,yy in cols.items() for y in yy]
        if len(ps)>=3:
            Y=np.array(ps,float);Y-=Y.mean(0);w,V=np.linalg.eigh(Y.T@Y);vy,vx=V[:,1]
            if w[1]>w[0]*1.2:ang[v]=float(np.degrees(np.arctan2(vy,vx)))%180
    vs=sorted(ang);dA=[min(abs(ang[b]-ang[a]),180-abs(ang[b]-ang[a])) for a,b in zip(vs,vs[1:]) if b==a+1]
    # stripe thickness at a pixel = min(vertical run, horizontal run) of its texel row inside the segment: a 1-px line at any angle
    # (straight, 45-deg staircase, steep) has thickness 1; a 2-px band has 2. adjacent doubles = thickness-2 pixels of row v touching
    # thickness-2 pixels of row v+-1.
    def thick(ids,famset):
        Q={p:A[p][1] for p,i in P.items() if i in ids and p in A and fam[p] in famset and A[p][0]<28}
        def run(p,dy,dx):
            v=Q[p];k=1;y,x=p
            for s in(1,-1):
                t=(y+s*dy,x+s*dx)
                while Q.get(t)==v:k+=1;t=(t[0]+s*dy,t[1]+s*dx)
            return k
        T={p:min(run(p,1,0),run(p,0,1)) for p in Q}
        adj=sum(1 for p,t in T.items() if t>=2 and any(T.get((p[0]+a,p[1]+b),0)>=2 and abs(Q[(p[0]+a,p[1]+b)]-Q[p])==1 for a,b in((1,0),(0,1))))
        return (max(T.values()) if T else 0),adj
    mx,adj=thick({2,3},{'jersey'})
    armthick={S.PARTS[i]:thick({i},{'upper arm','forearm'})[0] for i in(4,5,6,7) if any(j==i for j in P.values())}
    arm={}
    for ids in ({4},{5},{6},{7}):
        rv=collections.defaultdict(list)
        for p,(u,v) in A.items():
            if P.get(p) in ids:rv[v].append(p)
        an={}
        for v,ps in rv.items():
            if len(ps)>=3:
                Y=np.array(ps,float);Y-=Y.mean(0);w,V=np.linalg.eigh(Y.T@Y);vy,vx=V[:,1]
                if w[1]>w[0]*1.2:an[v]=float(np.degrees(np.arctan2(vy,vx)))%180
        vs=sorted(an);st=[min(abs(an[b]-an[a]),180-abs(an[b]-an[a])) for a,b in zip(vs,vs[1:]) if b==a+1]
        if st:arm[S.PARTS[min(ids)]]=round(max(st),1)
    return dict(arm_max_thickness=armthick,arm_max_angle_step_deg=arm,max_angle_step_deg=round(max(dA),1) if dA else 0.0,row_angles={int(k):round(a,1) for k,a in ang.items()},jersey_max_run=mx,adjacent_doubles=adj)
AFTER={n:MAPS[n][1] for n in FRAMES}
res={'after':{n:dict(check(n,AFTER[n]),**torso_extra(n,AFTER[n])) for n in FRAMES}}
if BEFORE:
    bj=json.load(open(BEFORE))['maps'];BM={n:{(int(k.split(',')[1]),int(k.split(',')[0])):tuple(v) for k,v in bj[str(n)].items()} for n in FRAMES};res['before']={n:dict(check(n,BM[n]),**torso_extra(n,BM[n])) for n in FRAMES}
json.dump(res,open(f'{OUT}/stripe_checks_v5.json','w'),indent=1,default=int)
for t in res:
    print(t,'arm thickness',{n:r['arm_max_thickness'] for n,r in res[t].items()})
    print(t,'arm angle step',{n:r['arm_max_angle_step_deg'] for n,r in res[t].items()})
    print(t,'angle/maxrun/adjdbl',{n:(r['max_angle_step_deg'],r['jersey_max_run'],r['adjacent_doubles']) for n,r in res[t].items()})
    print(t,{n:(r['kink'],r['kink_forced'],r['run_other'],r['run_capacity'],r['red_flags']) for n,r in res[t].items()},'totals kink/kink_forced/run_other/run_capacity/red_flags',
          [sum(r[k] for r in res[t].values()) for k in('kink','kink_forced','run_other','run_capacity','red_flags')])
# ---- stretch math (PROPOSAL ONLY, NOT applied - Abdul: no stretching without approval): geometric rows a segment spans in the sprite
# vs the template rows it has. need>have = rows clamped (repeated) at the end of the template range; factor = have/need would remove them.
SP={}
for n in FRAMES:
    sg=SEGS[n];fam=sg['fam'];o={}
    tg=sg['geo'].get('torso',{})
    if 'jersey_lines' in tg:o['jersey (APPLIED v5.2, approved pt789u)']=dict(need=round(tg['jersey_lines'],2),have=5,template_rows=[9,13])
    for k,g in sg['geo'].items():
        if 'curve_rows' in g:
            lo,hi=g['curve_rows'];tr=[8,11] if 'upper' in k else [15,17];o[k]=dict(sprite_rows=[lo,hi],need=hi-lo+1,have=tr[1]-tr[0]+1,template_rows=tr)
    for k,v in o.items():v['factor']=round(v['have']/v['need'],2) if v['need']>v['have'] else 1.0
    for k,v in o.items():v['applied']=k.startswith('jersey')
    SP[n]=o
json.dump(SP,open(f'{OUT}/stretch_proposal_v5.json','w'),indent=1,default=int)
for n,o in SP.items():print('stretch',n,{k:(v['need'],v['have'],v['factor']) for k,v in o.items() if v['factor']<1})
# ---- stick model (Abdul): 2 segments, shaft (grip -> heel) and blade (heel -> toe), fitted from the stick-zone pixels (136 not neck).
# grip = stick pixel nearest a glove pixel (parts 8/9; fallback nearest the torso); toe = max(distance from grip + drop below it); heel = the
# stick pixel farthest from the grip->toe chord (the bend); if the bend is < 1.2 px the blade is the last 3 px along the chord. No texel.
def stick_model(n):
    P=SEGS[n]['part'];st=[p for p,t in MAPS[n][3].items() if t=='stick']
    st=[p for p in st if any(max(abs(p[0]-o[0]),abs(p[1]-o[1]))<=2 for o in st if o!=p)] # drop isolated stray 136 px (42: x29,y13)
    if len(st)<3:return None
    gl=[p for p,i in P.items() if i in(8,9)] or [p for p,i in P.items() if i in(2,3)]
    d2=lambda a,b:(a[0]-b[0])**2+(a[1]-b[1])**2
    grip=min(st,key=lambda p:min(d2(p,g) for g in gl))
    # v5.2b fix: the blade lies on the ice -> toe = max(distance from grip + drop below grip), not just the pixel farthest from the
    # grip alone (on 370/889/42/67 that was the butt end above the hand); score = distance + drop below the grip. Heel = the bend, searched only within 8 px of the toe; if there is no
    # bend (< 1.2 px off the grip->toe chord) or the blade would be longer than the shaft, the blade is the last 4 px along the chord.
    toe=max(st,key=lambda p:d2(p,grip)**.5+(p[0]-grip[0]))   # far from the grip AND low (score = distance + drop)
    gy,gx=grip;ty,tx=toe;L=max(1e-6,d2(grip,toe)**.5)
    dev=lambda p:abs((tx-gx)*(gy-p[0])-(gx-p[1])*(ty-gy))/L
    near=[p for p in st if d2(p,toe)<=64 and p!=toe] or [toe]
    heel=max(near,key=dev)
    if dev(heel)<1.2 or d2(heel,toe)>d2(grip,heel):
        t=lambda p:((p[1]-gx)*(tx-gx)+(p[0]-gy)*(ty-gy))/L;heel=min([p for p in st if t(p)>=L-4] or [toe],key=t)
    if heel==toe:heel=min([p for p in st if p!=toe],key=lambda p:d2(p,toe))   # gap in the stick (occluded): nearest other pixel
    xy=lambda p:[float(p[1]),float(p[0])]
    return dict(grip=xy(grip),heel=xy(heel),toe=xy(toe),shaft_len=round(d2(grip,heel)**.5,2),blade_len=round(d2(heel,toe)**.5,2),
                grip_glove=('R glove' if P.get(min(gl,key=lambda g:d2(g,grip)))==8 else 'L glove' if P.get(min(gl,key=lambda g:d2(g,grip)))==9 else 'torso (no glove)'),pixels=len(st))
STICK={n:stick_model(n) for n in FRAMES}
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
            sm=STICK[n]
            if sm:
                for a,b,lab in(('grip','heel','SH'),('heel','toe','BL')):
                    A_=(sm[a][0]*S_+S_/2,24+sm[a][1]*S_+S_/2);B_=(sm[b][0]*S_+S_/2,24+sm[b][1]*S_+S_/2)
                    d.line([A_,B_],fill=(0,0,0),width=7);d.line([A_,B_],fill=(255,255,255),width=3,joint=None)
                    for t_ in range(0,10,3):   # dashes mark the stick (not a body bone)
                        f=t_/10;d.ellipse([A_[0]+(B_[0]-A_[0])*f-2,A_[1]+(B_[1]-A_[1])*f-2,A_[0]+(B_[0]-A_[0])*f+2,A_[1]+(B_[1]-A_[1])*f+2],fill=(0,0,0))
                    M=((A_[0]+B_[0])/2,(A_[1]+B_[1])/2);tw=d.textlength(lab);d.rectangle([M[0]-tw/2-2,M[1]-14,M[0]+tw/2+2,M[1]-2],fill=(0,0,0));d.text((M[0]-tw/2,M[1]-13),lab,fill=(255,255,0))
            for k_,(x,y) in J.items():
                X,Y=x*S_+S_/2,24+y*S_+S_/2;d.ellipse([X-6,Y-6,X+6,Y+6],fill=(0,0,0));d.ellipse([X-3,Y-3,X+3,Y+3],fill=(255,255,255))
                lab=k_[0] if k_[:2] in('R ','L ') else ''
                if lab:d.text((X+6,Y-12),lab,fill=(0,0,0))
    return W
ims=[overlay(n) for n in FRAMES];cols=3;cw=max(i.width for i in ims);ch=max(i.height for i in ims)
leg=' | '.join(f'{k} {v}' for k,v in S.PARTS.items())
SH=Image.new('RGB',(cw*cols,ch*((len(ims)+cols-1)//cols)+70),(255,255,255));dd=ImageDraw.Draw(SH)
dd.text((6,4),'v5 body-part segmentation + stickman (left: skeleton on game sprite, R/L = player side, stick SH = shaft, BL = blade; right: part numbers, black borders)',fill=(0,0,0))
for i in range(0,len(leg),170):dd.text((6,20+i//170*14),leg[i:i+170],fill=(0,0,0))
for i,im in enumerate(ims):SH.paste(im,((i%cols)*cw,70+(i//cols)*ch));im.save(f'{OUT}/skeleton_{FRAMES[i]}.png')
SH.save(f'{OUT}/skeleton_overlay_sheet.png')
json.dump({n:dict(parts={f'{x},{y}':i for (y,x),i in SEGS[n]['part'].items()},joints=SEGS[n]['joints'],torso_geometry=SEGS[n]['geo'],stick=STICK[n]) for n in FRAMES},open(f'{OUT}/skeleton_v5.json','w'),indent=1,default=float)
