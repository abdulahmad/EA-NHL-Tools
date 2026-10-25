"""D179: skeleton part names, the same as the editor's skLabels (pt1011u)."""
import re
from PIL import ImageFont
JN={'head':'head','neck':'neck','chest':'chest','belly':'belly','pelvis':'pelvis','stick butt':'butt','stick heel':'heel','stick toe':'toe'}
AB=dict(shoulder='shld',sh='shld',elbow='elb',elb='elb',wrist='wrist',glove='glove',hand='glove',hip='hip',knee='knee',ankle='ank',ank='ank',skate='skate')
def jname(k):
    if k in JN:return JN[k]
    m=re.match(r'^([LR]) ?(.*)$',k)
    if m:return m[1]+' '+AB.get(m[2],m[2])
    m=re.match(r'^(hand|stick)\d+ ([ab])$',k)
    return m[1] if m else k
def bname(a,b):
    s=(a+' '+b).lower();side=(b[0] if re.match('^[LR] ?',b) else a[0] if re.match('^[LR] ?',a) else '')+' '
    R=[('head','head',0),(r'neck.*(chest|pelvis)','torso',0),(r'neck.*sh','collar',1),(r'(chest|belly).*(pelvis|belly)','torso',0),(r'pelvis.*hip','pelvis',1),
       (r'sh.*elb','up arm',1),(r'elb.*(wrist|hand)','forearm',1),(r'wrist.*glove','hand',1),(r'hand\d','hand',0),(r'hip.*knee','thigh',1),(r'knee.*ank','shin',1),
       (r'ank.*skate','skate',1),(r'butt.*heel|stick\d','shaft',0),(r'heel.*toe','blade',0)]
    for pat,n,sd in R:
        if re.search(pat,s):return (side if sd else '')+n
    return a+'-'+b
def draw_labels(d,J,bones,k,W,H,size=12):
    f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',size);P=lambda q:((J[q][0]+.5)*k,(J[q][1]+.5)*k)
    L=[(bname(a,b),(P(a)[0]+P(b)[0])/2,(P(a)[1]+P(b)[1])/2,(255,224,0)) for a,b in bones if a in J and b in J]+[(jname(q),*P(q),(255,255,255)) for q in J]
    placed=[]
    for t,x,y,col in L:
        w=d.textlength(t,font=f)+4;h=size+2
        for dx,dy in [(8,0),(-8-w,0),(-w/2,-14),(-w/2,14),(8,-12),(8,12),(-8-w,-12),(-8-w,12),(16,0),(-16-w,0),(-w/2,-26),(-w/2,26)]:
            r=(x+dx,y+dy-h/2,x+dx+w,y+dy+h/2)
            if r[0]>=0 and r[1]>=0 and r[2]<=W and r[3]<=H and not any(r[0]<q[2] and r[2]>q[0] and r[1]<q[3] and r[3]>q[1] for q in placed):
                placed.append(r);d.text((r[0]+2,r[1]),t,font=f,fill=col,stroke_width=2,stroke_fill=(0,0,0));break
