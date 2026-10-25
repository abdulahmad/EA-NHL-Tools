# Genesis/SNES palette index -> 95PC palette index translator, learned from pixel-aligned shared frames (same crop shape).
import sys,pickle,numpy as np,collections
sys.path.insert(0,'/workspace/preview_v2/platform_unique/v2')
from cooc import crop,A,rows
TRN={'PC':255}
def pairs(src):
    P=[]
    for (t,n),r in rows.items():
        if t!=src or r['empty']:continue
        if src=='S94':
            m=r['G94']
            if m['cls']!='match' or m['scale']!=1.0:continue
            g=crop(A['S94'][n],'S94');q=crop(A['G94'][m['best']],'G94')
            if m['mirror']:q=q[:,::-1]
            if g.shape!=q.shape:continue
            r2=rows[('G94',m['best'])]['PC']
            if r2['score']<0.7 or r2['scale']!=1.0:continue
            p=crop(A['PC'][r2['best']],'PC')
            if r2['mirror']!=m['mirror']:p=p[:,::-1]
        else:
            m=r['PC']
            if m['score']<0.7 or m['scale']!=1.0:continue
            g=crop(A[src][n],src);p=crop(A['PC'][m['best']],'PC')
            if m['mirror']:p=p[:,::-1]
        if g.shape!=p.shape:continue
        P.append((n,g,p))
    return P
R=2
def feats(g):
    h,w=g.shape;pad=np.full((h+2*R,w+2*R),-1,int);pad[R:R+h,R:R+w]=g
    ys,xs=np.nonzero(g!=0);xc=xs.mean();y0,y1=ys.min(),ys.max()
    F=[];C=[]
    for y,x in zip(ys,xs):
        nb=pad[y:y+2*R+1,x:x+2*R+1].ravel()
        F.append(np.r_[nb,(y-y0)/max(1,y1-y0),y1-y,y-y0,(x-xc)/max(1,w),h,w]);C.append((y,x))
    return np.array(F,float),C
def dataset(P):
    X=[];Y=[];G=[]
    for n,g,p in P:
        F,C=feats(g);X.append(F);Y.append([int(p[c]) for c in C]);G+= [n]*len(C)
    return np.vstack(X),np.concatenate(Y),np.array(G)
from sklearn.ensemble import ExtraTreesClassifier
def train(src,holdout=True):
    P=pairs(src);X,Y,G=dataset(P);ids=sorted(set(G));te=set(ids[::5]) if holdout else set()
    m=np.array([g in te for g in G])
    clf=ExtraTreesClassifier(n_estimators=80,min_samples_leaf=2,n_jobs=4,random_state=0).fit(X[~m],Y[~m])
    return clf,(X[m],Y[m]),len(P)
if __name__=='__main__':
    exec(open('/workspace/preview_v2/d159/met.py').read().split('def run')[0].replace("ARGS=list(sys.argv[1:])",""))
    import os;os.chdir('/workspace/preview_v2/exclusive_samples')
    out={}
    for src in ['G94','G93','S94']:
        clf,(Xt,Yt),np_=train(src);pr=clf.predict(Xt)
        fam=lambda i:'transparent' if i==255 else (pf(int(i)) or f'idx{i}')
        ex=(pr==Yt).mean();fa=np.mean([fam(a)==fam(b) for a,b in zip(pr,Yt)])
        sys.path.insert(0,'/workspace/EA-NHL-Tools/sprite-textures/scripts');import parts as PS
        def coarse(i):
            i=int(i)
            for nm,z in (('sleeve',PS.ARMZ),('sock',PS.SOCKZ),('pants',PS.PANTZ),('torso',PS.BODYZ|{160}|PS.CREST),('helmet',PS.HELM),('skin',PS.SKIN|{136}),('outline',{0}),('blade',{8,28}),('shadow',{82,88,99}),('transparent',{255})):
                if i in z:return nm
            return 'other'
        co=np.mean([coarse(a)==coarse(b) for a,b in zip(pr,Yt)]);cc=collections.Counter((coarse(b),coarse(a)) for a,b in zip(pr,Yt) if coarse(a)!=coarse(b))
        print(src,'coarse part acc %.3f'%co,cc.most_common(6))
        conf=collections.Counter((fam(b),fam(a)) for a,b in zip(pr,Yt) if fam(a)!=fam(b))
        print(src,'pairs',np_,'test px',len(Yt),'exact PC index %.3f'%ex,'same family %.3f'%fa,'top confusions',conf.most_common(6))
        out[src]=dict(pairs=np_,test=len(Yt),exact=float(ex),family=float(fa),coarse=float(co),coarse_conf=[[a,b,c] for (a,b),c in cc.most_common(10)],conf=[[a,b,c] for (a,b),c in conf.most_common(10)])
        clf,_,_=train(src,holdout=False);pickle.dump(clf,open(f'clf_{src}.pkl','wb'))
    import json;json.dump(out,open('xmodel_eval.json','w'),indent=1)
