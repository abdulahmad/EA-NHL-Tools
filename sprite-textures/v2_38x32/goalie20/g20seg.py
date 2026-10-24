# Goalie v17 segmentation = g16 joint multi-facing fit + rules from Abdul's g15 corrections (pt911u, ground truth).
#  R1 BUTT    the shaft (136) is traced as a line; up to 2 px past its upper end with index 0/8 are stick (butt tape),
#             (416, 422, 538, 1044, 425 had the butt as b/B).
#  R2 SKATE   blade px (index 0/8) directly under a pad/skate px, inside the pad-bottom column span and touching the
#             skate (31 or skate label) are skate, not blade (1044).
#  R3 PAD>BLK blocker px with a pad-only index (151/152/155/164) 4-connected to a pad join that pad (416 outer left pad).
#  R4 GLOVE   body px with a catcher-zone index (144-152) 4-connected to the catcher join the catcher (422 glove lower).
#  R5 HIDDEN  in the exact side view of the ready stance (blocker hand depth < -7.9 in the rotated 3D pose, d6) the
#             blocker is behind the body: no blocker label (425).
#  R6 LEGS    leg continuity: each side keeps its largest connected blob (from the skeleton labels); a smaller blob of
#             that side that is cut off from it but touches the other leg joins the other leg (419, 407, 428, 980).
#             Side views d2/d6 with one connected pad mass: the larger side is the near leg (d2 right, d6 left), so the
#             two sides swap if needed (425). Pad labels above pelvis-4 (helmet columns on 407/980) become body.
#  Frozen px (538 (19,19),(19,21),(20,21); 1044 (24,9)) keep their g15 labels.
import sys,os,math,json
H17=os.path.dirname(os.path.abspath(__file__));sys.path.insert(0,H17+'/../goalie16')
import g16seg,g14seg
from g16seg import *
import numpy as np
FROZEN.pop(1044,None)   # Abdul pt918u answer: 1044 (x9,y24) is pad (upper stripe)
PADONLY={151,152,155,164}
def nb4(y,x,H,W):
    for d in ((y+1,x),(y-1,x),(y,x+1),(y,x-1)):
        if 0<=d[0]<H and 0<=d[1]<W:yield d
def grow(lab,p,src,dst,idx):
    H,W=lab.shape;ch=True;n=0
    while ch:
        ch=False
        for y in range(H):
            for x in range(W):
                if lab[y,x]==src and int(p[y,x]) in idx and any(lab[d]==dst for d in nb4(y,x,H,W)):lab[y,x]=dst;ch=True;n+=1
    return n
def butt(p,lab):
    S=np.argwhere(p==136);out=[]
    if len(S)<3:return out
    top=S[S[:,0].argmin()];C=S[np.abs(S[:,0]-top[0])<=6].astype(float)
    if np.ptp(C[:,0])<2:return out
    a=np.polyfit(C[:,0],C[:,1],1)[0]   # dx per row going down; butt continues upward
    y,x=float(top[0]),float(top[1])
    for k in (1,2):
        yy,xx=int(round(y-k)),int(round(x-k*a))
        if 0<=yy<p.shape[0] and 0<=xx<p.shape[1] and int(p[yy,xx]) in(0,8):out.append((yy,xx))
        else:break
    return out
def legs_assign(n,lab,J,d):
    H,W=lab.shape;P=[tuple(c) for c in np.argwhere(np.isin(lab,[PADL,PADR]))]
    if not P:return
    if d in(2,6) and len(comps(P))==1:   # side view, one leg mass: the larger side is the near leg (d2 right, d6 left)
        near=PADR if d==2 else PADL;far=PADL if d==2 else PADR
        if (lab==far).sum()>(lab==near).sum():
            m=lab.copy();lab[m==far]=near;lab[m==near]=far
    for _ in range(3):   # leg continuity: a pad blob cut off from its side's main leg but touching the other leg flips
        ch=False
        for L,O in ((PADL,PADR),(PADR,PADL)):
            bl=sorted(comps([tuple(c) for c in np.argwhere(lab==L)]),key=len,reverse=True)
            for c in bl[1:]:
                if len(c)<len(bl[0]) and any(lab[r]==O for q in c for r in nb4(*q,H,W)):
                    for q in c:lab[q]=O
                    ch=True
        if not ch:break
