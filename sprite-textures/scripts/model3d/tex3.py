import sys,json,re,numpy as np
from tex import *
from lib import ZN
from scipy.spatial import cKDTree
# flatten shading: light / medium / dark of one zone -> the zone's medium index (shading is put back afterwards)
GRP={}
for k,nm in ZN.items(): GRP.setdefault(re.sub(r' (light|medium|dark)$','',nm),{})[(re.findall(r'(light|medium|dark)$',nm) or ['medium'])[0]]=int(k)
FLAT=np.arange(256);SHADE={}
for g,m in GRP.items():
    rep=m.get('medium',list(m.values())[0])
    for i in m.values():FLAT[i]=rep
    SHADE[rep]=(m.get('light',rep),rep,m.get('dark',rep))
for i in PT.SKIN:FLAT[i]=134
FLAT[[8,28]]=0
CRESTI=np.array(sorted(PT.CREST))
def pool(parts,pts,cls,pid,col,votes):
    """stripes wrap round a limb and the left and right halves mirror: pool the votes that way before picking each zone"""
    names=[q['name'] for q in parts];col=col.copy()
    groups=[([('R upper arm',1),('L upper arm',-1)],1),([('R forearm',1),('L forearm',-1)],1),([('R shin',1),('L shin',-1)],1),
            ([('R thigh',1),('L thigh',-1)],8),([('torso',1),('torso',-1)],16),([('hips',1),('hips',-1)],12),([('head',1),('head',-1)],12)]
    for members,na in groups:
        keys=[];idxs=[];
        q0=parts[names.index(members[0][0])];ext=np.linalg.norm(q0['pts'].max(0)-q0['pts'].min(0));tr=q0['t'].max()-q0['t'].min();nt=max(2,int(round(ext/0.7)))
        acc=np.zeros((nt*na,256),np.float32);own={}
        for nm,sg in members:
            i=names.index(nm);q=parts[i];ii=np.flatnonzero(pid==i)
            tb=np.clip(((q['t']-q0['t'].min())/tr*nt).astype(int),0,nt-1);ab=(np.floor(((sg*q['ang'])%(2*np.pi))/(2*np.pi)*na).astype(int))%na
            if nm=='torso': ab=np.where(q['t']<0.5,0,ab)      # waist stripes run all the way round
            if nm in('R thigh','L thigh','hips'): ab=np.minimum(ab,(na//2-ab)%na) if False else ab
            k=tb*na+ab;np.add.at(acc,k,votes[ii]);own[(nm,sg)]=(ii,k)
        acc[:,CRESTI]=0;acc[:,list(PT.SKIN)]=0;best=acc.argmax(1);has=acc.sum(1)>0
        for (nm,sg),(ii,k) in own.items():
            if sg==-1 and nm==members[0][0]:continue          # self-mirrored part: assign once
            c=col[ii].copy();ok=has[k]&~np.isin(c,CRESTI)&(cls[ii]!=C['skin']);c[ok]=best[k][ok]
            # keep class consistency (skin stays skin)
            col[ii]=c
    return col
def texture3(F,V,step=0.3,R=2.5):
    x=np.array(F['x']);phi=F['phi'];parts,J,pts,cls,pid=model(x,step);N=len(pts);votes=np.zeros((N,256),np.float32)
    for i,v in enumerate(V):
        d=F['dirs'][i];pd=model(np.array(F['xv'][i]),step)[2];assert len(pd)==N
        sx,sy,dep=proj(pd[:,0],pd[:,1],pd[:,2],d,phi)
        px=np.floor(sx+v['a'][0]+F['offs'][i][0]).astype(int)+PAD;py=np.floor(sy+v['a'][1]+F['offs'][i][1]).astype(int)+PAD
        h,w=v['cls'].shape;ok=(px>=0)&(px<w)&(py>=0)&(py<h);zb=np.full((h,w),1e9);np.minimum.at(zb,(py[ok],px[ok]),dep[ok])
        vis=ok.copy();vis[ok]=dep[ok]<=zb[py[ok],px[ok]]+0.7
        pp=np.pad(v['p'],PAD,constant_values=255);fgp=np.pad(v['fg'],PAD);wv=F.get('wts',[1]*len(V))[i]
        for c,al in ALLOW.items():
            if c in (C['glove'],C['skate'],C['stick']):continue
            m=np.isin(pp,list(al))&fgp
            if not m.any():continue
            dist,ind=ndi.distance_transform_edt(~m,return_indices=True)
            s=vis&(cls==c);dd=dist[py[s],px[s]];good=dd<=R
            qy=ind[0][py[s],px[s]][good];qx=ind[1][py[s],px[s]][good]
            np.add.at(votes,(np.flatnonzero(s)[good],FLAT[pp[qy,qx]]),wv/(1+dd[good])**2)
    col=FLAT[np.array([DEF[c] for c in cls])];has=votes.sum(1)>0;col[has]=votes[has].argmax(1)
    for i in range(len(parts)):
        m=pid==i;a=m&has;b=m&~has
        if a.any() and b.any():col[b]=col[np.flatnonzero(a)[cKDTree(pts[a]).query(pts[b])[1]]]
    col[(pid==len(parts)-1)]=0
    col=pool(parts,pts,cls,pid,col,votes) if F.get('pool',True) else col
    return pts,cls,pid,col,parts,J
def sheet_pv(F,V,col,pal,path,s=8):
    """row 1 sprite, row 2 sprite with shading flattened, row 3 model in that frame's pose (flat colours)"""
    tiles=[]
    for i,v in enumerate(V):
        d=F['dirs'][i];p=v['p'];a=np.zeros(p.shape+(3,),np.uint8);a[:]=BG;a[v['fg']]=np.clip(pal[p[v['fg']]],0,255)
        a2=a.copy();a2[v['fg']]=np.clip(pal[FLAT[p[v['fg']]]],0,255)
        b=splat(model(np.array(F['xv'][i]),0.3)[2],col,d,F['phi'],v['a'],F['offs'][i],p.shape,pal)
        sp=np.full((1,)+a.shape[1:],20,np.uint8);t=np.concatenate([a,sp,a2,sp,b],0);tiles.append(Image.fromarray(t).resize((t.shape[1]*s,t.shape[0]*s),Image.NEAREST))
    W=sum(t.width+8 for t in tiles);Hh=max(t.height for t in tiles);im=Image.new('RGB',(W,Hh),(20,20,20));xx=0
    for t in tiles: im.paste(t,(xx,Hh-t.height));xx+=t.width+8
    im.save(path)
if __name__=='__main__':
    F=json.load(open(sys.argv[1]));V=load(F['frames']);prep(V)
    pts,cls,pid,col,parts,J=texture3(F,V);pal=spritepal(team('tor'))
    sheet_pv(F,V,col,pal,sys.argv[2]);np.savez(sys.argv[3],pts=pts,cls=cls,pid=pid,col=col)
