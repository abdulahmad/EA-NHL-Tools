# Evaluate candidate back base frames (d0 = straight away from camera) with automatic metrics.
import sys,os,json,collections,numpy as np;sys.path.insert(0,'.');sys.path.insert(0,os.path.join(os.path.dirname(os.path.abspath(__file__)),'../perpixel/v3'))
from ppmap import *
from lib import spritepal,team,toimg
from PIL import Image,ImageDraw
C={'stanley 217':217,'skate 42':42,'skate 43':43,'skate 44':44,'skate 45':45,'glide 1':1,'glideback 161':161,'celebrate 185':185,'celebrate 186':186,
   'fallfwd 305':305,'fallfwd 306':306,'fallfwd 307':307,'fallfwd 308':308,'fallback 273':273,'fallback 274':274,'fallback 275':275,'fallback 276':276,'crosscheck 889':889}
BANDS={b for k in CHAIN.values() for b in k}-{'yoke corner','shoulder patch'}
R={}
for nm,n in C.items():
    p,a,info=address(n)
    keys=collections.Counter(k[:4] for k in a.values() if k[0]!='crest')
    bands={k[3] for k in keys};miss=sorted(BANDS-bands)
    T=np.isin(p,list(range(159,177)));ys,xs=np.nonzero(T)
    # straightness: for each waist stripe, std of the stripe's top row over its columns
    st=[]
    for lo in (168,171,174):
        m=np.isin(p,[lo,lo+1,lo+2])
        if m.any():
            cols=np.unique(np.nonzero(m)[1]);tops=[np.nonzero(m[:,c])[0].min() for c in cols];st.append(float(np.std(tops)))
    # uprightness: torso principal axis angle from vertical
    c=np.cov(np.stack([ys,xs]).astype(float));w,v=np.linalg.eigh(c);ax=v[:,1];ang=float(np.degrees(np.arctan2(abs(ax[1]),abs(ax[0]))))
    # occlusion: non-body pixels inside the torso's filled rows
    hole=0
    for y in np.unique(ys):
        r=np.nonzero(T[y])[0];hole+=int((~np.isin(p[y,r.min():r.max()+1],list(range(144,192))+list(range(192,245)))).sum())
    sl=collections.Counter(k[1] for k in a.values() if k[0]=='sleeve');so=collections.Counter(k[1] for k in a.values() if k[0]=='sock')
    R[nm]=dict(frame=n,facing=info['facing'],dir=info['dir'],torso_px=int(T.sum()),jersey_px=int(np.isin(p,[165,166,167]).sum()),body_px=len(a),
               missing_bands=miss,waist_top_std=[round(x,2) for x in st],torso_tilt_deg=round(ang,1),torso_holes=hole,sleeve_px=dict(sl),sock_px=dict(so),
               pants_stripes={i:int((p==i).sum()) for i in (178,179)})
json.dump(R,open('subzones_stage1/backbase_metrics.json','w'),indent=1)
for k,v in R.items():print(k,v['facing'],v['dir'],'torso',v['torso_px'],'body',v['body_px'],'miss',v['missing_bands'],'std',v['waist_top_std'],'tilt',v['torso_tilt_deg'],'holes',v['torso_holes'],'sl',v['sleeve_px'],'so',v['sock_px'],v['pants_stripes'])
sp=spritepal(team('nyr'));ims=[]
for nm,n in C.items():
    p=frame(n);im=toimg(sp[p].astype(float),p!=255,8);c=Image.new('RGB',(im.width+10,im.height+20),(20,20,20));c.paste(im,(5,18));ImageDraw.Draw(c).text((4,3),nm,fill=(255,255,0));ims.append(c)
from lib import sheet_aligned;sheet_aligned(ims,6,8).save('subzones_stage1/backbase_candidates.png')
