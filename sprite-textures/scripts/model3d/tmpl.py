"""Parametric skater template (body frame: x = player's right, y = up, z = forward; units = sprite pixels)."""
import numpy as np
CL=['head','skin','torso','sleeve','glove','pants','sock','skate','stick']
C={n:i for i,n in enumerate(CL)}
# name, initial, sigma
PAR=[('hp',11,1.5),('zp',-1.5,1.5),('lean',35,12),('Lt',9,1.2),('y0',0,1.5),('tx',0,1),
     ('hy',3,1),('hz',1.5,1),('rh',3.2,.5),('ws',4.5,.8),('wh',2.5,.6),
     ('rxw',4,.7),('rzw',3,.7),('rxc',5,.7),('rzc',3.5,.7),
     ('Lua',5,.8),('Lfa',5,.8),('rua',2,.4),('rfa',1.7,.4),('rg',2,.4),
     ('Ra1',20,20),('Ra2',10,15),('Rf1',60,25),('Rf2',-20,20),
     ('La1',20,20),('La2',10,15),('Lf1',60,25),('Lf2',-20,20),
     ('Lth',5.5,.8),('Lsh',6,.8),('rth',2.8,.5),('rsh',2,.4),
     ('Rb1',40,15),('Rb2',12,10),('Rc1',-25,15),('Rc2',0,10),
     ('Lb1',40,15),('Lb2',12,10),('Lc1',-25,15),('Lc2',0,10),
     ('sA',5,3),('sB',15,3),('sa1',40,15),('sa2',-30,30),('sba',0,40),('sbl',4,1)]
NAMES=[p[0] for p in PAR];X0=np.array([p[1] for p in PAR],float);SIG=np.array([p[2] for p in PAR],float)
MESHSEG=0     # >0: fixed number of points per ring (mesh export)
def unit(v): return v/max(1e-9,np.linalg.norm(v))
def limb(sgn,a1,a2):
    a1,a2=np.deg2rad(a1),np.deg2rad(a2);return np.array([sgn*np.sin(a2),-np.cos(a2)*np.cos(a1),np.cos(a2)*np.sin(a1)])
def tube(A,B,ra,rb,ref,step=0.45,caps=(True,True),ez=None,sq=1.0,capk=1.0):
    """points on a tapered tube A->B. ra/rb = (rx,rz) half-axes at each end (rx along 'side', rz along 'front').
    returns pts, t (0..1 along the bone, <0 / >1 in caps), ang (0 = front, +90 = side)"""
    ax=B-A;L=np.linalg.norm(ax);ax=ax/max(L,1e-9);L=round(float(L),2);side=unit(np.cross(ref,ax)) if ez is None else ez;front=np.cross(ax,side)
    ra=np.atleast_1d(ra)*np.ones(2);rb=np.atleast_1d(rb)*np.ones(2)
    c0=max(ra)*capk if caps[0] else 0;c1=max(rb)*capk if caps[1] else 0
    ss=-c0+step/2+np.arange(max(1,int(round((c0+L+c1)/step-1e-6))))*step;P=[];T=[];AN=[]
    for s in ss:
        t=np.clip(s/max(L,1e-9),0,1);r=ra+(rb-ra)*t;k=1.0
        if s<0:k=np.sqrt(max(0,1-(s/c0)**2))
        elif s>L:k=np.sqrt(max(0,1-((s-L)/c1)**2))
        rx,rz=r*k;n=MESHSEG or max(6,int(2*np.pi*max(rx,rz)/step));a=np.arange(n)*2*np.pi/n
        P.append(A+ax*s+np.outer(np.sign(np.sin(a))*np.abs(np.sin(a))**sq*rx,side)+np.outer(np.sign(np.cos(a))*np.abs(np.cos(a))**sq*rz,front));T.append(np.full(n,s/max(L,1e-9)));AN.append(a)
    return np.concatenate(P),np.concatenate(T),np.concatenate(AN)
def ellipsoid(Cn,R,step=0.45):
    R=np.asarray(R,float);n=int(np.pi*R.max()/step);P=[];
    for i in range(n+1):
        la=-np.pi/2+np.pi*i/n;m=MESHSEG or max(1,int(2*np.pi*R.max()*np.cos(la)/step));lo=np.arange(m)*2*np.pi/m
        P.append(np.stack([np.cos(la)*np.sin(lo),np.full(m,np.sin(la)),np.cos(la)*np.cos(lo)],1))
    U=np.concatenate(P);return Cn+U*R,U
