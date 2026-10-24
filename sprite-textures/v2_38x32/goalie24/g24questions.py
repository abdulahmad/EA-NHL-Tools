# LOCAL ONLY: ringed questions for Abdul -> /workspace/preview_v2/goalie24/questions_<k>.png (clean | clean with yellow rings).
import sys,os,json,textwrap
HH=os.path.dirname(os.path.abspath(__file__));sys.path.insert(0,HH)
from g24inspect import *
def cells(n,f):
    lab=np.array(S[str(n)]['lab']);p=frame(n);return [(y,x) for y in range(p.shape[0]) for x in range(p.shape[1]) if p[y,x]!=255 and f(y,x,int(lab[y,x]))]
Q=[(408,lambda y,x,L:L==MASK and y>=4,'Q1 frame 408: the ringed pixels are labelled MASK. They look like the red jersey/back. Is the mask only the grey helmet at the top (rows 0-3)? Should the ringed pixels be BODY?'),
   (417,lambda y,x,L:L==PADL and x>=21,'Q2 frame 417: the ringed group on the right (x 21-29) is labelled LEFT PAD. Is it the pad, or is it the catcher/arm reaching to the right?'),
   (426,lambda y,x,L:x<=4 and 8<=y<=14,'Q3 frame 426 (back view): the ringed white/grey pixels at the left edge are labelled BODY. Are they the CATCHER? If not, where is the catcher in this frame?')]
for i,(n,f,q) in enumerate(Q):
    p=frame(n);lab=np.array(S[str(n)]['lab']);A=pan(p,lab,'clean','%d clean'%n);B=pan(p,lab,'clean','%d ringed'%n,cells(n,f))
    T=textwrap.wrap(q,60);im=Image.new('RGB',(1000,max(A.height,B.height)+20+40*len(T)));im.paste(A,(0,0));im.paste(B,(510,0))
    d=ImageDraw.Draw(im);y=max(A.height,B.height)+10
    for l in T:d.text((10,y),l,font=F_(28),fill=(255,255,255));y+=40
    im.save(OUT+'questions_%d.png'%(i+1));print(OUT+'questions_%d.png'%(i+1),im.size)
