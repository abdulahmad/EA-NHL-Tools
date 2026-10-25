"""D183: verify the black-pixel rule per platform, stick-first + black-driven limb fit, uncovered-black gate."""
from stages import *
from blackcov import classify,CATS,gate_b
from limbfit import stickfit,limbfit,is_player,drop_stick,attach,tree_ok
NS=[];WORSE=[];TREE=[]
NP=[]
import json,pickle,collections,os,tempfile
CACHE=[]
GB=collections.defaultdict(lambda:dict(fb=0,fa=0,flb=0,fla=0,nopart=0,amb=0,fl=[]))
from PIL import Image,ImageDraw
it=dict(name='it7 = it6 + stick-first + black-driven limbs',k=5,snap=True,R=4,dil=2,n=300,leaf=1,head=True,sil=True,skc=True,bfit=True)
met,convert=run(it);SK=met.pop('_sk');met.pop('_res');print(met,flush=True)
SMP=json.load(open('sample_d180.json'));T=collections.defaultdict(lambda:dict(n=0,b=np.zeros(7,int),a=np.zeros(7,int),fb=0,fa=0));EX={};SR=[]
for x in SMP:
    pf,cl,n=x['platform'],x['cls'],x['frame']
    if pf in('S94','G94') and not is_player((FS if pf=='S94' else FG)[A[pf][n]],cl):NP.append(f'{pf} {n}');continue
    if pf=='S94':
        a=A['S94'][n];mask=a>0;black=mask&(FS[a]==1)
        rb=convert(a,sn=n,abl=('nobfit','noedits'));ra=convert(a,sn=n,abl=('noedits',));Jb,Ja=rb['J'],ra['J']
        SR.append(dict(n=n,anim=x['anim'],cls=cl,pb=rb['parts'],pa=ra['parts'],lf=ra['limbfit']));lfG=ra['limbfit']
    elif pf=='G94':
        a=A['G94'][n];mask=a>0;black=mask&(FG[a]==1);g=gt_g94(n)
        Jb={k:(v[0]+.5,v[1]+.5) for k,v in g.items()} if g else SK.fit(a)
        Sj=stickfit(mask&(a==46),black,body=mask);Ja=drop_stick(Jb) if Sj is None else {**Jb,**Sj}
        Ja,_=limbfit(black,mask,Ja,BONES);grip=att=None
        if Sj:Ja,grip,att=attach(Ja,black,mask,BONES)
        lfG=dict(nostick=Sj is None,grip=grip,attach=att,tree=tree_ok(Ja,BONES,grip))
    else:continue
    if lfG['nostick']:NS.append(f'{pf} {n}')
    if lfG['attach'] and (lfG['attach'][1] is None or lfG['attach'][1]>lfG['attach'][0]):WORSE.append((f'{pf} {n}',lfG['attach']))
    if not lfG['tree']:TREE.append(f'{pf} {n}')
    k=(pf,cl);T[k]['n']+=1
    for J,key,fk in ((Jb,'b','fb'),(Ja,'a','fa')):
        ys,xs,cat=classify(black,mask,J,BONES);T[k][key]+=np.bincount(cat,minlength=7);T[k][fk]+=int((cat==6).sum()>2)
        CACHE.append((k,pf,n,key,black,mask,(FS if pf=='S94' else FG)[a],J,cat))
        asg,nf=gate_b(black,mask,(FS if pf=='S94' else FG)[a],J,BONES,cat);g=GB[k];g['fl'+key]+=nf;g['f'+key]+=int(nf>2)
        if key=='a':g['nopart']+=sum(v=='NO PART' for v in asg.values());g['amb']+=sum(v=='AMBIGUOUS' for v in asg.values());g['fl']+=[f'{pf} {n}'] if nf>2 else []
        if key=='a':
            for c in range(1,7):
                if (cat==c).any() and (c,pf) not in EX:i=np.argmax(cat==c);EX[(c,pf)]=(pf,n,a,J,int(ys[i]),int(xs[i]),cat,ys,xs)
