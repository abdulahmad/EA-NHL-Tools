# Goalie skeleton v10d (Abdul pt874u): one full-body 3D goalie (ready stance) rotated per facing (yaw 45deg x d, as the skater
# skeletons and goalie5), then hand-adjusted joints per frame for the 8 ready facings 407-428, read off the index grids.
# Body frame: x = goalie right, y = up, z = goalie forward. d0 = facing away (goalie right = screen right), d2 = faces
# screen-RIGHT (right side toward camera), d4 = facing camera, d6 = faces screen-LEFT (left side toward camera).
# BASE hands moved to the sides (Rhand x8 z3, Lhand x-9 z4) so the 3/4 views put the blocker on the correct side (D87).
# Hands: RH = blocker + stick, LH = catcher. Legs: RL/LL = right/left pad.
import math
J=['head','neck','Rsh','Lsh','Relb','Lelb','Rhand','Lhand','pelvis','Rhip','Lhip','Rknee','Lknee','Rank','Lank']
BASE={'head':(0,29,0.5),'neck':(0,25,0),'Rsh':(5,24,0),'Lsh':(-5,24,0),'Relb':(8,18,3),'Lelb':(-8,18,3),
      'Rhand':(8,12,3),'Lhand':(-9,17,4),'pelvis':(0,13,-1),'Rhip':(3,13,-1),'Lhip':(-3,13,-1),
      'Rknee':(5,7,4),'Lknee':(-5,7,4),'Rank':(6,0,0),'Lank':(-6,0,0)}
PITCH=math.radians(30)
READY={407:0,410:1,413:2,416:3,419:4,422:5,425:6,428:7}
FACE={0:'away',1:'away, turned screen-right',2:'faces screen-RIGHT (side)',3:'camera, turned screen-right',4:'camera',
      5:'camera, turned screen-left',6:'faces screen-LEFT (side)',7:'away, turned screen-left'}
def rot(v,d):
    t=math.radians(45*d);x,y,z=v;sx=x*math.cos(t)+z*math.sin(t);dep=x*math.sin(t)-z*math.cos(t)   # dep>0 = toward camera
    return sx,-y*math.cos(PITCH)+dep*math.sin(PITCH),dep
def proj(d):return {k:rot(v,d) for k,v in BASE.items()}
# per-frame adjusted joints (sprite x,y), D88. Checked against the mask face side (164/0 eye px), blocker board (147/144),
# catcher (148 rim), stick 136 and the pads (155 trim) in each frame.
ADJ={
 407:dict(head=(11,3),neck=(11,6),Rsh=(16,8),Lsh=(6,8),Relb=(18,11),Lelb=(5,10),Rhand=(19,13),Lhand=(4,12),pelvis=(11,18),Rhip=(15,19),Lhip=(8,19),Rknee=(16,23),Lknee=(7,23),Rank=(16,27),Lank=(8,27)),
 410:dict(head=(17,2),neck=(16,5),Rsh=(19,7),Lsh=(11,7),Relb=(21,11),Lelb=(10,8),Rhand=(23,14),Lhand=(9,8),pelvis=(15,18),Rhip=(18,19),Lhip=(12,19),Rknee=(19,22),Lknee=(12,22),Rank=(19,26),Lank=(11,25)),
 413:dict(head=(10,3),neck=(9,6),Rsh=(6,9),Lsh=(10,8),Relb=(8,12),Lelb=(11,10),Rhand=(12,16),Lhand=(12,9),pelvis=(6,17),Rhip=(6,18),Lhip=(7,17),Rknee=(8,21),Lknee=(5,21),Rank=(9,24),Lank=(4,25)),
 416:dict(head=(13,3),neck=(12,6),Rsh=(7,8),Lsh=(15,8),Relb=(5,12),Lelb=(17,9),Rhand=(9,16),Lhand=(18,10),pelvis=(11,18),Rhip=(8,19),Lhip=(13,19),Rknee=(7,22),Lknee=(15,22),Rank=(7,25),Lank=(16,25)),
 419:dict(head=(20,2),neck=(20,6),Rsh=(14,8),Lsh=(26,8),Relb=(12,11),Lelb=(28,10),Rhand=(13,12),Lhand=(31,11),pelvis=(20,16),Rhip=(16,17),Lhip=(24,17),Rknee=(15,20),Lknee=(25,20),Rank=(16,23),Lank=(25,23)),
 422:dict(head=(18,2),neck=(19,6),Rsh=(16,7),Lsh=(26,7),Relb=(14,10),Lelb=(27,10),Rhand=(12,11),Lhand=(26,13),pelvis=(23,16),Rhip=(19,17),Lhip=(27,17),Rknee=(18,20),Lknee=(27,20),Rank=(19,22),Lank=(28,22)),
 425:dict(head=(2,7),neck=(4,10),Rsh=(8,12),Lsh=(5,12),Relb=(7,15),Lelb=(4,17),Rhand=(6,19),Lhand=(3,23),pelvis=(9,22),Rhip=(10,22),Lhip=(9,23),Rknee=(11,26),Lknee=(8,27),Rank=(12,29),Lank=(8,30)),
 428:dict(head=(8,2),neck=(9,5),Rsh=(15,7),Lsh=(7,7),Relb=(17,10),Lelb=(6,12),Rhand=(17,8),Lhand=(3,16),pelvis=(12,18),Rhip=(15,19),Lhip=(9,19),Rknee=(16,23),Lknee=(9,23),Rank=(16,26),Lank=(10,28)),
}
STICK={407:[(24,8),(19,14),(20,17)],410:[(29,10),(22,17),(22,26)],413:[(5,12),(9,19),(15,25)],416:[(0,14),(9,18),(16,26)],
       419:[(5,4),(15,16),(18,25)],422:[(6,1),(16,22),(22,28)],425:[(6,0),(5,17),(1,33)],428:[(20,2),(17,7),(6,26)]}
N=(-0.3,0.0,1.0);_l=math.hypot(*N);N=tuple(v/_l for v in N)   # catcher palm normal (palm to the shooter, a bit outward)
def catcher(d):
    f=rot(N,d)[2]-rot((0,0,0),d)[2]
    return dict(d=d,frontness=round(f,2),orient='FRONT' if f>0.38 else 'BACK' if f<-0.38 else 'SIDE')
def sides(n):
    """screen side of each limb vs the neck, from the adjusted joints; and the base model's prediction (consistency check)."""
    A=ADJ[n];d=READY[n];P=proj(d);cx=(A['Rsh'][0]+A['Lsh'][0])/2;px=(P['Rsh'][0]+P['Lsh'][0])/2;out={}
    for k,j in (('RH blocker','Rhand'),('LH catcher','Lhand'),('RL pad','Rank'),('LL pad','Lank')):
        a=A[j][0]-cx;b=P[j][0]-px
        out[k]=('right' if a>0.5 else 'left' if a<-0.5 else 'centre','right' if b>0.5 else 'left' if b<-0.5 else 'centre',round(P[j][2],1))
    return out
if __name__=='__main__':
    for n,d in READY.items():print(n,d,FACE[d],catcher(d)['orient'],sides(n))
