# D153 (Abdul pt961u): texture-preview mapping for skater frames without a hand-checked map. Runs the v5 per-frame fit
# (playerlayout/frames_v5.py fit(): game-zone families + skeleton geometry from the frame's own stripe bands) on every frame,
# with the facing taken from the game's SPA tables (each frame's most common direction; agrees with all 11 hand-fitted frames),
# then maps old-layout texels to the v2 38x32 layout with column_map_v2 (COMP, same as v2map3.py). Palette indices the v5
# families don't know (referee/ice/odd art, 30, etc.) keep the game colour. Needs the LOCAL preview_back pipeline
# (/workspace/preview_back); holds no game data itself. Frames whose fit fails (no uniform px, goalie-mask px, no SPA direction)
# get no map. D156: back-view torso columns now get the 1:1 back-torso remap (backmap.py, below) like the
# hand-checked back frames -> 100% texel agreement on all 11 hand frames (was 70-96% on the back ones).
import sys,os,json,collections,io,contextlib
PB='/workspace/preview_back/root/sprite-textures'
# D156 (Abdul pt967u): back-torso 1:1 column remap (preview_back/scripts/backmap.py, the pass the hand-fitted back frames got)
# applied to every auto frame facing d0/1/2/6/7. Rows stay the v5.2 rows; per (family,row) the torso px are ordered across the
# body (PCA of that texel row's px, oriented to agree with the v5 columns) and packed onto ADJACENT base texels of the back figure
# (cols 14-27), jersey rows with col 21 pin the px nearest the body centre to the number centre; more px than texels = the
# approved even stretch (number cols 19-23 on rows 10-13 never doubled), then backmap's contiguity sweep on the
# segmentation parts; the v5 fit's own SEGS[n] parts are used.
TOR={'yoke 1','yoke 2','yoke 3','yoke corner','shoulder patch','jersey','waist 1','waist 2','waist 3'}
def backremap(A,TF,P=None):
    import numpy as np
    BASE={}
    for (u,v),f in TF.items():
        if 14<=u<28 and f in TOR:BASE.setdefault((f,v),[]).append(u)
    for k in BASE:BASE[k].sort()
    st=lambda u:(u-16+0.5)/10.0
    A=dict(A);M0=dict(A)
    bt=[p for p,uv in A.items() if uv in TF and 14<=uv[0]<28 and TF[uv] in TOR]
    if len(bt)<2:return A
    byrow=collections.defaultdict(list);allrow=collections.defaultdict(list)
    for p in bt:byrow[A[p][1]].append(p)
    for p,uv in A.items():
        if uv in TF and TF[uv] in TOR:allrow[uv[1]].append(p)
    S={}
    for v,ps in byrow.items():
        Y=np.array(allrow[v],float);c=Y.mean(0)
        if len(Y)>=3:w,Vv=np.linalg.eigh((Y-c).T@(Y-c));d=Vv[:,1]
        else:d=np.array([0.,1.])
        if d[1]<0:d=-d
        pr={p:float((np.array(p)-c)@d) for p in allrow[v]};lo,hi=min(pr.values()),max(pr.values())
        for p in ps:S[p]=(pr[p]-lo+0.5)/(hi-lo+1)
    a=[S[p] for p in bt];b=[A[p][0] for p in bt]
    if np.std(a)>0 and np.std(b)>0 and np.corrcoef(a,b)[0,1]<0:S={p:1-s for p,s in S.items()}
    grp=collections.defaultdict(list)
    for p in bt:grp[(TF[A[p]],A[p][1])].append(p)
    for (f,v),ps in grp.items():
        ps.sort(key=lambda p:S[p]);us=BASE[(f,v)];ts=[st(u) for u in us];m=len(ps)
        if m<=len(us):
            if 21 in us and m>1:
                c0=min(range(m),key=lambda i:abs(S[ps[i]]-0.5));o=min(max(us.index(21)-c0,0),len(us)-m)
            else:o=min(range(len(us)-m+1),key=lambda o:sum(abs(S[p]-ts[o+i]) for i,p in enumerate(ps)))
            for i,p in enumerate(ps):A[p]=(us[o+i],v)
            continue
        e=m-len(us);Dc=[j for j,u in enumerate(us) if not(10<=v<=13 and 19<=u<=23)] or list(range(len(us)))
        if e==1:dup={min(Dc,key=lambda j:abs(j-(len(us)-1)/2))}
        else:dup={Dc[min(len(Dc)-1,int(round((t+0.5)*len(Dc)/e-0.5)))] for t in range(e)}
        k=0
        for j,u in enumerate(us):
            for _ in range(2 if j in dup else 1):
                if k<m:A[ps[k]]=(u,v);k+=1
    # backmap contiguity sweep (pt833u): per packed row try every contiguous offset; keep the fewest red flags (4-neighbours of the
    # same torso/arm segment more than 2 texels apart), then most back-number px, then min sum |ds|. 3 sweeps. P = v5 seg parts.
    if P:
        wv=lambda uv:('F',uv[0],uv[1]) if uv[0]<14 else ('B',27-uv[0],uv[1]) if uv[0]<28 else ('S',uv[0],uv[1])
        SKIP=(0,1,16,10,11,12,13,14,15,17,8,9)
        def flags():
            r=0
            for (y,x),uv in A.items():
                for b in ((y+1,x),(y,x+1)):
                    if b not in A or P.get(b)!=P.get((y,x)) or P.get(b) in SKIP:continue
                    fa,wa,va=wv(uv);fb,wb,vb=wv(A[b])
                    if fa==fb and (abs(wa-wb)>2 or abs(va-vb)>2):r+=1
            return r
        for sweep in range(3):
            for (f,v),ps in grp.items():
                us=BASE[(f,v)];m=len(ps)
                if m>=len(us):continue
                ts=[st(u) for u in us];best=None
                for o in range(len(us)-m+1):
                    for i,p in enumerate(ps):A[p]=(us[o+i],v)
                    nb=sum(1 for p in ps if 19<=A[p][0]<=23 and 10<=v<=13)
                    key=(flags(),-nb,sum(abs(S[p]-ts[o+i]) for i,p in enumerate(ps)))
                    if best is None or key<best[0]:best=(key,o)
                for i,p in enumerate(ps):A[p]=(us[best[1]+i],v)
    return A
