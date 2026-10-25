# Sprite editor bundle (Abdul pt1006u/pt1007u): python3 sprite-textures/editor/build_bundle.py
# Builds editor/data/bundle.js and the single self-contained editor editor/data/sprite_editor.html (both gitignored: game sprite data) from the local pipelines:
#   skaters  - skater_editor/skater_export.py (D161/D163 skeletons, hand + auto texture maps)
#   goalies  - v2_38x32/goalie28 (<tempdir>/g28_all.json from g28all.py: labels, joints, pipeline maps)
#   exclusives - D175 run (preview_v2/exclusive_samples/v3: skel175.json + <tempdir>/d175_dump.pkl from run175.py), if present
# plus every test texture. Saved edits in editor/edits/ are folded in so the editor reopens where you left off.
import os,sys,json,subprocess,pickle
E=os.path.dirname(os.path.abspath(__file__));sys.path.insert(0,E)
from envcheck import need,need_data,tmp,ROOT
need();need_data()   # friendly errors: missing packages / missing out/data (run scripts/dump.js)
import numpy as np
S=ROOT;V=os.path.join(S,'v2_38x32','')
EXC=os.environ.get('EXCL_DIR',os.path.join(os.path.dirname(os.path.dirname(S)),'preview_v2','exclusive_samples','v3'))
from PIL import Image
def edits(kind):
  p=os.path.join(E,'edits',f'{kind}_edits.json');return json.load(open(p)).get('frames',{}) if os.path.exists(p) else {}
B=dict(textures={},palettes={},frames=[])
def tex(name,arr,kind):B['textures'][name]=dict(kind=kind,px=np.asarray(arr).astype(int).tolist())
# ---- skaters
SKB=[['head','neck'],['neck','chest'],['chest','belly'],['belly','pelvis'],['neck','R shoulder'],['neck','L shoulder'],['pelvis','R hip'],['pelvis','L hip'],
 ['R shoulder','R elbow'],['R elbow','R wrist'],['R wrist','R glove'],['L shoulder','L elbow'],['L elbow','L wrist'],['L wrist','L glove'],
 ['R hip','R knee'],['R knee','R ankle'],['R ankle','R skate'],['L hip','L knee'],['L knee','L ankle'],['L ankle','L skate'],['stick butt','stick heel'],['stick heel','stick toe']]
subprocess.run([sys.executable,os.path.join(S,'skater_editor','skater_export.py'),tmp('_sk_bundle.json')],check=True,cwd=S)
D=json.load(open(tmp('_sk_bundle.json')));B['palettes']['skater']=D['palette'];B['parts_skater']=D['parts']
for k,v in D['textures'].items():tex(k,v,'v2')
ed=edits('skater')
for n,r in D['frames'].items():
  why=[] if r.get('skel_ok',True) else list(r.get('skel_why') or ['skeleton flagged'])
  if r.get('skel_src')=='part labels':why.append('hand-joint pass: skeleton is only from part labels')
  if not r.get('tmap'):why.append('no texture map')
  e=ed.get(str(n),{});B['frames'].append(dict(id=f'skater {n}',kind='skater',pal='skater',px=r['px'],lab=e.get('lab',r['lab']),bp=e.get('bp'),joints=e.get('joints',r['joints']),bones=SKB,
    tmap=r.get('tmap') or {},src=r.get('tmap_src','none')+' map, '+str(r.get('skel_src')),why=why,err=[],nud=[],edited=bool(e)))
# ---- goalies (texture coords stored as [col,row] like the skaters)
GB=[['head','neck'],['neck','pelvis'],['neck','Rsh'],['neck','Lsh'],['Rsh','Relb'],['Relb','Rhand'],['Lsh','Lelb'],['Lelb','Lhand'],['pelvis','Rhip'],['pelvis','Lhip'],
 ['Rhip','Rknee'],['Rknee','Rank'],['Lhip','Lknee'],['Lknee','Lank']]
if not os.path.exists(tmp('g28_all.json')):subprocess.run([sys.executable,'g28all.py'],cwd=os.path.join(V,'goalie28'),check=False)
if os.path.exists(tmp('g28_all.json')):
  subprocess.run([sys.executable,os.path.join(V,'goalie28','g28export.py'),tmp('_g_bundle.json')],check=True,cwd=os.path.join(V,'goalie12'))
  G=json.load(open(tmp('_g_bundle.json')));A=json.load(open(tmp('g28_all.json')));B['palettes']['goalie']=G['palette']
  for k,v in G['textures'].items():tex('Goalie: '+k,v,'goalie')
  ed=edits('goalie')
  for n,r in G['frames'].items():
    tm={}
    for part,m in A[n].get('maps',{}).items():
      for yx,t in m.items():
        if t:tm[yx]=[int(t[1]),int(t[0])]
    eq=[(y,x) for y,row in enumerate(r['lab']) for x,v in enumerate(row) if 2<=v<=7]   # mask, catcher, blocker, stick, pads carry texels; body/skates keep game colour
    um=sum(1 for y,x in eq if f'{y},{x}' not in tm);nb=len(eq);why=[] if tm else ['no texture map']
    if um>max(3,0.1*nb):why.append(f'{um} equipment px unmapped')
    e=ed.get(str(n),{});B['frames'].append(dict(id=f'goalie {n}',kind='goalie',pal='goalie',px=r['px'],lab=e.get('lab',r['lab']),bp=e.get('bp'),joints=e.get('joints',r['joints']),bones=GB,
      tmap=tm,src='goalie28 pipeline map',why=why,err=[],nud=[],edited=bool(e),unm=um))
