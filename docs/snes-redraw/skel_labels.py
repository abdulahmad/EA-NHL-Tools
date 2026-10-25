"""D181: short skeleton tags, same as the editor's skLabels (pt1021u): H, LH, RH, LK, RK, LF, RF, SHAFT, BLADE only."""
from PIL import ImageFont
TAGJ=[('H',['head']),('LH',['L glove','Lhand']),('RH',['R glove','Rhand']),('LK',['L knee','Lknee']),('RK',['R knee','Rknee']),
      ('LF',['L skate','L ankle','Lank']),('RF',['R skate','R ankle','Rank'])]
LEGEND='Skeleton tags: H head, LH/RH left/right hand, LK/RK left/right knee, LF/RF left/right foot, SHAFT stick shaft, BLADE stick blade.'
def draw_labels(d,J,bones,k,W,H,size=9):
    f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',size);P=lambda q:((J[q][0]+.5)*k,(J[q][1]+.5)*k)
    L=[(t,*P(q)) for t,ks in TAGJ for q in [next((q for q in ks if q in J),None)] if q]
    for t,a,b in [('SHAFT','stick butt','stick heel'),('BLADE','stick heel','stick toe')]:
        if a in J and b in J:L.append((t,(P(a)[0]+P(b)[0])/2,(P(a)[1]+P(b)[1])/2))
    placed=[]
    for t,x,y in L:
        w=d.textlength(t,font=f)+6;h=size+4
        for dx,dy in [(5,-5),(-5-w,-5),(5,6),(-5-w,6),(-w/2,-14),(-w/2,12),(9,0),(-9-w,0)]:
            r=(x+dx,y+dy-h/2,x+dx+w,y+dy+h/2)
            if r[0]>=0 and r[1]>=0 and r[2]<=W and r[3]<=H and not any(r[0]<q[2] and r[2]>q[0] and r[1]<q[3] and r[3]>q[1] for q in placed):
                placed.append(r);d.rectangle(r,fill=(0,0,0),outline=(187,187,187));d.text((r[0]+3,r[1]+1),t,font=f,fill=(255,255,255));break
