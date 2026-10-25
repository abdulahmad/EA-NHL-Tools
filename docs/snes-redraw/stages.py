"""D178 per-stage training/evaluation + iterations. HOLD animations unseen in every stage."""
from skel import *
import pickle
exec(open('/workspace/snesredraw/train2.py').read().split("P=pairs();data={}")[0].split("clf=train()")[1]) if False else None
P=pickle.load(open('/tmp/skel_pairs.pkl','rb'))
TR=[p for p in P if p['grp'] not in HOLD];TE=[p for p in P if p['grp'] in HOLD]
fclf=ftrain()
from dirmap import build as _db,sclass
from skelcheck import check,enforce
_,MG,_=_db('G94');_,MS,_=_db('S94')
def tdir(game,n):
    M=MG if game=='G94' else MS;v=M.get(n);return v['dir'] if v and v['src']=='table' else None
def win(F,R,vals):
    Pd=np.pad(F,R);H,W=F.shape;ys,xs=np.mgrid[0:H,0:W];ys=ys.ravel();xs=xs.ravel()
    w=np.stack([Pd[ys+dy+R,xs+dx+R] for dy in range(-R,R+1) for dx in range(-R,R+1)],1)
    return np.concatenate([(w==v) for v in vals],1).astype(np.uint8)
def cfeat(O,OP,R):
    H,W=O.shape;ys,xs=np.mgrid[0:H,0:W]
    return np.concatenate([win(O,R,list(range(32,48))+[0]),win(OP%100,1,range(13)),win((OP>=100).astype(int),1,[1]),np.stack([ys.ravel()/H,xs.ravel()/W],1)],1)
def place(O,G):
    iou,dy,dx=off_align(O,G);H,W=G.shape;C=np.zeros_like(G)
    for y,x in zip(*np.nonzero(O)):
        Y,X=y+dy,x+dx
        if 0<=Y<H and 0<=X<W:C[Y,X]=O[y,x]
    return C,iou
def score(C,G):
    u=(C>0)|(G>0);return [(C[u]==G[u]).mean(),(FG[C][u]==FG[G][u]).mean(),((C>0)&(G>0)).sum()/u.sum()]
