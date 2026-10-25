"""D180b: apply the hard skeleton constraints to the fixed sample (docs/snes-redraw/sample_d180.json)
and write data/bundle_sample.js for the editor (open with launch.py --sample)."""
import json,os,sys
E=os.path.dirname(os.path.abspath(__file__));sys.path.insert(0,E)
from skelcheck import constrain_frame,SKC
S=json.load(open(sys.argv[1] if len(sys.argv)>1 else E+'/../../docs/snes-redraw/sample_d180.json'))
ids={r['frame'] for r in S if r['platform'] in('PC','GENEX')}
s=open(E+'/data/bundle.js').read();B=json.loads(s[s.index('{'):s.rindex('}')+1])
B['frames']=[f for f in B['frames'] if f['id'] in ids]
for f in B['frames']:
    f['why']=[w for w in f['why'] if not any(t in w for t in('off-pixel','zone-part','orphan px'))];constrain_frame(f)
    k=f.get('skc');f['score']=round(f['score']+((3*k['exist']+0.5*k['zone']+k['orphan']) if k else 0),1)
B['frames'].sort(key=lambda f:-f['score']);B['skc']=SKC
open(E+'/data/bundle_sample.js','w').write('window.BUNDLE='+json.dumps(B,separators=(',',':'))+';')
print(len(B['frames']),'sample frames; exist/zone/orphan before',SKC['before'],'after',SKC['after'],'frames with any',SKC['frames_before'],'->',SKC['frames_after'])
json.dump(SKC,open('/workspace/snesredraw/skc_sample_pc.json','w'))
