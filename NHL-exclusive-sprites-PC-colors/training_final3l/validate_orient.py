#!/usr/bin/env python3
"""Validate orientation_table against 95 PC pairs; write a progress contact sheet."""
import os,sys,json,math,collections
import numpy as np
from PIL import Image,ImageDraw,ImageFont
import pandas as pd

sys.path[:0]=[
  '/workspace/g94-to-pc-zones/v5/final3l/work',
  '/workspace/g94-to-pc-zones/v5/final3k/work',
  '/workspace/g94-to-pc-zones/v5/final3j/work',
  '/workspace/g94-to-pc-zones/v5/final3c/work',
  '/workspace/g94-to-pc-zones/v4/work',
  '/workspace/g94-to-pc-zones/v5/final3j/exclusive/fight',
]
from percolor import A,pairs,split,aligned_arrays,lab
from teams import teamact
from build_fight import GP

OUT='/workspace/g94-to-pc-zones/v5/final3l/orient/'
BOS=teamact('bos','h')
ICE=(168,196,214)
FB=lambda s: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',s)
FR=lambda s: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',s)
FONT,FONTS,FONTT=FB(13),FR(11),FB(16)
COL_A,COL_B=(0,114,178),(230,159,0)

def paint_g(g,bg=ICE):
  o=np.zeros(g.shape+(3,),np.uint8);o[:]=bg
  m=g>0;o[m]=GP[np.clip(g[m],0,255)];return o
def paint(idx,act,bg=ICE):
  o=np.zeros(idx.shape+(3,),np.uint8);o[:]=bg
  m=(idx!=255)&(idx>=0);o[m]=act[np.clip(idx[m],0,255)];return o
def big(a,z):
  return Image.fromarray(a).resize((a.shape[1]*z,a.shape[0]*z),Image.NEAREST)
def T(d,x,y,s,font,fill=(20,20,30)):
  d.text((x,y),s,fill=fill,font=font)

def circ(a,b):
  return min(abs(a-b), 8-abs(a-b))

