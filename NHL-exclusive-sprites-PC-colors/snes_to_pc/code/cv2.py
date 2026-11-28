from cv import *
ok=[p for p in P if p['iou']>=0.7]
grps=sorted(set(p['grp'] for p in ok));folds=[grps[i::5] for i in range(5)]
cache=[]
for f in folds:
    tr=[(p['S'],p['G'],p['cat']=='goalie') for p in ok if p['grp'] not in f];rf=train(tr)
    for p in ok:
        if p['grp'] in f:
            gl=p['cat']=='goalie';X,m=feats(p['S'],gl);sel=binary_dilation(m,iterations=1).ravel()
            pr=rf.predict_proba(X[sel]);cache.append((p,sel,m.ravel()[sel],pr,rf.classes_))
def run(thr_ring,thr_in):
    out=[]
    for p,sel,inm,pr,cl in cache:
        o=np.zeros(p['S'].size,int);p0=pr[:,0];nz=pr[:,1:];c1=cl[1:][nz.argmax(1)]
        keep=np.where(inm,p0<thr_in,p0<thr_ring);v=np.where(keep,c1,0);o[sel]=v;o=o.reshape(p['S'].shape)
        out.append((p['cat'],score(o,p['G'])))
    return {k:round(float(np.mean([s[k] for c,s in out])),3) for k in out[0][1]}
for ti in (0.5,0.8,1.01):
    for tr_ in (0.3,0.4,0.5,0.6,0.7):
        print('in',ti,'ring',tr_,run(tr_,ti))
