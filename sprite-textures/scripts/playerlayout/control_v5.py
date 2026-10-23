# v5.2 control test (Abdul pt792u): do textures that reproduce the game's own jerseys, rendered through the v5.2 mapping, match the game?
# Usage (from sprite-textures/out): PYTHONPATH=../scripts python3 ../scripts/playerlayout/control_v5.py <outdir> <textures dir>
# Test A "control" (the approved mapping, full pipeline): per team a control texture whose texel = medium colour of the game zone that texel
#   stands for (crest texels = their own index, skin = skin medium, glove/skate = gear), + the shading layer (light/medium/dark/shadow from
#   the game pixel) -> combined = shade(texel, level) with the game ramps; stick / ice shadow / gear in their real game colours.
# Test B "blind geometry" (diagnostic only, NOT a mapping change): every body pixel takes the nearest texel by skeleton geometry ALONE (no
#   game-zone filter): torso row from the fitted waist/yoke lines, arm row from arc length shoulder->elbow->glove, legs/helmet by body bbox.
#   This shows where geometry alone would disagree with the game's zones, i.e. what the zone filter is silently correcting.
# Mismatch classes (B; A uses the same): D game-zone defect (game pixel's family isolated: <=1 same-family 8-neighbour, and the prediction
#   equals the neighbours' majority) > R wrong stripe row (same body group: torso bands / arm bands / leg bands) > P wrong part (other group,
#   e.g. arm vs torso, or crest) > S wrong shade (right family, other colour).
import sys,os,json,runpy,collections,numpy as np
from PIL import Image,ImageDraw
H=os.path.dirname(os.path.abspath(__file__));OUT=sys.argv[1];TEXD=sys.argv[2];os.makedirs(OUT,exist_ok=True)
sys.argv=['x','/tmp/_ctl_fv5',TEXD];F=runpy.run_path(f'{H}/frames_v5.py')
MAPS,SEGS,TF,ALLP,ramps,shade,render,tpos,FRAMES,DIRS,TH,TW=(F[k] for k in 'MAPS SEGS TF ALLP ramps shade render tpos FRAMES DIRS TH TW'.split())
pfam=F['pfam']
TEAMS=[('leafs_home','HOME.json','tor'),('rangers_away','AWAY.json','nyr'),('chicago_home_top','HOME.json','chi'),
       ('chicago_alt_bottom','AWAY.json','chi'),('montreal_baby_blue_bottom','HOME.json','mtl')]
def grp(f):
    if f.startswith('idx'):return 'crest'
    if f in('yoke 1','yoke 2','yoke 3','yoke corner','shoulder patch','jersey','waist 1','waist 2','waist 3'):return 'torso'
    if f in('upper arm','arm stripe 1','arm stripe 2','arm stripe 3','forearm'):return 'arm'
    if f.startswith('pants') or f.startswith('socks'):return 'leg'
    return f
# ---------- control textures
def ctex(sp,R):
    G=np.zeros((TH,TW,3),np.uint8);G[:]=(252,0,252)
    for uv,f in TF.items():
        c=sp[int(f[3:])] if f.startswith('idx') else (R[f].get('medium') or R[f].get('flat')) if f!='gear' else sp[0]
        G[uv[1],uv[0]]=c
    return G
