from parts import *
sp=spritepal(team('tor'))
PC=np.array([[0,0,0]]*len(PN));
for k,c in {'outline':(30,30,30),'skin':(255,200,170),'helmet':(255,160,0),'torso':(200,200,200),'crest':(255,255,0),'shoulder_patch':(255,0,255),'sleeve':(0,200,255),'glove':(255,40,40),'pants':(40,40,220),'sock':(160,60,200),'skate':(255,255,255),'skate_blade':(180,220,255),'stick':(150,100,50),'shadow':(60,100,130),'goalie_mask':(255,120,0),'catcher':(0,230,90),'blocker':(255,40,40),'pad':(255,230,60),'other':(90,90,90)}.items(): PC[P[k]]=c
NEW={'glove':(220,30,30),'goalie_mask':(240,200,0),'catcher':(20,170,60),'blocker':(200,30,160),'pad':(250,140,20)}
def recolour(n):
    p=frame(n);pa,_=segment(n,p);rgb=sp[p].astype(float)
    lum=rgb.mean(-1)
    for k,c in NEW.items():
        m=pa==P[k]
        if not m.any(): continue
        # continuous shade: original luminance normalised within the part (black gear -> use relative rank)
        l=lum[m]; s=(l-l.min())/(np.ptp(l)+1e-6) if np.ptp(l)>0 else np.ones_like(l)
        rgb[m]=np.array(c)[None]*(0.45+0.6*s[:,None])
    return rgb,p!=255,pa
if __name__=='__main__':
    sel=[409,415,425,440,460,480,500,520,540,980,1000,1020,1040,1060,1,17,49,100]
    rows=[]
    for n in sel:
        rgb,m,pa=recolour(n);p=frame(n)
        rows.append(sheet([toimg(sp[p],m,6),toimg(PC[pa],m,6),toimg(rgb,m,6)],3,2))
    sheet(rows,3).save('10_equipment_zoom_orig_partmap_recolour.png')
    G=sorted(GOALIE);ims=[]
    for n in G:
        if not frame(n).size: continue
        rgb,m,pa=recolour(n);ims.append(toimg(rgb,m,2))
    sheet(ims,25,2).save('11_all_goalie_frames_recoloured.png')
    ims=[toimg(PC[segment(n)[0]],frame(n)!=255,2) for n in G if frame(n).size]
    sheet(ims,25,2).save('12_all_goalie_frames_partmap.png')
    ims=[]
    for n in range(1,353):
        rgb,m,pa=recolour(n);ims.append(toimg(rgb,m,2))
    sheet(ims,30,2).save('13_all_skater_frames_gloves_recoloured.png')
    from PIL import ImageDraw
    L=Image.new('RGB',(200,16*len(PN)),(30,30,30));d=ImageDraw.Draw(L)
    for i,nm in enumerate(PN): d.rectangle([2,i*16+2,14,i*16+14],fill=tuple(int(x) for x in PC[i]));d.text((20,i*16+2),nm,fill=(255,255,255))
    L.save('10b_part_legend.png')
