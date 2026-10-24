# Goalie v15 pads (Abdul pt907u): g14 strict mapping on the v15 texture (sock shading 181/182/183 built in, g15tex) and the
# v15 segmentation (colour zones x parts x fitted skeleton, iterated, g15seg).
import sys,os
H15=os.path.dirname(os.path.abspath(__file__));sys.path.insert(0,H15);sys.path.insert(0,H15+'/../goalie14')
import g15tex,g15seg
import g14pad
from g14pad import *
g15tex.install()
g14pad.H14=H15
def run(only=None):
    import json
    out=g14pad.run(only)
    os.replace(H15+'/g14_pads.json',H15+'/g15_pads.json');os.replace('/tmp/g14_seg.json','/tmp/g15_seg.json')
if __name__=='__main__':
    run([int(a) for a in sys.argv[1:]] or None)
    g15tex.save(g12pad.OPT['A'][0],H15+'/goalie_texture_v6_indexed.png')