# ---------- blind geometry assignment
CAND=[uv for uv,f in TF.items() if f not in('skin','gear')]
def blind(n):
    q,A,LEV,fixed=MAPS[n];S=SEGS[n];P=S['part'];J=S['joints'];g=S['geo'].get('torso',{});d=DIRS[n]
    fam=S['fam'];pts=[p for p in A if fam[p] not in('skin','gear')]
    ys=[p[0] for p in A];xs=[p[1] for p in A];x0,x1,y0,y1=min(xs),max(xs),min(ys),max(ys)
    want='B' if d in(0,1,7) else 'F'
    def arm_row(p,s):
        sh,el,gl=J.get(s+' shoulder'),J.get(s+' elbow'),J.get(s+' glove') or J.get(s+' wrist')
        if not(sh and el and gl):return None
        best=None
        for a,b,r0,r1 in((sh,el,8,13),(el,gl,13,17.5)):
            ax,ay=b[0]-a[0],b[1]-a[1];L2=max(1e-6,ax*ax+ay*ay);t=min(1,max(0,((p[1]-a[0])*ax+(p[0]-a[1])*ay)/L2))
            dd=(p[1]-a[0]-t*ax)**2+(p[0]-a[1]-t*ay)**2
            if best is None or dd<best[0]:best=(dd,r0+(r1-r0)*t)
        return best[1]
    out={}
    for p in pts:
        y,x=p;pt=P.get(p);ny=(y-y0)*31/max(1,y1-y0);wy=1;nx=4+(x-x0)*13/max(1,x1-x0);side=None
        if pt in(2,3) and g:
            yb=g['bottom_y']+g['bottom_slope']*(x-g['xc']);yt=g['top_y']+g['top_slope']*(x-g['xc'])
            ny=8+6*(y-yt)/max(1,yb-yt);wy=20
        elif pt in(4,5,6,7):
            side='R' if pt in(4,6) else 'L';r=arm_row(p,side)
            if r is not None:ny=r;wy=20
        best=None
        for uv in CAND:
            cx,cy,fig=tpos(*uv);c=wy*abs(ny-cy)+abs(nx-cx)
            if d not in(2,6) and fig!='S' and fig!=want:c+=40
            if side and uv[0]<28:
                w=27-uv[0] if uv[0]>=14 else uv[0];c+=0 if (w<=2)==(side=='R') and (w<=2 or w>=11) else 60
            elif side is None and uv[0]<28:
                w=27-uv[0] if uv[0]>=14 else uv[0]
                if w<=2 or w>=11:c+=25          # non-arm pixel on an arm column
            if best is None or c<best[0]:best=(c,uv)
        out[p]=best[1]
    return out
# ---------- diff + classify
def classify(q,fam,pred,p):
    fg,fp=fam[p],pred
    y,x=p;nb=[fam.get((y+a,x+b)) for a in(-1,0,1) for b in(-1,0,1) if (a or b) and (y+a,x+b) in fam]
    same=sum(1 for t in nb if t==fg);maj=collections.Counter(t for t in nb if t).most_common(1)
    if same<=1 and maj and maj[0][0]==fp:return 'D'
    if fg==fp:return 'S'
    return 'R' if grp(fg)==grp(fp) else 'P'
SC=6
def heat(q,M):
    h,w=q.shape;im=Image.new('RGB',(w*SC,h*SC),(0,0,0));dr=ImageDraw.Draw(im)
    for y,x in zip(*np.nonzero(q!=255)):dr.rectangle([x*SC,y*SC,x*SC+SC-1,y*SC+SC-1],fill=(55,55,55))
    for (y,x),c in M.items():
        X,Y=x*SC,y*SC
        if c=='R':dr.rectangle([X,Y,X+SC-1,Y+SC-1],fill=(255,255,255))
        elif c=='P':dr.rectangle([X,Y,X+SC-1,Y+SC-1],fill=(255,0,255))
        elif c=='S':dr.rectangle([X,Y,X+SC-1,Y+SC-1],outline=(255,255,255))
        else:dr.line([X,Y,X+SC-1,Y+SC-1],fill=(255,255,255),width=2);dr.line([X,Y+SC-1,X+SC-1,Y],fill=(255,255,255),width=2)
    return im
def toimg(a,bg=(40,70,50)):
    o=np.zeros(a.shape[:2]+(3,),np.uint8);o[:]=bg;m=(a>=0).all(2);o[m]=a[m];return Image.fromarray(o).resize((a.shape[1]*SC,a.shape[0]*SC),Image.NEAREST)
