import json,numpy as np
from limbfit import stickfit
from blackcov import dist_to
s=open('/workspace/EA-NHL-Tools/sprite-textures/editor/data/bundle.js').read();B=json.loads(s[s.index('{'):s.rstrip().rstrip(';').rindex('}')+1])
PAL=np.array(B['palettes']['skater']);N=B['parts_skater'];SI=N.index('stick');KI=N.index('skin')
SB=[('stick butt','stick heel'),('stick heel','stick toe')];R=dict(n=0,nofit=0,old=[],new=[],skin_in_stick=[])
for f in B['frames']:
    if f['kind']!='skater' or not f.get('joints') or 'stick heel' not in f['joints'] or 'head' not in f['joints'] or not f.get('lab'):continue
    px=np.array(f['px']);lab=np.array(f['lab'])
    if lab.shape!=px.shape:continue
    mask=px!=255;black=mask&(PAL[np.where(mask,px,0)].max(-1)<60);st=mask&(px==136)
    J={k:(v[0]+.5,v[1]+.5) for k,v in f['joints'].items()};yy,xx=np.mgrid[:px.shape[0],:px.shape[1]]
    hd=np.asarray(J['head']);skin=np.hypot(xx+.5-hd[0],yy+.5-hd[1])<=4.5
    for k in J:
        if 'glove' in k:skin|=np.hypot(xx+.5-J[k][0],yy+.5-J[k][1])<=1.5
    ys,xs=np.nonzero(lab==SI)
    if len(ys)<4:continue
    P=np.stack([xs+.5,ys+.5],1);R['n']+=1;R['old'].append((dist_to(P,J,SB)<=1.5).mean())
    S=stickfit(st,black,skin,body=mask)
    if S is None:R['nofit']+=1;R['new'].append(0);continue
    R['new'].append((dist_to(P,S,SB)<=1.5).mean())
print('PC skater frames',R['n'],'no stick found',R['nofit'],'GT stick px covered by bones: hand skeleton %.3f, stick-first %.3f'%(np.mean(R['old']),np.mean(R['new'])),
      'frames >=90%% covered: old %.3f new %.3f'%(np.mean(np.array(R['old'])>=.9),np.mean(np.array(R['new'])>=.9)))