print('done sample; non-player sprites excluded:',NP,flush=True);print('nostick',NS,'attach worse/unreachable',WORSE,'tree broken',TREE,flush=True)
pickle.dump(dict(T={str(k):{kk:(vv.tolist() if hasattr(vv,'tolist') else vv) for kk,vv in v.items()} for k,v in T.items()},SR=SR,met=met),open('/tmp/d183_out.pkl','wb'))
for k,v in sorted(T.items()):print(k,v['n'],'before',v['b'].tolist(),'after',v['a'].tolist(),'gate-fail frames before',v['fb'],'after',v['fa'])
for k,v in sorted(GB.items()):print('D184 gate',k,'fail frames before',v['fb'],'after',v['fa'],'flagged px before',v['flb'],'after',v['fla'],'no-part',v['nopart'],'ambiguous',v['amb'],'failing',v['fl'],flush=True)
pickle.dump(CACHE,open(os.path.join(tempfile.gettempdir(),'d184_cache.pkl'),'wb'))
import sys
if 'd184' in sys.argv:sys.exit(0)
RA=[612,216,229,377,397,417,437,936,956,976]
for r in SR:
    if r['n'] in RA:print('raised-arm',r['n'],r['anim'],'before',r['pb']['fail'],'after',r['pa']['fail'],'limbfit',r['lf'])
pickle.dump(EX,open('/tmp/d183_ex.pkl','wb'))
# exclusives: gate, then sheet
exec(open('sheets_d178.py').read().split('# exclusives:')[0].replace("d180_val_skatewp.png","d183_val_skatewp.png").replace('D180 held-out','D183 held-out'))
from refs import refscore
GD={n:tdir('G94',n) for n in A['G94'] if tdir('G94',n) is not None};PIN={196:222}
items=[];GATE=[]
for s,AB in ((196,()),(527,()),(800,('noedits',)),(800,())):
    a=A['S94'][s];r0=convert(a,sn=s,abl=AB)
    C=sorted([(sc['score'],n,sc) for n,d in GD.items() if d==r0['dir'] and sclass('G94',n)==r0['cls'] for sc in [refscore(a,A['G94'][n],off_align)] if sc],key=lambda c:c[:2],reverse=True)
    n=PIN.get(s,C[0][1]);gj=gt_g94(n);ga=(gj['head'][1]-.5,gj['head'][0]-.5) if gj and 'head' in gj else None
    r=convert(a,sn=s,ref=(A['G94'][n],ga),abl=AB);ub=r['ublack'];ok=ub<=2 and r['parts']['ok']
    tag='auto fit (no hand fix)' if AB else ('reviewed joints (D182)' if s==800 else 'auto fit')
    GATE.append(dict(s=s,fit=tag,ublack=ub,parts_fail=r['parts']['fail'],shown=ok,limbfit=r['limbfit'],ref=n));print(GATE[-1],flush=True)
    if not ok:continue
    alt=[m for _,m,_ in C if m!=n][:1]
    lab=f"S{s} {r['cls']}\nfacing {r['dir']} {DN[r['dir']]}\nref G{n}"+(' (pinned)' if s in PIN else '')+f"\n{tag}\nuncovered black: {ub}\nparts: PASS"
    cols=[rgbim(rgbS(a),3),partimg(np.pad(a,6),np.pad(r['PT'],6),{q:(v[0]+6,v[1]+6) for q,v in r['J'].items()},6),rgbim(rgbG(crop(r['O'])),3)]+[rgbim(rgbG(A['G94'][m]),3) for m in [n]+alt]
    items.append((lab,cols))
fails=[g for g in GATE if not g['shown']]
sheet(items,'D183 SNES-only frames: stick first, limbs follow black',['94 SNES','skeleton|+ parts','converted','ref used','next best|ref'],'/workspace/snesredraw/d183_exclusives.png',
      note='Shown only if the black gate passes (<= 2 uncovered black px) and the part check passes.\nFAILING (not shown): '+(', '.join(f"S{g['s']} {g['fit']} ({g['ublack']} px, {'/'.join(g['parts_fail']) or 'parts ok'})" for g in fails) or 'none'))
json.dump(dict(metrics=met,table={str(k):{kk:(vv.tolist() if hasattr(vv,'tolist') else vv) for kk,vv in v.items()} for k,v in T.items()},raised=[dict(n=r['n'],before=r['pb']['fail'],after=r['pa']['fail']) for r in SR if r['n'] in RA],
  non_player=NP,nostick=NS,attach_worse=WORSE,tree_broken=TREE,sample_parts=dict(before=sum(not r['pb']['ok'] for r in SR),after=sum(not r['pa']['ok'] for r in SR),n=len(SR)),exclusives=GATE),open('d183_checks.json','w'),indent=1,default=lambda o:o.tolist() if hasattr(o,'tolist') else str(o))
print('sample parts fail before',sum(not r['pb']['ok'] for r in SR),'after',sum(not r['pa']['ok'] for r in SR),'of',len(SR))
