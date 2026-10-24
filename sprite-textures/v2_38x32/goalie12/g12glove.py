# Goalie v12 glove coherence (Abdul): the catcher must still look like a catcher. The free per-frame fit could squash
# (sy 0.40-0.55 skips every other texture row), start half-way down the piece (oy 3-6 drops the cuff/web rows) or flip
# the mirror inside one facing. Coherent fit: mirror fixed per facing family (FRONT d2-d5 and BACK d6/d7/d0/d1: no
# mirror = cuff on the wrist side as drawn), the whole piece covered top to bottom (oy -1..1, last sprite row lands on
# the last 2 texture rows), sy 0.75-1.6. Same zones-first matcher, same expand step.
import sys,os,json,math,collections
H12=os.path.dirname(os.path.abspath(__file__));sys.path.insert(0,H12)
from g12 import *
H12=os.path.dirname(os.path.abspath(__file__))
def fitc(p,q,TP):
    zones=set(int(v) for v in TP.flatten())-{TRANS}
    inz=[c for c in q if int(p[c]) not in g10match.SHADE and (int(p[c]) in zones or (WHITE in zones and int(p[c]) in g10match.WHITESET))]
    ys=[y for y,x in inz];h=max(ys)-min(ys)+1;th=TP.shape[0];best=None
    for sy10 in range(75,161,5):
        sy=sy10/100
        for oy in (-1,0,1):
            last=oy+int(math.floor((h-1)*sy))
            if not th-2<=last<=th:continue
            for ox in range(-3,4):
                M=g10match.mapper(inz,TP,sy,oy,ox,0)
                s=sum(1 for c,t in M.items() if t and TP[t]!=TRANS and g10match.eq(int(p[c]),int(TP[t])))
                key=(s,-abs(sy-1),-abs(ox))
                if best is None or key>best[0]:best=(key,(sy,oy,ox,0))
    return best[1] if best else None
def run(frames):
    out=[]
    for n in frames:
        p=frame(n);q=[tuple(c) for c in catcher_q(n)];k='catFront' if orient(n)=='FRONT' else 'catBack';row=dict(frame=n,d=GF[n][0][1],orient=orient(n),piece=k)
        for o in 'AB':
            TP,_=tpiece(o,k);pf=g10match.fit(p,q,TP);R0,_,_=g10match.evaluate(p,q,TP,pf)
            pc=fitc(p,q,TP);R1,_,_=g10match.evaluate(p,q,TP,pc) if pc else (R0,0,0)
            row[o]=dict(free=list(pf),free_s=R0['strict_diff'],free_a=R0['after_expand_diff'],coh=list(pc or pf),coh_s=R1['strict_diff'],coh_a=R1['after_expand_diff'])
        out.append(row);print(n,row['orient'],{o:'free %s %d>%d | coh %s %d>%d'%(row[o]['free'],row[o]['free_s'],row[o]['free_a'],row[o]['coh'],row[o]['coh_s'],row[o]['coh_a']) for o in 'AB'},flush=True)
    json.dump(out,open(H12+'/g12_glove.json','w'),indent=1,default=int);return out
if __name__=='__main__':
    allf=sorted({r['frame'] for r in json.load(open(H12+'/../goalie10/g10e_catcher.json'))})
    run(allf)
def scrambled(prm):
    sy,oy,ox,mir=prm;return mir==1 or sy<0.6 or oy>=3
def final(r,o):
    """D99: FRONT oval -> coherent fit when the free fit is scrambled (mirrored, squashed sy<0.6, or starts 3+ rows down).
    BACK/SIDE rect keeps the free fit: visually it already reads as the glove back, coherent made 425/535/554/980 worse."""
    return r[o]['coh'] if r['orient']=='FRONT' and scrambled(r[o]['free']) and r[o]['coh']!=r[o]['free'] else r[o]['free']
