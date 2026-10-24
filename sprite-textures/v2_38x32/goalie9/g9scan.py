# Goalie v9 view scan (Abdul pt868u): "find sprites with better squared / straight-on shots of the pads, blocker, mask".
# Scans EVERY goalie frame in the NHL 95 PC SPA tables (g9common.goalie_frames), segments the gear generically (no per-frame boxes,
# unlike seg5/6 which only cover 8 frames), and scores each piece candidate for how straight-on / square / unoccluded it is.
# Segmentation (palette roles from D41/D47/D50):
#   stick = 136 (+0 only when 8-connected to 136 and outside the head); ice/shadow 88 ignored.
#   head  = 4-connected component of HEAD idx that touches the yoke/jersey (159-167) or is the topmost HEAD blob -> mask.
#           front = 164 face with 0 eye holes inside; back = socks-zone 184-189 with no 164.
#   gloves= components of GLOVE idx (144-152) 8-adjacent to the sleeve (153-158) and not below the pants; blocker = the glove
#           touching / nearest the stick, catcher = the other.
#   pads  = remaining gear px (144-152,155,164,0,22,30,31,109,181-189) at or below the pants (177-180) top; split into 2 legs by
#           the widest empty column gap (fallback: median x). Surface: socks 181-189 share = back, forearm/arm-stripe 144-148 = front.
# Facing from the SPA table index (d0 away from camera, d4 toward camera, d2 / d6 side).
# Score (0..1-ish): facing_fit^2 * rectangularity * sqrt(px / max px of that piece) * (1-stick occlusion) * [pads: verticality *
# separation]. Verticality = |cos| of the leg principal axis vs vertical (knee above ankle). Output: g9_scan.json (numbers only).
import math,collections
from g9common import *
F=goalie_frames()
R=lambda a,b:set(range(a,b+1))
HEAD={164,0,134,135,136,177}|R(184,189);YOKE=R(159,167);SLEEVE=R(153,158);GLOVE=R(144,152);PANTS=R(177,180)|R(168,176)
PADG={0,22,30,31,109,164,155}|R(144,152)|R(181,189);SOCK=R(181,189);FZ=R(144,148)
N4=((0,1),(1,0),(0,-1),(-1,0));N8=N4+((1,1),(1,-1),(-1,1),(-1,-1))
def comps(m,nb=N4):
    h,w=m.shape;lab=np.zeros((h,w),int);k=0;out=[]
    for y in range(h):
        for x in range(w):
            if m[y,x] and not lab[y,x]:
                k+=1;st=[(y,x)];lab[y,x]=k;c=[]
                while st:
                    a,b=st.pop();c.append((a,b))
                    for dy,dx in nb:
                        q=(a+dy,b+dx)
                        if 0<=q[0]<h and 0<=q[1]<w and m[q] and not lab[q]:lab[q]=k;st.append(q)
                out.append(c)
    return out
def touches(c,p,S,nb=N8):
    h,w=p.shape;return any(0<=a+dy<h and 0<=b+dx<w and int(p[a+dy,b+dx]) in S for a,b in c for dy,dx in nb)
