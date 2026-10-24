# Goalie v10d (Abdul pt874u): texture v4 = v3 (186 strip change) with the v3 lifted catcher views replaced by a designed
# Fuhr-style unified catcher (D89); catcher match per facing with the v10d skeleton (D90). Images local only.
import sys,os,json,collections
import g10tex,g10match,g10sheet
from g10match import *
from g10c import texture_v3,wrap,q6
import skel10
from PIL import Image,ImageDraw,ImageFont
GF=goalie_frames()
O,U=147,148   # outline top/left/separators, bottom/right rim
def fuhr_catcher():
    """22x9. x0-6 BACK panel | x6 sep | x7-10 CUFF (logo 150 block, 149 wrist band) | x11 sep | x12-16 PALM | x17-20 POCKET/WEB mesh."""
    C=np.full((9,22),0,int)
    for y in range(9):
        for x in range(22):
            if y==0 or x in (0,6,11):v=O
            elif y==8 or x==21:v=U
            elif x<=5:v=152 if y==1 else 150 if y==7 else 151                    # back of hand: light top, dark bottom
            elif x<=10:v=149 if x==10 else 150 if (3<=y<=5 and x in (8,9)) else 152 if y==1 else 151   # cuff + logo
            elif x<=16:v=144 if y<=2 else 145 if y<=4 else 146                   # palm: dark at web, light at heel
            else:v=152 if y==1 else (144 if (x+y)%2 else 145)                    # web lacing row + mesh pocket
            C[y,x]=v
    return C
REG={'BACK panel':(0,6),'CUFF+logo':(6,11),'PALM':(11,16),'POCKET/WEB':(17,21)}
def texture_v4():
    T3,P3=texture_v3();T=T3[:23].copy();C=fuhr_catcher();T4=np.full((24+9,23),TRANS,int);T4[:23]=T;T4[24:33,0:22]=C
    P=dict(g10tex.PIECES);P['catFront']=(6,24,21,32);P['catBack']=(0,24,11,32);P['catAll']=(0,24,21,32);return T4,P
T4,P4=texture_v4()
def pc(T,k):
    if k=='padWrap':return wrap(T)
    x0,y0,x1,y1=P4[k];return T[y0:y1+1,x0:x1+1]
def save():
    im=Image.fromarray(np.where(T4==WHITE,181,T4).astype(np.uint8),'P');im.putpalette(g10tex.ACT.flatten().tolist())
    im.save(H10+'/goalie_texture_v4_indexed.png')
def install():
    g10tex.PIECES.clear();g10tex.PIECES.update({k:v for k,v in P4.items() if k!='catAll'});g10sheet.decode=lambda:T4;g10sheet.piece=pc
def catcher_runs():
    C=[c for c in candidates() if c['piece']=='catcher_face' and len(c['q'])>=8 and (407<=c['frame']<=447 or 535<=c['frame']<=554 or c['frame'] in (519,980,987,1021,1042))]
    out=[]
    for c in C:
        n=c['frame'];d=GF[n][0][1];o=skel10.catcher(d)['orient'];p=frame(n)
        use={'FRONT':['catFront'],'BACK':['catBack'],'SIDE':['catFront','catBack']}[o];row=dict(frame=n,anim=GF[n][0][0],d=d,px=len(c['q']),orient=o)
        for t in ['catcher']+use+(['catBack'] if o=='FRONT' else ['catFront'] if o=='BACK' else []):
            if t in row:continue
            TP=pc(T4,t);prm=g10match.fit(p,c['q'],TP);R,_,_=g10match.evaluate(p,c['q'],TP,prm);row[t]=dict(params=prm,**R)
        row['layout']=min(use,key=lambda t:row[t]['after_expand_diff']);out.append(row)
    return out
if __name__=='__main__':
    save();R=catcher_runs();json.dump(R,open(H10+'/g10d_catcher.json','w'),indent=1,default=int)
    for r in R:
        L=r[r['layout']];A=r['catcher'];X='catBack' if r['layout']=='catFront' else 'catFront'
        print(r['frame'],r['anim'][4:],'d%d'%r['d'],r['orient'],r['px'],'abdul %d>%d out%d'%(A['strict_diff'],A['after_expand_diff'],A.get('outzone',0)),
              '%s %d>%d out%d'%(r['layout'],L['strict_diff'],L['after_expand_diff'],L.get('outzone',0)),'other %s %d>%d'%(X,r[X]['strict_diff'],r[X]['after_expand_diff']) if X in r else '')
