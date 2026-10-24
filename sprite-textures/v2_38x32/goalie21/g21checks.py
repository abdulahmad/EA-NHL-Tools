# Checks that every correction Abdul gave on g15 (pt911u) holds in the g21 labels. Writes ../goalie21/g21_checks.json.
import sys,os,json
H=os.path.dirname(os.path.abspath(__file__))
for d in ('','/../goalie16','/../goalie15','/../goalie14','/../goalie12'):sys.path.insert(0,H+d)
import g21seg
from g21seg import *
S=json.load(open('/tmp/g21_seg.json'))
def L(n):return np.array(S[str(n)]['lab'])
def adj(lab,y,x,T):return any(lab[d]==T for d in nb4(y,x,*lab.shape))
def cont(n):   # leg continuity: no blob of one side cut off from that side's main blob while touching the other leg
    lab=L(n);bad=0
    for A,O in ((PADL,PADR),(PADR,PADL)):
        bl=sorted(comps([tuple(c) for c in np.argwhere(lab==A)]),key=len,reverse=True)
        bad+=sum(len(c) for c in bl[1:] if any(adj(lab,*q,O) for q in c))
    return bad
def blk_on_pad(n,P):
    lab=L(n);p=frame(n);return int(sum(1 for y,x in np.argwhere(lab==BLOCK) if int(p[y,x]) in PADONLY and adj(lab,y,x,P)))
def butt_ok(n):
    p=frame(n);lab=L(n);b=butt(p,lab);return all(lab[c]==STICK for c in b),b
C={}
C['416 outer left pad not blocker']=(blk_on_pad(416,PADL)==0,'blocker px with pad-only index touching pad L: %d'%blk_on_pad(416,PADL))
for n,t in ((419,'419 left pad not right'),(407,'407 right pad inner edge not left'),(428,'428 left pad not right'),(980,'980 inner upper right pad not left')):
    C[t]=(cont(n)==0,'px cut off from their own leg but touching the other: %d'%cont(n))
lab=L(407);J=S['407']['joints'];C['407 no pad label on helmet']=(not np.isin(lab[:int(J['pelvis'][1]-4)],[PADL,PADR]).any(),'')
lab=L(425);C['425 left pad majority, no blocker']=((lab==PADL).sum()>(lab==PADR).sum() and (lab==BLOCK).sum()==0,'L %d R %d B %d'%((lab==PADL).sum(),(lab==PADR).sum(),(lab==BLOCK).sum()))
p=frame(1044);lab=L(1044);bad=[(int(y),int(x)) for y,x in np.argwhere(lab==STICK) if int(p[y,x]) in(0,8) and y>0 and lab[y-1,x] in(PADL,PADR,SKATE) and any(lab[yy,xx]==SKATE or int(p[yy,xx])==31 for yy in range(y-1,min(p.shape[0],y+2)) for xx in range(max(0,x-1),min(p.shape[1],x+2)))]
C['1044 skate not blade']=(not bad,'blade px under pad touching skate: %s'%bad)
p=frame(422);lab=L(422);bad=int(sum(1 for y,x in np.argwhere(lab==BODY) if int(p[y,x]) in CATZ and adj(lab,y,x,CATCH)))
C['422 glove covers catcher-colour body below it']=(bad==0,'body px with catcher index touching catcher: %d'%bad)
ok,b=butt_ok(538);C['538 stick butt']=(ok,str(b))
C['538 right pad not blocker']=(blk_on_pad(538,PADR)==0,'only pad-only-index px are checked (%d); the 144/146/147 board above the pad is still blocker - NEEDS coordinates from Abdul'%blk_on_pad(538,PADR))
bb={n:butt_ok(n) for n in FRAMES13};C['all frames stick butt is stick']=(all(v[0] for v in bb.values()),{n:v[1] for n,v in bb.items() if v[1]})
for k,(ok,why) in C.items():print('PASS' if ok else 'FAIL',k,'|',why)
json.dump({k:dict(ok=bool(v[0]),detail=str(v[1])) for k,v in C.items()},open(H+'/../goalie21/g21_checks.json','w'),indent=1)
