import sys,json,collections;sys.path.insert(0,'.');sys.path.insert(0,__import__('os').path.dirname(__import__('os').path.abspath(__file__)))
from ppmap import *
fr=player_frames();M=collections.defaultdict(lambda:[0,0,None]);print(len(fr),'player frames')
for n in fr:
    p,a,info=address(n);c=collections.Counter()
    for k in a.values():
        if k[0]=='crest':continue
        b=k[:4];m=M[b]
        if k[4]+1>m[0]:m[0]=k[4]+1
        if k[5]+1>m[1]:m[1]=k[5]+1;m[2]=n
json.dump({'|'.join(k):v for k,v in sorted(M.items())},open('poc2/measure.json','w'),indent=0);print(len(M),'band blocks')
