# Goalie v11 (Abdul pt878u): in-game team palettes on the index textures, Option A (v4) vs Option B (v5 candidate).
# Teams: CHI away, TOR/BUF/EDM home, palettes via goalie9 spal (same as goalie8). Texture stays index-based.
# Whole-goalie mapping per frame: every goalie9 part (mask, blocker, pads L/R/side) is fitted zones-first and the
# best texture piece is kept (mask; blocker; padF / padWrap / padStrip); catcher = g10e catcher_q + skel10 facing piece.
# A and B differ only in the catcher. Images are local only (/workspace/preview_v2/goalie11/).
import sys,os,json,collections
H=os.path.dirname(os.path.abspath(__file__));sys.path.insert(0,H+'/../goalie10');sys.path.insert(0,H+'/../goalie9')
from g10e import *
from g10c import wrap
from g9common import spal
TEAMS=[('chi_away','AWAY.json','chi','Chicago AWAY'),('tor_home','HOME.json','tor','Toronto HOME'),
       ('buf_home','HOME.json','buf','Buffalo HOME'),('edm_home','HOME.json','edm','Edmonton HOME')]
FRAMES=[416,419,421,538,407,428,980,413,425,520,987]
CHOICE={'mask':['mask'],'blocker':['blocker'],'padF':['padF','padWrap'],'padB':['padF','padWrap'],'pad_side':['padF','padStrip','padWrap']}
def tpiece(o,k):
    T,P=OPT[o]
    if k=='padWrap':return wrap(T),None
    x0,y0,x1,y1=P[k];return T[y0:y1+1,x0:x1+1],(x0,y0)
def parts(n):
    G=collections.OrderedDict()
    for c in candidates():
        if c['frame']!=n or len(c['q'])<4 or c['piece']=='catcher_face':continue
        g='mask' if c['piece'].startswith('mask') else 'blocker' if c['piece']=='blocker_face' else 'pad_side' if c['piece']=='pad_side' else c['piece'][:4]+c['piece'][-2:]
        key=tuple(sorted(map(tuple,c['q'])))
        if any(key==tuple(sorted(map(tuple,v[1]))) for v in G.values()):continue
        G[g]=(g,[tuple(x) for x in c['q']])
    return list(G.values())
_MC={}
def map_frame(n,o):
    if (n,o) in _MC:return _MC[(n,o)]
    _MC[(n,o)]=r=_map_frame(n,o);return r
def _map_frame(n,o):
    """-> dict px -> (texel index or None, label), totals"""
    p=frame(n);out={};tot=collections.Counter();row={}
    items=[]
    q=catcher_q(n);k='catFront' if orient(n)=='FRONT' else 'catBack';items.append(('catcher',[tuple(x) for x in q],[k]))
    for g,qq in parts(n):items.append((g,qq,CHOICE['padF' if g.startswith('padF') else 'padB' if g.startswith('padB') else g]))
    for g,qq,ks in items:
        qq=[c for c in qq if c not in out]
        if len(qq)<3:continue
        best=None
        for kk in ks:
            TP,_=tpiece(o,kk)
            try:prm=g10match.fit(p,qq,TP)
            except ValueError:continue   # no in-zone px for this piece
            R,lab,M=g10match.evaluate(p,qq,TP,prm)
            if best is None or R['after_expand_diff']<best[0]['after_expand_diff']:best=(R,lab,M,TP,kk)
        if best is None:continue
        R,lab,M,TP,kk=best;row[g]=dict(tex=kk,strict=R['strict_diff'],after=R['after_expand_diff'],zone=R.get('zone_px',0))
        for c in qq:
            t=M.get(c);v=int(TP[t]) if t and TP[t]!=TRANS else None
            out[c]=(v,lab.get(c,'shade'))
        tot['strict']+=R['strict_diff'];tot['after']+=R['after_expand_diff']
    return out,dict(tot),row
def color_of(sp,s,v,l):
    if l in('shade','outzone') or v is None:return tuple(sp[s])
    if v==WHITE:return tuple(sp[s]) if s in g10match.WHITESET else tuple(sp[181])
    return tuple(sp[v])
if __name__=='__main__':
    R={}
    for n in FRAMES:
        for o in 'AB':
            m,t,row=map_frame(n,o);R['%d%s'%(n,o)]=dict(frame=n,opt=o,**t,parts=row)
            print(n,o,t,{g:'%s %d>%d'%(v['tex'],v['strict'],v['after']) for g,v in row.items()},flush=True)
    vis={}
    for tag,f,c,_ in TEAMS:
        sp=spal(f,c);vis[tag]={}
        for o in 'AB':
            vv=0
            for n in FRAMES:
                m,_,_=map_frame(n,o);p=frame(n)
                vv+=sum(1 for px,(v,l) in m.items() if l=='diff' and color_of(sp,int(p[px]),v,l)!=tuple(sp[int(p[px])]))
            vis[tag][o]=vv
    print(vis)
    json.dump(dict(frames=R,visible=vis),open(H+'/g11_teams.json','w'),indent=1,default=int)
