"""Colouring, round 4: the front / back control sprites are copied onto the model pixel for pixel; stripes become clean rings; rules for thin features."""
import sys,json,numpy as np,collections
from tex3 import *
def literal(F,V,pts,cls,i,step=0.3,tol=1.2):
    """zone index per point copied straight from frame i's pixel (or -1)"""
    d=F['dirs'][i];v=V[i];N0=int((cls!=C['stick']).sum());pd=model(np.array(F['xv'][i]),step)[2][:N0]
    sx,sy,dep=proj(pd[:,0],pd[:,1],pd[:,2],d,F['phi'])
    px=np.floor(sx+v['a'][0]+F['offs'][i][0]).astype(int)+PAD;py=np.floor(sy+v['a'][1]+F['offs'][i][1]).astype(int)+PAD
    pp=np.pad(v['p'],PAD,constant_values=255);fgp=np.pad(v['fg'],PAD);h,w=pp.shape;ok=(px>=0)&(px<w)&(py>=0)&(py<h)
    zb=np.full((h,w),1e9);np.minimum.at(zb,(py[ok],px[ok]),dep[ok]);out=np.full(len(cls),-1)
    vis=ok.copy();vis[ok]=dep[ok]<=zb[py[ok],px[ok]]+tol;ii=np.flatnonzero(vis);z=FLAT[pp[py[ii],px[ii]]]
    good=fgp[py[ii],px[ii]]&np.array([zz in ALLOW[c] for zz,c in zip(z.tolist(),cls[ii].tolist())])
    out[ii[good]]=z[good];return out
def texture4(F,V):
    pts,cls,pid,col,parts,J=texture3(F,V);names=[q['name'] for q in parts];col=col.copy()
    lf=literal(F,V,pts,cls,F['frames'].index(370));lb=literal(F,V,pts,cls,F['frames'].index(185))
    lit=np.where(lf>=0,lf,lb);lfa=literal(F,V,pts,cls,F['frames'].index(370),tol=99);lba=literal(F,V,pts,cls,F['frames'].index(185),tol=99);P=lambda nm:np.flatnonzero(pid==names.index(nm));q=lambda nm:parts[names.index(nm)]
    # 1) torso, shoulders, head: literal where a control sees the point
    for nm in ('torso','chest','yoke','R shoulder pad','L shoulder pad'):
        ii=P(nm);m=lit[ii]>=0;col[ii[m]]=lit[ii[m]]
    # the jersey body: the half facing each control takes that control's pixels outright (no gaps in the crest)
    for nm in ('torso','chest','yoke'):
        ii=P(nm);a=np.abs(((q(nm)['ang'])%(2*np.pi))-np.pi);fr=a<np.deg2rad(75);bk=a>np.deg2rad(105)
        m=fr&(lfa[ii]>=0);col[ii[m]]=lfa[ii[m]];m=bk&(lba[ii]>=0);col[ii[m]]=lba[ii[m]]
    # 2) head: what the controls do not see is helmet, except the face band at the front
    ii=P('head');U_y=q('head')['t'];ang=np.abs(q('head')['ang'])
    col[ii]=np.where((ang<np.deg2rad(60))&(U_y<0.12),134,190)          # helmet over a square face window
    # 3) limbs and waist: clean rings read from the controls (left and right pooled)
    def rings(members,nbw=0.7):
        q0=q(members[0]);ext=np.linalg.norm(q0['pts'].max(0)-q0['pts'].min(0));t0,t1=q0['t'].min(),q0['t'].max();nt=max(2,int(round(ext/nbw)))
        acc=np.zeros((nt,256));tb={}
        for nm in members:
            ii=P(nm);b=np.clip(((q(nm)['t']-t0)/(t1-t0)*nt).astype(int),0,nt-1);tb[nm]=b;m=lit[ii]>=0;np.add.at(acc,(b[m],lit[ii][m]),1)
        acc[:,CRESTI]=0;best=acc.argmax(1);has=acc.sum(1)>=3
        for nm in members:
            ii=P(nm);b=tb[nm];col[ii[has[b]]]=best[b][has[b]]
    rings(['R upper arm','L upper arm']);rings(['R forearm','L forearm']);rings(['R shin','L shin'])
    # waist: rings on the lower torso, but keep literal pixels (crest reaches down on some jerseys)
    ii=P('torso');keep=col[ii].copy();rings(['torso']);m=np.isin(keep,CRESTI);col[ii[m]]=keep[m]
    # 4) pants: plain, with a one-pixel stripe down the outer seam
    for nm,sg in (('hips',0),('R thigh',1),('L thigh',-1)):
        ii=P(nm);col[ii]=180
        if sg:
            a=q(nm)['ang'];dv=np.abs(((a-sg*np.pi/2+np.pi)%(2*np.pi))-np.pi);r=np.linalg.norm(q(nm)['pts'][:,[0,2]]-q(nm)['pts'][:,[0,2]].mean(0),axis=1).mean()
            col[ii[(dv<0.3/max(r,1))&(q(nm)['t']>0.1)]]=179
    # 5) neckline: skin V at the front of the collar
    ii=P('yoke');a=np.abs(((q('yoke')['ang'])%(2*np.pi))-np.pi);t=q('yoke')['t']     # torso tubes: angle pi = front
    col[ii[col[ii]==134]]=166;col[ii[(a<np.deg2rad(38)*(np.clip(t,0,1.4)-0.45)/0.95)&(t>0.45)]]=134
    for nm in ('chest','R shoulder pad','L shoulder pad','torso'):
        jj=P(nm);col[jj[col[jj]==134]]=166
    col[P('neck')]=134
    return pts,cls,pid,col,parts,J
if __name__=='__main__':
    F=json.load(open(sys.argv[1]));V=load(F['frames']);prep(V)
    pts,cls,pid,col,parts,J=texture4(F,V);pal=spritepal(team('tor'))
    sheet_pv(F,V,col,pal,sys.argv[2]);np.savez(sys.argv[3],pts=pts,cls=cls,pid=pid,col=col)
