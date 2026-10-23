# audit evidence images (aligned on feet anchor). usage: python3 evidence.py
import uv,json
from jerseys import *
from lib import H
from atlas import base
sp=spritepal(team('tor'));anc=lambda n:(H[n-1][4],H[n-1][5])
def cfg(on):uv.WRAP_LIMBS=uv.SIDE_FIX=uv.FRONT_SMOOTH=on;uv.ELEV=40 if on else 35
def test_atlas():
    A=Image.new('RGB',(512,512),(255,0,255));d=ImageDraw.Draw(A)
    col={'torso_front':(235,235,235),'torso_back':(150,150,150),'sleeve':(220,40,40),'sleeve_b':(40,80,220),'sock':(220,40,40),'sock_b':(40,80,220),'pants':(60,60,60)}
    for nm,(x,y,w,h) in ATLAS.items():
        d.rectangle((x,y,x+w-1,y+h-1),fill=col.get(nm,(200,200,60)))
        if nm in col:
            for v in np.arange(.1,1,.2):d.rectangle((x,y+int(v*h),x+w-1,y+int(v*h)+int(h*.06)),fill=(20,20,20))
    return A
TA=test_atlas()
def r(n,A=TA):
    p,part,U,V,Rg=solve(n);m=p!=255;has=Rg!='';o=sp[p].astype(float);sh=shade_of(p)[...,None];o[has]=(sample(A,p,U,V,Rg)*sh)[has];return toimg(o,m,5)
def ba(frames,name,cols=None):
    ims=[];an=[]
    for on in (False,True):
        cfg(on)
        for n in frames:ims.append(r(n));an.append(anc(n))
    anchored(ims,an,len(frames)).save('audit/'+name)
A=json.load(open('audit_before.json'));B=json.load(open('audit_fix2.json'))
D8=[1,9,17,25,33,41,49,57]
ba(D8,'A01_sides_wrap_8dirs_before_after.png')
# limbs that were straight before and curved after
lim=[int(n) for n in A if any(l['s'] is not None and l['s']<.05 and l['ay']>.5 and l['n']>=15 for l in A[n].get('limbs',[])) and not any(l['s'] is not None and l['s']<.05 and l['ay']>.5 and l['n']>=15 for l in B[n].get('limbs',[]))][:8]
ba(lim,'A02_limb_wrap_before_after.png');print('limbs',lim)
seq=list(range(100,108));ba(seq,'A03_temporal_seq_100_107.png')
ba(list(range(889,905,2)),'A04_crosscheck_95only.png')
ba([409,420,450,500,980,1000,1040,1060],'A05_goalies.png')
over=[int(n) for n in A if A[n].get('arm_over_torso',0)>=3][:8];ba(over,'A06_arm_over_torso.png');print('over',over)
st=[int(n) for n in A if A[n].get('sock_sep',0)>.5*A[n].get('pants_w',99)][:8];ba(st,'A07_stride_pants.png');print('stride',st)
