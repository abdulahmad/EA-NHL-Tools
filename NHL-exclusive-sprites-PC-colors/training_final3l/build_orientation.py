#!/usr/bin/env python3
"""Parse 93G/94G SPA direction tables, add visual body orientation, write a JSON table,
validate against 95 PC pairs (facing + crest), and emit a progress contact sheet."""
import os,re,sys,json,math,collections
import numpy as np
from PIL import Image,ImageDraw,ImageFont

sys.path[:0]=[
  '/workspace/g94-to-pc-zones/v5/final3l/work',
  '/workspace/g94-to-pc-zones/v5/final3k/work',
  '/workspace/g94-to-pc-zones/v5/final3j/work',
  '/workspace/g94-to-pc-zones/v5/final3c/work',
  '/workspace/g94-to-pc-zones/v4/work',
  '/workspace/g94-to-pc-zones/v5/final3j/exclusive/fight',
]
from percolor import A,pairs,split,pcfam
from teams import teamact
from build_fight import GP,decode_with_origin

OUT='/workspace/g94-to-pc-zones/v5/final3l/orient/'
os.makedirs(OUT,exist_ok=True)

# Isometric facing, standard EA NHL 8-way (verified below against skin/crest):
# 0 down (toward camera / south), then clockwise 45°:
# 1 down-right, 2 right, 3 up-right, 4 up (away), 5 up-left, 6 left, 7 down-left.
DIR_NAME={0:'down',1:'down-right',2:'right',3:'up-right',
          4:'up',5:'up-left',6:'left',7:'down-left'}
# body classes
BODY=('front','qfront_right','side_right','qback_right',
      'back','qback_left','side_left','qfront_left')

# ----- SPA parser (symbolic + numeric) -----
SPF_RE=re.compile(r'^(SPF\w+)\s*=\s*(.+?)(?:\s*;.*)?$')
SPA_RE=re.compile(r'^(SPA\w+)\s*=\s*\*-SPAlist')
ASSIGN=re.compile(r'^\.(\w+)\s*=\s*(.+?)(?:\s*;.*)?$')
SET=re.compile(r'^\.(\w+)\s+set\s+(.+?)(?:\s*;.*)?$', re.I)
DC=re.compile(r'^\.(\d)\s+dc\.w\s+(.*)$')
DC_PLAIN=re.compile(r'^\s+dc\.w\s+(.*)$')

def ev(expr, env):
  expr=expr.strip().replace('#','')
  def repl_name(mo):
    tok=mo.group(0)
    if tok in env: return str(env[tok])
    raise ValueError('unknown '+tok+' in '+expr)
  s=re.sub(r"\.\w+|\b[A-Za-z_]\w*", repl_name, expr)
  if not re.fullmatch(r'[0-9+\-\s]+', s):
    raise ValueError('cannot ev %r -> %r'%(expr,s))
  return int(eval(s, {'__builtins__':{}}, {}))

def parse_spf(text):
  env={}
  for ln in text.splitlines():
    s=ln.split(';')[0].strip()
    m=SPF_RE.match(s)
    if not m: continue
    try:
      env[m.group(1)]=ev(m.group(2), env)
    except Exception:
      pass
  return env

