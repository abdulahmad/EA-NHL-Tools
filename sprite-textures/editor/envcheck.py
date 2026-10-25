"""Portable environment checks for the sprite editor rebuild (Windows/macOS/Linux, Python 3.8+).
TMP: scratch dir for derived files (tempfile.gettempdir(), or SPRITE_CACHE if set). need(): friendly dependency errors.
need_data(): clear error when the dumped game data (out/data) is missing."""
import os,sys,tempfile
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # sprite-textures/
TMP=os.environ.get('SPRITE_CACHE') or tempfile.gettempdir()
os.makedirs(TMP,exist_ok=True)
def tmp(name):return os.path.join(TMP,name)
REQ=os.path.join(ROOT,'requirements.txt')
def need(*mods):
    miss=[]
    for m in mods or ('numpy','PIL','scipy'):
        try:__import__(m)
        except ImportError:miss.append({'PIL':'pillow'}.get(m,m))
    if miss:
        sys.exit('Missing Python package(s): '+', '.join(miss)+'\nInstall them with:\n    '+os.path.basename(sys.executable)
                 +' -m pip install -r "'+REQ+'"\n(On Windows: py -m pip install -r sprite-textures\\requirements.txt)')
DATA=os.path.join(ROOT,'out','data')
def need_data(files=('frames.json','frames.bin','HOME.json','zn.json')):
    miss=[f for f in files if not os.path.exists(os.path.join(DATA,f))]
    if miss:
        sys.exit('Game data not found: '+', '.join(os.path.join(DATA,f) for f in miss)+'\n'
          'The editor rebuild needs the NHL 95 PC sprites dumped to sprite-textures/out/data first. Run once (Node.js 18+):\n'
          '    cd sprite-textures/scripts\n'
          '    PowerShell: $env:NHL9XSTUDIO="C:\\path\\to\\NHL9XStudio"   cmd: set NHL9XSTUDIO=C:\\path\\to\\NHL9XStudio   macOS/Linux: export NHL9XSTUDIO=/path/to/NHL9XStudio\n'
          '    node dump.js C:\\path\\to\\NHL95                   (folder with the *.PPV files, HOMEPALS.BIN, AWAYPALS.BIN)\n'
          'then rerun: python sprite-textures/editor/launch.py --rebuild')
