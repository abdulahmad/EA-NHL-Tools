# P1 regression check: rasterise every D band list with the fixed jerseys.bands() and report any band with 0 rows
import json;from PIL import Image,ImageDraw;import jerseys;from jerseys import D
CAP={k:tuple(v) for k,v in json.load(open('data/capacity.json')).items()};bad=0
for k,s in D.items():
  for reg,bl,(w,h),vert in (('torso',(s.get('yoke') or [])+s['torso'],CAP['torso_front'],0),('sleeve',s['sleeve'],CAP['sleeve'],0),('sock',s['sock'],CAP['sock'],0),('vpipe',s.get('vpipe',[]),CAP['torso_front'],1)):
    for i,(v0,v1,c) in enumerate(bl):
      im=Image.new('RGB',(w,h),(1,2,3));L=[(a,b,(9,9,9) if j!=i else (250,1,250)) for j,(a,b,_) in enumerate(bl)]
      jerseys.bands(ImageDraw.Draw(im),w,h,(1,2,3),L,vertical=bool(vert))
      if (250,1,250) not in [p for _,p in im.getcolors(9999)]:print(k,reg,v0,v1,'DROPPED');bad+=1
print('dropped:',bad)
