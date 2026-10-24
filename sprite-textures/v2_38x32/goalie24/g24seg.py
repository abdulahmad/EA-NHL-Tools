# g24: next animation group SPAgglover (glove save, screen right; frames not in FRAMES13). One process per frame:
# g16 joint fit (g16seg.seg) + the g21 R rules (post) -> /tmp/g24_<n>.json; 'merge' -> /tmp/g24_seg.json. Run from goalie12.
import sys,os,json
H=os.path.dirname(os.path.abspath(__file__))
GROUP=[408,411,414,417,420,423,426,429]
def one(n):
    sys.path[:0]=[H+'/../goalie21',H+'/../goalie15',H+'/../goalie16'];import g16seg,g21seg
    p,lab,J,src=g16seg.seg(n);lab,log=g21seg.post(n,p,lab,J)
    json.dump(dict(lab=lab.tolist(),joints={k:list(map(int,v)) for k,v in J.items()},src=src+' +R'),open('/tmp/g24_%d.json'%n,'w'),default=int)
def merge():json.dump({n:json.load(open('/tmp/g24_%d.json'%n)) for n in GROUP},open('/tmp/g24_seg.json','w'))
if __name__=='__main__':
    merge() if sys.argv[1]=='merge' else one(int(sys.argv[1]))
