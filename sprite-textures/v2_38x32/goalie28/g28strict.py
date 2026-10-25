# Goalie v28 (Abdul pt947u + steering): strict 0-error mapping for blocker, catcher (incl. cuff), mask and the new
# STICK part, D141/D142.  Pads stay g25/g26 (1127 ok / 0 err).
# D141 fixes (no px is left unmapped to hide an error):
#  - segmentation: 3 'blocker' px with jersey indices (416 (17,6) 177; 407 (14,16) 169, (15,16) 173) -> BODY;
#    425 (27,3) idx 0 'catcher' px sits in the stick's black butt (stick 0/136 around it) -> STICK;
#    1044 (33,9) idx 8 'stick' px is skate colour next to the skate -> SKATE.
#  - texel mapping: a glove px whose index is not in its own block takes the nearest same-index texel of the other
#    glove blocks (blocker <-> catcher front/back are one atlas; same rule as D130 for the catcher). The 44 blocker px
#    with glove indices 145/148-152 (blocker glove cuff/hand, D139) now map into the catcher blocks.
#  - cannot reach 0: 538 mask (4,30),(4,32) index 45 (the eye holes in that frame); no texel in the layout has
#    index 45 (Abdul's mask eyes are 0), so it needs a layout/palette decision (listed, not hidden).
# D142 STICK: new region in the free area of the layout, x14-16 rows 9-22 (right of the pad back strip):
#    col 15 rows 9-19 = 136 (shaft), cols 14/16 rows 9-19 = 0 (outline), rows 20-22 x14-16 = 0 (blade/tape).
#    Texture: goalie28/goalie_texture_v7_indexed.png = v6 + that region. Stick px: v = position along the stick's long
#    axis (top/hand 0 -> blade 13), u = across (0..2), snapped to the nearest same-index texel.
import sys,os,json,collections,numpy as np
H=os.path.dirname(os.path.abspath(__file__));G=os.path.abspath(H+'/..')
sys.path.insert(0,G+'/goalie15');from g15pad import frame
from PIL import Image
L6=np.array(Image.open(G+'/goalie15/goalie_texture_v6_indexed.png')).astype(int)
def texture_v7():
    T=L6.copy()
    for y in range(9,23):
        for x in (14,15,16):T[y,x]=0
    for y in range(9,20):T[y,15]=136
    return T
L=texture_v7()
BG,BODY,MASK,CATCH,BLOCK,STICK,PADL,PADR,SKATE,SHADOW=range(10)
# D152: 407 back-view helmet (rows 1-5, mask colours) is MASK
FIX={416:[((17,6),BODY)],407:[((14,16),BODY),((15,16),BODY)]+[((y,x),MASK) for y,xs in ((1,(10,11,12)),(2,(10,11,12,13)),(3,(10,11,12,13)),(4,(10,11,12,13)),(5,(12,13))) for x in xs],425:[((27,3),STICK)],1044:[((33,9),SKATE)]}
BLK={'blocker':(0,0,10,7),'catFront':(11,23,11,9),'catBack':(0,23,11,9),'stick':(14,9,3,14)}
def snap_box(s,box,v,u):
    x0,y0,w,h=box;C=[(y,x) for y in range(y0,y0+h) for x in range(x0,x0+w) if L[y,x]==s]
    return min(C,key=lambda z:(z[0]-(y0+v*(h-1)))**2+(z[1]-(x0+u*(w-1)))**2) if C else None
sys.path.insert(0,G+'/goalie25')
def seg_all():
    S=json.load(open('/tmp/g21_seg.json'))
    src=open(G+'/goalie21/g21seg.py').read();A=eval(src.split('ARM1044=')[1].split('\n')[0])   # D132 ruling (x,y)
    FIX.setdefault(1044,[]);FIX[1044]=[f for f in FIX[1044] if f[1]!=BODY]+[((y,x),BODY) for x,y in A]
    for n,f in FIX.items():
        lab=np.array(S[str(n)]['lab'])
        for c,l in f:lab[c]=l
        S[str(n)]['lab']=lab.tolist()
    return S
def run():
    import g25map
    S=seg_all();out={};tot=collections.Counter();err=[]
    for n in g25map.FR:
        p=frame(n);lab=np.array(S[str(n)]['lab']);R={}
        for part,L_ in (('blocker',BLOCK),('catcher',CATCH),('mask',MASK),('stick',STICK)):
            q=[tuple(map(int,c)) for c in np.argwhere((lab==L_)&(p!=255))]
            if not q:continue
            ys=[c[0] for c in q];xs=[c[1] for c in q];a,b,cc,e=min(ys),min(xs),max(ys),max(xs);M={}
            if part=='stick':
                P=np.array(q,float);c0,ax,bx=g25map.axes(q);sv=(P-c0)@ax;su=(P-c0)@bx
                V=(sv-sv.min())/max(1e-6,sv.max()-sv.min());U=(su-su.min())/max(1e-6,su.max()-su.min())
            for i,(y,x) in enumerate(q):
                v=(y-a)/max(1,cc-a);u=(x-b)/max(1,e-b);s=int(p[y,x])
                if part=='mask':t=g25map.snap_mask(s,v,u,n in g25map.BACK)
                elif part=='stick':t=snap_box(s,BLK['stick'],V[i],U[i])
                else:
                    if part=='catcher':
                        own=['catFront','catBack'] if g25map.ORI.get(n)=='FRONT' else ['catBack','catFront'];order=own+['blocker']
                    else:order=['blocker','catFront','catBack']
                    t=None
                    for bk in order:
                        t=snap_box(s,BLK[bk],v,u)
                        if t:break
                M['%d,%d'%(y,x)]=list(map(int,t)) if t else None
                ok=bool(t) and L[t]==s;tot[part+('_ok' if ok else '_err')]+=1
                if not ok:err.append((n,part,y,x,s))
            R[part]=M
        out[n]=R
    json.dump(dict(frames=out,totals=dict(tot),errors=err),open(H+'/g28_map.json','w'))
    Image.fromarray(L.astype(np.uint8)).save(H+'/goalie_texture_v7_indexed.png')
    print('TOTAL',dict(tot));print('ERRORS',err);return out
if __name__=='__main__':run()
