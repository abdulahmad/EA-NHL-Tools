import os,sys;sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)));import paths
import json,csv,collections
R=json.load(open(paths.WORK+'recon.json'))['results'];OUT=paths.STATUS
with open(OUT+'psd_layers_status.csv','w',newline='') as f:
  w=csv.writer(f);w.writerow(['layer','psd_group','layer_type','visible','bbox_x0_y0_x1_y1','overlays_composited','matched_93_frame','silhouette_iou','mirrored','how_matched','status','pc_pct','pc_px','shared_black_px','genesis_px','off_palette_px','hole_px','name_vs_pixels_flag','remaining_colours','detached_parts_outside_frame'])
  for r in R:
    c=r['counts']
    w.writerow([r['layer'],r['group'],r['kind'],r['visible'],' '.join(map(str,r['bbox'])),'; '.join(r['overlays']),r['frame'],r['iou'],r['mirror'],r['how'],r['status'],r['done_pct'],c.get('pc',0),c.get('shared',0),c.get('genesis',0),c.get('other',0),c.get('missing',0),r['flag'],
      '; '.join(f'{k}x{v}' for k,v in r['remaining_colours'].items()),'; '.join(f"{e['px']}px@{e['bbox']}" for e in r['extra_components'])])
best={}
for r in R:
  if r['layer']=='Layer 33':continue      # second copy of 374 (same pixels inside the frame as Layer 30)
  f=r['frame']
  if f not in best or (r['done_pct'],r['kind']=='PC_PAL')>(best[f]['done_pct'],best[f]['kind']=='PC_PAL'):best[f]=r
with open(OUT+'frame_status.csv','w',newline='') as f:
  w=csv.writer(f);w.writerow(['game','frame','group','status','pc_pct','best_layer','other_layers','genesis_px_left','off_palette_px','what_is_left'])
  for fr in list(range(353,377))+list(range(633,645)):
    grp='injury1 (bloody)' if fr>=633 else ('fight injury' if fr>=371 else 'fight')
    r=best.get(fr);others=[x['layer'] for x in R if x['frame']==fr and (not r or x['layer']!=r['layer'])]
    if not r:w.writerow(['NHLPA93 Genesis',fr,grp,'TODO (no layer)','','',';'.join(others),'','','whole frame']);continue
    c=r['counts'];left=[]
    if fr>=633 and any(k in r['remaining_colours'] for k in('(108, 0, 0)','(180, 72, 0)')):left.append('blood still Genesis RGB (108,0,0)/(180,72,0)')
    if c.get('missing',0):left.append(f"{c['missing']} px are holes (transparent/background in the PSD where retail has a pixel)")
    rest=[k for k in r['remaining_colours'] if k not in('(108, 0, 0)','(180, 72, 0)')]
    if rest:left.append('remaining non-PC colours: '+', '.join(rest))
    if r['status']=='NONE' or r['done_pct']<50:left=['most of the frame (only head/crest overlay or shared black is PC)']
    w.writerow(['NHLPA93 Genesis',fr,grp,r['status'],r['done_pct'] if r['status']=='PARTIAL' else '',r['layer'],';'.join(others),c.get('genesis',0),c.get('other',0),' | '.join(left)])
print(collections.Counter(best[f]['status'] for f in best),len(best))
