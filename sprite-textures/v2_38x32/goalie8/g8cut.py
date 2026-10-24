# Goalie default gear v8 (Abdul pt867u): v1-style flat texture made by LIFTING real sprite pixels, the way the v1 player texture was
# made from the anthem sprite. Each piece = the segmented (goalie6/7 seg + skeleton) pixels of one part, cut from its clearest frame,
# kept at 1 sprite px = 1 texel in its on-screen arrangement (bbox crop). Base texture = team base colour (medium of the pixel's family);
# shading-layer indices (goalie7 OVR: outline, 164/22 greys, toe navy, cage) are filled with the nearest base-colour texel of the piece.
# Shaded texture = the lifted in-game colours (base x shading baked in).
# Mapping back: every gear pixel of every frame has a (u,v) on its part from goalie7 uv(); it takes the texel of the piece pixel with the
# nearest (u,v) (mask: union of front/side/back lifts, u wraps). Render = texel family at the target pixel's own shading level.
import sys,os,json,math,collections,numpy as np
G7=os.path.join(os.path.dirname(os.path.abspath(__file__)),'../goalie7');__file__=G7+'/g7map.py'
src=open(G7+'/g7map.py').read().split('PIX={n:uv(n)')[0];exec(src)
from lib import frame
PIX={n:uv(n) for n in FRG}
OUT='/workspace/preview_v2/goalie8/';HERE=os.path.dirname(__file__.replace('goalie7/g7map.py','goalie8/x'))
HERE=os.path.abspath(G7+'/../goalie8')
# part -> list of (source frame, seg label(s), view name)
PIECES=[('padF_L',422,['padF_L'],'front'),('padF_R',422,['padF_R'],'front'),
        ('padB_L',519,['padB_L'],'back'),('padB_R',519,['padB_R'],'back'),
        ('blocker',422,['blocker'],'face'),('catcher',416,['catcher'],'face'),
        ('mask',416,['maskF'],'front'),('mask',413,['maskF'],'side'),('mask',519,['maskB'],'back')]
PRI={416:0,413:1,519:2}
def base_fam(n,q):
    i=int(SEG[n][0][q]);return None if ISO(i) else fam(i)
cut=[]
for part,n,labs,vw in PIECES:
    p,L=SEG[n][0],SEG[n][1];m=np.isin(L,labs);ys,xs=np.nonzero(m);y0,x0=ys.min(),xs.min();h,w=ys.max()-y0+1,xs.max()-x0+1
    px={}
    for y,x in zip(ys,xs):px[(y-y0,x-x0)]=dict(q=(int(y),int(x)),idx=int(p[y,x]),fam=base_fam(n,(y,x)),uv=PIX[n][(int(y),int(x))][1:])
    known=[k for k,v in px.items() if v['fam']]
    for k,v in px.items():
        if not v['fam']:v['fam']=px[min(known,key=lambda s:(s[0]-k[0])**2+(s[1]-k[1])**2)]['fam'];v['filled']=1
    cut.append(dict(part=part,frame=n,view=vw,bbox=(int(x0),int(y0),int(w),int(h)),px=px))
# layout: pads row 0, gloves + mask row 1 (1 texel gap); record placement
x=0;y=0;rowh=0;GAP=2
order=[0,1,2,3,None,4,5,6,7,8]
for i in order:
    if i is None:x=0;y+=rowh+GAP;rowh=0;continue
    c=cut[i];c['at']=(x,y);x+=c['bbox'][2]+GAP;rowh=max(rowh,c['bbox'][3])
TW=max(c['at'][0]+c['bbox'][2] for c in cut);TH=max(c['at'][1]+c['bbox'][3] for c in cut)
def texture(sp,shaded):
    t=np.zeros((TH,TW,4),np.uint8)
    for c in cut:
        ax,ay=c['at']
        for (yy,xx),v in c['px'].items():t[ay+yy,ax+xx,:3]=sp[v['idx']] if shaded else sp[lev_idx(v['fam'],'medium',v['idx'])];t[ay+yy,ax+xx,3]=255
    return t
# mapping
def nearest(part,u,v):
    best=None
    for c in cut:
        if c['part']!=part:continue
        W=12 if part=='mask' else c['bbox'][2];H=c['bbox'][3]
        for k,pv in c['px'].items():
            du=abs(u-pv['uv'][0]);du=min(du,1-du) if part=='mask' else du
            d=(du*W)**2+((v-pv['uv'][1])*H)**2;key=(round(d,6),PRI.get(c['frame'],0))
            if best is None or key<best[0]:best=(key,c,k)
    return best[1],best[2]
MAP={}
for n in FRG:
    MAP[n]={}
    for q,(blk,a,b) in PIX[n].items():
        if blk=='strap':continue
        part=blk;c,k=nearest(part,a,b);MAP[n][q]=(cut.index(c),k)
def render(n,sp,shaded_tex=None):
    p=frame(n);m=p!=255;A_=np.full(p.shape+(3,),40,np.uint8);A_[m]=sp[p[m]];B_=A_.copy();wrong=[]
    for q,(ci,k) in MAP[n].items():
        v=cut[ci]['px'][k];i=int(p[q])
        r=sp[i] if ISO(i) else sp[lev_idx(v['fam'],SH(i) or '',i)]
        B_[q]=r
        if tuple(r)!=tuple(sp[i]):wrong.append(dict(q=q,part=PIX[n][q][0],want=fam(i),got=v['fam'],src=cut[ci]['frame'],self=cut[ci]['frame']==n))
    return A_,B_,wrong
if __name__=='__main__':
    from PIL import Image
    TEAMS2=[('HOME.json','chi'),('HOME.json','tor'),('AWAY.json','chi'),('AWAY.json','nyr'),('HOME.json','mtl')]
    J=dict(size=[TW,TH],pieces=[dict(part=c['part'],frame=c['frame'],view=c['view'],frame_bbox_xywh=c['bbox'],texture_xy=c['at'],
           texels=len(c['px']),filled_from_shading=sum(1 for v in c['px'].values() if v.get('filled'))) for c in cut],diff={})
    for tf,code in TEAMS2:
        sp=spal(tf,code);tag=f'{code}_{tf[:4].lower()}'
        for sh in (0,1):Image.fromarray(texture(sp,sh)).save(f"{HERE}/default_gear_v8_{tag}_{'shaded' if sh else 'base'}.png")
        J['diff'][tag]={}
        for n in FRG:
            _,_,w=render(n,sp);J['diff'][tag][n]=dict(total=len(w),by_part=dict(collections.Counter(x['part'] for x in w)),
              in_source_frame=sum(1 for x in w if x['self']),pairs=dict(collections.Counter(f"{x['want']} <- {x['got']}" for x in w).most_common(6)))
        J['diff'][tag]['sum']=sum(J['diff'][tag][n]['total'] for n in FRG)
    J['gear_px']=sum(len(MAP[n]) for n in FRG)
    json.dump(J,open(HERE+'/g8_map.json','w'),indent=1,default=str)
    print(TW,TH,{t:J['diff'][t]['sum'] for t in J['diff']});print({n:J['diff']['chi_home'][n]['total'] for n in FRG})