RES={'A_control':{},'B_blind_geometry':{}};SHEETS={}
BL={n:blind(n) for n in FRAMES}
for k,fn,c in TEAMS:
    sp=ALLP[(fn,c)];R=ramps(sp);G=ctex(sp,R);os.makedirs(f'{OUT}/textures',exist_ok=True)
    Image.fromarray(G).save(f'{OUT}/textures/control_{k}.png');Image.fromarray(G).resize((TW*12,TH*12),Image.NEAREST).save(f'{OUT}/textures/control_{k}_x12.png')
    for n in FRAMES:
        q,A,LEV,fixed=MAPS[n];fam=SEGS[n]['fam'];m=q!=255
        fl,sh,cb,_=render(n,G.astype(int),R,gamecol=sp)
        game=-np.ones(q.shape+(3,),int);game[m]=sp[q[m]]
        MA={}
        for y,x in zip(*np.nonzero(m)):
            if tuple(cb[y,x])!=tuple(sp[q[y,x]]):p=(y,x);MA[p]=classify(q,fam,TF.get(A.get(p)),p) if p in A else 'P'
        occ=int(((cb>=0).all(2)!=m).sum())
        # blind
        bb=cb.copy();MB={}
        for p,uv in BL[n].items():
            f=TF[uv];col=tuple(int(t) for t in G[uv[1],uv[0]]);bb[p]=shade(col,f,LEV[p],R)
            if tuple(bb[p])!=tuple(sp[q[p]]):MB[p]=classify(q,fam,f,p)
        for tag,M,img in(('A_control',MA,cb),('B_blind_geometry',MB,bb)):
            cnt=collections.Counter(M.values());RES[tag].setdefault(k,{})[n]=dict(mismatch=len(M),**{c_:cnt.get(c_,0) for c_ in 'RPSD'},
                                   **({'occupancy_diff':occ} if tag=='A_control' else {}))
            SHEETS.setdefault((tag,k),[]).append((n,toimg(game),toimg(img),heat(q,M),len(M)))
        for t,a in(('flat',fl),('shading',sh),('combined',cb)):toimg(a).save(f'{OUT}/{k}_{n}_control_{t}.png')
# ---------- sheets: game | render | heatmap per frame (rows), legend in words + shapes
LEG='heatmap (black bg, grey = sprite): WHITE SOLID = R wrong stripe row | MAGENTA SOLID = P wrong part | WHITE OUTLINE = S wrong shade | WHITE X = D game-zone defect'
for (tag,k),rows in SHEETS.items():
    CW=max(r[1].width for r in rows)+20;RH=max(r[1].height for r in rows)+20
    W=Image.new('RGB',(150+CW*3,60+RH*len(rows)),(0,0,0));dr=ImageDraw.Draw(W)
    dr.text((6,6),f'{tag}  {k}: game | {"control render (v5.2 mapping, full pipeline)" if tag[0]=="A" else "blind-geometry render (no zone filter, diagnostic)"} | diff heatmap',fill=(255,255,255))
    dr.text((6,22),LEG,fill=(255,255,255))
    for j,l in enumerate(('game frame','render','diff heatmap')):dr.text((150+j*CW+10,42),l,fill=(255,255,0))
    for i,(n,a,b,c,cnt) in enumerate(rows):
        y=60+i*RH;dr.text((6,y+RH//2-6),f'{n} d{DIRS[n]}  mismatch {cnt}',fill=(255,255,255))
        for j,im in enumerate((a,b,c)):W.paste(im,(150+j*CW+10,y+(RH-im.height)//2))
    W.save(f'{OUT}/{tag}_{k}_sheet.png')
json.dump(RES,open(f'{OUT}/control_v5.json','w'),indent=1)
for tag,r in RES.items():
    print(tag)
    for k,v in r.items():print(' ',k,'total',sum(t['mismatch'] for t in v.values()),{n:(t['mismatch'],t['R'],t['P'],t['S'],t['D']) for n,t in v.items()})
