# Feed editor fixes back (Abdul pt947u): python3 g28import.py goalie_edits.json -> merges into /tmp/g28_edits.json, which
# g28all.py uses in place of the automatic segmentation/joints for those frames. Then rerun g28all.py and the render.
import sys,json,os
E=json.load(open('/tmp/g28_edits.json')) if os.path.exists('/tmp/g28_edits.json') else {}
N=json.load(open(sys.argv[1]));N=N.get('frames',N)
for n,r in N.items():
    assert set(r)>={'lab','joints'} and all(0<=v<=9 for row in r['lab'] for v in row),n
    E[str(n)]={'lab':r['lab'],'joints':{k:[int(round(a)) for a in v] for k,v in r['joints'].items()}}
json.dump(E,open('/tmp/g28_edits.json','w'));print('edits for',len(N),'frames; total',len(E))