GREEN538=[(17,10),(17,11),(17,12),(18,9),(18,10),(18,11),(18,12),(18,13),(19,8),(19,9),(19,10),(19,11),(19,12),(19,13),(20,8),(20,9),(20,10),(20,11),(20,12),(21,9),(21,10),(21,11),(22,10)]
def gloves(n,p,lab,J):
    # D123 Abdul's answers (goalie20): 980 inner edge of right pad, 1044 (x9,y24) pad stripe, 428 no blocker,
    # glove pixels must be distal to the wrist (skeleton elbow->hand); proximal glove px are arm (body).
    L=LOG.setdefault(n,{}).setdefault('D123',[])
    if n==980:
        for x in (13,14,15):
            for y in (19,20,21):
                if lab[y,x]!=BG:lab[y,x]=PADR;L.append(('980 padR',x,y))
    if n==1044:
        nb=[int(lab[yy,xx]) for yy in (23,24,25) for xx in (8,9,10) if lab[yy,xx] in (PADL,PADR)]
        lab[24,9]=max(set(nb),key=nb.count) if nb else PADR;L.append(('1044 pad',9,24,int(lab[24,9])))
    if n==428:
        for y,x in np.argwhere(lab==BLOCK):lab[y,x]=BODY;L.append(('428 no blocker',int(x),int(y)))
    if not J:return
    # arm = glove-labelled px lying on the shoulder->hand segment before the wrist (t<0.8), not catcher core, touching body
    H,W=lab.shape;ch=True
    while ch:
        ch=False
        for y,x in np.argwhere((lab==CATCH)|(lab==BLOCK)):
            if int(p[y,x]) in (148,149,150):continue
            if not any(0<=y+dy<H and 0<=x+dx<W and lab[y+dy,x+dx]==BODY for dy,dx in ((0,1),(1,0),(0,-1),(-1,0))):continue
            best=None
            for s_ in 'LR':
                h=np.array(J[s_+'hand'],float);sh=np.array(J[s_+'sh'],float);v=h-sh;nv2=float(v@v)
                if nv2<4:continue
                t=((x-sh[0])*v[0]+(y-sh[1])*v[1])/nv2;q=sh+min(max(t,0),1)*v;dd=np.hypot(x-q[0],y-q[1])
                if best is None or dd<best[0]:best=(dd,t)
            if best and best[0]<=1.5 and best[1]<0.8:lab[y,x]=BODY;ch=True;L.append(('arm',int(x),int(y),round(float(best[1]),2)))
ARM980=[(7,8),(6,9),(6,10),(6,11),(7,11),(8,11),(9,11),(6,12),(7,12),(8,12),(9,12),(6,13),(7,13),(8,13),(6,14)]
GREEN419=[(8,12),(9,11),(9,12),(9,13),(10,9),(10,10),(10,11),(10,12),(10,13),(10,14),(11,8),(11,9),(11,10),(11,11),(11,12),(11,13),(11,14),(11,15),(12,8),(12,9),(12,10),(12,11),(12,12),(12,13),(12,14),(13,9),(13,10),(13,11),(13,12),(14,10),(14,11)]
STRIPE3_ARM=os.environ.get('S3')=='arm'
def answers20(n,p,lab):
    # D124 Abdul's goalie19 answers (pt918u chain): 980 ringed = arm; 416 ringed stay catcher (untouched);
    # 419 catcher arm: white/black/white stripes run across the arm (constant x+y). Stripes 1-2 (x+y<=38) are arm;
    # stripe 3 (white 148 along x+y 39-40) is arm only if S3=arm, otherwise cuff border (catcher).
    # 419 blocker: Abdul's green cells are blocker, other old blocker cells are arm stripe (body).
    if n==980:
        for x,y in ARM980:lab[y,x]=BODY
    if n==419:
        lim=40 if STRIPE3_ARM else 38
        for y,x in np.argwhere(lab==CATCH):
            if x+y<=lim and x<31:lab[y,x]=BODY
        G=set(GREEN419)
        for y,x in np.argwhere(lab==BLOCK):
            if (int(x),int(y)) not in G:lab[y,x]=BODY
        for x,y in G:lab[y,x]=BLOCK
