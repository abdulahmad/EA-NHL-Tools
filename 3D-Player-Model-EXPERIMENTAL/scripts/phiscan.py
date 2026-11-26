import sys,json
from multiprocessing import Pool
from fit3 import *
def job(a):
    n,d,x0,off,phi,seed=a;v=load([n])[0];prep([v]);x,f=refine(np.array(x0),v,d,phi,off,iters=110,seed=seed);return n,phi,f,x.tolist()
if __name__=='__main__':
    F=json.load(open(sys.argv[1]));jobs=[(F['frames'][i],F['dirs'][i],F['xv'][i],F['offs'][i],phi,i) for i in range(int(sys.argv[3]),len(F['frames'])) for phi in (15,25,35,45,55)]
    with Pool(4) as p:R=p.map(job,jobs)
    out={}
    for n,phi,f,x in R:out.setdefault(n,{})[phi]=(round(f,3),x)
    for n,r in out.items():print(n,{k:v[0] for k,v in r.items()})
    json.dump(out,open(sys.argv[2],'w'))
