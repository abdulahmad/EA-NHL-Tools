"""Clean NHL 96 PC model, final passes: left-right symmetric stripe rules, then shading from a fitted light (4 shades per palette zone)."""
import numpy as np,sys,pickle,os,imageio
from PIL import Image
from ss96 import setup
from clean96 import *
import shade96
class Sym(Clean):
    """Sleeve and leg stripe widths shared by both sides; only the starting offset along the limb is per side (it absorbs the pose)."""
    def symmetrise(s):
        s.wid={};s.off={}
        for nm in ('sleeve','leg'):
            s.wid[nm]=(np.diff(s.par[(nm,-1)][2])+np.diff(s.par[(nm,1)][2]))/2
            for sg in (-1,1):s.off[(nm,sg)]=np.array([s.par[(nm,sg)][2][0]])
        s.hemk[0]=0.0;s.rebuild()
    def rebuild(s):
        for (nm,sg),(c,u,b) in s.par.items():b[:]=s.off[(nm,sg)][0]+np.r_[0,np.cumsum(np.minimum(s.wid[nm],-0.05))]
    def err(s):
        if hasattr(s,'wid'):s.rebuild()
        return Clean.err(s)
    def params(s):
        out=[(s.hem,i,0.3) for i in range(len(s.hem))]+[(s.hemk,1,0.05)]+[(s.yoke,i,0.3) for i in range(3)]+[(s.misc,0,0.2),(s.misc,1,0.3)]+[(s.pant,i,0.2) for i in range(4)]
        for nm,w in s.wid.items():out+=[(w,i,0.2) for i in range(len(w))]
        for k,o in s.off.items():out+=[(o,0,0.3)]+[(s.par[k][1],i,0.05) for i in range(3)]
        for k,(T,front,cc,rr) in s.grid.items():out+=[(cc,0,0.03),(cc,1,0.03),(cc,2,0.2),(rr,0,0.02),(rr,1,0.2)]
        return out
def shade_idx(idx,n,co):
    sh=np.clip(np.round(n@co[:3]+co[3]),0,3).astype(int);z=(idx>=4)&(idx<148);return np.where(z,(idx>>2)*4+sh,idx)
def render_shaded(cl,co,ns,cam=None,W=None,H=None,n=None):
    fit=cl.fit;fid,zo=depth_render(fit,cl.D['verts'],cam,W,H,n);n=fit.n if n is None else n;cam=fit.cam if cam is None else cam;out=np.full((n,MH,MW),255,np.uint8)
    for d in range(n):
        ys,xs=np.nonzero(fid[d]>=0);f=fid[d,ys,xs];p=unproject(cam[d],xs,ys,zo[d,ys,xs]);out[d,ys,xs]=shade_idx(cl.label(p,f),ns[f],co)
    return out
def score_shaded(cl,R,pal):
    b=t=zone_ok=sh_ok=0
    for d,v in enumerate(cl.fit.V):
        pd=cl.fit.pad;im=R[d,pd:pd+v['h'],pd:pd+v['w']];sp=v['p'];body=(sp!=255)&~np.isin(sp,err96.STK);b+=body.sum();both=body&(im!=255)
        t+=(body&(im==255)).sum()+((im!=255)&(sp==255)).sum()+(both&(pal[im].astype(int)!=pal[sp].astype(int)).any(-1)).sum()
        zz=both&(sp>=4)&(sp<148)&(im>=4)&(im<148)&((sp>>2)==(im>>2));zone_ok+=zz.sum();sh_ok+=(zz&(sp==im)).sum()
    return t/8,b/8,100*t/b,100*sh_ok/zone_ok
def novel_shaded(cl,co,ns,pal,yaws,pitch,sc=5,size=(64,76),anchor=(32,68)):
    n=len(yaws);cam=np.array([[np.cos(np.deg2rad(y)),np.sin(np.deg2rad(y)),np.cos(np.deg2rad(pitch)),np.sin(np.deg2rad(pitch)),anchor[0],anchor[1]] for y in yaws])
    R=render_shaded(cl,co,ns,cam,np.full(n,size[0],np.int32),np.full(n,size[1],np.int32),n);p2=pal.copy();p2[255]=(40,90,60);return [np.kron(p2[R[k,:size[1],:size[0]]],np.ones((sc,sc,1),np.uint8)) for k in range(n)]
