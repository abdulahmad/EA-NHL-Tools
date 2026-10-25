"""D182: part-preservation check on the 5% sample, reference choice by head clarity/neutrality, verbatim reference heads."""
exec(open('/workspace/snesredraw/sheets_d178.py').read().split('# exclusives:')[0].replace("'/workspace/snesredraw/d180_val_skatewp.png'","'/workspace/snesredraw/d182_val_skatewp.png'").replace('D180 held-out','D182 held-out'))
from refs import refscore
SMP=[x for x in json.load(open('sample_d180.json')) if x['platform']=='S94']
fq=[];npass=0
for x in SMP:
    r=convert(A['S94'][x['frame']],sn=x['frame'])
    if r['parts']['ok']:npass+=1
    if r['parts']['fail'] or r['parts']['review']:fq.append(dict(frame=x['frame'],anim=x['anim'],cls=x['cls'],fail=r['parts']['fail'],review=r['parts']['review']))
print('sample S94',len(SMP),'part check pass',npass,'fail',len(SMP)-npass,'review',sum(1 for q in fq if not q['fail']),flush=True)
PIN={196:222}   # Abdul t1022u: G222 is a perfect reference for S196
GD={n:tdir('G94',n) for n in A['G94'] if tdir('G94',n) is not None}
items=[];chk=[]
for s in(196,527,800):
    a=A['S94'][s];r0=convert(a,sn=s)
    C=[]
    for n,d in GD.items():
        if d!=r0['dir'] or sclass('G94',n)!=r0['cls']:continue
        sc=refscore(a,A['G94'][n],off_align)
        if sc:C.append((sc['score'],n,sc))
    C.sort(reverse=True);top=C[:3];n=PIN.get(s,top[0][1])
    gj=gt_g94(n);ga=(gj['head'][1]-.5,gj['head'][0]-.5) if gj and 'head' in gj else None
    r=convert(a,sn=s,ref=(A['G94'][n],ga))
    chk.append(dict(s=s,dir=r['dir'],ref=n,pinned=s in PIN,anchor='head joint' if ga else 'head centroid',top3=[(m,c) for _,m,c in top],head=r['head'],parts=r['parts'],disc=r['disc']))
    rk={m:i+1 for i,(_,m,_) in enumerate(C)}
    lab=f"S{s} {r['cls']}\nfacing {r['dir']} {DN[r['dir']]}\nref G{n}"+(' (pinned)' if s in PIN else '')+f"\nref rank {rk.get(n,'-')}/{len(C)}\ntop: "+'\n  '.join(f'G{m} score {c["score"]:.2f}' for _,m,c in top)+f"\nparts: {'PASS' if r['parts']['ok'] else 'FAIL'}"
    cols=[rgbim(rgbS(a),3),partimg(np.pad(a,6),np.pad(r['PT'],6),{q:(v[0]+6,v[1]+6) for q,v in r['J'].items()},6),rgbim(rgbG(crop(r['O'])),3)]
    alt=[m for _,m,_ in C if m!=n][:1];cols+=[rgbim(rgbG(A['G94'][m]),3) for m in [n]+alt]
    while len(cols)<5:cols.append(Image.new('RGB',(10,10),(20,20,20)))
    items.append((lab,cols))
    print(s,'ref',n,'top',[(m,c['score']) for _,m,c in top],r['head'],r['parts']['ok'],r['parts']['fail'],flush=True)
tl=lambda i:f"#{i+1} ref|score"
sheet(items,'D182 SNES-only frames: reference heads, part check',['94 SNES','skeleton|+ parts','converted','ref used','next best|ref'],'/workspace/snesredraw/d182_exclusives.png',
      note='Refs: same facing and class, scored by head clarity, no occlusion, upright, then pose.\nHead pasted verbatim from the chosen ref, on the head joint.')
json.dump(dict(metrics=met,sample=dict(n=len(SMP),passed=npass,fix_queue=fq),exclusives=chk),open('d182_checks.json','w'),indent=1,default=lambda o:o.tolist() if hasattr(o,'tolist') else int(o))