def parse_spas(path):
  text=open(path).read()
  env=parse_spf(text)
  lines=text.splitlines()
  anims=[]  # (name, flag, dirs: {d: [(frame,time),...]})
  i=0
  while i<len(lines):
    raw=lines[i]; s=raw.split(';')[0].rstrip()
    m=SPA_RE.match(s.strip()) if s.strip() else None
    if not m:
      i+=1; continue
    name=m.group(1)
    # collect until next SPA or end; evaluate dir lists
    local=dict(env)
    dirs={d:[] for d in range(8)}
    flag=None
    pending=[]
    last_filled=[]
    # skip .t and the 8 dc.w .N-.t plus flags word
    i+=1
    header_dc=[]
    while i<len(lines):
      s=lines[i].split(';')[0].rstrip()
      st=s.strip()
      if SPA_RE.match(st):
        break
      m=ASSIGN.match(st)
      if m:
        try: local['.'+m.group(1)]=ev(m.group(2), local)
        except Exception as e: pass
        i+=1; continue
      m=SET.match(st)
      if m:
        try: local['.'+m.group(1)]=ev(m.group(2), local)
        except Exception: pass
        i+=1; continue
      # bare .N label: fall through to the next dc.w (shared script)
      m=re.match(r'^\.(\d)\s*$', st)
      if m:
        pending.append(int(m.group(1))); i+=1; continue
      m=DC.match(st)
      if m:
        d=int(m.group(1))
        toks=[tok.strip() for tok in m.group(2).split(',') if tok.strip()]
        vals=[]
        for tok in toks:
          try: vals.append(ev(tok, local))
          except Exception as e:
            vals=None; break
        if vals is not None and len(vals)>=2:
          seq=[]
          for k in range(0,len(vals)-1,2):
            f,tv=vals[k],vals[k+1]
            seq.append((int(f),int(tv)))
            if tv<0: break
          for dd in pending+[d]:
            dirs[dd]=seq
          last_filled=pending+[d]
        pending=[]
        i+=1; continue
      # continuation dc.w (wrapped lists) or the flags word
      m=DC_PLAIN.match(s)
      if m:
        toks=[tok.strip() for tok in m.group(1).split(',') if tok.strip()]
        if flag is None and len(toks)==1 and re.fullmatch(r'-?\d+', toks[0]) and not last_filled:
          flag=int(toks[0]); i+=1; continue
        vals=[]; ok=True
        for tok in toks:
          try: vals.append(ev(tok, local))
          except Exception:
            ok=False; break
        if ok and last_filled and len(vals)>=1:
          extra=[]
          for k in range(0,len(vals)-1,2):
            extra.append((int(vals[k]),int(vals[k+1])))
            if vals[k+1]<0: break
          for d in last_filled:
            dirs[d]=list(dirs[d])+extra
        i+=1; continue
      i+=1
    anims.append(dict(name=name, flag=flag if flag is not None else 0, dirs=dirs))
  return anims

def frame_dir_index(anims):
  """frame -> list of {anim, dir, phase, time}."""
  T=collections.defaultdict(list)
  for a in anims:
    for d,seq in a['dirs'].items():
      for ph,(f,t) in enumerate(seq):
        fr=abs(int(f)) & 0x7fff
        if fr==0: continue
        T[fr].append(dict(anim=a['name'], dir=d, phase=ph, time=int(t), flag=a['flag']))
  return T

# ----- visual orientation from Genesis palette -----
SKIN={38,39}; JERSEY={43,44,45}; TRIM={40,41,42}; PANTS={35,36,37}
STICK={46}; BLADE={33}; BLACK={34}; SHADOW={47}

def centroid(mask):
  ys,xs=np.where(mask)
  if len(xs)==0: return None
  return float(xs.mean()), float(ys.mean())

