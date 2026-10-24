# Parallel driver: one process per frame -> /tmp/g16_<n>.json, then merge into g16_pads.json (+ /tmp/g16_seg.json).
import sys,os,json,collections,subprocess
H16=os.path.dirname(os.path.abspath(__file__))
def one(n):
    sys.path.insert(0,H16);sys.path.insert(0,H16+'/../goalie15');import g15pad,g16seg;from g15pad import frame,legs,why,g13pad
    p=frame(n);L,lab,J,src=legs(n);R=[]
    for g,q,sk in L:
        t,M,mode=g13pad.solve_leg(p,q);cl=collections.Counter(why(p,c,M.get(c)) for c in q)
        miss=collections.Counter(int(p[c]) for c in q if why(p,c,M.get(c))=='missing texel')
        R.append(dict(leg=g,px=len(q),skate=len(sk),mode=mode,**{k.replace(' ','_').replace('/','_'):v for k,v in cl.items()},missing_idx=dict(miss),
                 map={'%d,%d'%c:(list(map(int,M[c])) if M.get(c) else None) for c in q},skate_px=[list(map(int,c)) for c in sk]))
    json.dump(dict(pads=R,seg=dict(lab=lab.tolist(),joints={k:list(v) for k,v in J.items()},src=src)),open('/tmp/g16_%d.json'%n,'w'),default=int)
def merge():
    sys.path.insert(0,H16);sys.path.insert(0,H16+'/../goalie15');import g15pad
    out={};seg={};tot=collections.Counter()
    for n in g15pad.FRAMES13:
        d=json.load(open('/tmp/g16_%d.json'%n));G=json.load(open(H16+'/../goalie15/g15_pads.json'))['frames'][str(n)]
        mc=lambda L:sum(r.get('row_col_content',0) for r in L)
        if mc(d['pads'])>mc(G):   # no-regression guard: keep g15 legs (labels) for this frame
            d=dict(pads=G,seg=json.load(open('/tmp/g15_seg.json'))[str(n)]);d['seg']['src']+=' (g15 kept)'
        out[n]=d['pads'];seg[n]=d['seg']
        for r in d['pads']:
            for k in ('ok','row_col_content','missing_texel'):tot[k]+=r.get(k,0)
            tot['skate']+=r['skate']
    json.dump(dict(frames=out,totals=dict(tot)),open(H16+'/g16_pads.json','w'),default=int);json.dump(seg,open('/tmp/g16_seg.json','w'))
    print('TOTAL',dict(tot))
if __name__=='__main__':
    if sys.argv[1]=='merge':merge()
    else:one(int(sys.argv[1]))
