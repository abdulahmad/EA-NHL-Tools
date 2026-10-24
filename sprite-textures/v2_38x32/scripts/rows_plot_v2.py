import json,collections,numpy as np
from PIL import Image,ImageDraw,ImageFont
PF=json.load(open('/workspace/preview_back/overflow_breakdown.json'))['per_frame']
OLD=json.load(open('/workspace/preview_back/rows_overflow.json'))
T=np.asarray(Image.open('/workspace/preview_v2/raw/stripe_diagnostic_v2.png').convert('RGB'))
J=json.load(open('/workspace/preview_v2/column_map_v2.json'))
ZN={}
for k,(x,y) in J['map_new_to_oldwide'].items():
    nx,v=map(int,k.split(','))
    if x>=50 or v>20 or v<6:continue
    ZN[(nx,v)]='FR' if x<=3 else 'FT' if x<=18 else 'FL' if x<=23 else 'BL' if x<=28 else 'BT' if x<=43 else 'BR'
F=lambda z:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',z)
TN={6:'yoke 1',7:'yoke 2+patch',8:'yoke 3+corner',9:'jersey',10:'jersey',11:'jersey',12:'jersey',13:'jersey',14:'waist 1',15:'waist 2',16:'waist 3'}
AN={8:'upper arm',9:'upper arm',10:'upper arm',11:'upper arm',12:'arm stripe 1',13:'arm stripe 2',14:'arm stripe 3',15:'forearm',16:'forearm',17:'forearm'}
# delta = texels added per row in v2 vs original 54x32 (same counting convention as survey)
DT={'front torso':{**{v:4 for v in (6,7,8)},**{v:2 for v in range(9,16)},16:1},'back torso':{**{v:2 for v in range(6,16)},16:1},
    'right arm':{v:1 for v in range(8,18)},'left arm':{v:1 for v in range(8,18)}}
PARTS={'front torso':([(2,18)],{'FT'},TN),'right arm':([(0,5),(33,38)],{'FR','BR'},AN),'left arm':([(15,25)],{'FL','BL'},AN),'back torso':([(22,37)],{'BT'},TN)}
COL=[(30,40,120),(40,110,220),(120,180,240),(235,215,110),(255,245,40)];Z0=(150,150,150)
stats={};summary={}
for part,(_,_,names) in PARTS.items():
    show=[n for n in PF if part in PF[n]];sr={}
    for v in names:
        hav=[n for n in show if PF[n][part]['row_px'].get(str(v),0)>0]
        ex=[max(0,PF[n][part]['row_extra'].get(str(v),0)-DT[part][v]) for n in hav];pos=[e for e in ex if e>0]
        h=collections.Counter(min(e,5) for e in pos)
        sr[v]=dict(frames=len(pos),row_frames=len(hav),part_frames=len(show),zero=len(hav)-len(pos),hist=[h.get(k,0) for k in range(1,6)],max=max(pos) if pos else 0,
                   old_frames=OLD[part]['rows'][str(v)]['frames'],v2_extra_texels=DT[part][v])
    anyn=sum(1 for n in show if any(max(0,e-DT[part][int(v)])>0 for v,e in PF[n][part]['row_extra'].items() if int(v) in DT[part]))
    anyo=sum(1 for n in show if any(e>0 for e in PF[n][part]['row_extra'].values()))
    summary[part]=dict(frames=len(show),old_need1=anyo,new_need1=anyn)
    stats[part]=dict(frames_showing=len(show),rows=sr)
