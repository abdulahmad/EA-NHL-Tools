"""D177d 8-way facing classifier (labels from 94G animation tables: 5/dir skatewp 1-40, skate 41-80, 1/dir turnl 81-88, 6/dir swing 97-144, 2/dir stop 145-160, 3/dir skateb 161-184)."""
from conv2 import *
from sklearn.ensemble import RandomForestClassifier
TAB=[(1,40,5,'skatewp'),(41,80,5,'skate'),(81,88,1,'turnl'),(97,144,6,'swing'),(145,160,2,'stop'),(161,184,3,'skateb')]
def gdir(n):
    for a,b,k,g in TAB:
        if a<=n<=b:return (n-a)//k,g
    return None,None
def rs(m,h,w):
    if m.shape[0]==0 or m.shape[1]==0:return np.zeros((h,w))
    return zoom(m.astype(float),(h/m.shape[0],w/m.shape[1]),order=1)
def feat(a,G):
    F=MF((FG if G else FS)[a]);m=a>0;ys,xs=np.nonzero(m);a2=a[ys.min():ys.max()+1,xs.min():xs.max()+1];F=F[ys.min():ys.max()+1,xs.min():xs.max()+1]
    v=[rs(F==k,12,10).ravel() for k in(1,2,4,5)]+[rs(a2>0,12,10).ravel()]
    hm,f,c=head(a,SK_G if G else SK_S,HD_G if G else HD_S)
    if hm is not None:
        ys2,xs2=np.nonzero(hm);sub=F[:0] if False else MF((FG if G else FS)[a])[max(0,ys2.min()-1):ys2.max()+2,max(0,xs2.min()-1):xs2.max()+2]
        v+= [rs(sub==4,6,6).ravel()*2,rs(sub==2,6,6).ravel()]
    else:v+=[np.zeros(36),np.zeros(36)]
    return np.concatenate(v+[[a2.shape[1]/a2.shape[0]]])
def train(hold=('skatewp','stop')):
    X,Y=[],[]
    for n,a in A['G94'].items():
        d,g=gdir(n)
        if d is None or g in hold or not pl(a):continue
        X.append(feat(a,1));Y.append(d)
    for s,g,grp in pairs():
        d,gg=gdir(g)
        if d is None or gg in hold:continue
        X.append(feat(sscale(A['S94'][s]),0));Y.append(d)
    return RandomForestClassifier(300,random_state=0).fit(np.array(X),Y)
if __name__=='__main__':
    clf=train();ok=n=0;okg=ng=0
    for s,g,grp in pairs():
        d,gg=gdir(g)
        if gg=='skatewp':ok+=clf.predict([feat(sscale(A['S94'][s]),0)])[0]==d;n+=1
    for g in range(1,41):
        if pl(A['G94'][g]):okg+=clf.predict([feat(A['G94'][g],1)])[0]==gdir(g)[0];ng+=1
    print('held-out skatewp facing accuracy SNES',ok,n,'G94',okg,ng)
