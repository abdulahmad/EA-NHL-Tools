# Part B (D166): expand console-exclusive skater frames to 95PC colour zones.
# console frame -> learned translator -> synthetic PC-index frame -> UNCHANGED PC skater pipeline (v5 fit, backremap,
# column_map_v2, pantsremap, straighten) -> 38x32 v2 texel map -> render with any v2 texture.
import sys,os,pickle,json,collections,numpy as np
ES='/workspace/preview_v2/exclusive_samples';S='/workspace/EA-NHL-Tools/sprite-textures'
sys.path[:0]=[S+'/scripts',S+'/skater_editor',S,'/workspace/preview_v2/platform_unique/v2',ES]
from cooc import crop,A
from xmodel import feats
from lib import team,spritepal
from parts import segment,PN
import skater_autofit as AF
from PIL import Image
def synth(src,n,flip=False):
    g=crop(A[src][n],src)
    if flip:g=g[:,::-1]
    clf=pickle.load(open(f'{ES}/clf_{src}.pkl','rb'));F,C=feats(g);pr=clf.predict_proba(F);cl=clf.classes_.copy()
    pr[:,cl==255]=0   # a console pixel always becomes a PC pixel
    if os.environ.get('SKATER')=='1':pr[:,np.isin(cl,[164])]=0   # D167: skater frames never get the goalie-mask index
    q=np.full(g.shape,255,np.uint8)
    for (y,x),p in zip(C,pr):q[y,x]=cl[p.argmax()]
    conf=np.zeros(g.shape);
    for (y,x),p in zip(C,pr):conf[y,x]=p.max()/max(p.sum(),1e-9)
    return g,q,conf
def run(samples):
    """samples: list of (src,n,dir). Returns {key:(g,q,lab,tmap,conf,err)}"""
    SY={};ids={}
    for i,(src,n,d) in enumerate(samples):
        g,q,conf=synth(src,n);k=9001+i;SY[k]=(g,q,conf,d);ids[k]=(src,n,d)
    # inject: copy autofit, hook frame()/DIRS right after frames_v5 is exec'd
    import inspect;src=inspect.getsource(AF.autofit)
    hook="G['ICE']=set(G['ICE'])|UNK\n        _f=G['frame'];G['frame']=lambda n:SYN[n] if n in SYN else _f(n);G['DIRS'].update(SDIR)"
    src=src.replace("G['ICE']=set(G['ICE'])|UNK",hook,1)
    NS=dict(AF.__dict__);NS['SYN']={k:v[1] for k,v in SY.items()};NS['SDIR']={k:v[3] for k,v in SY.items()}
    LABS={}
    for k,(g,q,c,d) in SY.items():
        exec("import skater_export_face as X",{}) if False else None
        part,_=segment(k,q);LABS[k]=part
    NS['LABS']=LABS;NS['ANCH']={}
    exec(src,NS);out,err=NS['autofit'](list(SY),S+'/v2_38x32/')
    R={}
    for k,(g,q,c,d) in SY.items():R[ids[k]]=dict(g=g,q=q,lab=LABS[k],tmap=out.get(k),conf=c)
    return R,err