def joints(x,stick=None):
    p=dict(zip(NAMES,x))
    for k in ('Lt','rh','ws','wh','rxw','rzw','rxc','rzc','Lua','Lfa','rua','rfa','rg','Lth','Lsh','rth','rsh','sbl'):p[k]=max(p[k],{'s':2.0,'L':2.5}.get(k[0],0.8))
    p['rua']=max(p['rua'],1.5);p['rfa']=max(p['rfa'],1.35);p['rg']=max(p['rg'],1.6);p['rsh']=max(p['rsh'],1.6);p['rth']=max(p['rth'],2.2);p['rzw']=max(p['rzw'],2.4);p['rzc']=min(max(p['rzc'],p['rzw']),3.2);p['rxw']=max(p['rxw'],0.85*p['rxc']);p['sA']=max(p['sA'],0.5);p['sB']=max(p['sB'],3)
    J={};le=np.deg2rad(p['lean']);s=np.array([0,np.cos(le),np.sin(le)]);ex=np.array([1.,0,0])
    O=np.array([p['tx'],p['y0'],0]);J['pelvis']=O+[0,p['hp'],p['zp']];J['neck']=J['pelvis']+p['Lt']*s;J['spine']=s
    J['head']=J['neck']+[0,p['hy'],p['hz']];J['chest']=J['pelvis']+0.65*p['Lt']*s;J['shline']=J['neck']-1.6*s
    for sd,sg in (('R',1),('L',-1)):
        J[sd+' shoulder']=J['neck']-1.4*s+sg*p['ws']*ex
        J[sd+' elbow']=J[sd+' shoulder']+p['Lua']*limb(sg,p[sd+'a1'],p[sd+'a2'])
        fd=limb(sg,p[sd+'f1'],p[sd+'f2']);J[sd+' wrist']=J[sd+' elbow']+p['Lfa']*fd;J[sd+' glove']=J[sd+' wrist']+1.3*fd
        J[sd+' hip']=J['pelvis']+sg*p['wh']*ex
        J[sd+' knee']=J[sd+' hip']+p['Lth']*limb(sg,p[sd+'b1'],p[sd+'b2'])
        J[sd+' ankle']=J[sd+' knee']+p['Lsh']*limb(sg,p[sd+'c1'],p[sd+'c2'])
    a1,a2=np.deg2rad(p['sa1']),np.deg2rad(p['sa2']);sd=np.array([np.cos(a1)*np.sin(a2),np.sin(a1),-np.cos(a1)*np.cos(a2)])
    J['stick heel']=J['R glove']-p['sB']*sd;J['stick butt']=J['R glove']+p['sA']*sd
    b=np.deg2rad(p['sba']);J['stick toe']=J['stick heel']+p['sbl']*np.array([np.sin(b),0,np.cos(b)])
    if stick:
        for k in ('heel','butt','toe'):J['stick '+k]=np.asarray(stick[k],float)
    return J,p
def build(x,step=0.45,stick=None):
    """returns list of parts: dict(name, cls, pts, t, ang)"""
    J,p=joints(x,stick);ex=np.array([1.,0,0]);ez=np.array([0,0,1.]);s=J['spine'];out=[]
    def add(name,cls,pts,t,ang): out.append(dict(name=name,cls=np.full(len(pts),cls) if np.isscalar(cls) else cls,pts=pts,t=t,ang=ang))
    P,T,A=tube(J['pelvis'],J['chest'],(p['rxw'],p['rzw']),(p['rxc'],p['rzc']),None,step,caps=(True,False),ez=ex,sq=0.7);add('torso',C['torso'],P,T,A)
    top=(p['ws']+0.3,0.85*p['rzc'])
    P,T,A=tube(J['chest'],J['shline'],(p['rxc'],p['rzc']),top,None,step,caps=(False,False),ez=ex,sq=0.7);add('chest',C['torso'],P,T,A)
    P,T,A=tube(J['shline'],J['neck']-0.2*s,top,(0.82*p['ws'],0.75*p['rzc']),None,step,caps=(False,True),ez=ex,sq=0.8,capk=0.3);add('yoke',C['torso'],P,T,A)
    for sd,sg in (('R',1),('L',-1)):
        P,U=ellipsoid(J[sd+' shoulder']-0.5*s,(p['rua']+0.45,p['rua']+0.2,p['rua']+0.7),step);add(sd+' shoulder pad',C['torso'],P,U[:,1],np.arctan2(sg*U[:,0],U[:,2]))
    P,U=ellipsoid(J['head'],(p['rh'],p['rh']*1.3,p['rh']*1.1),step)
    face=(U[:,2]>0.15)&(U[:,1]<0.15);add('head',np.where(face,C['skin'],C['head']),P,U[:,1],np.arctan2(U[:,0],U[:,2]))
    P,U=ellipsoid(J['pelvis']-2.2*s,(min(p['wh']+p['rth'],0.95*p['rxw']),p['rth']*1.1,0.9*p['rzw']),step);add('hips',C['pants'],P,U[:,1],np.arctan2(U[:,0],U[:,2]))
    for sd in 'RL':
        P,T,A=tube(J[sd+' shoulder'],J[sd+' elbow'],p['rua'],p['rua'],ez,step);add(sd+' upper arm',C['sleeve'],P,T,A)
        P,T,A=tube(J[sd+' elbow'],J[sd+' wrist'],p['rua'],p['rfa'],ez,step);add(sd+' forearm',C['sleeve'],P,T,A)
        P,U=ellipsoid(J[sd+' glove'],(p['rg'],)*3,step);add(sd+' glove',C['glove'],P,U[:,1],np.arctan2(U[:,0],U[:,2]))
        P,T,A=tube(J[sd+' hip'],J[sd+' knee'],p['rth']*1.05,p['rth'],ez,step,sq=0.8);add(sd+' thigh',C['pants'],P,T,A)
        P,T,A=tube(J[sd+' knee'],J[sd+' ankle'],p['rsh'],p['rsh']*0.85,ez,step);add(sd+' shin',C['sock'],P,T,A)
        P,U=ellipsoid(J[sd+' ankle']+[0,-0.6,0.8],(1.3,1.5,2.3),step);add(sd+' skate',C['skate'],P,U[:,1],np.arctan2(U[:,0],U[:,2]))
        B0=J[sd+' ankle']+[0,-2.3,-1.6];P,T,A=tube(B0,B0+[0,0,5.2],(.35,.5),(.35,.5),None,step,caps=(False,False),ez=ex);add(sd+' blade',C['skate'],P,T,A)
    P,T,A=tube(J['stick heel'],J['stick butt'],.2,.2,ez,step,caps=(False,False));add('stick shaft',C['stick'],P,T,A)
    P,T,A=tube(J['stick heel'],J['stick toe'],(.2,.7),(.2,.7),None,step,caps=(False,False),ez=unit(np.cross(J['stick toe']-J['stick heel'],[0,1.,0])));add('stick blade',C['stick'],P,T,A)
    return out,J,p