def post(n,p,lab,J):
    lab=lab.copy();H,W=lab.shape;d=GF[n][0][1];log={}
    # R2 skate under the pads
    P=np.argwhere(np.isin(lab,[PADL,PADR]))
    if len(P):
        yb=P[:,0].max();xs=P[P[:,0]>=yb-3][:,1];x0,x1=xs.min(),xs.max();k=0
        for y in range(yb-2,min(H,yb+4)):   # blade px right under a pad/skate px and touching the skate
            for x in range(x0,x1+1):
                if lab[y,x]==STICK and int(p[y,x]) in(0,8) and lab[y-1,x] in(PADL,PADR,SKATE) and \
                   any(lab[yy,xx]==SKATE or int(p[yy,xx])==31 for yy in range(y-1,min(H,y+2)) for xx in range(max(0,x-1),min(W,x+2))):lab[y,x]=SKATE;k+=1
        log['R2']=k
    b=butt(p,lab);log['R1']=len(b)
    for c in b:lab[c]=STICK
    log['R3']=grow(lab,p,BLOCK,PADL,PADONLY)+grow(lab,p,BLOCK,PADR,PADONLY)
    log['R4']=grow(lab,p,BODY,CATCH,CATZ)
    t=math.radians(45*d);x,y,z=skel10.BASE['Rhand']
    if n in skel10.READY and x*math.sin(t)-z*math.cos(t)<-7.9:log['R5']=int((lab==BLOCK).sum());lab[lab==BLOCK]=BODY
    py=J['pelvis'][1];top=lab[:max(0,int(py-4))];top[np.isin(top,[PADL,PADR])]=BODY
    before=lab.copy();legs_assign(n,lab,J,d);log['R6']=int((before!=lab).sum())
    for c in FROZEN.get(n,[]):lab[c]=g15lab(n)[c]
    return lab,log
LOG={}
G16=None
def seg(n,iters=4):   # g16 joint-fit result (from its run) + the R rules
    global G16
    if G16 is None:G16=json.load(open('/tmp/g16_seg.json'))
    S=G16[str(n)];p=frame(n);J={k:tuple(v) for k,v in S['joints'].items()}
    lab=np.array(S['lab']);ALL=set(range(256))   # g16 stored the skate px legs() split off; give them back to their pad
    grow(lab,p,SKATE,PADL,ALL);grow(lab,p,SKATE,PADR,ALL)
    lab,LOG[n]=post(n,p,lab,J);return p,lab,J,S['src']+' +R'
g14seg.seg=seg
#  LEGS FOR MAPPING: with leg continuity in place, the two sides are mapped separately; the g13 "merge touching narrow
#  pads" rule (D102) now only merges a side smaller than 8 px into the other (416 left+right were merged into one leg).
def legs(n):
    p,lab,J,src=seg(n);raw=[(g,set(zip(*np.nonzero(lab==L)))) for g,L in (('padF_L',PADL),('padF_R',PADR))];raw=[(g,s) for g,s in raw if s]
    if len(raw)==2 and min(len(s) for g,s in raw)<8:raw=[(raw[0][0]+'+'+raw[1][0],raw[0][1]|raw[1][1])]
    res=[]
    for g,s in raw:
        s=g14seg.main_body(s);sk=g14seg.skate(p,s)
        for c in sk:lab[c]=SKATE
        res.append((g,sorted(s-sk),sorted(sk)))
    H,W=lab.shape;ch=True   # R2 again once legs() has marked the skate: blade px under a pad/skate px touching the skate
    while ch:
        ch=False
        for y,x in np.argwhere(lab==STICK):
            if int(p[y,x]) in(0,8) and y>0 and lab[y-1,x] in(PADL,PADR,SKATE) and any(lab[yy,xx]==SKATE or int(p[yy,xx])==31 for yy in range(y-1,min(H,y+2)) for xx in range(max(0,x-1),min(W,x+2))):lab[y,x]=SKATE;ch=True
    if n==538:   # D122: Abdul's green cells (pt918u) are the blocker; rest of the old blocker block by colour zone
        for y,x in np.argwhere(lab==BLOCK):
            if (x,y) not in GREEN538:
                i=int(p[y,x]);lab[y,x]=STICK if i==136 else BODY   # none touch a pad; pad-only shades here sit on the shoulder
                LOG.setdefault(n,{}).setdefault('D122',[]).append((int(x),int(y),i,int(lab[y,x])))
        for x,y in GREEN538:lab[y,x]=BLOCK
    gloves(n,p,lab,J)
    if n==538:
        for x,y in GREEN538:lab[y,x]=BLOCK   # Abdul's green cells stay blocker
    answers20(n,p,lab)
    return res,lab,J,src