if __name__=='__main__':
    import ss96
    D,fit=load(sys.argv[1]);S=samples(D,fit);cl=Sym(D,fit,S)
    for k,v in D.get('rules',{}).items():setattr(cl,k,v)
    pal=with_number(pals()['!bfh'],88,fg=np.array([12,0,174]));cl.cache(pal);e0=cl.err();print('before symmetry',e0)
    if True:
        cl.symmetrise();print('symmetric, before tuning',cl.err());cl.tune(3)
    print('symmetric',cl.err(),'widths',{k:v.round(2) for k,v in cl.wid.items()},'offsets',{k:v.round(2) for k,v in cl.off.items()})
    rules=dict(D['rules']);rules.update(hem=cl.hem,hemk=cl.hemk,yoke=cl.yoke,misc=cl.misc,pant=cl.pant,par=cl.par,grid=cl.grid,wid=cl.wid,off=cl.off)
    co,ex,w1=shade96.fit_light_clipped(cl,1);ns=shade96.smooth_normals(cl,1);print('light',co.round(3),'exact %.3f within1 %.3f'%(ex,w1))
    rules['light']=co;D['rules']=rules;pickle.dump(D,open(sys.argv[2],'wb'))
    R=render_shaded(cl,co,ns);print('shaded vs raw sprites: %.1f of %.0f px/frame wrong (%.1f%%); exact shade where zone is right %.1f%%'%score_shaded(cl,R,pal))
    Rf=cl.render();print('unshaded model vs raw sprites: %.1f of %.0f (%.1f%%), shade match %.1f%%'%score_shaded(cl,Rf,pal))
    if len(sys.argv)>3:
        out=sys.argv[3];os.makedirs(out,exist_ok=True);phi=D['phi'];p2=pal.copy();p2[255]=(40,90,60);rows=[[],[],[]]
        for d,v in enumerate(fit.V):
            pd=fit.pad
            def tile(a):
                t=np.full((72,64),255,np.uint8);t[:min(72,a.shape[0]),:min(64,a.shape[1])]=a[:72,:64];return p2[t]
            rows[0].append(tile(v['p']));rows[1].append(tile(R[d,pd:pd+v['h'],pd:pd+v['w']]));rows[2].append(tile(Rf[d,pd:pd+v['h'],pd:pd+v['w']]))
        Image.fromarray(np.kron(np.concatenate([np.concatenate(r,1) for r in rows],0),np.ones((4,4,1),np.uint8))).save(out+'/sprites_vs_shaded_vs_flat.png')
        cl.sheet(pal,out+'/sprites_vs_model_vs_errors.png');ys=list(range(0,360,10))
        imageio.mimsave(out+'/turntable_sprite_size.gif',novel_shaded(cl,co,ns,pal,ys,phi,sc=4),duration=0.09,loop=0)
        imageio.mimsave(out+'/turntable_sprite_size_1x.gif',novel_shaded(cl,co,ns,pal,ys,phi,sc=1),duration=0.09,loop=0)
        Image.fromarray(np.concatenate([np.concatenate(novel_shaded(cl,co,ns,pal,[22.5+45*k for k in range(8)],p),1) for p in (phi,40)],0)).save(out+'/angles_the_game_never_drew.png')
        Image.fromarray(np.concatenate(novel_shaded(cl,co,ns,pal,[45*k for k in range(8)],phi,sc=6),1)).save(out+'/eight_directions.png')
        import trimesh;from export96 import subdivide
        T,fid=subdivide(D['verts'],D['faces'],3);idx=shade_idx(cl.label(T.mean(1),fid),ns[fid],co);V=T.reshape(-1,3)*np.array([-1,1,1]);F=np.arange(len(V)).reshape(-1,3)[:,::-1]
        trimesh.Trimesh(V,F,face_colors=np.c_[pal[idx],np.full(len(idx),255)].astype(np.uint8),process=False).export(out+'/nhl96pc_buffalo_player_clean_shaded.glb')
        idx=cl.label(T.mean(1),fid);trimesh.Trimesh(V,F,face_colors=np.c_[pal[idx],np.full(len(idx),255)].astype(np.uint8),process=False).export(out+'/nhl96pc_buffalo_player_clean_flat.glb')
