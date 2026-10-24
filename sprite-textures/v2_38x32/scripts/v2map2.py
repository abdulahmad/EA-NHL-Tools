import sys,os,runpy,json,collections,numpy as np
from PIL import Image
os.chdir('/workspace/preview_back/root/sprite-textures/out');sys.path.insert(0,'/workspace/preview_back/root/sprite-textures/scripts')
sys.argv=['x'];B=runpy.run_path('/workspace/preview_back/scripts/backmap.py')
G=B['G'];MAPS=G['MAPS'];TF=G['TF'];FR=G['FRAMES'];MAG=(252,0,252);GRN=(0,220,0)
src=open('/workspace/preview_wide/widen.py').read();src=src[:src.index("os.makedirs('/workspace/preview_wide/raw'")]
W={};exec(src,W);place=W['place'];ROLE=W['R'];ARM=W['ARM']
J=json.load(open('/workspace/preview_v2/column_map_v2.json'))
INV={tuple(v):tuple(map(int,k.split(','))) for k,v in J['map_new_to_oldwide'].items()}  # wide(x,y)->new(nx,v)
DIAG=np.asarray(Image.open('/workspace/preview_v2/raw/stripe_diagnostic_v2.png').convert('RGB'))
def wzone(x,v):
    if x>=50:return 'pantsF' if x<=62 else 'pantsB'
    if v>=23:return 'legF' if x<=23 else 'legB'
    if v<=5:return 'headF' if x<=23 else 'headB'
    return 'FR' if x<=3 else 'FT' if x<=18 else 'FL' if x<=23 else 'BL' if x<=28 else 'BT' if x<=43 else 'BR'
NZ={};NSRC={}     # v2 texel -> zone, -> old54 source texel (None for added)
for (x,y),(nx,v) in INV.items():NZ[(nx,v)]=wzone(x,y)
for c,_,_ in J['glove_added']:
    for v in (18,19,20):NZ[(c,v)]={0:'FR',19:'FL',20:'BL',37:'BR'}[c]
COMP={}           # old54 -> v2
for (u,v),f in TF.items():
    if u==53:continue
    x=place(u,v,ROLE.get((u,v),f));
    if (x,v) in INV:COMP[(u,v)]=INV[(x,v)]
for v in range(17,24):
    if (29,v) in COMP:COMP[(53,v)]=COMP[(29,v)]
for o,nw in COMP.items():NSRC.setdefault(nw,o)
def ozone(u,v):   # zone of an old texel in v2 terms
    f=TF[(u,v)]
    if u>=28:
        x=place(u,v,f)
        if v==23:return 'legF' if x<=62 else 'legB'   # side-panel hem row dropped in v2 -> figure pants row 23
        return wzone(x,v)
    back=u>=14;w=27-u if back else u
    if v<=5:return 'headB' if back else 'headF'
    if v>=23:return 'legB' if back else 'legF'
    if f in ARM or ROLE.get((u,v)) in ARM:
        right=w<=6;return ('BR' if right else 'BL') if back else ('FR' if right else 'FL')
    if v>=17:return 'pantsB' if back else 'pantsF'
    return 'BT' if back else 'FT'
SPECIAL=lambda f:f in('skin','gear') or f.startswith('idx')
REMAP={'FR','FL','BL','BR','FT','BT','pantsF','pantsB'}
REMAPROW=lambda z,v,u:z in REMAP or (v==23 and u>=28)
def targets(z,v,glove):
    ts=sorted(x for (x,vv),zz in NZ.items() if zz==z and vv==v and tuple(DIAG[v,x])!=MAG)
    # keep skin texels out of torso rows; gloves only onto glove rows' texels (rows 18-20 are all glove in arms)
    ts=[x for x in ts if not(NSRC.get((x,v)) and SPECIAL(TF.get(NSRC[(x,v)])))]
    return ts
import sys;sys.path.insert(0,'/workspace/preview_v2/mapped');import ctrl as _c
FAM2=_c.setup({'TF':TF,'NSRC':NSRC,'NZ':NZ,'DIAG':DIAG})
FALLBACK=collections.Counter()
def ftargets(z,v,fam):
    ts=[x for x in targets(z,v,False) if FAM2.get((x,v))==fam]
    if ts:return ts,v
    FALLBACK[(z,v,fam)]+=1
    for dv in (1,-1,2,-2,3,-3):   # nearest row in same zone having that family
        ts=[x for x in targets(z,v+dv,False) if FAM2.get((x,v+dv))==fam]
        if ts:return ts,v+dv
    if z in('pantsF','pantsB'):   # wrap: dropped col 74 (old 53, stripe 2) == col 50 (old 29) -> use the other pants half, same row
        oz={'pantsF':'pantsB','pantsB':'pantsF'}[z];ts=[x for x in targets(oz,v,False) if FAM2.get((x,v))==fam]
        if ts:FALLBACK[('wrap',z,v,fam)]+=1;return ts,v
    raise SystemExit(f'no target {z} {v} {fam}')
OLDROW=collections.defaultdict(list)
for (u,v),f in TF.items():
    if not SPECIAL(f):OLDROW[(ozone(u,v),v,f)].append(u)
