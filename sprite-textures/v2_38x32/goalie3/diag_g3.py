import sys,pickle,numpy as np,json
sys.path.insert(0,'../scripts')
import uv;uv.WRAP_LIMBS=uv.SIDE_FIX=uv.FRONT_SMOOTH=uv.GLOVE_UV=uv.PAD_UV=True;uv.ELEV=40
FRG=[413,416,422,428,449,519,980,1000]
GL={'padL':(0,0,9,21),'padR':(9,0,10,21),'blocker':(19,0,10,10),'catcher':(19,10,10,10),'goalie_mask':(29,0,7,6)}
S={};F={}
for n in FRG:S[n]=uv.solve(n);F[n]=uv.solve.front
out={}
for P,(x0,y0,w,h) in GL.items():
    K=pickle.load(open(f'/tmp/g2_{P}.pkl','rb'));d=[];back=0;tot=0;cols=set()
    for n in FRG:
        U=S[n][2];V=S[n][3]
        for q,(tx,ty) in K['A'][n].items():
            nx=x0+min(w-1,int(U[q]*w));d.append(abs(nx-tx));tot+=1;back+=(not F[n]);cols.add(tx)
    d=np.array(d);out[P]=dict(px=tot,back_frame_px=back,mean_col_shift=round(float(d.mean()),2),shift_ge2=int((d>=2).sum()),cols_used=sorted(c-x0 for c in cols),block_w=w)
K=pickle.load(open('/tmp/g3.pkl','rb'));GL3=K['GL'];new={}
for b,(x0,y0,w,h) in GL3.items():
    d=[]
    for n in FRG:
        for q,(bb,u,v) in K['PIX'][n].items():
            if bb!=b:continue
            t=K['A'][n][q];nx,ny=x0+round(u*(w-1)),y0+round(v*(h-1));d.append(max(abs(t[0]-nx),abs(t[1]-ny)))
    d=np.array(d);new[b]=dict(px=len(d),mean_shift=round(float(d.mean()),2),shift_ge2=int((d>=2).sum()))
print(json.dumps(dict(old=out,new=new),indent=0))
json.dump(dict(old=out,new=new),open('/workspace/preview_v2/goalie3/diagnosis_numbers.json','w'),indent=1)
