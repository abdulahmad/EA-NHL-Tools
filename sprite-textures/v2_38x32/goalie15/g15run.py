# Parallel driver: one process per frame -> /tmp/g15_<n>.json, then merge into g15_pads.json (+ /tmp/g15_seg.json).
import sys,os,json,collections,subprocess
H15=os.path.dirname(os.path.abspath(__file__))
def one(n):
    sys.path.insert(0,H15);import g15pad;from g15pad import frame,legs,why,g13pad
    p=frame(n);L,lab,J,src=legs(n);R=[]
    for g,q,sk in L:
        t,M,mode=g13pad.solve_leg(p,q);cl=collections.Counter(why(p,c,M.get(c)) for c in q)
        miss=collections.Counter(int(p[c]) for c in q if why(p,c,M.get(c))=='missing texel')
        R.append(dict(leg=g,px=len(q),skate=len(sk),mode=mode,**{k.replace(' ','_').replace('/','_'):v for k,v in cl.items()},missing_idx=dict(miss),
                 map={'%d,%d'%c:(list(map(int,M[c])) if M.get(c) else None) for c in q},skate_px=[list(map(int,c)) for c in sk]))
    json.dump(dict(pads=R,seg=dict(lab=lab.tolist(),joints={k:list(v) for k,v in J.items()},src=src)),open('/tmp/g15_%d.json'%n,'w'),default=int)
def merge():
    sys.path.insert(0,H15);import g15pad
    out={};seg={};tot=collections.Counter()
    for n in g15pad.FRAMES13:
        d=json.load(open('/tmp/g15_%d.json'%n));out[n]=d['pads'];seg[n]=d['seg']
        for r in d['pads']:
            for k in ('ok','row_col_content','missing_texel'):tot[k]+=r.get(k,0)
            tot['skate']+=r['skate']
    json.dump(dict(frames=out,totals=dict(tot)),open(H15+'/g15_pads.json','w'),default=int);json.dump(seg,open('/tmp/g15_seg.json','w'))
    g15pad.g15tex.save(g15pad.g12pad.OPT['A'][0],H15+'/goalie_texture_v6_indexed.png');print('TOTAL',dict(tot))
if __name__=='__main__':
    if sys.argv[1]=='merge':merge()
    else:one(int(sys.argv[1]))
