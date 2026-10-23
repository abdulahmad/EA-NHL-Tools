from lib import *
import colorsys
# diagnostic palette: hue per part group, brightness per shade
GROUPS=[((144,145,146),0.15,'forearm'),((147,148,149),0.62,'arm stripe3'),((150,151,152),0.33,'arm stripe2'),((153,154,155),0.0,'arm stripe1'),((156,157,158),0.5,'upper arm'),
((159,161,162,163),0.28,'yoke'),((160,),0.83,'shoulder patch'),((164,),0.08,'goalie mask'),((165,166,167),0.0,'jersey body'),((168,169,170),0.1,'waist1'),((171,172,173),0.2,'waist2'),((174,175,176),0.9,'waist3'),
((177,180),0.66,'pants'),((178,179),0.75,'pant stripes'),((181,182,183),0.8,'socks'),((184,185,186),0.45,'sock stripe1'),((187,188,189),0.55,'sock stripe2'),((190,191),0.12,'helmet')]
def diagpal():
    p=np.zeros((256,3),int)+[90,90,90];p[0]=[0,0,0];p[88]=[60,120,160];p[136]=[150,100,50]
    for i in (133,134,135,140):p[i]=[255,200,170]
    for g,h,name in GROUPS:
        sat=0 if name=='jersey body' else 1
        for k,i in enumerate(g):
            v=[1.0,0.75,0.5][k%3] if len(g)==3 else 0.85
            p[i]=[int(255*c) for c in colorsys.hsv_to_rgb(h,sat,v)]
    for r in (192,208,224,240):
        for i in range(r,r+5):p[i]=[255,255,0]
    return p