def run(it):
    R=bone_ratio(TR);sk=Skel(TR,k=it['k'],snap=it['snap'])
    # colour model, teacher-forced on GT skeleton for training frames
    Xs,Ys=[],[]
    for p in TR:
        a=A['S94'][p['s']];PT=parts(a,p['JS']);O,OP,_=pose_scale(a,p['JS'],PT,R);G=A['G94'][p['g']]
        iou,dy,dx=off_align(O,G);H,W=G.shape
        Op=np.pad(O,((max(0,dy),max(0,H)),(max(0,dx),max(0,W))));OPp=np.pad(OP,((max(0,dy),max(0,H)),(max(0,dx),max(0,W))))
        y0,x0=max(0,-dy),max(0,-dx);Oc=Op[y0:y0+H,x0:x0+W];OPc=OPp[y0:y0+H,x0:x0+W]
        if Oc.shape!=G.shape:continue
        m=binary_dilation(Oc>0,iterations=it['dil']).ravel();X=cfeat(Oc,OPc,it['R']);Xs.append(X[m]);Ys.append(G.ravel()[m])
    cm=RandomForestClassifier(it['n'],min_samples_leaf=it['leaf'],n_jobs=-1,random_state=0).fit(np.concatenate(Xs),np.concatenate(Ys))
    lib=[h for h in headlib(exclude={n for n,g in {int(x['frame']):x['spf_group'] for x in rows if x['set']=='G94'}.items() if g in HOLD}) if not h['mir']]
    for h in lib:
        t=tdir('G94',h['n']);h['dir']=t if t is not None else int(fclf.predict([feat(A['G94'][h['n']],1)])[0]);h['dsrc']='table' if t is not None else 'classifier';h['cls']=sclass('G94',h['n'])
    from refs import load_edits,pasteref
    EDITS=load_edits()
    def convert(a,J=None,sn=None,abl=(),ref=None):
        ed=EDITS.get(f'S94 {sn}',{}) if sn is not None else {}
        if J is None and ed.get('joints'):J={k:tuple(v) for k,v in ed['joints'].items()}
        J=J or sk.fit(a);c0=c1=None
        if it.get('skc') and 'noskc' not in abl and not ed.get('joints'):
            F=FS[a];mask=a>0;body=mask&(F!=6);al={(y,x):FAMOK[F[y,x]] for y,x in zip(*np.nonzero(mask)) if F[y,x] in FAMOK}
            c0=check(mask,body,al,J,BONES,0.5);J,c1=enforce(mask,body,al,J,BONES,0.5)
        PT=np.array(ed['bp']) if ed.get('bp') else parts(a,J);O,OP,JN2=pose_scale(a,J,PT,R)
        Op=np.pad(O,it['dil']);OPp=np.pad(OP,it['dil']);m=binary_dilation(Op>0,iterations=it['dil']).ravel()
        o=np.zeros(Op.size,int)
        if 'norf' in abl:o=np.array([imap.get(int(v),0) if v else 0 for v in Op.ravel()])
        else:o[m]=cm.predict(cfeat(Op,OPp,it['R'])[m])
        o=o.reshape(Op.shape);k=(Op>0)&(o==0);o[k]=[imap.get(int(v),int(v)) for v in Op[k]]
        if 'nosmooth' not in abl:
            o=smooth(o)
            if it.get('sil'):o=silsmooth(o)
        t=tdir('S94',sn) if sn else None;d=t if t is not None else int(fclf.predict([feat(sscale(a),0)])[0]);cl=sclass('S94',sn) if sn else 'skater'
        if ref is not None and it['head'] and 'nohead' not in abl:
            g,ga=ref;D=it['dil'];o,hd=pasteref(o,Op,OPp,g,ga,(JN2['head'][1]+D-.5,JN2['head'][0]+D-.5))
        else:o,hd=pastehead(o,Op,[h for h in lib if h['dir']==d and h['cls']==cl]) if it['head'] and 'nohead' not in abl else (o,None)
        o=repair(Op,o);pc=partcheck(PT,OPp,o)
        return dict(J=J,PT=PT,O=o,S=Op,OP=OPp,disc=disconnected(Op,o),head=hd,dir=d,dsrc='table' if t is not None else 'classifier',cls=cl,skc=(c0,c1),parts=pc)
    res=dict(joint_err=[],parts_acc=[],final=[],disc=0,jag=[])
    for p in TE:
        a=A['S94'][p['s']];r=convert(a,sn=p['s']);G=A['G94'][p['g']]
        res['joint_err'].append(jerr(r['J'],p['JS']));gp=parts(a,p['JS']);m=a>0;res['parts_acc'].append(float((r['PT'][m]==gp[m]).mean()))
        C,_=place(r['O'],G);res['final'].append(score(C,G));res['disc']+=r['disc']>0;res['jag'].append(jag(r['O']))
    out=dict(name=it['name'],joint_err_px=round(float(np.mean(res['joint_err'])),2),parts_acc=round(float(np.mean(res['parts_acc'])),3),
             exact=round(float(np.mean([f[0] for f in res['final']])),3),family=round(float(np.mean([f[1] for f in res['final']])),3),sil_iou=round(float(np.mean([f[2] for f in res['final']])),3),
             disconnected=res['disc'],jagged=round(float(np.mean(res['jag'])),3),n=len(TE))
    # oracle: GT skeleton on held-out (upper bound of stages 3-4)
    if it.get('oracle'):
        f=[score(place(convert(A['S94'][p['s']],p['JS'])['O'],A['G94'][p['g']])[0],A['G94'][p['g']]) for p in TE];out['oracle_gt_skeleton']=np.mean(f,0).round(3).tolist()
    pickle.dump((sk.__dict__,R),open('/tmp/d178_last.pkl','wb'))
    out['_res']=res
    return out,convert
