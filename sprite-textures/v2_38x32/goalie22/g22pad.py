# Goalie v22 pads: labels are ground truth (g21 segmentation, pad/skate pixel sets taken unchanged from g21_pads.json).
# New: a leg may be split into TWO pieces by one straight cut (sprite row, sprite column, or a 45-degree diagonal), each piece
# mapped with its own best g14 mode (row/diag arcs or column paths). A split costs SPLIT_PEN, so it is kept only when it removes
# at least two strict errors. Physically: the knee roll / boot cuff and the pad face bend differently, so one global cylinder
# mapping for the whole leg is too stiff. Same texture, no new texels, strict index equality.
import sys,os,json,collections
H=os.path.dirname(os.path.abspath(__file__))
for d in ('/../goalie15','/../goalie16','/../goalie14','/../goalie13','/../goalie12'):sys.path.insert(0,H+d)
import g15pad,g14pad
from g15pad import frame,why,g13pad
SPLIT_PEN=1.5
def strict(p,q,M):return sum(why(p,c,M.get(c))!='ok' for c in q)
def solve(p,q):
    t,M,mode=g13pad.solve_leg(p,q);best=(strict(p,q,M),M,mode)
    if best[0]==0:return best
    cuts=[('y',lambda c:c[0]),('x',lambda c:c[1]),('y+x',lambda c:c[0]+c[1]),('y-x',lambda c:c[0]-c[1])]
    for nm,f in cuts:
        vals=sorted({f(c) for c in q})
        for k in vals[2:-2]:
            A=[c for c in q if f(c)<k];B=[c for c in q if f(c)>=k]
            if len(A)<6 or len(B)<6:continue
            _,MA,ma=g13pad.solve_leg(p,A);ea=strict(p,A,MA)
            if ea+SPLIT_PEN>=best[0]:continue
            _,MB,mb=g13pad.solve_leg(p,B);e=ea+strict(p,B,MB)
            if e+SPLIT_PEN<best[0]:best=(e,{**MA,**MB},'split %s<%d: [%s] + [%s]'%(nm,k,ma,mb))
    return best
def one(n):
    old=json.load(open(H+'/../goalie21/g21_pads.json'))['frames'][str(n)];p=frame(n);R=[]
    for r in old:
        q=[tuple(map(int,k.split(','))) for k in r['map']];e,M,mode=solve(p,q)
        cl=collections.Counter(why(p,c,M.get(c)) for c in q)
        R.append(dict(leg=r['leg'],px=len(q),skate=r['skate'],mode=mode,**{k.replace(' ','_').replace('/','_'):v for k,v in cl.items()},
                      missing_idx={},map={'%d,%d'%c:(list(map(int,M[c])) if M.get(c) else None) for c in q},skate_px=r['skate_px']))
    json.dump(R,open('/tmp/g22_%d.json'%n,'w'),default=int)
def merge():
    out={};tot=collections.Counter()
    for n in g15pad.FRAMES13:
        out[n]=json.load(open('/tmp/g22_%d.json'%n))
        for r in out[n]:
            for k in ('ok','row_col_content','missing_texel'):tot[k]+=r.get(k,0)
            tot['skate']+=r['skate']
        print(n,sum(r.get('row_col_content',0)+r.get('missing_texel',0) for r in out[n]),[r['mode'] for r in out[n]])
    json.dump(dict(frames=out,totals=dict(tot)),open(H+'/g22_pads.json','w'),default=int);print('TOTAL',dict(tot))
if __name__=='__main__':
    merge() if sys.argv[1]=='merge' else one(int(sys.argv[1]))
