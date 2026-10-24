# Goalie v10 (Abdul pt869u): match Abdul's texture pieces to in-game goalie parts, zones first, then expand (D73-D75).
# Part pixels = goalie9 generic segmentation (g9scan.candidates). Per part:
#  1 ZONE MATCH: only sprite px whose index is one of the piece's texture zones take part in the fit; shading px
#    (22 grey, 30/31 toe, 88 ice shadow, 109, 136 stick) go to the shading layer and are never compared.
#    Fit = per-row mapping (v2 rule: row run of m px onto the n-texel texture row: m<=n centred block (n-m)//2 + ox,
#    m>n even stretch), V = oy + (y-y0)*sy, optional mirror. Search sy 0.40..2.00, oy, ox -3..3; maximise exact matches.
#  2 EXPAND: a remaining diff px is accepted if its index sits in the piece within Chebyshev r of its mapped texel
#    (r=1, then r=2) -> the zone grows by that texel. Out-of-zone px (index not in the piece at all) are listed apart.
import sys,os,json,math,collections
sys.path.insert(0,os.path.abspath(os.path.dirname(__file__)+'/../goalie9'))
from g9scan import *
from g10tex import decode,piece,WHITE,TRANS,HERE as H10
SHADE={22,30,31,88,109,136}
WHITESET=set(range(149,150))|set(range(153,164))|set(range(165,177))|set(range(178,184))
def eq(s,t):return t==s or (t==WHITE and s in WHITESET)
def mapper(q,TP,sy,oy,ox,mir):
    rows=collections.defaultdict(list)
    for y,x in q:rows[y].append(x)
    y0=min(rows);out={};th,tw=TP.shape
    for y,xs in rows.items():
        v=oy+int(math.floor((y-y0)*sy))
        if not 0<=v<th:
            for x in xs:out[(y,x)]=None
            continue
        tr=[u for u in range(tw) if TP[v,u]!=TRANS]
        if not tr:
            for x in xs:out[(y,x)]=None
            continue
        a,b=min(xs),max(xs);m=b-a+1;ta,tb=tr[0],tr[-1];n=tb-ta+1
        for x in xs:
            k=(b-x) if mir else (x-a)
            u=ta+min(max((n-m)//2+ox,0),n-m)+k if m<=n else ta+int(k*n/m)
            out[(y,x)]=(v,u)
    return out
def fit(p,q,TP):
    zones=set(int(v) for v in TP.flatten())-{TRANS}
    inz=[c for c in q if int(p[c]) not in SHADE and (int(p[c]) in zones or (WHITE in zones and int(p[c]) in WHITESET))]
    best=None;th=TP.shape[0]
    for mir in (0,1):
        for sy10 in range(40,201,5):
            sy=sy10/100
            for oy in range(-th,th):
                for ox in range(-3,4):
                    M=mapper(inz,TP,sy,oy,ox,mir)
                    s=sum(1 for c,t in M.items() if t and TP[t]!=TRANS and eq(int(p[c]),int(TP[t])))
                    key=(s,-abs(sy-1),-abs(ox))
                    if best is None or key>best[0]:best=(key,(sy,oy,ox,mir))
    return best[1]
def evaluate(p,q,TP,prm):
    zones=set(int(v) for v in TP.flatten())-{TRANS};M=mapper(q,TP,*prm);R=collections.Counter();lab={}
    for c,t in M.items():
        s=int(p[c])
        if s in SHADE:lab[c]='shade';R['shade']+=1;continue
        if not (s in zones or (WHITE in zones and s in WHITESET)):lab[c]='outzone';R['outzone']+=1;continue
        R['zone_px']+=1
        if t and TP[t]!=TRANS and eq(s,int(TP[t])):lab[c]='ok';R['ok']+=1;continue
        done=False
        for r in (1,2):
            if t and any(0<=t[0]+dy<TP.shape[0] and 0<=t[1]+dx<TP.shape[1] and eq(s,int(TP[t[0]+dy,t[1]+dx])) for dy in range(-r,r+1) for dx in range(-r,r+1)):
                lab[c]='exp%d'%r;R['exp%d'%r]+=1;done=True;break
        if not done:lab[c]='diff';R['diff']+=1
    R['strict_diff']=R['zone_px']-R['ok'];R['after_expand_diff']=R['diff']
    return dict(R),lab,M
# targets (Abdul pt869u good frames from the goalie9 scan + facing-truth frames + the 373-376 wall frames)
TARGETS=[(987,'padF_L','padF'),(987,'padF_R','padF'),(505,'padF_L','padF'),(505,'padF_R','padF'),
         (520,'padB_L','padStrip'),(520,'padB_R','padStrip'),(1044,'pad_side','padF'),(1044,'pad_side','padStrip'),
         (1021,'blocker_face','blocker'),(538,'catcher_face','catcher'),
         (547,'mask_front','mask'),(543,'mask_side','mask'),(539,'mask_back','mask'),
         (416,'padF_L','padF'),(416,'padF_R','padF'),(422,'padF_L','padF'),(422,'padF_R','padF'),(413,'mask_side','mask'),(416,'mask_front','mask')]
WALL=[373,374,375,376]
def parts_for(frames):
    C=[c for c in candidates() if c['frame'] in frames];return {(c['frame'],c['piece']):c for c in C}
def wall_pads(n):
    """373-376 are not in the goalie SPA set (SPAgwallright/left); segment them with the same seg(), pads split in 2 legs."""
    p,L,st=seg(n);pad=list(zip(*np.nonzero(L=='pad')));return p,{('pad%d'%i):c for i,(c,_) in enumerate(legs(pad))}
if __name__=='__main__':
    T=decode();P=parts_for({t[0] for t in TARGETS});out=[]
    for n,pc,tk in TARGETS:
        c=P.get((n,pc))
        if not c:print('missing',n,pc);continue
        p=frame(n);TP=piece(T,tk);prm=fit(p,c['q'],TP);R,_,_=evaluate(p,c['q'],TP,prm)
        out.append(dict(frame=n,part=pc,tex=tk,params=prm,**R));print(n,pc,tk,prm,R)
    for n in WALL:
        p,lg=wall_pads(n);TP=piece(T,'padF')
        for k,q in lg.items():
            prm=fit(p,q,TP);R,_,_=evaluate(p,q,TP,prm);out.append(dict(frame=n,part='wall_'+k,tex='padF',params=prm,**R));print(n,k,prm,R)
    json.dump(out,open(H10+'/g10_match.json','w'),indent=1,default=int)
