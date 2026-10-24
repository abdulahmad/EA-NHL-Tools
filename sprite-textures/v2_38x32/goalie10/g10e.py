# Goalie v10e (Abdul pt875u): two catcher texture options side by side.
#  Option A = v4 Fuhr-style 22x9 rectangle (D89).  Option B = texture v5 candidate: back panel rectangle (v4 x0-11)
#  + front as a rimmed oval (148 ring round a 144-146 pocket/palm, cuff on the left, 152 web lacing on top) at x12-22.
#  Catcher pixels per frame: goalie9 segmentation; 413/416/425 (no catcher part there) = catcher-zone px connected to the
#  skel10 left hand. Piece by skel10 facing: FRONT d3-d5, BACK d0/d1/d7; SIDE: 413 FRONT (high, in front of the chest),
#  425 BACK-panel family (low near-side piece) -- placement confirmed by Abdul pt875u (D92).
import json,collections
from g10d import *
import g10d
OVAL_TXT=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'g10e_oval.txt')).read()
def parse(s):return np.array([[TRANS if t=='.' else int(t) for t in l.split()] for l in s.strip().split('\n')])
OVAL=parse(OVAL_TXT)
def texture_v5():
    T=T4.copy();T[24:33,12:23]=TRANS;h,w=OVAL.shape;T[24:24+h,12:12+w]=OVAL
    P=dict(P4);P['catBack']=(0,24,11,32);P['catFront']=(12,24,11+w,23+h);P['catAll']=(0,24,22,32);return T,P
T5,P5=texture_v5()
OPT={'A':(T4,P4),'B':(T5,P5)}
def piece(o,k):
    T,P=OPT[o];x0,y0,x1,y1=P[k];return T[y0:y1+1,x0:x1+1]
# regions in texture coordinates (rows 24-32) per option
def regions(o):
    T,P=OPT[o];R=np.full(T.shape,'',object)
    for y in range(24,33):
        for x in range(23):
            v=T[y,x]
            if v==TRANS:continue
            if o=='A' or x<=11:
                R[y,x]='TRIM' if v in (147,148) else 'BACK' if x<=5 else 'CUFF' if x<=10 else 'PALM' if x<=16 else 'WEB'
            else:
                u=x-12;row=OVAL[y-24]
                ring=[i for i,t in enumerate(row) if t in (147,148)]
                if v in (147,148):R[y,x]='TRIM'
                elif v in (144,145,146):R[y,x]='POCKET' if v==144 else 'PALM'
                elif v==152 and u>=3 and y<=25:R[y,x]='WEB'
                else:R[y,x]='CUFF'
    return R
SAMPLE=[416,419,421,538, 407,412,428,980, 413,425, 1042,519]
SIDEPICK={413:'FRONT',425:'BACK'}
def catcher_q(n):
    C={c['frame']:c for c in candidates() if c['piece']=='catcher_face' and c['frame']==n}
    if n in C and len(C[n]['q'])>=8:return C[n]['q']
    p=frame(n);x,y=skel10.ADJ[n]['Lhand'];r=5 if n==416 else 4
    Z=lambda c:144<=p[c]<=152
    seed=min(((yy,xx) for yy in range(p.shape[0]) for xx in range(p.shape[1]) if Z((yy,xx))),key=lambda c:max(abs(c[0]-y),abs(c[1]-x)))
    out={seed};st=[seed]
    while st:
        cy,cx=st.pop()
        for dy in (-1,0,1):
            for dx in (-1,0,1):
                c=(cy+dy,cx+dx)
                if c not in out and 0<=c[0]<p.shape[0] and 0<=c[1]<p.shape[1] and Z(c) and max(abs(c[0]-y),abs(c[1]-x))<=r:out.add(c);st.append(c)
    return sorted(out)
def orient(n):
    d=GF[n][0][1];o=skel10.catcher(d)['orient'];return SIDEPICK.get(n,o) if o=='SIDE' else o
def run(frames):
    out=[]
    for n in frames:
        p=frame(n);q=catcher_q(n);o=orient(n);k='catFront' if o=='FRONT' else 'catBack';row=dict(frame=n,anim=GF[n][0][0],d=GF[n][0][1],orient=o,piece=k,px=len(q))
        ab=g10tex.piece(g10tex.decode(),'catcher');prm=g10match.fit(p,q,ab);R,_,_=g10match.evaluate(p,q,ab,prm);row['abdul']=dict(params=prm,**R)
        for op in 'AB':
            TP=piece(op,k);prm=g10match.fit(p,q,TP);R,lab,M=g10match.evaluate(p,q,TP,prm);row[op]=dict(params=prm,**R)
        out.append(row)
    return out
def save():
    im=Image.fromarray(np.where(T5==WHITE,181,T5).astype(np.uint8),'P');im.putpalette(g10tex.ACT.flatten().tolist())
    im.save(H10+'/goalie_texture_v5_candidate_indexed.png')
if __name__=='__main__':
    save()
    allf=sorted(set(SAMPLE)|{r['frame'] for r in json.load(open(H10+'/g10d_catcher.json'))})
    R=run(allf);json.dump(R,open(H10+'/g10e_catcher.json','w'),indent=1,default=int)
    tot=collections.defaultdict(lambda:[0,0,0])
    for r in R:
        print(r['frame'],r['anim'][4:],'d%d'%r['d'],r['orient'],r['px'],*['%s %d>%d out%d'%(k,r[k]['strict_diff'],r[k]['after_expand_diff'],r[k].get('outzone',0)) for k in ('abdul','A','B')])
        for i,k in enumerate(('abdul','A','B')):tot[r['orient']][i]+=r[k]['after_expand_diff'];tot['ALL'][i]+=r[k]['after_expand_diff']
    print(dict(tot))
