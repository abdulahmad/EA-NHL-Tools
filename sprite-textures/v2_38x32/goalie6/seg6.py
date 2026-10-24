# Goalie gear segmentation v6 = seg v5 (Abdul pt863u: 416 and 1000 confirmed) minus the goalie stick (skel6.STICK):
# 422 blade pixels had been taken as pad FRONT (Abdul: "goalie stick highlighted for FR"); the same check also frees 416 and 428 blade pixels.
# 428 blocker: rotation check (skel6 base pose at d7 vs d0/d1) puts the right hand at depth -9.2 (the farthest joint, behind the torso),
# so only the cuff where the stick meets the hand is visible; the 5 px stay blocker, nothing else is added.
import sys,os,json,numpy as np;HERE=os.path.dirname(os.path.abspath(__file__));sys.path.insert(0,HERE);sys.path.insert(0,os.path.join(HERE,'../goalie5'))
from seg5 import seg as seg5,FRG
from skel6 import stick_px
FREED={}
def seg(n):
    p,L,v,LEG=seg5(n);L=L.copy();st=stick_px(n);fr=[]
    for q in st:
        if L[q]:fr.append((q,L[q]));L[q]=''
    FREED[n]=fr;return p,L,v,LEG,st
if __name__=='__main__':
    J={}
    for n in FRG:
        p,o,f,_,st=seg(n);u,c=np.unique(o[o!=''],return_counts=True)
        J[n]=dict(view=f,stick_px=len(st),freed_from_gear=[(int(q[1]),int(q[0]),l) for q,l in FREED[n]],**{a:int(b) for a,b in zip(u,c)})
    print(json.dumps(J));json.dump(J,open('/workspace/preview_v2/goalie6/seg6_stats.json','w'),indent=1)
