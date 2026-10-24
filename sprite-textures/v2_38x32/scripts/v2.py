import os,json,numpy as np
from PIL import Image
os.chdir('/workspace/preview_back/root/sprite-textures/out')
src=open('/workspace/preview_wide/widen.py').read();src=src[:src.index("os.makedirs('/workspace/preview_wide/raw'")]
G={};exec(src,G);widen=G['widen'];MAG=(252,0,252)
HIS='/cursor/stores/store-8857abcf-3c16-4710-88f2-ab256111c134/grok-bot/agents/0984e4f2-0f69-4737-84ba-d2d87f94a30b/attachments/01M5NZHR29J1PAT765NX1WECR7.png'
NW,NH=38,32
# region rules: (rows, old-wide col range, shift)
RULES=[]
def R(rows,a,b,s,name):RULES.append((rows,a,b,s,name))
R(range(0,17),0,3,0,'front arm R')          # also rows 17-20 forearm/glove below
R(range(0,17),5,18,-2,'front head/torso')
R(range(0,17),20,23,-4,'front arm L')
R(range(0,17),25,28,-5,'back arm L')
R(range(0,17),31,43,-8,'back head/torso')
R(range(0,17),45,48,-11,'back arm R')
R(range(17,21),0,3,0,'front forearm/glove R')
R(range(17,21),20,23,-4,'front forearm/glove L')
R(range(17,21),25,28,-5,'back forearm/glove L')
R(range(17,21),45,48,-11,'back forearm/glove R')
R(range(17,23),50,62,-47,'side pants panel -> front pants (old54 cols 29-41)')
R(range(17,23),63,73,-39,'side pants panel -> back pants (old54 cols 42-52); col 74 (old54 53) dropped = duplicate of col 50 (old54 29)')
R(range(23,32),0,23,-2,'front legs/socks/skates')
R(range(23,32),25,48,-8,'back legs/socks/skates')
GLOVE_ADD=[(0,1,'front R'),(19,18,'front L'),(20,21,'back L'),(37,36,'back R')]  # (new col, copied-from new col)
def mapping():
    M={}
    for rows,a,b,s,_ in RULES:
        for v in rows:
            for x in range(a,b+1):
                nx=x+s
                if 0<=nx<NW and tuple(FOOT[v,x])!=MAG:
                    assert (nx,v) not in M,(nx,v);M[(nx,v)]=(x,v)
    return M
FOOT=widen(np.asarray(Image.open('/workspace/out/zones/v2/poc5/v5/textures/stripe_diagnostic.png').convert('RGB')))[0]
M=mapping()
def to_v2(W):
    N=np.zeros((NH,NW,3),np.uint8);N[:]=MAG
    for (nx,v),(x,y) in M.items():
        if tuple(W[y,x])!=MAG:N[v,nx]=W[y,x]
    for v in (18,19,20):
        for c,f,_ in GLOVE_ADD:
            assert tuple(N[v,c])==MAG;N[v,c]=N[v,f]
    return N
TEX=[('stripe_diagnostic','/workspace/out/zones/v2/poc5/v5/textures/stripe_diagnostic.png')]
for n in ['chicago_home_top','chicago_alt_bottom','leafs_home','rangers_away','montreal_baby_blue_bottom']:TEX.append((n,f'/workspace/out/zones/v2/poc5/v5/textures/{n}.png'))
for n in ['east94_num77','east94_nonum','dallas_blackstar_num14','dallas_blackstar_nonum']:TEX.append((n,f'/workspace/new_textures/{n}.png'))
his=np.asarray(Image.open(HIS).convert('RGB'))
res={}
for n,p in TEX:
    O=np.asarray(Image.open(p).convert('RGB'));W,ADD,_=widen(O);N=to_v2(W)
    if n=='chicago_home_top':
        w0=np.asarray(Image.open('/workspace/preview_wide/raw/chicago_home_wide.png').convert('RGB'));res['chicago_wide_regen_diff']=int((w0!=W).any(2).sum())
    if n=='stripe_diagnostic':
        w0=np.asarray(Image.open('/workspace/preview_wide/raw/stripe_diagnostic_wide.png').convert('RGB'));res['diag_wide_regen_diff']=int((w0!=W).any(2).sum())
        res['diag_vs_his_diff']=int((N!=his).any(2).sum())
    # side panel dup check
    res[n+'_col53eq29']=bool((O[17:24,53]==O[17:24,29]).all())
    Image.fromarray(N).save(f'/workspace/preview_v2/raw/{n}_v2.png')
print(json.dumps(res,indent=1))
json.dump({'rules':[(r.start,r.stop-1,a,b,s,nm) for r,a,b,s,nm in RULES],'glove_added':GLOVE_ADD,'map_new_to_oldwide':{f'{k[0]},{k[1]}':v for k,v in M.items()}},open('/workspace/preview_v2/column_map_v2.json','w'))
mapped=set(M.values())
lost=[(x,v) for v in range(32) for x in range(75) if tuple(FOOT[v,x])!=MAG and (x,v) not in mapped]
from collections import Counter
def zone(x,v):
    if x>=50:return 'side panel col %d'%x if x==74 else 'side panel row %d'%v
    return ('front' if x<25 else 'back')+' figure rows17-22'
print('lost',len(lost),Counter(zone(*p) for p in lost))
