# Goalie v27 (Abdul pt935u) -> g27_map.json: geometric pad maps v2, 14 frames + SPAgglover 8. D134.
# Old geo (g25 geo_pad): v = PCA long axis scaled to the leg, u normalised inside ROUNDED v-slices that are cut across
# a tilted axis -> the slices are staircase bands, so a texture column (the stripe) zig-zags; and the screen-right pad
# was mirrored by leg name, not by view, so back views put cols 7-8 on the wrong side.
# New geo: (1) u per sprite SCANLINE (row) when the leg is within 40 deg of vertical (per column otherwise), normalised to
# the leg's extent on that line -> a texel column is a straight line down the pad; diagonal legs: u from the leg's two
# edges fitted as straight lines along the axis; (2) u side chosen from the game's own
# art: the side of the leg where the sprite's own 151/152 px are (same as the strict maps in all 28 legs: inner edge in
# front views, outer in back views); no 151/152 px -> inner; (3) v = long axis knee 0 -> toe 13; D136: when the blob's PCA axis is >25 deg off the skeleton's hip->ankle line, the skeleton line is used (short/occluded/butterfly pads) (a 145 knee-band anchor was tried and dropped: it over-stretched 987).
import sys,os,json,collections,numpy as np
H=os.path.dirname(os.path.abspath(__file__));G=os.path.abspath(H+'/..')
for d in ('/goalie15','/goalie14','/goalie13','/goalie12','/goalie25'):sys.path.insert(0,G+d)
import g15pad;from g15pad import frame
import g25map
FR=g25map.FR;SPA=[408,411,414,417,420,423,426,429]
def legs(n):
    """[(leg, pixels, strict map or None)]"""
    if n in FR:
        P=json.load(open(G+'/goalie23/g23_pads.json'))['frames'][str(n)]
        return [(r['leg'],[tuple(map(int,k.split(','))) for k,t in r['map'].items() if t is not None],{k:t for k,t in r['map'].items() if t}) for r in P]
    lab=np.array(json.load(open('/tmp/g24_seg.json'))[str(n)]['lab']);p=frame(n);out=[]
    for code,leg in ((6,'padF_L'),(7,'padF_R')):
        q=[tuple(map(int,c)) for c in np.argwhere((lab==code)&(p!=255))]
        if len(q)>=4:out.append((leg,q,None))
    return out
JO={}
def joints(n):   # g16 joint fit (14 frames) / g24 (SPAgglover); joints are [x,y]
    if not JO:JO.update(json.load(open('/tmp/g16_seg.json')));JO.update(json.load(open('/tmp/g24_seg.json')))
    return JO[str(n)]['joints']
def leg_axis(n,leg):
    """D136 (Abdul pt938u): knee->toe direction = hip->ankle line of the skeleton, (dy,dx) unit, pointing down."""
    J=joints(n);sides=[k for k in ('L','R') if 'padF_'+k in leg]
    h=np.mean([J[k+'hip'] for k in sides],0);a_=np.mean([J[k+'ank'] for k in sides],0)
    d=np.array([a_[1]-h[1],a_[0]-h[0]],float);nn=np.linalg.norm(d)
    if nn<1e-6:return None
    d/=nn;return d if d[0]>=0 else -d
def geo2(q,outer_right,anchor_v=None,ja=None):
    P=np.array(q,float);c,a,b=g25map.axes(q)
    if ja is not None and abs(a@ja)<np.cos(np.radians(25)):   # PCA blob axis disagrees with the skeleton -> use the skeleton
        a=ja;b=np.array([-a[1],a[0]])
    vert=abs(a[0])>=np.cos(np.radians(40))
    s=(P-c)@a;v=(s-s.min())/max(1e-6,s.max()-s.min())*13
    if False and anchor_v is not None and anchor_v.any():   # tried: 145 knee-band anchor; over-stretched 987 (top px clipped to v0), dropped
        s2=s[anchor_v].mean();k=11/max(1e-6,s.max()-s2);v=np.clip(2+(s-s2)*k,0,13)
    u=np.zeros(len(q))
    if vert:
        for l in np.unique(P[:,0]):
            m=P[:,0]==l;t=P[m,1];u[m]=(t-t.min())/max(1e-6,t.max()-t.min())*9 if t.max()>t.min() else 4.5
    else:   # diagonal/flat leg: the leg edges t_min(s), t_max(s) per 1-px slice along the axis, fitted as straight lines,
            # so u is constant along lines parallel to the leg edges (no staircase checkerboard)
        t=(P-c)@b;sb=np.floor(s-s.min()).astype(int);S_,LO,HI=[],[],[]
        for k in np.unique(sb):m=sb==k;S_.append(s[m].mean());LO.append(t[m].min());HI.append(t[m].max())
        if len(S_)>=2:lo=np.polyval(np.polyfit(S_,LO,1),s);hi=np.polyval(np.polyfit(S_,HI,1),s)
        else:lo=np.full(len(s),t.min());hi=np.full(len(s),t.max())
        u=np.clip((t-lo)/np.maximum(1e-6,hi-lo),0,1)*9
        if b[1]<0:u=9-u
    if not outer_right:u=9-u         # u=9 (cols 7-9) on the outer side
    return v,u
def run():
    out={};diag={}
    for n in FR+SPA:
        p=frame(n);L_=legs(n);R={};cx={leg:np.mean([c[1] for c in q]) for leg,q,_ in L_}
        for leg,q,sm in L_:
            other=[x for l,x in cx.items() if l!=leg];P=np.array(q)
            # side from the art: the sprite's own 151/152 px (texel cols 7-8) -> that side gets u=9
            xs=[c[1] for c in q if int(p[c]) in (151,152)]
            inner_right=cx[leg]<np.mean(other) if other else True
            outer_right=(np.mean(xs)>P[:,1].mean()) if xs else inner_right   # no cue: front-view rule (cols 7-8 inside, 14/14 strict frames)
            av=np.array([int(p[c])==145 for c in q])
            ja=leg_axis(n,leg);v,u=geo2(q,outer_right,av,ja)
            pa=g25map.axes(q)[1];forced=bool(ja is not None and abs(pa@ja)<np.cos(np.radians(25)));vo,uo=g25map.geo_pad(q,leg.endswith('R'))
            R['geo2_'+leg]={'%d,%d'%c:[int(round(v[i])),int(round(u[i]))] for i,c in enumerate(q)}
            R['geo_'+leg]={'%d,%d'%c:[int(round(vo[i])),int(round(uo[i]))] for i,c in enumerate(q)}
            diag['%d %s'%(n,leg)]=dict(outer_right=bool(outer_right),px=len(q),strict=bool(sm),skel_axis=forced)
        out[n]=R
    json.dump(dict(frames=out,diag=diag),open(H+'/g27_map.json','w'));return out,diag
if __name__=='__main__':
    o,d=run()
    for k,v in d.items():print(k,v)
