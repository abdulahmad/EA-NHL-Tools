import json,numpy as np
from PIL import Image
D=np.asarray(Image.open('/workspace/preview_v2/raw/stripe_diagnostic_v2.png').convert('RGB'))
J=json.load(open('/workspace/preview_v2/column_map_v2.json'))
MAG=(252,0,252);GRN=(0,220,0)
Z={}
for k,(x,y) in J['map_new_to_oldwide'].items():
    nx,v=map(int,k.split(','))
    if v>=23:Z[(nx,v)]='leg'
    elif x>=50:Z[(nx,v)]='pantsF' if x<=62 else 'pantsB'
    elif x<=3:Z[(nx,v)]='armFR'
    elif x<=18:Z[(nx,v)]='torsoF'
    elif x<=23:Z[(nx,v)]='armFL'
    elif x<=28:Z[(nx,v)]='armBL'
    elif x<=43:Z[(nx,v)]='torsoB'
    else:Z[(nx,v)]='armBR'
for c,_,_ in J['glove_added']:
    for v in (18,19,20):Z[(c,v)]={0:'armFR',19:'armFL',20:'armBL',37:'armBR'}[c]
W=(232,232,232);K=(44,44,44)
DG=(0,104,71);TE=(0,132,132)
FT0,BT0=5,24   # torso rows 9-16 start cols (10 wide)
def torso_rows(rows,x0,v,N):
    for r,s in rows.items():
        for i,ch in enumerate(s):N[r,x0+i]=KEYC[ch]
KEYC={}
def build(team,num):
    global KEYC
    N=D.copy()
    for (x,v),z in Z.items():
        if tuple(D[v,x]) in (MAG,GRN):continue
        arm=z.startswith('arm')
        if team=='dal':
            KEYC={'K':K,'W':W,'G':DG}
            if v<=5:c=K
            elif z in('torsoF','torsoB'):c=DG if v<=7 else K
            elif arm:c={12:W,13:K,14:W}.get(v,DG)
            elif z.startswith('pants'):c=K
            else:c={23:K,24:K,25:W,26:K,27:DG}.get(v,K)
        else:
            KEYC={'K':K,'W':W,'T':TE}
            if v<=5:c=W
            elif z in('torsoF','torsoB'):c=TE if v<=8 else W
            elif arm:c=TE if v<=9 else W
            elif z.startswith('pants'):c=K
            else:c={23:K,24:TE,25:K,26:W,27:K}.get(v,K)
        N[v,x]=c
    if team=='dal':
        # row 7-8: black chest reaching up to collar, green shoulders
        star={9:'GGGWKKWGGG',10:'WWWKKKKWWW',11:'WKKKGGKKKW',12:'GWKKKKKKWG',13:'GGWKKKKWGG',14:'GWKKWWKKWG',15:'GWKWGGWKWG',16:'GWWGGGGWWG'}
        N[8,9]=N[8,10]=W;N[8,28]=N[8,29]=W
        torso_rows(star,FT0,0,N)
        bstar=dict(star);bstar[11]='WKKKKKKKKW'
        torso_rows(bstar,BT0,0,N)
        if num:
            dig={10:'.W..W.',11:'WW..W.',12:'.W..WW',13:'.W...W',14:'.W...W'}
            # 1 at rel 3-4, 4 at rel 6-8 drawn on black
            d1=['.W','WW','.W','.W','.W'];d4=['W.W','W.W','WWW','..W','..W']
            for i in range(5):
                for j in range(5):N[10+i,BT0+2+j]=K
                for j,ch in enumerate(d1[i]):
                    if ch=='W':N[10+i,BT0+2+j]=W
                for j,ch in enumerate(d4[i]):
                    if ch=='W':N[10+i,BT0+5+j]=W
        # pants side stripes: green edge, white inside
        for v in range(17,23):
            for x,c in ((3,DG),(4,W),(14,W),(15,DG),(24,DG),(25,W),(33,W),(34,DG)):N[v,x]=c
    else:
        star={9:'TTTTTTTTTT',10:'KTTTTTTTTK',11:'WKTTWWTTKW',12:'WWKTTTTKWW',13:'WKTTTTTTKW',14:'KTTKWWKTTK',15:'KTKWWWWKTK',16:'KKWWWWWWKK'}
        torso_rows(star,FT0,0,N)
        for x in range(24,34):N[9,x]=TE;N[10,x]=K if x in (24,33) else W
        if num:
            d7=['KKK','..K','..K','.K.','.K.']
            for i in range(5):
                for off in (1,6):
                    for j,ch in enumerate(d7[i]):
                        if ch=='K':N[11+i,BT0+off+j]=K
        # pants teal triangle on each side seam, widening downward
        wid={17:1,18:1,19:2,20:2,21:3,22:3}
        for v,w in wid.items():
            for e in range(w):
                for x in (3+e,15-e,24+e,34-e):N[v,x]=TE
    return N
for team,name,n in (('dal','dallas_blackstar_num14',1),('dal','dallas_blackstar_nonum',0),('east','east94_num77',1),('east','east94_nonum',0)):
    Image.fromarray(build(team,n)).save(f'/workspace/preview_v2/redraw/{name}_v2redraw.png')
