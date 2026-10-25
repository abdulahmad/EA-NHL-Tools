import pickle,numpy as np
M=pickle.load(open('match.pkl','rb'))
def support(v):
    d={a:(b-a,s) for a,b,s in zip(v['A'],v['best'],v['score'])};sup={}
    for a,(o,s) in d.items():
        sup[a]=any(d.get(a+k,(None,0))[0]==o and d[a+k][1]>=0.6 for k in (-2,-1,1,2))
    return sup
if __name__=='__main__':
    bins=[0,.5,.6,.65,.7,.75,.8,.85,.9,1.01]
    for k,v in M.items():
        s=support(v);sc=np.array(v['score']);su=np.array([s[a] for a in v['A']])
        print(k,'sup',np.histogram(sc[su],bins)[0],'uns',np.histogram(sc[~su],bins)[0])
