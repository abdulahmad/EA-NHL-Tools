# goalie28 full set (Abdul pt947u): texel maps for all 246 goalie frames -> /tmp/g28_all.json (derived, regenerate locally).
# Seg: the 14 FR frames use g21 + D141 fixes (g28strict.seg_all); the other frames use g24seg.one (g16 joint fit + g21 rules),
# run per frame into /tmp/g24_<n>.json (OMP_NUM_THREADS=1, 8 in parallel). Editor overrides (/tmp/g28_edits.json from
# g28import.py) replace lab/joints per frame.
# Parts: blocker/catcher/mask/stick = same-index snap inside the part's texel block at the bbox/axis position (strict; the
# D141 glove-atlas fallback); a px with no same-index texel stays None (sprite colour, keeps the default pixel-perfect).
# Pads = geo2 (D134/D136) + D139 strip texel, for custom art.
import sys,os,json,collections,numpy as np
import scipy.ndimage as ndi
H=os.path.dirname(os.path.abspath(__file__));G=os.path.abspath(H+'/..')
for d in ('/goalie15','/goalie14','/goalie13','/goalie12','/goalie25','/goalie27','/goalie9'):sys.path.insert(0,G+d)
from g15pad import frame
import g25map,g27map,g28strict as S28,g9common
BG,BODY,MASK,CATCH,BLOCK,STICK,PADL,PADR,SKATE,SHADOW=range(10)
# D145 (Abdul pt951u: eye holes belong in the mask texture) texture v8 = v7 + mask texels the game uses that v7 lacked:
# 45 eye-hole shade (538) at (7,15)/(7,17), under the 0 eye holes (4,15)/(4,17), same columns; 134 helmet strap (D42: 519/1000
# draw the strap with 134) at (6,12)/(6,20), under the 135 strap (5,12)/(5,20). These cells were 255 (unused).
from PIL import Image as _I
L8=S28.L.copy();L8[7,15]=L8[7,17]=45;L8[6,12]=L8[6,20]=134
S28.L=L8;g25map.L=L8
def seg(n):
    E=json.load(open('/tmp/g28_edits.json')) if os.path.exists('/tmp/g28_edits.json') else {}
    if str(n) in E:return np.array(E[str(n)]['lab']),E[str(n)]['joints']
    if n in g25map.FR:
        if not hasattr(seg,'fr'):seg.fr=S28.seg_all();seg.j=json.load(open('/tmp/g16_seg.json'))
        return evidence(n,frame(n),np.array(seg.fr[str(n)]['lab']))[0],seg.j[str(n)]['joints']
    d=json.load(open('/tmp/g24_%d.json'%n));lab=region(n,frame(n),np.array(d['lab']),d['joints']);lab,_=evidence(n,frame(n),lab);return lab,d['joints']
L7=L8
def own_idx(l):
    """indices a part can map exactly: gloves share one atlas (D141), mask = cols 12-20 rows 0-7, stick = its region."""
    if l in (BLOCK,CATCH):return {int(v) for y in range(23,32) for v in L7[y,0:22]}|{int(v) for v in L7[0:7,0:10].ravel()}
    if l==MASK:return {int(v) for v in L7[0:8,12:21].ravel()}
    if l==STICK:return {int(v) for v in L7[9:23,14:17].ravel()}
    if l in (PADL,PADR):return {int(v) for v in L7[9:23,0:13].ravel()}
    return None
