"""Round-trip gate for 95 PC player PPVs.
1) retail: decode every picture -> re-encode -> byte-identical picture; rebuild whole PPV -> byte-identical file.
2) synthetic: random index images (incl. 255 runs, crest/zone indices) encode -> decode -> identical indices.
Usage: python roundtrip_test.py <folder with NHL 95 PC NNN_NNN.PPV files>   (game files are not in this repo)"""
import sys,glob,os,random
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from ppv95 import parse,encode_pic,decode_pic,build
d=sys.argv[1] if len(sys.argv)>1 else os.environ.get('NHL95_DIR','')
files=sorted(f for f in glob.glob(os.path.join(d,'*.PPV')) if os.path.basename(f)[:1].isdigit())
if not files:sys.exit('no NNN_NNN.PPV files in '+repr(d))
pics=pok=fok=0
for f in files:
    b=open(f,'rb').read();P=parse(b);enc=[]
    for p in P['pics']:
        e=encode_pic(p['hdr'],p['w'],p['h'],p['pixels']);pics+=1;pok+=e==p['raw']
        assert decode_pic(e)['pixels']==p['pixels']
        enc.append(dict(tag=p['tag'],bytes=e))
    fok+=build(P['ident'],enc)==b
print(f'retail pictures byte-identical: {pok}/{pics}; whole files byte-identical: {fok}/{len(files)}')
random.seed(1);sok=0;N=500
for k in range(N):
    w,h=random.randint(1,64),random.randint(1,64)
    vals=[255,0,8,28,88,133,136]+list(range(144,192))+list(range(192,256))
    px=bytearray();
    while len(px)<w*h:px+=bytes([random.choice(vals)])*random.choice([1,1,2,3,5,40,130,300])
    px=bytes(px[:w*h]);hdr=bytes([0x81,2,4,8])+bytes(12)
    sok+=decode_pic(encode_pic(hdr,w,h,px))['pixels']==px
print(f'synthetic encode->decode identical: {sok}/{N}')
sys.exit(0 if pok==pics and fok==len(files) and sok==N else 1)