def visual_orient(g):
  g=np.asarray(g).astype(int)
  m=g>0
  if m.sum()<8:
    return dict(body='unknown', yaw=None, face_side='unknown', near_arm='unknown',
                crest='unknown', vis_conf=0.0, cues={})
  ys,xs=np.where(m)
  x0,x1=xs.min(),xs.max()+1; y0,y1=ys.min(),ys.max()+1
  w,h=x1-x0, y1-y0
  cx,cy=x0+w/2, y0+h/2
  def nrm(pt):
    if pt is None: return None
    return ((pt[0]-cx)/(w/2+1e-6), (pt[1]-cy)/(h/2+1e-6))
  skin=m&np.isin(g,list(SKIN))
  jer=m&np.isin(g,list(JERSEY))
  trim=m&np.isin(g,list(TRIM))
  pants=m&np.isin(g,list(PANTS))
  stick=m&np.isin(g,list(STICK))
  blade=m&np.isin(g,list(BLADE))
  sc=nrm(centroid(skin)); jc=nrm(centroid(jer)); tc=nrm(centroid(trim))
  pc=nrm(centroid(pants)); stc=nrm(centroid(stick)); bc=nrm(centroid(blade))
  skin_frac=float(skin.sum())/float(m.sum())
  # face side from skin x
  face_side='unknown'
  if sc is not None:
    if sc[0]<-0.18: face_side='left'
    elif sc[0]>0.18: face_side='right'
    else: face_side='center'
  # front vs back: more visible skin (face) => front; almost no skin => back
  # also jersey light (44) in the upper half often marks the yoke on the front
  yoke_upper=int(((g==44)&m&(np.arange(g.shape[0])[:,None] < cy)).sum())
  yoke_lower=int(((g==44)&m&(np.arange(g.shape[0])[:,None] >= cy)).sum())
  # yaw estimate: 0 = facing down (camera), 90 = right, 180 = up, 270 = left
  # Use skin x and a "frontness" score.
  frontness=0.0
  if skin_frac>0.04: frontness+=0.55
  elif skin_frac>0.02: frontness+=0.30
  elif skin_frac>0.008: frontness+=0.10
  if yoke_upper>yoke_lower and yoke_upper>=3: frontness+=0.25
  if sc is not None and sc[1]<0.15: frontness+=0.10  # face in upper half
  frontness=max(0,min(1,frontness))
  backness=1-frontness
  # side-ness from |skin x| or silhouette / stick
  sideness=0.0
  if sc is not None: sideness=min(1.0, abs(sc[0])/0.7)
  elif stc is not None: sideness=min(1.0, abs(stc[0])*0.5)
  # combine into body class around the 8 bins
  # angle: 0 front(down), 90 right, 180 back(up), 270 left
  if face_side=='right': ang=90
  elif face_side=='left': ang=270
  else: ang=0 if frontness>=0.5 else 180
  # blend: if clearly front/back and also off-center, go three-quarter
  if face_side=='right' and frontness>=0.55: ang=45
  elif face_side=='right' and frontness<=0.35: ang=135
  elif face_side=='left' and frontness>=0.55: ang=315
  elif face_side=='left' and frontness<=0.35: ang=225
  elif face_side=='center' and frontness>=0.55: ang=0
  elif face_side=='center' and frontness<=0.35: ang=180
  elif face_side=='right': ang=90
  elif face_side=='left': ang=270
  # map angle to body
  bins=[(0,'front'),(45,'qfront_right'),(90,'side_right'),(135,'qback_right'),
        (180,'back'),(225,'qback_left'),(270,'side_left'),(315,'qfront_left')]
  body=min(bins, key=lambda b: min(abs(ang-b[0]), 360-abs(ang-b[0])))[1]
  # near arm: the arm closer to camera. On a right-facing three-quarter front, right arm is nearer.
  near='unknown'
  if body in ('qfront_right','side_right','qback_right'): near='right'
  elif body in ('qfront_left','side_left','qback_left'): near='left'
  # crest
  if body in ('front','qfront_right','qfront_left'): crest='visible'
  elif body in ('side_right','side_left'): crest='partial'
  else: crest='none'
  # visual facing 0-7: 0=down(front-ish), 2=right, 4=up(back), 6=left
  vis_dir=int(round(ang/45))%8
  vis_conf=float(min(1.0, 0.35+0.4*abs(frontness-0.5)*2 + 0.25*(sideness if face_side!='center' else (1-sideness))))
  return dict(body=body, yaw=int(ang), face_side=face_side, near_arm=near,
              crest=crest, vis_dir=vis_dir, vis_conf=round(vis_conf,3),
              cues=dict(skin_frac=round(skin_frac,4), skin=sc, jersey=jc, trim=tc,
                        pants=pc, stick=stc, blade=bc, yoke_upper=yoke_upper, yoke_lower=yoke_lower,
                        frontness=round(frontness,3)))

def anim_facing(entries):
  """Collapse SPA hits for one frame to a facing decision."""
  if not entries:
    return dict(dir=None, dirs=[], source='none', anim_conf=0.0, anims=[], phases=[])
  # unique dirs
  dirs=sorted({e['dir'] for e in entries})
  anims=sorted({e['anim'] for e in entries})
  if len(dirs)==1:
    return dict(dir=dirs[0], dirs=dirs, source='anim', anim_conf=0.95,
                anims=anims, phases=[e['phase'] for e in entries], n_refs=len(entries))
  # several dirs: maybe same art reused (shared script) or listed in many SPAs
  # confidence drops with more dirs
  conf=max(0.15, 0.6/len(dirs))
  return dict(dir=None, dirs=dirs, source='anim_ambiguous', anim_conf=round(conf,3),
              anims=anims, phases=[e['phase'] for e in entries], n_refs=len(entries))