GLOVE=set(range(144,153))
def region(n,p,lab,J=None):
    """D146 (pt951u): glove/mask label by region, not only by colour. The g16 auto-seg sometimes gives a whole torso to the
    blocker (540) or the chest to the mask (521, 530, 1071), and body px whose colour a glove/mask texel also has then
    render glove/mask colours on the body. Blocker/catcher keep only glove colours 144-152 and the 0 outline 8-touching
    them; mask keeps only its top 9 rows (mask is 8 rows tall in every hand-checked frame). Checked on the 14 hand-checked
    frames: changes 1 px there (407 blocker outline), so it runs on the auto-segmented frames only."""
    lab=lab.copy();h,w=lab.shape
    for L_ in (BLOCK,CATCH):
        m=lab==L_;keep=m&np.isin(p,list(GLOVE))
        for y,x in zip(*np.nonzero(m&(p==0))):
            if keep[max(0,y-1):y+2,max(0,x-1):x+2].any():keep[y,x]=True
        lab[m&~keep]=-10-L_
    if J and 'neck' in J:   # head: a glove-labelled px at/above the neck joint in a mask colour is the mask (540, 462)
        mi=own_idx(MASK)
        for y,x in zip(*np.nonzero(lab<0)):
            if y<=J['neck'][1] and int(p[y,x]) in mi:lab[y,x]=MASK
    # D152 (pt955u): legs the auto-seg gave to a glove (540) are pads when they are in pad colours (155, strip 181-189, white 164)
    # and the piece shows the pad strip (>=2 px 181-189). Pants 177/180 stay body (as in all 14 hand-checked frames).
    PI=set(own_idx(PADL))-{0,255}-set(GLOVE);moved=lab<0
    cand=moved&np.isin(p,list(PI))
    cl,k=ndi.label(cand|(moved&(p==0)),np.ones((3,3),bool));acc=np.zeros_like(cand)
    ys_,_=np.nonzero(p!=255);ymid=(ys_.min()+ys_.max())/2   # legs only: piece centre in the lower half of the sprite (462's chest stays body)
    for c in range(1,k+1):
        cm=cl==c
        if (cm&np.isin(p,list(range(181,190)))).sum()<2 or np.nonzero(cm)[0].mean()<=ymid:continue
        if ((lab==PADL)|(lab==PADR)).any() and not (ndi.binary_dilation(cm,np.ones((3,3),bool))&((lab==PADL)|(lab==PADR))).any():continue   # must touch the frame's pads (1038/1028 glove px stay)
        acc|=cm&(cand|((p==0)&ndi.binary_dilation(cm&cand,np.ones((3,3),bool))))
    if acc.any():
        ex6,ex7=lab==PADL,lab==PADR;ys,xs=np.nonzero(acc);mid=(xs.min()+xs.max())/2
        for y,x in zip(ys,xs):
            if ex6.any() or ex7.any():
                d6=np.abs(np.nonzero(ex6)[1]-x).min() if ex6.any() else 99;d7=np.abs(np.nonzero(ex7)[1]-x).min() if ex7.any() else 99
                lab[y,x]=PADL if d6<=d7 else PADR
            else:lab[y,x]=PADR if x<=mid else PADL   # no pad yet: front-view convention (L pad on image right)
    m=lab==MASK
    if m.any():
        top=np.nonzero(m)[0].min();mm=m.copy();mm[:top+9]=False;lab[mm]=-10-MASK
    return lab
def evidence(n,p,lab):
    """D144 (pt948u-pt950u, pixel match like D139): on the auto-segmented frames a blocker/catcher/mask/stick px whose
    sprite index no texel of that part has is not that part: it takes the most common 8-neighbour label that can hold the
    index (skate/body/shadow hold any index), else BODY (jersey/skin 153-180 = arm/body/face) (mask/glove px: BODY, e.g. 538's eye holes, index 45, seen through the cage) or SKATE (pad/stick px <153: boot/blade
    greys 22/30/31). Pads too (index must exist in the pad front/strip)."""
    lab=lab.copy();h,w=lab.shape;ch=0
    for _ in range(3):
        for y,x in zip(*np.nonzero(((lab<0)|np.isin(lab,[BLOCK,CATCH,MASK,STICK,PADL,PADR]))&(p!=255))):
            s=int(p[y,x]);l=lab[y,x]
            if l>=0 and s in own_idx(l):continue
            nb=collections.Counter(int(lab[yy,xx]) for yy in range(max(0,y-1),min(h,y+2)) for xx in range(max(0,x-1),min(w,x+2)) if (yy,xx)!=(y,x) and p[yy,xx]!=255)
            ok=[k for k,_ in nb.most_common() if k>0 and k!=l and not (l<0 and k==-10-l) and own_idx(k) is not None and s in own_idx(k)]   # prefer a part whose texture has the colour (pad 155/164)
            ok+=[k for k,_ in nb.most_common() if k>0 and k!=l and own_idx(k) is None]
            lab[y,x]=ok[0] if ok else (BODY if s>=153 or l in (MASK,BLOCK,CATCH) or l<0 else SKATE);ch+=1
    lab[lab<0]=BODY;return lab,ch
