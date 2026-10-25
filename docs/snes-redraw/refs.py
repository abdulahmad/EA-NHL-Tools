"""D182: reference choice by head clarity + neutrality, verbatim reference head anchored on the head joint, editor edits loader."""
import json,os,numpy as np
from conv2 import head,SK_G,HD_G,SK_S,HD_S,sscale
from scipy.ndimage import binary_dilation
EDIR='/workspace/EA-NHL-Tools/sprite-textures/editor/edits';FIX='/workspace/EA-NHL-Tools/docs/snes-redraw/fixes_d182.json'
def load_edits():
    """saved editor edits (any kind) + reviewed fix file; key 'S94 800' -> {joints, bp}"""
    E={}
    for p in ([os.path.join(EDIR,f) for f in sorted(os.listdir(EDIR)) if f.endswith('_edits.json')] if os.path.isdir(EDIR) else [])+[FIX,'/workspace/EA-NHL-Tools/docs/snes-redraw/nostick_d183.json']:
        if os.path.exists(p):
            for k,v in json.load(open(p))['frames'].items():E.setdefault(k.replace('_',' '),{}).update(v)
    return E
def headinfo(a):
    hm,f,c=head(a,SK_G,HD_G)
    if hm is None:return None
    ys,xs=np.nonzero(hm);y0,y1,x0,x1=ys.min(),ys.max(),xs.min(),xs.max()
    box=np.zeros_like(hm);box[max(0,y0-1):y1+2,max(0,x0-1):x1+2]=1
    occl=float(((a>0)&box&~binary_dilation(hm)&(np.arange(a.shape[0])[:,None]<=y1)).sum()/max(1,hm.sum()))   # other pixels at/above the head
    compact=float(hm.sum()/((y1-y0+1)*(x1-x0+1)));ry,rx=np.nonzero(a>0)
    top=float((y0-ry.min())/max(1,a.shape[0]))                     # head is the top of the sprite when upright
    low=rx[ry>=ry.min()+0.6*(ry.max()-ry.min())];lean=float(abs(c[1]-np.median(low))/max(1,a.shape[1]))
    return dict(hm=hm,f=f,c=c,occl=occl,compact=compact,top=top,lean=lean,size=int(hm.sum()))
def refscore(src,g,off_align):
    h=headinfo(g)
    if h is None or not 12<=h['size']<=60:return None
    iou=off_align(sscale(src),g)[0]
    s=0.30*iou+0.25*max(0,1-h['occl'])+0.20*max(0,1-4*h['lean'])+0.15*h['compact']+0.10*max(0,1-4*h['top'])
    return dict(score=round(s,3),iou=round(iou,2),occl=round(h['occl'],2),lean=round(h['lean'],2),compact=round(h['compact'],2),top=round(h['top'],2),f=h['f'])
def pasteref(O,S,OP,g,ganchor,sanchor,keep=(4,5,6,10,11)):
    """paste the reference head verbatim; its head joint goes onto the SNES head joint. Arm/hand/stick pixels are never overwritten."""
    h=headinfo(g)
    if h is None:return O,None
    gy,gx=ganchor if ganchor is not None else h['c'];sy,sx=sanchor;dy=int(round(sy-gy));dx=int(round(sx-gx))
    O=O.copy();prot=np.isin(OP%100,keep);old=head(S,SK_S,HD_S)[0];cand=np.zeros_like(O,bool);n=0
    for y,x in zip(*np.nonzero(h['hm'])):
        Y,X=y+dy,x+dx
        if 0<=Y<O.shape[0] and 0<=X<O.shape[1] and not prot[Y,X]:O[Y,X]=g[y,x];cand[Y,X]=1;n+=1
    if old is not None:O[binary_dilation(old)&~cand&~prot&np.isin(O,list(HD_G))&(OP%100==1)]=0
    return O,dict(pasted=n,of=int(h['hm'].sum()))
