"""Builds pairs.pkl: for each of the 406 matched SNES/94G/95PC triples (snes-style-compare/measurements.csv) the SNES sprite
placed on the real 94G canvas by best mask IoU. Run this first, then run1.py (trains the forests), then eval_oof.py / buildall.py."""
import sys;sys.path.insert(0,'/workspace/snes-to-pc')
from s2g import *
import pickle
m=triples();P=[]
for r in m.itertuples():
    S=A['S94'][r.s94];G=A['G94'][r.g94]
    Sp,i=place_best(S,G);P.append(dict(s=r.s94,g=r.g94,pc=r.pc_shown,grp=r.grp,cat=r.category,iou=i,S=Sp,G=G))
pickle.dump(P,open('/workspace/snes-to-pc/pairs.pkl','wb'))
print(len(P),np.mean([p['iou'] for p in P]))