def main():
  table=json.load(open(OUT+'orientation_table.json'))
  recs={(r['game'],r['frame']):r for r in table}
  spa95=json.load(open('/workspace/wt-census/sprite-textures/playerlayout/pose3d_v5/spa95pc.json'))
  pc_dirs=collections.defaultdict(set)
  for anim,dirs in spa95.items():
    if not isinstance(dirs,list) or len(dirs)<8: continue
    for d,seq in enumerate(dirs):
      for f in seq:
        try: pc_dirs[int(f)].add(d)
        except Exception: pass

  sk=pairs('skater')
  tr,te=split(sk)
  val=dict(all={},held={},train={})
  def score(split_name, S):
    st=dict(facing_n=0,facing_exact=0,facing_off1=0,facing_miss=0,
            crest_n=0,crest_ok=0,crest_vis_n=0,crest_vis_has=0,
            crest_none_n=0,crest_none_empty=0,by_dir={str(d):{'n':0,'ok':0} for d in range(8)},
            by_source=collections.defaultdict(lambda:dict(n=0,ok=0)))
    for n,o in S:
      rec=recs.get(('94G',int(n)))
      if rec is None: continue
      pcid=int(o['pc'])
      # facing: only when we made a unique anim call, or any final dir vs PC dirs
      if rec.get('dir') is not None and pcid in pc_dirs:
        st['facing_n']+=1
        d=int(rec['dir']); ok=d in pc_dirs[pcid]
        if ok: st['facing_exact']+=1
        elif any(circ(d,x)==1 for x in pc_dirs[pcid]): st['facing_off1']+=1
        else: st['facing_miss']+=1
        st['by_dir'][str(d)]['n']+=1
        if ok: st['by_dir'][str(d)]['ok']+=1
        src=rec.get('source') or '?'
        st['by_source'][src]['n']+=1
        if ok: st['by_source'][src]['ok']+=1
      # crest vs PC pixels
      try:
        _,p=aligned_arrays(n,o); p=np.asarray(p).astype(int)
      except Exception:
        continue
      m=(p>=0)&(p!=255)
      if m.sum()<8: continue
      has=int(((p>=192)&(p<=244)&m).sum())
      truth='visible' if has>=8 or (has/m.sum()>=0.01) else ('partial' if has>=2 else 'none')
      pred=rec.get('crest') or 'unknown'
      st['crest_n']+=1
      # visible/partial both count as "some crest" vs none
      def bin(x):
        return 'has' if x in ('visible','partial') else ('none' if x=='none' else 'unk')
      if bin(pred)!='unk' and bin(truth)!='unk':
        if bin(pred)==bin(truth): st['crest_ok']+=1
      if rec.get('body') in ('front','qfront_right','qfront_left'):
        st['crest_vis_n']+=1
        if truth in ('visible','partial'): st['crest_vis_has']+=1
      if rec.get('body') in ('back','qback_right','qback_left'):
        st['crest_none_n']+=1
        if truth=='none': st['crest_none_empty']+=1
    # rates
    def rate(a,b):
      return None if b==0 else round(a/b,3)
    st['facing_acc']=rate(st['facing_exact'],st['facing_n'])
    st['facing_acc_off1']=rate(st['facing_exact']+st['facing_off1'],st['facing_n'])
    st['crest_acc']=rate(st['crest_ok'],st['crest_n'])
    st['crest_front_precision']=rate(st['crest_vis_has'],st['crest_vis_n'])
    st['crest_back_precision']=rate(st['crest_none_empty'],st['crest_none_n'])
    st['by_source']={k:dict(v,acc=rate(v['ok'],v['n'])) for k,v in st['by_source'].items()}
    st['by_dir']={k:dict(v,acc=rate(v['ok'],v['n'])) for k,v in st['by_dir'].items()}
    return st
  val['train']=score('train',tr)
  val['held']=score('held',te)
  val['all']=score('all',sk)
  json.dump(val, open(OUT+'orient_validation.json','w'), indent=1)
  print('VALIDATION')
  for k in ('train','held','all'):
    s=val[k]
    print(f"  {k}: facing {s['facing_exact']}/{s['facing_n']} exact={s['facing_acc']} (+/-1 {s['facing_acc_off1']})  crest {s['crest_ok']}/{s['crest_n']} acc={s['crest_acc']}  front-has {s['crest_vis_has']}/{s['crest_vis_n']}={s['crest_front_precision']}  back-none {s['crest_none_empty']}/{s['crest_none_n']}={s['crest_back_precision']}")
    print('    by source', s['by_source'])

  # unique-anim vs any
  n_unique=sum(1 for r in table if r['game']=='94G' and r.get('source')=='anim')
  n_vis=sum(1 for r in table if r['game']=='94G' and 'visual' in (r.get('source') or ''))
  print('94G unique-anim',n_unique,'visual-involved',n_vis,'total',sum(1 for r in table if r['game']=='94G'))

  # progress sheet: dir 0-7 skatewp examples + exclusive samples
  skate={0:2,1:7,2:12,3:17,4:22,5:27,6:32,7:37}
  ex=pd.read_csv('/workspace/exclusive-frames/exclusive_frames.csv')
  samples=[]
  for d,n in skate.items():
    samples.append(('94G',n,f'skatewp dir {d}'))
  # a few exclusive
  for n in (659,670,714,738,791,803,830,835):
    samples.append(('94G',n,f'excl {n}'))
  for n in (354,357,358,368,376,633,639):
    samples.append(('93G',n,f'fight/inj {n}'))

  # load 93
  from build_fight import decode_with_origin
  ids93=[n for g,n,_ in samples if g=='93G']
  spr=decode_with_origin('/workspace/NHLPA93Genesis/Extracted/Graphics/Sprites.anim', ids93) if ids93 else {}

  cells=[]
  for game,n,note in samples:
    rec=recs.get((game,n),{})
    if game=='94G':
      g=A['G94'][n].astype(int)
    else:
      g=spr[n]['img'].astype(int)
    ys,xs=np.where(g>0)
    if len(xs):
      g=g[max(0,ys.min()-1):ys.max()+2, max(0,xs.min()-1):xs.max()+2]
    im=big(paint_g(g),3)
    lab1=f"{game} {n}"
    lab2=f"d{rec.get('dir')} {rec.get('dir_name','?')}  {rec.get('body','?')}"
    lab3=f"crest {rec.get('crest','?')}  {rec.get('source','?')}  c={rec.get('conf','?')}"
    cells.append((im,lab1,lab2,lab3))

  W=990; cols=4; pad=8
  cw=(W-16)//cols; ch=max(c[0].height for c in cells)+52
  rows=(len(cells)+cols-1)//cols
  H=56+rows*(ch+8)+8
  im=Image.new('RGB',(W,H),(255,255,255)); d=ImageDraw.Draw(im)
  T(d,8,6,'final3l step 2: facing from SPA tables + visual body orientation',FONTT)
  T(d,8,28,'Dir 0=down (toward camera), then clockwise.  Crest = predicted from body orientation.',FONTS)
  T(d,8,42,'skatewp 2/7/12/17/22/27/32/37 are the 8 unique-anim directions used to check the mapping.',FONTS)
  for i,(tile,l1,l2,l3) in enumerate(cells):
    r,c=divmod(i,cols)
    x=8+c*cw; y=56+r*(ch+8)
    T(d,x,y,l1,FONT,COL_A)
    T(d,x,y+16,l2,FONTS)
    T(d,x,y+30,l3,FONTS,(80,80,90))
    im.paste(tile,(x,y+44))
  path=OUT+'orient_progress_sheet.png'
  if im.width>1000: raise SystemExit(im.size)
  im.save(path)
  print('sheet',path,im.size)
  return val

if __name__=='__main__':
  main()