def seg(n):
    p=frame(n);h,w=p.shape;isin=lambda S:np.isin(p,list(S));L=np.full((h,w),'',object)
    # head: HEAD-idx 4-components touching yoke/jersey; keep the one with most 164/184-189, must sit in the upper half of the body bbox
    ys=np.nonzero(p!=255)[0];top,bot=ys.min(),ys.max()
    hc=[c for c in comps(isin(HEAD-{136,177})) if touches(c,p,YOKE)]
    def hs(c):return sum(1 for q in c if int(p[q]) in {164}|R(184,189))-0.3*np.mean([q[0] for q in c])
    head=max(hc,key=hs) if hc else []
    if head and len(head)>40:head=[]   # implausible
    for q in head:L[q]='mask'
    # stick
    st=set(zip(*np.nonzero(p==136)))
    for q in list(comps(p==136,N8)):
        if len(q)<2:continue
    zero=[c for c in comps(p==0,N8) if touches(c,p,{136}) and not any(L[q] for q in c) and len(c)<=14]
    for c in zero:st|=set(c)
    for q in st:
        if not L[q]:L[q]='stick'
    # pants top (row) for pad/glove split
    pr=[q[0] for q in zip(*np.nonzero(isin(PANTS)))];ptop=min(pr) if pr else (top+bot)//2
    # gloves: GLOVE px reached from the sleeve, cut at the pants bottom row; below it only px outside the pants columns, max 4 rows
    pq=list(zip(*np.nonzero(isin(R(177,180)))))
    if pq:pb=max(q[0] for q in pq);px0=min(q[1] for q in pq);px1=max(q[1] for q in pq)
    else:pb,px0,px1=ptop,0,-1
    ok=lambda q:int(p[q]) in GLOVE and not L[q] and (q[0]<=pb or (q[0]<=pb+4 and not px0-1<=q[1]<=px1+1))
    seen=set();stk=[q for q in zip(*np.nonzero(isin(GLOVE))) if ok(q) and touches([q],p,SLEEVE)]
    seen=set(stk)
    while stk:
        a,b=stk.pop()
        for dy,dx in N8:
            q=(a+dy,b+dx)
            if 0<=q[0]<h and 0<=q[1]<w and q not in seen and ok(q):seen.add(q);stk.append(q)
    for c in comps(np.isin(np.arange(h*w).reshape(h,w),[a*w+b for a,b in seen]),N8):
        if len(c)>=4:
            for q in c:L[q]='glove'
    # pads
    pm=isin(PADG)&(L=='')
    for c in comps(pm,N8):
        if len(c)<6:continue
        cy=np.mean([q[0] for q in c])
        if cy>=ptop-1 or max(q[0] for q in c)>=bot-3:
            for q in c:L[q]='pad'
    return p,L,st
def gloves_split(p,L,st,d):
    cs=comps(L=='glove',N8);cs=[c for c in cs if len(c)>=4]
    if not cs:return {}
    stl=list(st)
    def dst(c):return min((math.dist(a,b) for a in c for b in stl),default=99)
    cs.sort(key=dst);out={'blocker':cs[0]}
    if len(cs)>1:out['catcher']=max(cs[1:],key=len)
    return out
def legs(pad):
    xs=sorted(set(q[1] for q in pad));
    if not xs:return []
    gaps=[(b-a,a) for a,b in zip(xs,xs[1:]) if b-a>1]
    if gaps:
        g=max(gaps);cut=g[1]+0.5;sep=g[0]-1
    else:
        cut=float(np.median([q[1] for q in pad]));sep=0
    A=[q for q in pad if q[1]<cut];B=[q for q in pad if q[1]>=cut]
    return [(A,sep),(B,sep)] if A and B else [(pad,0)]
def verticality(c):
    a=np.array(c,float);a-=a.mean(0)
    if len(c)<3:return 0
    ev,evec=np.linalg.eigh(np.cov(a.T));v=evec[:,1];el=1-ev[0]/max(ev[1],1e-9)  # v=(dy,dx)
    return abs(v[0])*el+ (1-el)*0.7   # round blobs get a neutral 0.7
def rect(c):
    ys=[q[0] for q in c];xs=[q[1] for q in c];return len(c)/((max(ys)-min(ys)+1)*(max(xs)-min(xs)+1)),(min(xs),min(ys),max(xs)-min(xs)+1,max(ys)-min(ys)+1)
def occl(c,st):
    _,(x,y,w,h)=rect(c);ins=sum(1 for q in st if x<=q[1]<x+w and y<=q[0]<y+h);return ins/(len(c)+ins)
FACE={'front':4,'back':0,'sideR':2,'sideL':6}
def ffit(d,want):
    if want=='side':return max(ffit(d,'sideR'),ffit(d,'sideL'))
    return 0.5+0.5*math.cos(math.radians(45*((d-FACE[want])%8)))
