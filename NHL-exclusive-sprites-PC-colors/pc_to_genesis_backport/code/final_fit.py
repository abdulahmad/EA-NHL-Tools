import sys;sys.path.insert(0,'.')
from train import *
for kind in('skater','goalie'):
    X,y,_=dataset(pairs(kind));allow,cnt,C=learn_allow(X,y);m=fit(X,y)
    joblib.dump(dict(m=m,allow=allow,cnt=cnt),f'model_{kind}_final.joblib');print(kind,len(y),flush=True)
