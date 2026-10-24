import sys,numpy as np;from PIL import Image,ImageDraw,ImageFont;sys.path.insert(0,'/workspace/preview_v2/mapped')
def load(f):
    s=open(f).read();s=s[:s.index('# ---- verification')];NS={};exec(s,NS);return NS
import ctrl
F=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',18)
BG=(40,40,40)
def img(cb,q,sc,hl=None):
    h,w=q.shape;a=np.zeros((h,w,3),np.uint8);a[:]=BG
    m=(cb>=0).all(2);a[m]=cb[m]
    if hl is not None:
        a[m]=(a[m]*0.25).astype(np.uint8)   # dim
        for p in hl:a[p]=(255,255,0)         # wrong px: bright yellow
    return Image.fromarray(a).resize((w*sc,h*sc),Image.NEAREST)
def sheet(NS,team,out,label):
    o,ims,T=ctrl.diff(NS,NS['A2'],team);G=NS['G'];sp=G['ALLP'][team]
    FR=NS['FR'];sc=2;h,w=NS['MAPS'][FR[0]][0].shape;w=w+6;tw=38*4
    W=tw+20+len(FR)*(w*sc+4);H=40+3*(h*sc+28)
    S=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(S)
    S.paste(Image.fromarray(T.astype(np.uint8)).resize((38*4,32*4),Image.NEAREST),(4,40))
    d.text((4,6),f'{label}  total diff={sum(v["diff"] for v in o.values())} px',fill='white',font=F)
    for r,name in enumerate(['in-game','v2 render','diff (yellow)']):
        y=40+r*(h*sc+28);d.text((4,y+h*sc-20 if r else 40+32*4+4),'' ,fill='white')
        for i,n in enumerate(FR):
            q=NS['MAPS'][n][0];cb_g=-np.ones(q.shape+(3,),int)
            for p in zip(*np.nonzero(q!=255)):cb_g[p]=sp[q[p]]
            cb,bad=ims[n];x=tw+20+i*(w*sc+4)
            S.paste(img(cb_g if r==0 else cb,q,sc,bad if r==2 else None),(x,y+24))
            if r==0:d.text((x,y),str(n),fill='white',font=F)
        d.text((4,y+24+h*sc-22 if r else y+132),name,fill='white',font=F)
    S.save(out);return o
if __name__=='__main__':
    import json
    TEAMS=[('HOME.json','tor','Leafs home'),('AWAY.json','nyr','Rangers away'),('HOME.json','chi','Chicago home (white)'),('AWAY.json','chi','Chicago away (red)'),('HOME.json','mtl','Montreal home')]
    for tag,f in [('before','/workspace/preview_v2/mapped/v2map.py'),('after','/workspace/preview_v2/mapped/v2map2.py')]:
        NS=load(f);ps=[]
        for a,b,l in TEAMS:
            p=f'/tmp/cs_{tag}_{b}_{a[0]}.png';sheet(NS,(a,b),p,f'{tag.upper()}: {l}');ps.append(Image.open(p))
        W=max(p.width for p in ps);S=Image.new('RGB',(W,sum(p.height for p in ps)),BG);y=0
        for p in ps:S.paste(p,(0,y));y+=p.height
        S.save(f'/workspace/preview_v2/mapped/control_diff_sheet_{tag}.png');print(tag,S.size)
