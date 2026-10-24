# loader for pose3d_v5.py: runs frames_v5 (no outputs kept), adds the crosscheck sibling frames 891-903 (d1-3,5-7)
import sys,os,runpy,io,contextlib
sys.path.insert(0,''+__import__('os').path.abspath(__import__('os').path.join(__import__('os').path.dirname(__file__),'../..'))+'/scripts')
os.chdir(''+__import__('os').path.abspath(__import__('os').path.join(__import__('os').path.dirname(__file__),'../..'))+'/out')
sys.argv=['x','/tmp/_ms_fv5','/workspace/out/zones/v2/poc5/v5/textures']
with contextlib.redirect_stdout(io.StringIO()):F=runpy.run_path(''+__import__('os').path.abspath(__import__('os').path.join(__import__('os').path.dirname(__file__),'../..'))+'/scripts/playerlayout/frames_v5.py')
_pf=F['pfam']
def _pfam(i):
    if i==30:return 'gear','flat'     # idx 30 only on crosscheck d1/d2/d6/d7 (not in zn.json): treated as gear
    return _pf(i)
F['fit'].__globals__['pfam']=_pfam
G=F['fit'].__globals__
SIB={891:1,893:2,895:3,899:5,901:6,903:7}
for _n,_d in SIB.items():G['DIRS'][_n]=_d;G['MAPS'][_n]=G['fit'](_n)[:4]