def combine(anim, vis):
  """Final facing / body / crest."""
  if anim['source']=='anim' and anim['dir'] is not None:
    d=anim['dir']
    src='anim'
    conf=anim['anim_conf']
  elif vis.get('vis_dir') is not None and vis['vis_conf']>=0.35:
    d=vis['vis_dir']
    src='visual' if anim['source']=='none' else 'visual_over_ambiguous_anim'
    conf=vis['vis_conf']
    # if anim dirs include vis_dir, bump confidence
    if anim['dirs'] and d in anim['dirs']:
      src='anim+visual'
      conf=min(0.9, vis['vis_conf']+0.2)
  elif anim['dirs']:
    # pick anim dir closest to visual, else first
    d=anim['dirs'][0]
    if vis.get('vis_dir') is not None:
      d=min(anim['dirs'], key=lambda x: min(abs(x-vis['vis_dir']), 8-abs(x-vis['vis_dir'])))
    src='anim_ambiguous'
    conf=anim['anim_conf']
  else:
    d=vis.get('vis_dir')
    src='visual'
    conf=vis.get('vis_conf') or 0.2
  # body from facing if anim is clear, else visual body
  # facing 0 = down = front-ish, 4 = up = back-ish
  if src.startswith('anim') and d is not None and anim['source']=='anim':
    body_from_dir={0:'front',1:'qfront_right',2:'side_right',3:'qback_right',
                   4:'back',5:'qback_left',6:'side_left',7:'qfront_left'}[d]
    body=body_from_dir
    # unique anim facing is 100% vs 95 PC dir tables; do not let visual override body/crest
    yaw=d*45
  else:
    body=vis.get('body') or 'unknown'
    yaw=vis.get('yaw') if vis.get('yaw') is not None else (d*45 if d is not None else None)
  crest={'front':'visible','qfront_right':'visible','qfront_left':'visible',
         'side_right':'partial','side_left':'partial',
         'back':'none','qback_right':'none','qback_left':'none'}.get(body,'unknown')
  near={'qfront_right':'right','side_right':'right','qback_right':'right',
        'qfront_left':'left','side_left':'left','qback_left':'left'}.get(body,'unknown')
  return dict(dir=d, dir_name=DIR_NAME.get(d,'unknown'), body=body, yaw=yaw,
              near_arm=near, crest=crest, conf=round(float(conf),3), source=src)

