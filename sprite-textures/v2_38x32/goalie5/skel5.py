# Goalie skeleton v5: one 3D base pose (SPAgready, 8 directions 407..428), rotated by yaw 45deg x d,
# fitted (scale + offset) per frame, then per-frame 2D adjustments (hand-placed joints, ADJ).
# Directions from frames95pc.asm SPA tables: d0 = facing away (goalie right = screen right), d4 = facing camera,
# d2 = goalie right side toward camera (faces screen-right), d6 = left side toward camera (faces screen-left).
import os,sys,math,numpy as np
os.chdir('/workspace/preview_back/root/sprite-textures/out');sys.path.insert(0,'../scripts')
from lib import frame
J=['head','neck','Rsh','Lsh','Relb','Lelb','Rhand','Lhand','pelvis','Rhip','Lhip','Rknee','Lknee','Rank','Lank']
# body frame: x = goalie right, y = up, z = goalie forward (units ~ px)
BASE={'head':(0,29,0.5),'neck':(0,25,0),'Rsh':(5,24,0),'Lsh':(-5,24,0),'Relb':(8,18,3),'Lelb':(-8,18,3),
      'Rhand':(6,12,7),'Lhand':(-10,17,6),'pelvis':(0,13,-1),'Rhip':(3,13,-1),'Lhip':(-3,13,-1),
      'Rknee':(5,7,4),'Lknee':(-5,7,4),'Rank':(6,0,0),'Lank':(-6,0,0)}
PITCH=math.radians(30)
GREADY={407:0,410:1,413:2,416:3,419:4,422:5,425:6,428:7}
DIRS={**GREADY,449:1,519:0,980:0,1000:1}       # 449 SPAgstackr d1/d2 (same frame), 519 SPAgdive d0, 980 SPAgoaliepoke d0, 1000 SPAgoalieknee d1
def proj(d):
    t=math.radians(45*d);out={}
    for k,(x,y,z) in BASE.items():
        sx=x*math.cos(t)+z*math.sin(t);dep=x*math.sin(t)-z*math.cos(t)
        out[k]=(sx,-y*math.cos(PITCH)+dep*math.sin(PITCH),dep)
    return out
def body_mask(n):
    p=frame(n);return (p!=255)&(p!=88)&(p!=136)
def fit(n):
    """scale + offset: head top -> sprite top+2, ankles -> lowest body row-2, x centre -> silhouette centroid"""
    P=proj(DIRS[n]);m=body_mask(n);ys,xs=np.nonzero(m)
    top=min(v[1] for v in P.values());bot=max(P['Rank'][1],P['Lank'][1])
    s=((ys.max()-2)-(ys.min()+2))/(bot-top);cx=np.mean([v[0] for v in P.values()])
    return {k:(xs.mean()+(v[0]-cx)*s,ys.min()+2+(v[1]-top)*s,v[2]) for k,v in P.items()}
# per-frame adjusted 2D joints (x,y sprite px), read off the index grids idx_<n>.png
ADJ={
 413:dict(head=(10,3),neck=(9,6),Rsh=(10,8),Lsh=(5,8),Relb=(12,12),Lelb=(2,10),Rhand=(12,17),Lhand=(0,12),
          pelvis=(5,15),Rhip=(6,16),Lhip=(4,16),Rknee=(8,19),Lknee=(4,20),Rank=(8,25),Lank=(3,25)),
 416:dict(head=(13,3),neck=(12,6),Rsh=(7,8),Lsh=(15,8),Relb=(5,12),Lelb=(16,10),Rhand=(7,14),Lhand=(18,10),
          pelvis=(7,13),Rhip=(5,14),Lhip=(10,14),Rknee=(6,19),Lknee=(12,17),Rank=(6,25),Lank=(14,24)),
 422:dict(head=(18,3),neck=(19,6),Rsh=(16,7),Lsh=(27,6),Relb=(14,9),Lelb=(28,9),Rhand=(12,11),Lhand=(26,11),
          pelvis=(22,11),Rhip=(19,11),Lhip=(27,11),Rknee=(18,14),Lknee=(27,14),Rank=(19,21),Lank=(28,21)),
 428:dict(head=(8,2),neck=(9,5),Rsh=(15,7),Lsh=(8,7),Relb=(17,11),Lelb=(6,12),Rhand=(16,7),Lhand=(3,16),
          pelvis=(13,17),Rhip=(15,18),Lhip=(10,18),Rknee=(15,21),Lknee=(8,21),Rank=(16,26),Lank=(10,28)),
 449:dict(head=(12,2),neck=(12,5),Rsh=(14,8),Lsh=(6,7),Relb=(15,11),Lelb=(4,10),Rhand=(18,14),Lhand=(1,12),
          pelvis=(8,14),Rhip=(11,15),Lhip=(5,15),Rknee=(11,17),Lknee=(4,17),Rank=(13,21),Lank=(5,21)),
 519:dict(head=(11,4),neck=(11,7),Rsh=(16,8),Lsh=(6,8),Relb=(17,9),Lelb=(4,9),Rhand=(19,10),Lhand=(3,10),
          pelvis=(11,17),Rhip=(15,19),Lhip=(8,19),Rknee=(16,22),Lknee=(7,22),Rank=(18,28),Lank=(7,28)),
 980:dict(head=(14,2),neck=(14,5),Rsh=(18,9),Lsh=(10,9),Relb=(19,12),Lelb=(6,11),Rhand=(20,15),Lhand=(3,14),
          pelvis=(14,16),Rhip=(17,18),Lhip=(11,18),Rknee=(19,19),Lknee=(9,19),Rank=(21,23),Lank=(9,24)),
 1000:dict(head=(30,9),neck=(27,9),Rsh=(26,11),Lsh=(25,7),Relb=(31,13),Lelb=(28,11),Rhand=(34,10),Lhand=(29,15),
          pelvis=(15,8),Rhip=(15,11),Lhip=(14,6),Rknee=(11,15),Lknee=(9,9),Rank=(5,17),Lank=(3,10)),
}
# facing per Abdul pt861u (authoritative); 'mixed' = per region
FACING={413:'front (side, faces screen-right)',416:'front',422:'front',428:'back + front side (faces screen-left, away)',
        449:'back',519:'back',980:'back',1000:'back + front side (lying, head screen-right)'}
def swap_test(n):
    """does the base projection's L/R identity agree with the adjusted joints? (cost unswapped vs swapped)"""
    F=fit(n);A=ADJ[n];sw=lambda k:('L'+k[1:]) if k[0]=='R' else (('R'+k[1:]) if k[0]=='L' else k)
    c=lambda f:sum(math.dist(A[k],F[f(k)][:2]) for k in J)
    return round(c(lambda k:k),1),round(c(sw),1)
if __name__=='__main__':
    for n in ADJ:print(n,DIRS[n],swap_test(n))