def back(n,lab,p,J):
    o=g25map.ORI.get(n)
    if o:return o=='BACK'
    # no orient ruling: back view when the mask px show no eye/face indices (0 inside the mask interior) -> mostly helmet back
    q=np.argwhere(lab==MASK);return bool(len(q)) and not any(int(p[tuple(c)])==0 for c in q if 0<c[1]-q[:,1].min()<q[:,1].max()-q[:,1].min())
def ppsnap(s,cells,py,px):
    """D147: per-pixel target (py,px) in texel units, snapped to the nearest SAME-index texel of the block."""
    C=[c for c in cells if L8[c]==s]
    return min(C,key=lambda z:(z[0]-py)**2+(z[1]-px)**2) if C else None
CELLS={k:[(y,x) for y in range(b[1],b[1]+b[3]) for x in range(b[0],b[0]+b[2]) if L8[y,x]!=255] for k,b in S28.BLK.items()}
CELLS['mask']=[(y,x) for y in range(0,8) for x in range(12,21) if L8[y,x]!=255]
CELLS['pad']=[(y,x) for y in range(9,23) for x in range(0,13) if L8[y,x]!=255]
PP=os.environ.get('PP','1')=='1'
def maps(n):
    p=frame(n);lab,J=seg(n);R={};B=back(n,lab,p,J);L=S28.L
    for part,L_ in (('blocker',BLOCK),('catcher',CATCH),('mask',MASK),('stick',STICK)):
        q=[tuple(map(int,c)) for c in np.argwhere((lab==L_)&(p!=255))]
        if not q:continue
        ys=[c[0] for c in q];xs=[c[1] for c in q];a,b,cc,e=min(ys),min(xs),max(ys),max(xs);M={}
        if part=='stick':
            P=np.array(q,float);c0,ax,bx=g25map.axes(q);sv=(P-c0)@ax;su=(P-c0)@bx
            V=(sv-sv.min())/max(1e-6,sv.max()-sv.min());U=(su-su.min())/max(1e-6,su.max()-su.min())
        for i,(y,x) in enumerate(q):
            v=(y-a)/max(1,cc-a);u=(x-b)/max(1,e-b);s=int(p[y,x])
            if PP and part in ('blocker','catcher','mask'):
                cy=(a+cc)/2;cxx=(b+e)/2
                if part=='mask':
                    tc=16+(x-cxx) if not B else (12.5 if x<cxx else 19.5)+(x-cxx)*0.5;t=ppsnap(s,CELLS['mask'],3.5+(y-cy),tc)
                else:
                    t=None
                    for bk in ((['catFront','catBack'] if not B else ['catBack','catFront'])+['blocker'] if part=='catcher' else ['blocker','catFront','catBack']):
                        x0,y0,w_,h_=S28.BLK[bk];t=ppsnap(s,CELLS[bk],y0+(h_-1)/2+(y-cy),x0+(w_-1)/2+(x-cxx))
                        if t:break
            elif part=='mask':t=g25map.snap_mask(s,v,u,B)
            elif part=='stick':t=S28.snap_box(s,S28.BLK['stick'],V[i],U[i])
            else:
                order=(['catFront','catBack'] if not B else ['catBack','catFront'])+['blocker'] if part=='catcher' else ['blocker','catFront','catBack']
                t=None
                for bk in order:
                    t=S28.snap_box(s,S28.BLK[bk],v,u)
                    if t:break
            M['%d,%d'%(y,x)]=list(map(int,t)) if t and L[t]==s else None
        R[part]=M
    # pads: geo2
    g27map.JO[str(n)]={'joints':J}
    cx={}
    LG=[(leg,[tuple(map(int,c)) for c in np.argwhere((lab==code)&(p!=255))]) for code,leg in ((PADL,'padF_L'),(PADR,'padF_R'))]
    LG=[(l,q) for l,q in LG if len(q)>=4];cx={l:np.mean([c[1] for c in q]) for l,q in LG}
    for leg,q in LG:
        other=[x for l,x in cx.items() if l!=leg];P=np.array(q)
        xs=[c[1] for c in q if int(p[c]) in (151,152)]
        inner_right=cx[leg]<np.mean(other) if other else True
        outer_right=(np.mean(xs)>P[:,1].mean()) if xs else inner_right
        try:ja=g27map.leg_axis(n,leg)
        except Exception:ja=None
        v,u=g27map.geo2(q,outer_right,None,ja)
        # D144 strict pads: snap the geo2 position to the nearest SAME-index texel of the pad front x0-9 / strip x10-12
        # (rows 9-22), so the default texture reproduces the game px exactly; geo2 only chooses which texel.
        def psnap(s,vv,uu):
            C=[(y,x) for y in range(9,23) for x in range(0,13) if L[y,x]==s]
            return list(min(C,key=lambda z:(z[0]-9-vv)**2+(z[1]-uu)**2)) if C else None
        if os.environ.get('PADPP')=='1':   # D147 trial: per-pixel pad target; worse (30%/25% 1-step) than geo2 (34%/45%), off
            ys=P[:,0];top=ys.min();k=min(1.0,13/max(1,ys.max()-top));rows=collections.defaultdict(list)
            for c in q:rows[c[0]].append(c[1])
            def pp(c):
                r=rows[c[0]];lo,hi=min(r),max(r)
                uu=9-(hi-c[1]) if outer_right else 9-(c[1]-lo)     # outer side = texel col 9, 1 col per px inward
                return 9+(c[0]-top)*k,max(0,uu)
            R['pad_'+leg]={'%d,%d'%c:psnap(int(p[c]),*pp(c)) for c in q}
        else:R['pad_'+leg]={'%d,%d'%c:psnap(int(p[c]),v[i],u[i]) for i,c in enumerate(q)}
        R['geo2_'+leg]={'%d,%d'%c:([9+t[0],t[1]] if (t:=g27map.strip_texel(int(p[c]),v[i]) if 181<=int(p[c])<=189 else None) else [9+int(round(v[i])),int(round(u[i]))]) for i,c in enumerate(q)}
    # D155 (Abdul pt965u): a leg piece with 1-3 px (pad mostly hidden behind the other pad, glove or stick) was skipped
    # (geo2 needs >=4 px for an axis), so those px had no texel. Map them with the same strict same-index snap: v = the
    # px's height inside the frame's whole pad span (knee 0 -> toe 13), u = pad centre; the snap picks the nearest
    # pad texel of the SAME index, so the default texture reproduces the game px exactly. Labels are unchanged.
    allp=np.argwhere(np.isin(lab,(PADL,PADR))&(p!=255))
    for code,leg in ((PADL,'padF_L'),(PADR,'padF_R')):
        q=[tuple(map(int,c)) for c in np.argwhere((lab==code)&(p!=255))]
        if not q or len(q)>=4:continue
        t0,t1=allp[:,0].min(),allp[:,0].max()
        C=lambda s:[(y,x) for y in range(9,23) for x in range(0,13) if L[y,x]==s]
        def sn(c):
            vv=13*(c[0]-t0)/max(1,t1-t0);cc=C(int(p[c]))
            return list(min(cc,key=lambda z:(z[0]-9-vv)**2+(z[1]-4.5)**2)) if cc else None
        R['pad_'+leg]={'%d,%d'%c:sn(c) for c in q}
    return R,lab,J,B
def run(frames=None):
    out={}
    for n in frames or g9common.goalie_frames():
        try:R,lab,J,B=maps(n);out[n]=dict(maps=R,lab=lab.tolist(),joints=J,back=B)
        except FileNotFoundError:print('no seg',n)
    json.dump(out,open('/tmp/g28_all.json','w'),default=int);return out
if __name__=='__main__':run([int(a) for a in sys.argv[1:]] or None)
