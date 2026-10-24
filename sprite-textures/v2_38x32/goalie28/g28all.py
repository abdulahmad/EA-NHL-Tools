# goalie28 full set (Abdul pt947u): texel maps for all 246 goalie frames -> /tmp/g28_all.json (derived, regenerate locally).
# Seg: the 14 FR frames use g21 + D141 fixes (g28strict.seg_all); the other frames use g24seg.one (g16 joint fit + g21 rules),
# run per frame into /tmp/g24_<n>.json (OMP_NUM_THREADS=1, 8 in parallel). Editor overrides (/tmp/g28_edits.json from
# g28import.py) replace lab/joints per frame.
# Parts: blocker/catcher/mask/stick = same-index snap inside the part's texel block at the bbox/axis position (strict; the
# D141 glove-atlas fallback); a px with no same-index texel stays None (sprite colour, keeps the default pixel-perfect).
# Pads = geo2 (D134/D136) + D139 strip texel, for custom art.
import sys,os,json,numpy as np
H=os.path.dirname(os.path.abspath(__file__));G=os.path.abspath(H+'/..')
for d in ('/goalie15','/goalie14','/goalie13','/goalie12','/goalie25','/goalie27','/goalie9'):sys.path.insert(0,G+d)
from g15pad import frame
import g25map,g27map,g28strict as S28,g9common
BG,BODY,MASK,CATCH,BLOCK,STICK,PADL,PADR,SKATE,SHADOW=range(10)
def seg(n):
    E=json.load(open('/tmp/g28_edits.json')) if os.path.exists('/tmp/g28_edits.json') else {}
    if str(n) in E:return np.array(E[str(n)]['lab']),E[str(n)]['joints']
    if n in g25map.FR:
        if not hasattr(seg,'fr'):seg.fr=S28.seg_all();seg.j=json.load(open('/tmp/g16_seg.json'))
        return np.array(seg.fr[str(n)]['lab']),seg.j[str(n)]['joints']
    d=json.load(open('/tmp/g24_%d.json'%n));return np.array(d['lab']),d['joints']
def back(n,lab,p,J):
    o=g25map.ORI.get(n)
    if o:return o=='BACK'
    # no orient ruling: back view when the mask px show no eye/face indices (0 inside the mask interior) -> mostly helmet back
    q=np.argwhere(lab==MASK);return bool(len(q)) and not any(int(p[tuple(c)])==0 for c in q if 0<c[1]-q[:,1].min()<q[:,1].max()-q[:,1].min())
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
            if part=='mask':t=g25map.snap_mask(s,v,u,B)
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
        R['pad_'+leg]={'%d,%d'%c:([9+t[0],t[1]] if (t:=g27map.strip_texel(int(p[c]),v[i]) if 181<=int(p[c])<=189 else None) else [9+int(round(v[i])),int(round(u[i]))]) for i,c in enumerate(q)}
    return R,lab,J,B
def run(frames=None):
    out={}
    for n in frames or g9common.goalie_frames():
        try:R,lab,J,B=maps(n);out[n]=dict(maps=R,lab=lab.tolist(),joints=J,back=B)
        except FileNotFoundError:print('no seg',n)
    json.dump(out,open('/tmp/g28_all.json','w'),default=int);return out
if __name__=='__main__':run([int(a) for a in sys.argv[1:]] or None)