for k in OLDROW:OLDROW[k].sort()
A2={};SHARED=[];STAT={}
for n in FR:
    q,A,LEV,fx=MAPS[n];grp=collections.defaultdict(list);B2={}
    for p,(u,v) in A.items():
        f=TF[(u,v)];z=ozone(u,v)
        if SPECIAL(f) or not REMAPROW(z,v,u):
            assert (u,v) in COMP,(n,u,v,f);B2[p]=COMP[(u,v)]
        else:grp[(z,v,f)].append(p)
    sh=[]
    for (z,v,fam),ps in grp.items():
        ts,tv=ftargets(z,v,fam);ou=OLDROW[(z,v,fam)]
        if not ts:print("NOTARGET",n,z,v,len(ps),collections.Counter(TF[A[p]] for p in ps),collections.Counter(A[p] for p in ps));continue
        # order: old texel u, then screen position along the row (direction from correlation of x with u)
        xs=np.array([p[1] for p in ps]);us=np.array([A[p][0] for p in ps]);sg=1 if len(ps)<3 or np.std(xs)==0 or np.std(us)==0 or np.corrcoef(xs,us)[0,1]>=0 else -1
        ps.sort(key=lambda p:(A[p][0],sg*p[1],p[0]));m,nT=len(ps),len(ts)
        s=[(ou.index(A[p][0])+0.5)/len(ou) if A[p][0] in ou else (i+0.5)/m for i,p in enumerate(ps)]
        if m<=nT:
            o=(nT-m)//2      # NEW RULE pt851u: contiguous block centred in the row, outer columns dropped first
            for i,p in enumerate(ps):B2[p]=(ts[o+i],tv)
        else:
            e=m-nT;dup={min(range(nT),key=lambda j:abs(j-(nT-1)/2))} if e==1 else {min(nT-1,int(round((t+0.5)*nT/e-0.5))) for t in range(e)}
            if len(dup)<e:dup=set(range(nT)) # >2x: fall back below
            per=[1+(j in dup) for j in range(nT)]
            while sum(per)<m:per[min(range(nT),key=lambda j:per[j]-0.01*abs(j-(nT-1)/2))]+=1   # extremely dense rows
            k=0
            for j,c in enumerate(per):
                for _ in range(c):B2[ps[k]]=(ts[j],tv);k+=1
            for j,c in enumerate(per):
                if c>1:sh.append(dict(frame=n,zone=z,row=v,texel=[ts[j],tv],pixels_xy=[[int(p[1]),int(p[0])] for p in ps if B2[p]==(ts[j],tv)],group_px=m,group_texels=nT))
    A2[n]=B2;SHARED+=sh
    co=collections.Counter(A.values());cn=collections.Counter(B2.values())
    STAT[n]=dict(px=len(A),old_texels_shared=sum(1 for c in co.values() if c>1),old_dup_px=len(A)-len(co),new_texels_shared=sum(1 for c in cn.values() if c>1),new_dup_px=len(B2)-len(cn),new_shared_listed=len(sh))
# ---- verification
ver={}
for n in FR:
    A=MAPS[n][1];B2=A2[n];bad_mag=[p for p,t in B2.items() if tuple(DIAG[t[1],t[0]])==MAG]
    badz=[p for p,t in B2.items() if NZ.get(t)!=ozone(*A[p]) and not SPECIAL(TF[A[p]])]
    rows=sum(1 for p in A if A[p][1]!=B2[p][1])
    # ID round trip: unique colour per v2 texel, render, decode
    ID=np.zeros((32,38,3),int)
    for v in range(32):
        for x in range(38):ID[v,x]=(x*6,v*7,77)
    dec={p:(ID[t[1],t[0]][0]//6,ID[t[1],t[0]][1]//7) for p,t in B2.items()}
    ver[n]=dict(pixels_same_set=set(A)==set(B2),on_magenta=len(bad_mag),wrong_zone=len(badz),row_changes=rows,roundtrip_mismatch=sum(1 for p in B2 if dec[p]!=B2[p]))
TEXS={'stripe_diagnostic_v2':('/workspace/preview_v2/raw/stripe_diagnostic_v2.png',('HOME.json','chi')),'chicago_home_v2':('/workspace/preview_v2/raw/chicago_home_top_v2.png',('HOME.json','chi')),
      'dallas_blackstar_nonum_redraw':('/workspace/preview_v2/redraw/dallas_blackstar_nonum_v2redraw.png',('HOME.json','chi')),'east94_num77_redraw':('/workspace/preview_v2/redraw/east94_num77_v2redraw.png',('HOME.json','chi'))}
OUT='/workspace/preview_v2/mapped'
RND={}
for k,(path,pal) in TEXS.items():
    T=np.asarray(Image.open(path).convert('RGB')).astype(int);R=G['ramps'](G['ALLP'][pal]);mh=0
    for n in FR:
        q,A,LEV,fx=MAPS[n];cb=-np.ones(q.shape+(3,),int)
        for p,t in fx.items():cb[p]=GRN
        for p,(x,v) in A2[n].items():
            c=tuple(int(a) for a in T[v,x]);mh+=c==MAG;f=TF[A[p]]
            cb[p]=GRN if c==GRN else G['shade'](c,f,LEV[p],R)
        RND[(k,n)]=cb
    ver.setdefault('magenta_hits',{})[k]=mh
json.dump(dict(stats=STAT,verify=ver,shared=SHARED,maps={n:{f'{p[1]},{p[0]}':list(t) for p,t in A2[n].items()} for n in FR}),open(f'{OUT}/v2_mapping.json','w'),indent=1,default=int)
import pickle;pickle.dump(dict(RND=RND,FR=FR,DIRS=G['DIRS'],TEXS={k:v[0] for k,v in TEXS.items()},STAT=STAT,SHARED=SHARED,A2=A2,MAPS={n:(MAPS[n][0],) for n in FR}),open('/tmp/v2map.pkl','wb'))
print(json.dumps(STAT));print(json.dumps(ver))
