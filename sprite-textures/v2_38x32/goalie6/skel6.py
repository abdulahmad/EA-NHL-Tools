# Goalie skeleton v6 = skeleton v5 (skel5: base pose rotated per SPA direction + per-frame ADJ) + the goalie STICK (Abdul pt863u).
# Stick per frame, read off the index grids: shaft = index 136 (pink), butt-end knob and blade tape = index 0.
# 'segs' = visible polylines (x,y) from butt to toe; the shaft is hidden behind the blocker/pads between segments.
# 'hand' = the hand holding the stick (the blocker hand = goalie RIGHT on every test frame), 'blade' = blade/paddle pixels.
import os,sys,math;sys.path.insert(0,os.path.join(os.path.dirname(os.path.abspath(__file__)),'../goalie5'))
from skel5 import ADJ,DIRS,fit,frame,J,GREADY,FACING
STICK={
 413:dict(butt=(5,12),segs=[[(5,12),(10,19)],[(15,18),(15,24)],[(13,23),(15,25)]],heel=(15,25),toe=(15,19),hand='R',bbox=(15,19,15,24)),
 416:dict(butt=(0,13),segs=[[(0,13),(7,19)],[(12,21),(16,26)],[(17,25),(22,22)]],heel=(16,26),toe=(22,22),hand='R',bbox=(17,22,21,26)),
 422:dict(butt=(6,0),segs=[[(6,0),(10,9)],[(13,16),(16,24)],[(17,23),(22,28)]],heel=(17,25),toe=(22,28),hand='R',bbox=(17,23,21,27)),
 428:dict(butt=(21,1),segs=[[(21,1),(18,7)],[(5,24),(5,26)]],heel=(5,26),toe=(6,25),hand='R',bbox=(6,23,6,25)),
 449:dict(butt=(27,9),segs=[[(27,9),(15,17)]],heel=None,toe=None,hand='R',bbox=None),
 519:dict(butt=(10,0),segs=[[(10,0),(19,9)]],heel=None,toe=None,hand='R',bbox=None),
 980:dict(butt=(23,10),segs=[[(23,10),(20,14)]],heel=None,toe=None,hand='R',bbox=None),
 1000:dict(butt=(34,0),segs=[[(34,0),(35,5)],[(36,16),(36,23)]],heel=(36,23),toe=(36,23),hand='R',bbox=None),
}
def blade_px(n):
    """index-0 pixels in the frame's blade box (the black-taped blade / paddle)"""
    b=STICK[n]['bbox'];p=frame(n)
    if not b:return []
    return [(y,x) for y in range(b[1],b[3]+1) for x in range(b[0],b[2]+1) if p[y,x]==0]
def stick_px(n,box=None):
    """shaft (136 within 1 px of a stick segment) + blade pixels"""
    p=frame(n);out=set(blade_px(n))
    def dseg(q,a,b):
        ax,ay=a;bx,by=b;vx,vy=bx-ax,by-ay;t=max(0,min(1,((q[0]-ax)*vx+(q[1]-ay)*vy)/max(vx*vx+vy*vy,1e-9)));return math.hypot(q[0]-ax-t*vx,q[1]-ay-t*vy)
    for y,x in zip(*(p==136).nonzero()):
        if any(dseg((x,y),a,b)<=1.5 for sg in STICK[n]['segs'] for a,b in zip(sg,sg[1:])):out.add((int(y),int(x)))
    return out