else:print('goalie data missing (run v2_38x32/goalie28/g28all.py locally)')
# ---- Genesis exclusives (D175) + the D169 Leafs and D175 control textures
if os.path.exists(os.path.join(EXC,'skel175.json')) and os.path.exists(tmp('d175_dump.pkl')):
  sys.path[:0]=[EXC,os.path.dirname(EXC),os.path.dirname(EXC)+'/v2']
  from gpal import GP
  PC={33:(255,255,255),34:(90,90,90),35:(0,90,255),36:(255,220,0),37:(150,0,200),38:(255,140,0),39:(0,220,255),40:(130,60,0),41:(255,120,220),42:(0,0,140),43:(255,255,150),44:(0,140,140),45:(200,0,0)}
  B['palettes']['genesis']=[list(map(int,c)) for c in GP]
  os.chdir(EXC);_,_,FT=pickle.load(open(os.path.join(EXC,'tex_G94_d169.pkl'),'rb'));_,FI=pickle.load(open(os.path.join(EXC,'tex175_ctl.pkl'),'rb'))
  REP={'white':44,'navy':36,'skin':38,'black':34};L=np.full((32,38,3),(252,0,252));C=L.copy()
  for (u,v),f in FT.items():L[v,u]=GP[REP[f]]
  for (u,v),i in FI.items():C[v,u]=PC[i]
  tex('D169 Leafs (frozen key)',L,'v2');tex('D175 control (shade groups)',C,'v2')
  SK=json.load(open(os.path.join(EXC,'skel175.json')));DU=pickle.load(open(tmp('d175_dump.pkl'),'rb'));ed=edits('exclusive')
  for k,r in DU.items():
    g=np.asarray(r['g']);px=np.where(g>0,g,255).astype(int).tolist();sk=SK.get(k,{})
    why=[f"{len(r['IM'])} wrong control zone",f"{r['err']} Leafs errors",f"{len(r['EX'])} nudged"]+list(sk.get('flags',[]))
    e=ed.get(k,{});B['frames'].append(dict(id=k.replace('_',' '),kind='exclusive',pal='genesis',px=px,lab=None,bp=e.get('bp'),joints=e.get('joints',sk.get('joints',{})),
      bones=[b[:2] for b in sk.get('bones',[])],tmap={f'{y},{x}':[int(u),int(v)] for (y,x),(u,v) in r['M'].items()},src='D175 joint+warp fit',
      why=why,err=[list(map(int,p)) for p in r['IM']],nud=[list(map(int,p)) for p in r['EX']],edited=bool(e)))
else:print('exclusive D175 data missing:',EXC)
# D180b hard skeleton constraints (pixel existence, colour zone, coverage): enforce on auto-fit joints, flag the rest
from skelcheck import check,enforce
from skelcheck import constrain_frame as _constrain,SKC
if os.environ.get('SKC')=='1':   # full-set enforcement is opt-in; use skc_sample.py on the fixed sample (t1020u)
  for f in B['frames']:_constrain(f)
  print('skeleton constraints exist/zone/orphan before',SKC['before'],'after',SKC['after'],'frames with any',SKC['frames_before'],'->',SKC['frames_after'])
  B['skc']=SKC
# worst-first queue: wrong-zone px + 0.5*nudges + 25 per skeleton flag / hand-joint item + 15 for no map
def score(f):
  if f['kind']=='skater' and f['lab'] and sum(v in(2,3,4) for row in f['lab'] for v in row)<10:   # arrows, puck, UI: not a player sprite
    f['why']=['not a player sprite (no helmet/skin/torso px)'];return 0
  s=len(f['err'])+0.5*len(f['nud'])+0.5*f.get('unm',0)
  if any('no texture map' in w for w in f['why']):s+=15
  k=f.get('skc');s+=(3*k['exist']+0.5*k['zone']+k['orphan']) if k else 0
  if any(not any(t in w for t in('no texture map','wrong control','Leafs errors','nudged','unmapped','off-pixel','zone-part','orphan px')) for w in f['why']):s+=25   # skeleton flag / hand-joint pass
  return s
for f in B['frames']:f['score']=round(score(f),1)
NSF=os.path.join(os.path.dirname(S),'docs','snes-redraw','nostick_d183.json')
NSEED=json.load(open(NSF)).get('frames',{}) if os.path.exists(NSF) else {}
for f in B['frames']:
  e=edits(f['kind']).get(f['id'].split(' ')[-1] if f['kind']!='exclusive' else f['id'].replace(' ','_'),{})
  if 'nostick' in e:f['nostick']=bool(e['nostick']);f['nostick_src']='edit'
  elif f['id'] in NSEED:f['nostick']=True;f['nostick_src']='auto (D183)'
B['nostick_seed']=sorted(NSEED)
# D187: one connected skeleton tree per frame (missing joints inferred, canonical bones); not for non-player sprites
from skeltree import connect
for f in B['frames']:
  if not any('not a player' in w for w in f['why']):connect(f)
B['frames'].sort(key=lambda f:-f['score'])
import time;B['tree']='D189';B['built']=time.strftime('%Y-%m-%d %H:%M %Z')   # D189: the editor warns when its data predates the connected-tree build
os.makedirs(os.path.join(E,'data'),exist_ok=True)
open(os.path.join(E,'data','bundle.js'),'w').write('window.BUNDLE='+json.dumps(B,separators=(',',':'))+';')
from single import write_html
print('bundle:',len(B['frames']),'frames,',len(B['textures']),'textures ->',write_html(B,'sprite_editor.html'))
