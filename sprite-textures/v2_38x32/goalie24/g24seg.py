# g24: next animation group SPAgglover (glove save, screen right; frames not in FRAMES13). One process per frame:
# g16 joint fit (g16seg.seg) + the g21 R rules (post) -> /tmp/g24_<n>.json; 'merge' -> /tmp/g24_seg.json. Run from goalie12.
import sys,os,json
H=os.path.dirname(os.path.abspath(__file__))
GROUP=[408,411,414,417,420,423,426,429]
MASKIDX={0,22,135,164,177,184,185,186,187,188,189}
def evidence(n,p,lab):
    """D139 (pt942u: resolve by pixel match). 408: the px labelled MASK below helmet row 4 use jersey indices 153-173
    (no mask texel has them) -> BODY. 426 (back view): the BODY px at the left edge (x<=4, rows 8-14) use mask
    indices 164/177/184-189/135 -> MASK (the helmet back), not the catcher; 155/0 there stay BODY.
    417: the right-side LEFT PAD group uses exactly the pad-front indices (155/164/151/152/146/145/0; the catcher
    block has no 155/164) -> stays PADL."""
    if n==408:
        for y,x in zip(*((lab==2).nonzero())):
            if y>=4 and int(p[y,x]) not in MASKIDX:lab[y,x]=1
    if n==426:
        for y,x in zip(*((lab==1).nonzero())):
            if x<=4 and 8<=y<=14 and int(p[y,x]) in MASKIDX-{0}:lab[y,x]=2
    return lab
def one(n):
    sys.path[:0]=[H+'/../goalie21',H+'/../goalie15',H+'/../goalie16'];import g16seg,g21seg
    p,lab,J,src=g16seg.seg(n);lab,log=g21seg.post(n,p,lab,J);lab=evidence(n,p,lab)
    json.dump(dict(lab=lab.tolist(),joints={k:list(map(int,v)) for k,v in J.items()},src=src+' +R'),open('/tmp/g24_%d.json'%n,'w'),default=int)
def merge():json.dump({n:json.load(open('/tmp/g24_%d.json'%n)) for n in GROUP},open('/tmp/g24_seg.json','w'))
if __name__=='__main__':
    merge() if sys.argv[1]=='merge' else one(int(sys.argv[1]))
