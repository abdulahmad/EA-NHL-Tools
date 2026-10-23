from uv import *
from atlas import base,labelled
from PIL import ImageDraw
sp=spritepal(team('tor'))
A={k:base(k) for k in ('checker','uv','candy','design')}
big=Image.new('RGB',(1024+16,1024+16),(10,10,10))
for i,k in enumerate(('uv','checker','candy','design')):
    big.paste(labelled(A[k]),((i%2)*(512+16),(i//2)*(512+16)))
big.save('20_reference_texture_atlas.png')
def shade_of(p):
    # continuous per-pixel shade from the original light/medium/dark zone (placeholder for a painted shade layer)
    s=np.ones(p.shape)
    for i,nm in ZN.items():
        i=int(i); s[p==i]=1.05 if 'light' in nm else 0.62 if 'dark' in nm else 0.85
    return s
def thin_stripe(V,R,v0,regions,thick=1):
    """constant-thickness isoline of V (screen-space), following the body curvature."""
    m=np.isin(R,regions)&~np.isnan(V);Vv=np.where(m,V,np.nan);out=np.zeros(V.shape,bool)
    for dy,dx in ((0,1),(1,0),(0,-1),(-1,0)):
        nb=np.roll(np.roll(Vv,dy,0),dx,1)
        out|=m&(Vv<v0)&(nb>=v0)
    if thick>1: out|=m&ndi.binary_dilation(out,iterations=thick-1)&(Vv<v0+0.12)&(Vv>v0-0.12)
    return out
FR=[1,9,17,25,33,41,49,57,100,200,300,889,897,1080,409,980]
rows=[]
for n in FR:
    p,part,U,V,R=solve(n);m=p!=255;has=R!='';orig=sp[p].astype(float);sh=shade_of(p)[...,None]
    uvv=orig*0.25;uvv[has]=np.stack([np.nan_to_num(U[has])*255,np.nan_to_num(V[has])*255,np.full(has.sum(),60)],-1)
    def tex(k):
        o=orig.copy();s=sample(A[k],p,U,V,R);o[has]=(s*sh)[has];return o
    st=orig.copy();line=thin_stripe(V,R,0.5,['torso_front','torso_back'],1);st[line]=np.array([20,40,170])*sh[line]
    st2=orig.copy();line2=thin_stripe(V,R,0.5,['torso_front','torso_back'],2);st2[line2]=np.array([20,40,170])*sh[line2]
    rows.append(sheet([toimg(orig,m,5),toimg(uvv,m,5),toimg(tex('checker'),m,5),toimg(tex('candy'),m,5),toimg(tex('design'),m,5),toimg(st,m,5),toimg(st2,m,5)],7,2))
sheet(rows[:8],1).save('21_uv_proofs_8dirs.png');sheet(rows[8:],1).save('22_uv_proofs_bend_cross_goalie.png')
