from conv import *
FG[46]=5
import json
from scipy.ndimage import binary_erosion
P=pairs();out={};co=collections.Counter();st=collections.defaultdict(list)
lum=lambda c:0.3*c[...,0]+0.59*c[...,1]+0.11*c[...,2]
for s,g,grp in P:
    a=A['S94'][s];b=A['G94'][g]
    st['h_ratio'].append(b.shape[0]/a.shape[0]);st['w_ratio'].append(b.shape[1]/a.shape[1]);st['same_size'].append(a.shape==b.shape)
    for tag,x,F in(('S',a,FS),('G',b,FG)):
        m=x>0;edge=m&~binary_erosion(m);f=F[x]
        st[tag+'_edge_black'].append((f[edge]==1).mean());st[tag+'_black_frac'].append((f[m]==1).mean())
        for k,nm in((2,'white'),(3,'blue'),(4,'skin')):
            u=np.unique((SP if tag=='S' else GP)[x[f==k]],axis=0);st[f'{tag}_levels_{nm}'].append(len(u))
        # light direction: lum-weighted centroid vs body centroid (team+white px)
        body=(f==2)|(f==3);ys,xs=np.nonzero(body)
        if len(ys)>5:
            L=lum((SP if tag=='S' else GP)[x[body]].astype(float));L=L-L.mean()
            st[tag+'_light_dy'].append(float((L*(ys-ys.mean())).sum()/(np.abs(L).sum()+1e-9)));st[tag+'_light_dx'].append(float((L*(xs-xs.mean())).sum()/(np.abs(L).sum()+1e-9)))
        st[tag+'_px'].append(int(m.sum()))
    S,G,iou=align(scale(a),b)
    st['iou_after_scale'].append(iou)
    m=(S>0)&(G>0)
    for i,j in zip(S[m],G[m]):co[(int(i),int(j))]+=1
summ={k:(float(np.mean(v)),float(np.median(v))) for k,v in st.items()}
for k,v in summ.items():print(f'{k:22s} mean {v[0]:.3f}  median {v[1]:.3f}')
by=collections.defaultdict(collections.Counter)
for (i,j),c in co.items():by[i][j]+=c
imap={}
for i,c in sorted(by.items()):
    tot=sum(c.values());top=c.most_common(3);imap[i]=top[0][0]
    print(i,tuple(SP[i]),FAM[FS[i]],'->',[(j,tuple(GP[j]),FAM[FG[j]],round(n/tot,2)) for j,n in top],tot)
json.dump(dict(summary=summ,imap=imap),open('analysis.json','w'),indent=1)
