"""D180 deep analysis (Abdul t1017u): error breakdown by cause, oracle/ablation bounds per stage, violations."""
import json
from stages import *
from scipy.ndimage import distance_transform_edt as edt
it=dict(name='it6 = it5 + hard skeleton constraints + table facing',k=5,snap=True,R=4,dil=2,n=300,leaf=1,head=True,sil=True,skc=True)
met,convert=run(it);res=met.pop('_res');print(json.dumps(met),flush=True)
def ev(fn):
    f=[];
    for p in TE:
        r=fn(p);C,_=place(r['O'],A['G94'][p['g']]);f.append(score(C,A['G94'][p['g']]))
    return [round(float(x),3) for x in np.mean(f,0)]
AB={}
AB['full it6']=[met['exact'],met['family'],met['sil_iou']]
for ab in('noskc','nohead','nosmooth','norf'):AB['without '+ab[2:]]=ev(lambda p:convert(A['S94'][p['s']],sn=p['s'],abl=(ab,)));print(ab,AB['without '+ab[2:]],flush=True)
AB['oracle skeleton (GT joints)']=ev(lambda p:convert(A['S94'][p['s']],J=p['JS'],sn=p['s']))
# breakdown + shape oracle
cause=Counter();tot=0;ovl=[];shape_or=[];colour_or=[];viol=dict(before=[0,0,0],after=[0,0,0])
for p in TE:
    a=A['S94'][p['s']];r=convert(a,sn=p['s']);G=A['G94'][p['g']];C,_=place(r['O'],G)
    c0,c1=r['skc']
    for i,k in enumerate(('exist','zone','orphan')):viol['before'][i]+=c0[k];viol['after'][i]+=c1[k]
    u=(C>0)|(G>0);tot+=u.sum();FC,FGm=FG[C],FG[G]
    only_c=(C>0)&(G==0);only_g=(G>0)&(C==0);both=(C>0)&(G>0)
    cause['silhouette: extra converted px']+=only_c.sum();cause['silhouette: missing px']+=only_g.sum()
    wrong=both&(FC!=FGm)
    edge=both&(binary_dilation(G==0,iterations=1))
    hb=np.zeros_like(both)
    if r['head']:
        hy,hx=np.nonzero(np.isin(FGm,[4]));
        if len(hy):hb[max(0,hy.min()-3):hy.max()+3,max(0,hx.min()-3):hx.max()+3]=True
    cause['family wrong: outline / edge px']+=(wrong&edge).sum()
    cause['family wrong: head area']+=(wrong&~edge&hb).sum()
    cause['family wrong: stick']+=(wrong&~edge&~hb&((FC==5)|(FGm==5))).sum()
    cause['family wrong: jersey/pants interior']+=(wrong&~edge&~hb&(FC!=5)&(FGm!=5)).sum()
    cause['shade only (family right, index wrong)']+=(both&(FC==FGm)&(C!=G)).sum()
    ovl.append((FC[both]==FGm[both]).mean())
    # shape oracle: real 94G silhouette, each pixel takes the nearest converted pixel's colour
    d,ind=edt(C==0,return_indices=True);S=np.where(G>0,C[ind[0],ind[1]],0);shape_or.append(score(S,G))
    colour_or.append(both.sum()/u.sum())
B={k:round(v/tot,3) for k,v in cause.most_common()}
AB['oracle shape (94G silhouette, converter colours)']=[round(float(x),3) for x in np.mean(shape_or,0)]
AB['oracle colour on overlap (family = sil IoU)']=[None,round(float(np.mean(colour_or)),3),None]
out=dict(metrics=met,breakdown_share_of_union=B,family_acc_on_overlap=round(float(np.mean(ovl)),3),ablations_and_oracles=AB,
         skeleton_violations_heldout=dict(order=['exist','zone','orphan'],**viol))
json.dump(out,open('analysis_d180.json','w'),indent=1,default=float);print(json.dumps(out,indent=1,default=float),flush=True)
exec(open('sheets_d178.py').read())