json.dump(dict(note='extra = max(0, old row_extra - texels added in v2 for that row); gloves (rows 18-20) not measured by survey',summary=summary,parts=stats),open('rows_overflow_v2.json','w'),indent=1)
W=780;Z=20;S=10
panels=[]
for part,(crops,zs,names) in PARTS.items():
    st=stats[part];r0,r1=min(names),max(names)+1;sm=summary[part]
    pieces=[]
    for c0,c1 in crops:
        im=Image.fromarray(T[r0-1:r1+1,c0:c1]).resize(((c1-c0)*S,(r1-r0+2)*Z),Image.NEAREST);d=ImageDraw.Draw(im)
        for (x,v),z in ZN.items():
            if z not in zs or not(c0<=x<c1 and r0<=v<r1):continue
            X=(x-c0)*S;Y=(v-r0+1)*Z
            for dx,dy,seg in ((-1,0,[(X,Y),(X,Y+Z)]),(1,0,[(X+S-1,Y),(X+S-1,Y+Z)]),(0,-1,[(X,Y),(X+S,Y)]),(0,1,[(X,Y+Z-1),(X+S,Y+Z-1)])):
                if ZN.get((x+dx,v+dy))!=z:d.line(seg,fill=(255,255,0),width=2)
        pieces.append(im)
    tw=sum(p.width for p in pieces)+4*(len(pieces)-1)
    H=70+(r1-r0+2)*Z+8;P=Image.new('RGB',(W,H),(0,0,0));d=ImageDraw.Draw(P)
    d.text((8,4),part.upper(),fill=(255,255,255),font=F(30))
    d.text((8,40),f"{st['frames_showing']} frames. Need >=1 extra col: {100*sm['old_need1']/sm['frames']:.0f}% -> {100*sm['new_need1']/sm['frames']:.0f}%",fill=(255,255,0),font=F(18))
    ty=66;x=8
    for p in pieces:P.paste(p,(x,ty));x+=p.width+4
    lx=8+tw+8;bx=lx+142;bw=W-bx-252
    d.text((bx+bw+6,ty+2),'need/row',fill=(190,190,190),font=F(13));d.text((bx+bw+114,ty+2),'part',fill=(190,190,190),font=F(13));d.text((bx+bw+162,ty+2),'old->new',fill=(190,190,190),font=F(13))
    for v in names:
        y=ty+(v-r0+1)*Z;s=st['rows'][v];tot=max(s['row_frames'],1)
        d.text((lx,y+2),f'{v:2d} {names[v]}',fill=(255,255,255),font=F(13))
        x=bx;w0=int(round(s['zero']/tot*bw))
        if w0:d.rectangle([x,y+2,x+w0-1,y+Z-3],fill=Z0,outline=(255,255,255));x+=w0
        for k,c in enumerate(s['hist']):
            w=int(round(c/tot*bw))
            if w:d.rectangle([x,y+2,x+w-1,y+Z-3],fill=COL[k],outline=(0,0,0));x+=w
        pr=100*s['frames']/tot;po=100*s['old_frames']/tot;pp=100*s['frames']/max(s['part_frames'],1)
        d.text((bx+bw+6,y+3),f"{s['frames']}/{s['row_frames']}={pr:.0f}%",fill=(255,255,255),font=F(13))
        d.text((bx+bw+114,y+3),f"{pp:.0f}%",fill=(190,190,190),font=F(13))
        d.text((bx+bw+162,y+3),f"{po:.0f}->{pr:.0f}%",fill=(255,255,0) if pr<po else (255,255,255),font=F(13))
    panels.append(P)
L=Image.new('RGB',(W,92),(0,0,0));d=ImageDraw.Draw(L);d.text((8,4),'extra columns needed:',fill=(255,255,255),font=F(17))
x=240
for c,l in zip([Z0]+COL,['0','1','2','3','4','5+']):d.rectangle([x,4,x+36,24],fill=c,outline=(255,255,255));d.text((x+40,4),l,fill=(255,255,255),font=F(17));x+=84
for i,t in enumerate(['589 fitted skater frames. Bar = 100% of frames with pixels on the row.','part % = of frames showing the part. old->new = % of row frames needing >=1 col, 54x32 -> v2.','Gloves (rows 18-20) not measured: survey has no glove part.']):d.text((8,30+i*20),t,fill=(200,200,200),font=F(13))
Hh=sum(p.height for p in panels)+L.height+50;O=Image.new('RGB',(W,Hh),(0,0,0));dd=ImageDraw.Draw(O)
dd.text((8,8),'Which texture rows need more columns (v2 38x32)',fill=(255,255,255),font=F(26));O.paste(L,(0,46));y=46+L.height
for p in panels:dd.line([(0,y),(W,y)],fill=(120,120,120),width=2);O.paste(p,(0,y+2));y+=p.height
O.save('rows_overflow_bars_v2.png');print(O.size,json.dumps(summary))
for part in PARTS:print(part,sorted(((s['frames'],v,s['row_frames'],round(100*s['frames']/s['row_frames']),s['old_frames']) for v,s in stats[part]['rows'].items()),reverse=True)[:3])
