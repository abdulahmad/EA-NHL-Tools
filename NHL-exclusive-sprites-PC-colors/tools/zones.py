import os,sys;sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)));import paths
import json
# zone id = Genesis palette-line-2 index (value-32). Colours from pal3.py optimisation (L* and b* contrast, no greens), stick natural.
Z={0:('transparent / background',(128,128,128)),
1:('skate blade (dark grey)',(255,240,180)),
2:('black: outline, gloves, boots',(0,0,0)),
3:('pants dark (team colour A)',(150,215,255)),
4:('pants medium (team colour A)',(60,60,60)),
5:('pants light (team colour A)',(255,128,0)),
6:('skin light',(120,0,50)),
7:('skin dark',(210,210,210)),
8:('trim B dark (stripes)',(255,255,255)),
9:('trim B light (stripes)',(110,55,0)),
10:('trim C (stripes)',(40,110,255)),
11:('jersey/helmet/socks medium',(255,225,0)),
12:('jersey/helmet/socks light',(255,150,210)),
13:('jersey/helmet/socks dark',(0,0,150)),
14:('stick (natural wood)',(214,150,70)),
15:('ice shadow / spray',(235,0,200))}
# NHLPA 93 extras on other palette lines (not the 16-colour sprite line 2). Names checked against the frames:
# line 0 idx 1/2 = ice chips/spray (white/pale cyan), line 1 idx 12/13 = blood. The line-1 object colours appear only
# in 93 frames 634 and 637 (44 px); what the object is is unknown (it is NOT verified to be blood or a glove).
BLOOD={1:('ice chips (line 0 idx 1)',(225,225,255)),2:('ice chips (line 0 idx 2)',(170,170,255)),
28:('blood (line 1 idx 12)',(255,40,40)),29:('blood (line 1 idx 13)',(90,0,20)),
17:('line-1 object idx 1 (unknown)',(255,200,120)),18:('line-1 object idx 2 (unknown)',(100,100,190)),
19:('line-1 object idx 3 (unknown)',(190,255,255)),22:('line-1 object idx 6 (unknown)',(150,90,150)),
23:('line-1 object idx 7 (unknown)',(30,30,30)),25:('line-1 object idx 9 (unknown)',(240,240,120))}
OVL={1:1,2:2,28:12,29:13,17:3,18:4,19:5,22:6,23:7,25:8}   # extra value -> index in the *_blood_overlay.png files
