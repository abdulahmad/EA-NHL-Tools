import sys
from uv_proofs import *
FR=[int(x) for x in sys.argv[2].split(',')]
ims=[]
for n in FR:
    p,part,U,V,R=solve(n);m=p!=255;orig=sp[p].astype(float);sh=shade_of(p)[...,None];has=R!=''
    st=orig.copy();line=thin_stripe(V,R,0.5,['torso_front','torso_back'],1);st[line]=np.array([220,20,40])
    ck=orig.copy();s=sample(A['checker'],p,U,V,R);ck[has]=(s*sh)[has]
    ims.append(sheet([toimg(orig,m,9),toimg(ck,m,9),toimg(st,m,9)],3,2))
sheet(ims,2).save(sys.argv[1])