PNAME={1:'head',2:'torso',3:'pelvis',4:'upper arm',5:'forearm',6:'hand',7:'thigh',8:'shin',9:'skate',10:'shaft',11:'blade'}
def partcheck(PT,OP,o,lo=0.5):
    """D182 part preservation: every part seen in the source (parts labels) must survive scaling (OP) and colouring (o>0 on its
    footprint) with a comparable pixel count. Head is checked for presence only (it is pasted from 94G)."""
    out={};fail=[]
    for p,nm in PNAME.items():
        src=int((PT==p).sum())
        if src<3:continue
        sc=int((OP%100==p).sum());kept=int(((OP%100==p)&(o>0)).sum());exp=src*SX*SY
        r1=sc/exp;r2=kept/max(1,sc);out[nm]=dict(src=src,scaled=sc,kept=kept,r_scale=round(r1,2),r_kept=round(r2,2))
        if (p!=1 and (r1<lo or r2<lo)) or sc==0:fail.append(nm)
    review=[]
    for p in (4,5):   # arm part with no pixels on either side = arm lost in the labels (hard); one side only = review (may be hidden)
        if (PT%100==p).sum()<2:fail.append(PNAME[p]+' missing (both sides)')
        else:review+=[sd+' '+PNAME[p]+' missing' for sd,v in (('L',p),('R',p+100)) if (PT==v).sum()<2]
    return dict(ok=not fail,fail=fail,review=review,detail=out)
def silsmooth(O):
    O=O.copy()
    for _ in range(3):
        P=np.pad(O,1);H,W=O.shape;ch=0
        for y in range(H):
            for x in range(W):
                nb=[P[y+dy+1,x+dx+1] for dy in(-1,0,1) for dx in(-1,0,1) if dy or dx];nz=[q for q in nb if q]
                if O[y,x]==0 and len(nz)>=5:O[y,x]=Counter(nz).most_common(1)[0][0];ch+=1
                elif O[y,x] and len(nz)<=1 and FG[O[y,x]]!=5:O[y,x]=0;ch+=1
        if not ch:break
    return O
def jag(a):
    m=a>0;st=[];prev=None
    for r in m:
        r=np.nonzero(r)[0]
        if len(r):
            if prev is not None:st+=[abs(r[0]-prev[0]),abs(r[-1]-prev[1])]
            prev=(r[0],r[-1])
        else:prev=None
    return float((np.array(st)>1).mean())
ITS=[dict(name='it1 kNN k=1, no snap, 5x5 colour window',k=1,snap=False,R=2,dil=2,n=150,leaf=3,head=True),
     dict(name='it2 kNN k=3 + joint snapping',k=3,snap=True,R=2,dil=2,n=150,leaf=3,head=True),
     dict(name='it3 + 7x7 colour window',k=3,snap=True,R=3,dil=2,n=200,leaf=3,head=True),
     dict(name='it4 k=5, 9x9 window, leaf 1',k=5,snap=True,R=4,dil=2,n=300,leaf=1,head=True,oracle=True)]
if __name__=='__main__':
    import json,sys;outs=json.load(open('iterations_d178.json')) if len(sys.argv)>1 else []
    if len(sys.argv)>1:ITS[:]=[dict(name='it5 = it4 + silhouette smoothing pass',k=5,snap=True,R=4,dil=2,n=300,leaf=1,head=True,sil=True)]
    print('train pairs',len(TR),'held-out',len(TE),Counter(p['grp'] for p in TE),flush=True)
    for it in ITS:
        o,_=run(it);o.pop('_res',None);outs.append(o);print(json.dumps(o),flush=True);json.dump(outs,open('iterations_d178.json','w'),indent=1)
