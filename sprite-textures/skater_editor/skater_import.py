# Feed skater editor fixes back (Abdul pt951u, D148): python3 skater_editor/skater_import.py skater_edits.json
# Merges into /tmp/skater_edits.json (local). skater_export.py then serves these labels/joints in place of the automatic ones;
# pipelines can read /tmp/skater_edits.json the same way. Labels are scripts/parts.py PN codes (0-19).
import sys,json,os
E=json.load(open('/tmp/skater_edits.json')) if os.path.exists('/tmp/skater_edits.json') else {}
N=json.load(open(sys.argv[1]));N=N.get('frames',N)
for n,r in N.items():
    assert set(r)>={'lab','joints'} and all(0<=v<=19 for row in r['lab'] for v in row),n
    E[str(n)]={'lab':r['lab'],'joints':{k:[int(round(a)) for a in v] for k,v in r['joints'].items()}}
json.dump(E,open('/tmp/skater_edits.json','w'));print('edits for',len(N),'frames; total',len(E))
