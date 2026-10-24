# Goalie v10c (Abdul pt872u). Part 1: pad back = Abdul's strip wrapping round (no separate pad-back piece); 186 added (D80-D82).
# Part 2: unified catcher = Fuhr-like FRONT (palm/pocket) + BACK block replacing catcherH; orientation from skel10 (D83-D86).
import sys,os,json,collections
import g10tex,g10match,g10sheet
from g10match import *
sys.path.insert(0,os.path.abspath(H10+'/../goalie6'))
from g10b import lift
from skel10 import catcher as skc
from PIL import Image
GF=goalie_frames()
def texture_v3():
    T=decode();T[16,12]=186                      # D81: strip row 'stripe 1' = 184 185 186 (was 184 185 155)
    FR=lift(538,'catcher_face');BK=lift(428,'catcher_face');h,w=T.shape
    H=h+1+max(FR.shape[0],BK.shape[0]);T3=np.full((H,w),TRANS,int);T3[:h]=T
    T3[h+1:h+1+FR.shape[0],0:FR.shape[1]]=FR;bx=w-BK.shape[1];T3[h+1:h+1+BK.shape[0],bx:]=BK
    P=dict(g10tex.PIECES);P['catcherF']=(0,h+1,FR.shape[1]-1,h+FR.shape[0]);P['catcherB']=(bx,h+1,w-1,h+BK.shape[0])
    return T3,P
def wrap(T):
    """D80 pad back view: padF right trim col (155) | strip (3) | padF left trim cols (155 155), rows 9..22 (same rows)."""
    return np.concatenate([T[9:23,9:10],T[9:23,10:13],T[9:23,0:2]],axis=1)
def save(T3):
    im=Image.fromarray(np.where(T3==WHITE,181,T3).astype(np.uint8),'P');im.putpalette(g10tex.ACT.flatten().tolist())
    im.save(H10+'/goalie_texture_v3_indexed.png');im.convert('RGB').save(H10+'/goalie_texture_v3_rgb.png')
T3,P3=texture_v3();T2old=decode()
def pc(T,k):
    if k=='padWrap':return wrap(T)
    if k=='padWrapOld':return wrap(T2old)
    x0,y0,x1,y1=P3[k];return T[y0:y1+1,x0:x1+1]
def install():
    g10tex.PIECES.clear();g10tex.PIECES.update(P3);g10sheet.decode=lambda:T3;g10sheet.piece=pc
from seg6 import seg as seg6
def q6(n,k):p,o,f,_,st=seg6(n);return [tuple(c) for c in zip(*np.nonzero(o==k))]
def run(items):
    out=[]
    for p,q,t,l in items:
        TP=pc(T3,t);prm=g10match.fit(p,q,TP);R,_,_=g10match.evaluate(p,q,TP,prm);out.append(dict(label=l,piece=t,params=prm,**R))
    return out
if __name__=='__main__':
    save(T3);install();print(T3.shape,P3)
    # ---- Part 1 pad backs: old strip (155) vs new (186), both wrapped
    G=parts_for({520,487,488,539,410,471,976,1056})
    PB=[(n,k) for n in (520,487,488,539,410,471,976,1056) for k in ('padB_L','padB_R') if (n,k) in G]
    it1=[(frame(n),G[(n,k)]['q'],t,'%d %s<-%s'%(n,k,t)) for n,k in PB for t in ('padWrapOld','padWrap')]
    for n,k in [(416,'padB_R'),(449,'padB_L'),(449,'padB_R'),(519,'padB_L'),(519,'padB_R'),(980,'padB_L'),(980,'padB_R')]:
        q=q6(n,k)
        if q:it1+=[(frame(n),q,t,'%d %s(seg6)<-%s'%(n,k,t)) for t in ('padWrapOld','padWrap')]
    R1=run(it1)
    # ---- Part 2 catcher: every catcher_face part in the ready anim + glove saves; fit FRONT, BACK and Abdul's catcher
    C=[c for c in candidates() if c['piece']=='catcher_face' and len(c['q'])>=8 and (407<=c['frame']<=430 or c['frame'] in (538,421,1042,535,545,1021,987,519,980))]
    R2=[]
    for c in C:
        n=c['frame'];d=GF[n][0][1];p=frame(n);row=dict(frame=n,anim=GF[n][0][0],d=d,px=len(c['q']),skel=skc(d))
        for t in ('catcherF','catcherB','catcher'):
            TP=pc(T3,t);prm=g10match.fit(p,c['q'],TP);R,_,_=g10match.evaluate(p,c['q'],TP,prm);row[t]=dict(params=prm,**R)
        z=lambda t:(row[t]['strict_diff']/max(row[t].get('zone_px',1),1))
        row['best']=min(('catcherF','catcherB'),key=z);R2.append(row)
    json.dump(dict(padback=R1,catcher=R2),open(H10+'/g10c_match.json','w'),indent=1,default=int)
    for r in R1:print(r['label'],r['strict_diff'],r['after_expand_diff'],r.get('outzone',0),r.get('zone_px'))
    for r in R2:print(r['frame'],r['anim'],r['d'],r['px'],r['skel']['orient'],'best',r['best'],*['%s %d>%d/%d out%d'%(t,r[t]['strict_diff'],r[t]['after_expand_diff'],r[t].get('zone_px',0),r[t].get('outzone',0)) for t in ('catcherF','catcherB','catcher')])
