# D153 (Abdul pt961u): texture-preview mapping for skater frames without a hand-checked map. Runs the v5 per-frame fit
# (playerlayout/frames_v5.py fit(): game-zone families + skeleton geometry from the frame's own stripe bands) on every frame,
# with the facing taken from the game's SPA tables (each frame's most common direction; agrees with all 11 hand-fitted frames),
# then maps old-layout texels to the v2 38x32 layout with column_map_v2 (COMP, same as v2map3.py). Palette indices the v5
# families don't know (referee/ice/odd art, 30, etc.) keep the game colour. Needs the LOCAL preview_back pipeline
# (/workspace/preview_back); holds no game data itself. Frames whose fit fails (no uniform px, goalie-mask px, no SPA direction)
# get no map. Known gap: back-view torso columns use the v5.2 columns, not the later 1:1 back-torso remap (backmap.py) the
# hand-checked back frames have -> 70-96% texel agreement on those, 100% on the front frames.
import sys,os,json,collections,io,contextlib
PB='/workspace/preview_back/root/sprite-textures'
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
        COMP=GG['COMP'];out={};err=collections.Counter()
        for n in frames:
            if n not in G['DIRS']:err['no SPA direction']+=1;continue
            try:
                with contextlib.redirect_stdout(io.StringIO()):q,A,LEV,fx,sh,bb=G['fit'](n)
            except BaseException as e:err['fit failed: '+('goalie mask px' if 'goalie mask' in str(e) else 'no uniform px')]+=1;continue
            out[n]={'%d,%d'%(int(y),int(x)):list(map(int,COMP[(int(u),int(w))])) for (y,x),(u,w) in A.items() if (int(u),int(w)) in COMP}
        return out,dict(err)
    finally:os.chdir(cwd);sys.argv=argv
