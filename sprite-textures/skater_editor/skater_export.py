# Skater editor data (Abdul pt951u, D148): python3 skater_editor/skater_export.py [out.json] [team]
# Writes a LOCAL json with every skater frame's sprite indices, part labels (scripts/parts.py segment(), the skater
# pipeline's own parts) and skeleton joints (playerlayout pose3d_v5 joints2d where hand-fitted, else rough joints from
# part centres). It holds game data: keep it on your machine, never commit it. Open sprite-textures/skater_part_editor.html.
import sys,os,json,numpy as np
S=os.path.dirname(os.path.abspath(__file__))+'/..';sys.path.insert(0,S+'/scripts')
from lib import frame,H,team,spritepal
from parts import segment,PN,GOALIE
from scipy import ndimage as ndi
ARGS=list(sys.argv);E=json.load(open('/tmp/skater_edits.json')) if os.path.exists('/tmp/skater_edits.json') else {}
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
t=team(ARGS[2] if len(ARGS)>2 else 'edm');pal=spritepal(t)
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
# textures (38x32 v2 layout) + diagnostic tests; tmap = sprite px -> v2 texel from the skater pipeline (v2map3: backmap + column_map_v2),
# which exists only for its evidence frames -- other frames show 'no mapping'.
from PIL import Image
sys.path.insert(0,S);import test_textures as TT
V=S+'/v2_38x32/';TX={}
for nm,f in [('Leafs home','textures/raw/leafs_home_v2.png'),('Rangers away','textures/raw/rangers_away_v2.png'),('Chicago home','textures/raw/chicago_home_top_v2.png'),
  ('Montreal baby blue','textures/raw/montreal_baby_blue_bottom_v2.png'),('Dallas black star','textures/raw/dallas_blackstar_num14_v2.png'),('East 94','textures/raw/east94_num77_v2.png'),
  ('Stripe diagnostic','textures/raw/stripe_diagnostic_v2.png'),('Layout (Abdul)','textures/layout_v2_38x32_abdul.png'),('Skate test','skates/skate_texture_test.png')]:
    TX[nm]=np.asarray(Image.open(V+f).convert('RGB')).astype(int)
base=TX['Stripe diagnostic'];used=~np.all(base==(252,0,252),axis=2)
TT_=TT.make(base,used,regions={'arm R':(0,0,3,21),'front torso':(3,0,13,17),'arm L':(16,0,4,21),'back arm L':(20,0,4,21),'back torso':(24,0,10,17),'back arm R':(34,0,4,21),'pants':(0,17,38,6),'legs/socks/skates':(0,23,38,9)})
textures={k:v.tolist() for k,v in TX.items()};textures.update(TT_)
try:
    import io,contextlib
    src=open(V+'scripts/v2map3.py').read();src=src[:src.index('def category')];GG={}
    with contextlib.redirect_stdout(io.StringIO()):exec(src,GG)
    for n,v in GG['MAPS'].items():
        if n in F:F[n]['tmap']={'%d,%d'%(int(y),int(x)):list(map(int,GG['COMP'][(int(u),int(w))])) for (y,x),(u,w) in v[1].items() if (int(u),int(w)) in GG['COMP']}
except Exception as e:print('no skater texture map (needs the local preview_back pipeline):',e)
out=dict(parts=PN,textures=textures,palette=[list(map(int,c)) for c in pal],team=t['code'],frames=F)
os.chdir(S);o=ARGS[1] if len(ARGS)>1 else '/tmp/skater_editor_data.json';json.dump(out,open(o,'w'),separators=(',',':'));print(o,len(F),'frames')
