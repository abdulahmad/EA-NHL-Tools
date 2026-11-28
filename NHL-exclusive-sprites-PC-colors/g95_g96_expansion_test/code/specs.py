import pickle,numpy as np,sys
sys.path.insert(0,'/workspace/g94-to-pc-zones/v5/x95')
X='/workspace/g94-to-pc-zones/v5/x95/'
SEL95=[('skate dir0',1,'skater'),('skate dir2',17,'skater'),('skate dir4',33,'skater'),('skate dir6',49,'skater'),
 ('shot (swing)',448,'skater'),('backhand shot',576,'skater'),('shoulder check L',123,'skater'),('shoulder check R',131,'skater'),
 ('goalie glove-L',616,'goalie'),('goalie stick-R',640,'goalie'),('goalie swing',742,'goalie'),('goalie ready',904,'goalie')]
def build(game,sel,imap):
  F94,F95,F96=pickle.load(open(X+'frames.pkl','rb'));F={'95':F95,'96':F96}[game]
  m=pickle.load(open(X+f'match{game}.pkl','rb'));base={'95':950000,'96':960000}[game]
  out=[]
  for label,f,kind in sel:
    img=F[f]['img'];g=imap(img,kind);o=m.get((game,f))
    pr=None
    if o and o['iou']>=0.85:pr=dict(pc=o['pc'],iou=o['iou'],mir=o['mir'],dy=o['dy'],dx=o['dx'],cat=kind,label=label,slot=False)
    out.append(dict(K=base+f,f=f,label=label,kind=kind,g=g,raw=img,pr=pr,near=o))
  return out
SEL96=[('skate',363,'skater'),('skate (other dir)',387,'skater'),('skate backwards',435,'skater'),('forehand shot',757,'skater'),
 ('backhand shot',681,'skater'),('body check R',933,'skater'),('body check L',997,'skater'),('cross check',965,'skater'),
 ('goalie ready',355,'goalie'),('goalie glove-L',75,'goalie'),('goalie dive',171,'goalie'),('goalie block',123,'goalie')]