def autofit(frames,V):
    cwd=os.getcwd();argv=list(sys.argv);os.chdir(PB+'/out');sys.argv=['x','/tmp/_pb_chk/frames'];os.makedirs('/tmp/_pb_chk/frames',exist_ok=True)
    sys.path[:0]=[PB+'/scripts',PB+'/scripts/playerlayout']
    try:
        P=PB+'/scripts/playerlayout/frames_v5.py';src=open(P).read();src=src[:src.index('FRAMES=[370')]
        G={'__file__':P,'__name__':'fv5'}
        with contextlib.redirect_stdout(io.StringIO()):exec(compile(src,P,'exec'),G)
        D={}
        for a,dirs in json.load(open('/workspace/preview_back/spa95pc.json')).items():
            for d,fl in enumerate(dirs):
                for f in fl:D.setdefault(f,collections.Counter())[d]+=1
        G['DIRS'].update({f:c.most_common(1)[0][0] for f,c in D.items() if f not in G['DIRS']})
        UNK=set()
        for i in range(256):
            if i==255 or i in G['ICE'] or i==136:continue
            try:G['pfam'](i)
            except Exception:UNK.add(i)
        G['ICE']=set(G['ICE'])|UNK
        s2=open(V+'scripts/v2map3.py').read();s2=s2[:s2.index('def category')]
        s2=s2.replace("B=runpy.run_path('/workspace/preview_back/scripts/backmap.py')","B={'G':G}")
        G['FRAMES']=[];G['MAPS']={};GG={'G':G}
        with contextlib.redirect_stdout(io.StringIO()):exec(s2,GG)
        COMP=GG['COMP'];out={};CH={};err=collections.Counter()
        for n in frames:
            if n not in G['DIRS']:err['no SPA direction']+=1;continue
            try:
                with contextlib.redirect_stdout(io.StringIO()):q,A,LEV,fx,sh,bb=G['fit'](n)
            except BaseException as e:err['fit failed: '+('goalie mask px' if 'goalie mask' in str(e) else 'no uniform px')]+=1;continue
            if os.environ.get('NOBACK')!='1' and G['DIRS'][n] in (0,1,2,6,7):A=backremap({p:tuple(map(int,uv)) for p,uv in A.items()},G['TF'],G['SEGS'].get(n,{}).get('part'));CH[n]=1
            out[n]={'%d,%d'%(int(y),int(x)):list(map(int,COMP[(int(u),int(w))])) for (y,x),(u,w) in A.items() if (int(u),int(w)) in COMP}
        err['back-torso remapped']=len(CH);return out,dict(err)
    finally:os.chdir(cwd);sys.argv=argv