def candidates():
    C=[]
    for n,an in F.items():
        anim,d=an[0];p,L,st=seg(n)
        base=dict(frame=n,d=d,anim=anim)
        # mask
        head=list(zip(*np.nonzero(L=='mask')))
        if head:
            f164=sum(1 for q in head if p[q]==164);fs=sum(1 for q in head if 184<=p[q]<=189)
            eyes=sum(1 for q in head if p[q]==0)
            r,bb=rect(head);o=occl(head,st)
            for view in ('front','side','back'):
                fit=ffit(d,view)
                cont={'front':min(1,(f164+2*eyes)/max(1,len(head))*1.6),'back':0 if (eyes and f164>2) else fs/len(head) if f164==0 else 0.3*fs/len(head),
                      'side':1.0 if (eyes<=1 and f164 and fs) else 0.3}[view]   # profile: one eye hole, face + shell both visible
                C.append(dict(base,piece='mask_'+view,px=len(head),rect=r,bbox=bb,occ=o,fit=fit,content=cont,q=head))
        for k,c in gloves_split(p,L,st,d).items():
            r,bb=rect(c);o=occl(c,st);fit=ffit(d,'front')
            C.append(dict(base,piece=k+'_face',px=len(c),rect=r,bbox=bb,occ=o,fit=fit,content=1.0,q=c))
        pad=list(zip(*np.nonzero(L=='pad')))
        lg=legs(pad)
        if len(lg)==2:
            (A,sep),(B,_)=lg
            # goalie's own leg: back views (d7,d0,d1) screen-left = L; front views (d3,d4,d5) screen-left = R; side: near (lower foot) leg
            if d in (7,0,1):own={'L':A,'R':B}
            elif d in (3,4,5):own={'R':A,'L':B}
            else:
                near=A if max(q[0] for q in A)>=max(q[0] for q in B) else B;far=B if near is A else A
                own={'R':near,'L':far} if d==2 else {'L':near,'R':far}
        else:own={};sep=0
        hy=np.mean([q[0] for q in head]) if head else 0
        for side,c in own.items():
            up=1.0 if np.mean([q[0] for q in c])>hy+6 else 0.3   # pad must hang below the mask (rejects dive / lying flips)
            if len(c)<8:continue
            r,bb=rect(c);o=occl(c,st);v=verticality(c)
            sock=sum(1 for q in c if int(p[q]) in SOCK);fz=sum(1 for q in c if int(p[q]) in FZ|{164})
            sp_=min(1,0.6+0.2*sep)
            C.append(dict(base,piece='padF_'+side,px=len(c),rect=r,bbox=bb,occ=o,fit=ffit(d,'front'),content=fz/len(c),vert=v*up,sep=sep,q=c))
            C.append(dict(base,piece='padB_'+side,px=len(c),rect=r,bbox=bb,occ=o,fit=ffit(d,'back'),content=min(1,2*sock/len(c)),vert=v*up,sep=sep,q=c))
            if d in (2,6) and c is own.get('R' if d==2 else 'L'):
                C.append(dict(base,piece='pad_side',px=len(c),rect=r,bbox=bb,occ=o,fit=ffit(d,'side'),content=1.0,vert=v*up,sep=sep,q=c,leg=side))
    mx=collections.defaultdict(int)
    for c in C:mx[c['piece']]=max(mx[c['piece']],c['px'])
    for c in C:
        s=c['fit']**2*c['rect']*math.sqrt(c['px']/mx[c['piece']])*(1-c['occ'])*(0.5+0.5*c['content'])
        if 'vert' in c:s*=c['vert']*(min(1,0.6+0.2*c['sep']) if c['piece']!='pad_side' else 1)
        c['score']=round(s,4)
    return C
def ranked(C,k=6):
    out=collections.defaultdict(list);seen=collections.defaultdict(set)
    for c in sorted(C,key=lambda c:-c['score']):
        P_=frame(c['frame']);key=tuple(sorted((q[0]-min(a for a,_ in c['q']),q[1]-min(b for _,b in c['q']),int(P_[q])) for q in c['q']))  # identical piece pixels (breathing / shared frames) once
        if key in seen[c['piece']] or len(out[c['piece']])>=k:continue
        seen[c['piece']].add(key);out[c['piece']].append(c)
    return out
PIECES=['padF_L','padF_R','padB_L','padB_R','pad_side','blocker_face','catcher_face','mask_front','mask_side','mask_back']
if __name__=='__main__':
    C=candidates();Rk=ranked(C)
    J={p:[{k:(round(v,3) if isinstance(v,float) else v) for k,v in c.items() if k!='q'} for c in Rk[p]] for p in PIECES}
    J['_frames_scanned']=len(F)
    json.dump(J,open(HERE+'/g9_scan.json','w'),indent=1,default=int)
    for p in PIECES:print(p,[(c['frame'],'d%d'%c['d'],c['px'],c['score']) for c in Rk[p]])