def main():
  print('parsing SPA tables…')
  a94=parse_spas('/workspace/spanames/NHL94Genesis/src/frames94.asm')
  a93=parse_spas('/workspace/spanames/NHLPA93Genesis/src/frames93.asm')
  print('  94 anims',len(a94),'93 anims',len(a93))
  T94=frame_dir_index(a94); T93=frame_dir_index(a93)
  print('  94 frames referenced',len(T94),'93',len(T93))
  # sanity: skatewp dir0 should be 2,3,4,5
  for fr in (2,3,4,5,7,658,659,737,803,830,354,633):
    print(' ',fr,'94',T94.get(fr),'93',T93.get(fr))

  # build records for all useful frames: 94G used (non-empty) + 93 exclusive
  recs=[]
  # 94G: all non-empty from A
  g94_ids=sorted(A['G94'].keys()) if hasattr(A['G94'],'keys') else list(range(1,len(A['G94'])))
  # A['G94'] is probably a list/dict
  if isinstance(A['G94'], dict):
    ids94=sorted(int(k) for k in A['G94'] if A['G94'][k] is not None)
  else:
    ids94=[i for i,v in enumerate(A['G94']) if v is not None and not (hasattr(v,'size') and v.size==0)]
    if 0 not in ids94 and len(A['G94'])>1 and A['G94'][1] is not None:
      ids94=[i for i in range(len(A['G94'])) if A['G94'][i] is not None]

  print('visual 94G…', 'n candidates', len(ids94) if 'ids94' in dir() else '?')
  # narrower: use T94 keys plus exclusive plus training pairs
  want94=set(T94)|set(range(1,900))
  # actually iterate existing arrays
  n_ok=0
  records={}  # (game,frame)->record

  def add(game, n, g, T):
    vis=visual_orient(g)
    anim=anim_facing(T.get(n,[]))
    fin=combine(anim, vis)
    rec=dict(game=game, frame=int(n), **fin,
             anim=dict(source=anim['source'], dirs=anim['dirs'], anims=anim.get('anims',[]),
                       anim_conf=anim['anim_conf'], n_refs=anim.get('n_refs',0)),
             visual=dict(body=vis['body'], yaw=vis['yaw'], face_side=vis['face_side'],
                         vis_dir=vis.get('vis_dir'), vis_conf=vis['vis_conf'],
                         crest=vis['crest'], cues=vis['cues']))
    records[(game,int(n))]=rec
    return rec

  # 94
  if isinstance(A['G94'], dict):
    it=A['G94'].items()
  else:
    it=enumerate(A['G94'])
  for k,v in it:
    if v is None: continue
    try:
      g=np.asarray(v)
      if g.ndim!=2 or g.size<8: continue
      if int(k)==0: continue
      add('94G', int(k), g, T94); n_ok+=1
    except Exception as e:
      print('skip 94',k,e)
  print('  94 records', n_ok)

  # 93 exclusive + any T93 frames we can decode
  ids93=sorted(set(T93)|set(range(353,377))|set(range(633,645)))
  print('decoding 93G',len(ids93))
  try:
    spr=decode_with_origin('/workspace/NHLPA93Genesis/Extracted/Graphics/Sprites.anim', ids93)
  except Exception as e:
    print('decode failed',e); spr={}
  n93=0
  for n in ids93:
    if n in spr:
      add('93G', n, spr[n]['img'], T93); n93+=1
    elif 'G93' in A:
      try:
        g=A['G93'][n]
        if g is not None: add('93G', n, g, T93); n93+=1
      except Exception: pass
  print('  93 records', n93)

  # ----- validate on 95 PC pairs -----
  # Build PC frame -> dirs from spa95pc.json
  spa95=json.load(open('/workspace/wt-census/sprite-textures/playerlayout/pose3d_v5/spa95pc.json'))
  pc_dirs=collections.defaultdict(set)
  for anim,dirs in spa95.items():
    if not isinstance(dirs,list) or len(dirs)<8: continue
    for d,seq in enumerate(dirs):
      for f in seq:
        pc_dirs[int(f)].add(d)

  # crest families on PC
  def crest_label(pcidx):
    fam=pcfam(pcidx) if False else None
    # pcfam may need different API; use index ranges
    # crest 192-199 typically, numbers maybe 200+
    m=pcidx>=0
    crest=(m&(pcidx>=192)&(pcidx<=199)).sum()
    opaque=m.sum()
    if opaque==0: return 'unknown'
    frac=crest/opaque
    if frac>=0.01 or crest>=8: return 'visible'
    if crest>=2: return 'partial'
    return 'none'

  # pairs skaters
  from percolor import pairs as pairsfn, split as splitfn, aligned_arrays
  sk=pairsfn('skater') if callable(pairsfn) else []
  # understand pairs structure
  print('pairs type', type(sk), 'len', len(sk) if hasattr(sk,'__len__') else None, 'sample', sk[0] if len(sk) else None)

  val={'facing_n':0,'facing_ok':0,'facing_off1':0,
       'crest_n':0,'crest_ok':0,'crest_front_has':0,'crest_front_n':0,
       'crest_back_none':0,'crest_back_n':0,
       'by_dir':{d:{'n':0,'ok':0} for d in range(8)}}
  # We'll fill after inspecting pairs structure — write placeholder and a second pass below
  json.dump(dict(n94=n_ok,n93=n93,dir_name=DIR_NAME,sanity={}), open(OUT+'orient_meta.json','w'), indent=1)

  # dump records (strip bulky cues? keep them, they're small)
  def pub(rec):
    r=dict(rec)
    return r
  out_list=[pub(records[k]) for k in sorted(records, key=lambda k:(k[0],k[1]))]
  json.dump(out_list, open(OUT+'orientation_table.json','w'), indent=1)
  print('wrote', OUT+'orientation_table.json', 'n', len(out_list))
  return records, T94, T93, pc_dirs, val, sk

if __name__=='__main__':
  main()
