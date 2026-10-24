# Goalie v10b (Abdul pt870u): 164 = texture zone (D76); texture v2 = Abdul's 23x23 + a wide pad-back piece lifted from 520 L and a
# horizontal catcher lifted from 538 (D77); rerun zones-first-then-expand, 416/422 pads with the goalie6 hand-checked seg (D78).
import sys,os,json
import g10tex,g10match,g10sheet
from g10match import *
sys.path.insert(0,os.path.abspath(H10+'/../goalie6'))
from PIL import Image
# D76 (Abdul pt870u correction): 164 stays a TEXTURE zone (pad/mask face), compared like any zone; supersedes goalie7 D61 for this texture.
def lift(n,part,fill_shade=True):
    q=parts_for({n})[(n,part)]['q'];p=frame(n);ys=[a for a,_ in q];xs=[b for _,b in q]
    A=np.full((max(ys)-min(ys)+1,max(xs)-min(xs)+1),TRANS,int)
    for y,x in q:
        v=int(p[y,x]);A[y-min(ys),x-min(xs)]=0 if v in (30,31) else v   # toe shading 30/31 -> base 0 (outline/toe)
    return A
def texture_v2():
    T=decode();h,w=T.shape;PB=lift(520,'padB_L');CH=lift(538,'catcher_face')
    H=h+1+max(PB.shape[0],CH.shape[0]);T2=np.full((H,w),TRANS,int);T2[:h]=T
    T2[h+1:h+1+PB.shape[0],0:PB.shape[1]]=PB;cx=PB.shape[1]+1;T2[h+1:h+1+CH.shape[0],cx:cx+CH.shape[1]]=CH
    P2=dict(g10tex.PIECES);P2['padBack']=(0,h+1,PB.shape[1]-1,h+PB.shape[0]);P2['catcherH']=(cx,h+1,cx+CH.shape[1]-1,h+CH.shape[0])
    return T2,P2
def save(T2):
    pal=ACT_=g10tex.ACT.copy();im=Image.fromarray(np.where(T2==WHITE,181,T2).astype(np.uint8),'P')
    im.putpalette(pal.flatten().tolist());im.save(H10+'/goalie_texture_v2_indexed.png')   # exact indices (WHITE -> 181)
    im.convert('RGB').save(H10+'/goalie_texture_v2_rgb.png')
if __name__=='__main__':
    T2,P2=texture_v2();save(T2);print(T2.shape,P2)
    g10tex.PIECES.clear();g10tex.PIECES.update(P2);g10sheet.decode=lambda:T2
    pc=lambda T,k:T[P2[k][1]:P2[k][3]+1,P2[k][0]:P2[k][2]+1];g10sheet.piece=pc
    from seg6 import seg as seg6
    def q6(n,k):p,o,f,_,st=seg6(n);return [tuple(c) for c in zip(*np.nonzero(o==k))]
    G9=parts_for({987,505,520,1044,1021,538,547,543,539,413})
    T1=[(987,'padF_L','padF'),(987,'padF_R','padF'),(505,'padF_L','padF'),(505,'padF_R','padF'),(1044,'pad_side','padF'),
        (520,'padB_L','padBack'),(520,'padB_R','padBack'),(520,'padB_L','padStrip'),(1021,'blocker_face','blocker'),
        (538,'catcher_face','catcherH'),(538,'catcher_face','catcher'),(547,'mask_front','mask'),(543,'mask_side','mask'),(539,'mask_back','mask'),(413,'mask_side','mask')]
    items=[(frame(n),G9[(n,k)]['q'],t,'%d %s<-%s'%(n,k,t)) for n,k,t in T1]
    for n,k,t in [(416,'padF_L','padF'),(416,'padF_R','padF'),(416,'padB_R','padBack'),(422,'padF_L','padF'),(422,'padF_R','padF')]:
        items.append((frame(n),q6(n,k),t,'%d %s(seg6)<-%s'%(n,k,t)))
    out=[]
    for p,q,t,l in items:
        TP=pc(T2,t);prm=g10match.fit(p,q,TP);R,_,_=g10match.evaluate(p,q,TP,prm);out.append(dict(label=l,params=prm,**R));print(l,prm,R)
    json.dump(out,open(H10+'/g10b_match.json','w'),indent=1,default=int)
    it=[(p,q,t,l,None) for p,q,t,l in items]
    g10sheet.build(it[:10],'g10b_match_1.png','v10b: texture v2, 164 = texture zone (zones first, then expand)')
    g10sheet.build(it[10:],'g10b_match_2.png','v10b: catcher H, masks, 416/422 pads on goalie6 seg')
