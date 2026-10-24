# Goalie skeleton v10 (Abdul pt872u): goalie5/skel5 base pose + the CATCHER (left hand, Lhand) with a palm normal.
# Body frame (skel5): x = goalie right, y = up, z = goalie forward. Ready stance: catcher open, palm toward the shooter,
# turned slightly outward -> palm normal N = (-0.3, 0, 1) normalised. Yaw 45deg x d as skel5.proj (d0 away, d4 camera).
# toward-camera component of a body vector after yaw = x*sin(t) - z*cos(t) (skel5 'dep'; >0 = toward the viewer).
# Orientation: f > +0.38 FRONT (palm/pocket visible), f < -0.38 BACK (back of hand visible), else SIDE (rim/cuff edge-on).
import math
N=(-0.3,0.0,1.0);_l=math.hypot(*N);N=tuple(v/_l for v in N)
LHAND=(-10,17,6)   # skel5 BASE Lhand
def catcher(d):
    t=math.radians(45*d);f=N[0]*math.sin(t)-N[2]*math.cos(t)
    sx=LHAND[0]*math.cos(t)+LHAND[2]*math.sin(t)          # screen x of the catcher vs body centre (skel5 proj)
    o='FRONT' if f>0.38 else 'BACK' if f<-0.38 else 'SIDE'
    return dict(d=d,frontness=round(f,2),orient=o,screen='right' if sx>1 else 'left' if sx<-1 else 'centre')
if __name__=='__main__':
    for d in range(8):print(catcher(d))
