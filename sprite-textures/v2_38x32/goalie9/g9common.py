# Goalie v9 view scan (Abdul pt868u): shared loading. All goalie frames from the NHL 95 PC SPA tables, with animation + facing.
import os,re,sys,json,numpy as np
HERE=os.path.dirname(os.path.abspath(__file__));ROOT=os.path.abspath(HERE+'/../..')
sys.path.insert(0,ROOT+'/scripts');from lib import frame,act,D
ASM=os.path.abspath(ROOT+'/../Sprite-Viewer/data/frames95pc.asm')
def spal(f,c):
    t=next(t for t in json.load(open(D+f)) if t['code']==c);p=act.copy().astype(int);p[128:192]=np.array(t['colors'])*4;return np.clip(p[np.array(t['map'])],0,255)
GOALIE_SPA=('SPAg','SPAgoal')  # SPAg* and SPAgo*; line-change/wall (373-376) and cup tables excluded (not goalie gear sprites)
SKIP={'SPAgwallright','SPAgwallleft','SPAgetcup','SPAgvcup','SPAglide','SPAglideback'}
def spa_tables():
    T={};cur=None
    for ln in open(ASM):
        m=re.match(r'(SPA\w+)\s*=\s*\*-SPAlist',ln)
        if m:cur=m.group(1);T[cur]=[];continue
        m=re.match(r'\s*dc\.w\s+(.*)',ln)
        if m and cur:T[cur]+= [int(v) for v in m.group(1).split(';')[0].split(',')]
    return T
def goalie_frames():
    """frame -> list of (anim, facing d0..d7). Header = 8 byte offsets + flag; facing d's sequence = (frame,dur) pairs to dur<0."""
    F={}
    for name,w in spa_tables().items():
        if not name.startswith('SPAg') or name in SKIP:continue
        offs=w[:8]
        for d,o in enumerate(offs):
            i=o//2
            while i+1<len(w):
                f,du=w[i],w[i+1];F.setdefault(f,[])
                if (name,d) not in F[f]:F[f].append((name,d))
                i+=2
                if du<0:break
    return dict(sorted(F.items()))
if __name__=='__main__':
    F=goalie_frames();print(len(F));[print(f,v) for f,v in F.items()]
