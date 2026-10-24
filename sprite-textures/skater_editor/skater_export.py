# Skater editor data (Abdul pt951u, D148): python3 skater_editor/skater_export.py [out.json] [team]
# Writes a LOCAL json with every skater frame's sprite indices, part labels (scripts/parts.py segment(), the skater
# pipeline's own parts) and skeleton joints (playerlayout pose3d_v5 joints2d where hand-fitted, else rough joints from
# part centres). It holds game data: keep it on your machine, never commit it. Open sprite-textures/skater_part_editor.html.
import sys,os,json,numpy as np
S=os.path.dirname(os.path.abspath(__file__))+'/..';sys.path.insert(0,S+'/scripts')
from lib import frame,H,team,spritepal
from parts import segment,PN,GOALIE
from scipy import ndimage as ndi
E=json.load(open('/tmp/skater_edits.json')) if os.path.exists('/tmp/skater_edits.json') else {}
J2=json.load(open(S+'/playerlayout/pose3d_v55/pose3d_v5.json'))['joints2d']
def rough(part):
    J={}
    def c(m):
        ys,xs=np.nonzero(m);return [int(round(xs.mean())),int(round(ys.mean()))]
    for k,names in (('head',['helmet','skin']),('chest',['torso','crest','shoulder_patch']),('pelvis',['pants'])):
        m=np.isin(part,[PN.index(n) for n in names])
        if m.any():J[k]=c(m)
    for k,n in (('glove','glove'),('skate','skate')):
        l,nk=ndi.label(part==PN.index(n),np.ones((3,3),bool))
        cs=sorted([c(l==i) for i in range(1,nk+1) if (l==i).sum()>=3])[:2]
        for s,p in zip('LR',cs):J[s+' '+k]=p
    return J
t=team(sys.argv[2] if len(sys.argv)>2 else 'edm');pal=spritepal(t)
F={}
for n in range(1,len(H)+1):
    if n in GOALIE:continue
    p=frame(n)
    if p.size==0 or (p!=255).sum()<10:continue
    part,g=segment(n,p)
    if g:continue
    j=J2.get(str(n));j={k:[int(round(v[0])),int(round(v[1]))] for k,v in j.items()} if j else rough(part)
    r=dict(px=p.astype(int).tolist(),lab=part.astype(int).tolist(),joints=j,fitted=str(n) in J2)
    if str(n) in E:r.update(E[str(n)]);r['edited']=True
    F[n]=r
out=dict(parts=PN,palette=[list(map(int,c)) for c in pal],team=t['code'],frames=F)
o=sys.argv[1] if len(sys.argv)>1 else '/tmp/skater_editor_data.json';json.dump(out,open(o,'w'),separators=(',',':'));print(o,len(F),'frames')
