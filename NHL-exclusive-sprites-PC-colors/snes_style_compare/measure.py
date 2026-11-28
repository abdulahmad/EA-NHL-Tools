#!/usr/bin/env python3
"""Measure 94 SNES vs 94 Genesis vs 95 PC style on matched pose triples."""
import os, sys, json, csv, struct, math, collections
import numpy as np
from scipy.ndimage import binary_erosion

OUT = '/workspace/snes-style-compare'
V = '/workspace/preview_v2/platform_unique/v2/'
sys.path.insert(0, '/workspace/EA-NHL-Tools/docs/snes-redraw')
sys.path.insert(0, '/workspace/preview_v2/exclusive_samples/v2')
sys.path.insert(0, '/workspace/EA-NHL-Tools/sprite-textures/scripts')
from common import A, rows
import lib

# ---- palettes for colour counts and later rendering (Boston home) ----
def snes_pal(path):
    P = np.zeros((256, 3), int)
    def rd(f, base, endian):
        d = open(f, 'rb').read()
        for i in range(len(d)//2):
            x = int.from_bytes(d[2*i:2*i+2], endian)
            P[base+i] = ((x&31)*255//31, ((x>>5)&31)*255//31, ((x>>10)&31)*255//31)
    rd('/workspace/NHL94SNES/Extracted/data/gfx/Pals/RinkPalette.pal', 0, 'little')
    rd(path, 32, 'little')
    return P

def gen_pal(path):
    d = open(path, 'rb').read()
    P = np.zeros((256, 3), int)
    w = [int.from_bytes(d[i:i+2], 'big') for i in range(0, min(len(d), 32), 2)]
    for i, x in enumerate(w):
        P[32+i] = ((x&14)*18, ((x>>4)&14)*18, ((x>>8)&14)*18)
    return P

SP = snes_pal('/workspace/NHL94SNES/Extracted/data/gfx/Pals/BOSh.pal')
GP = gen_pal('/workspace/NHL94Genesis/Extracted/NHL94/Graphics/Pals/BOSh.pal')
PP = lib.spritepal(lib.team('bos'))

# Index roles (not RGB): console player line is 32–47.
# Stick = 46, shadow/ice spray = 47. All other nonzero pixels are body
# (black outline, skates, gloves, jersey, skin, helmet).
CONSOLE_STICK = {46}
CONSOLE_SHADOW = {47}
# PC: mapping doc: 136 stick, 88 shadow; 31 is blade brown in fallbacks.
PC_STICK = {136, 31}
PC_SHADOW = {88, 82, 89}

def masks(arr, platform):
    """Body = largest connected components after removing stick, shadow, and PC pad 255.
    Index 255 is empty in the 95 PC editor (`px==255` -> 0). Stick-blade black
    (console 34) left behind when 46 is removed is dropped as a tiny component.
    """
    a = np.array(arr)
    if platform == 'PC':
        a = np.where(a == 255, 0, a)
        stick = np.isin(a, list(PC_STICK))
        shadow = np.isin(a, list(PC_SHADOW))
    else:
        stick = np.isin(a, list(CONSOLE_STICK))
        shadow = np.isin(a, list(CONSOLE_SHADOW))
    raw = (a > 0) & ~stick & ~shadow
    from scipy.ndimage import label
    lab, n = label(raw)
    if n == 0:
        return raw, stick, shadow, a
    sizes = [(int((lab == i).sum()), i) for i in range(1, n+1)]
    biggest = max(s for s,_ in sizes)
    body = np.zeros_like(raw)
    for sz, i in sizes:
        if i == max(sizes)[1] or sz >= 10 or sz >= biggest:
            # keep largest always; also any component of 10+ px (glove / pad)
            pass
    # keep largest + any >= 10
    keep_ids = {i for sz,i in sizes if sz == biggest or sz >= 10}
    for i in keep_ids:
        body |= (lab == i)
    return body, stick, shadow, a

def tight(mask):
    ys, xs = np.nonzero(mask)
    if len(ys) == 0:
        return None
    return int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())

def wh(bb):
    if not bb:
        return 0, 0
    x0,y0,x1,y1 = bb
    return x1-x0+1, y1-y0+1

# ---- hotspots ----
S_RAW = __import__('pickle').load(open('/workspace/preview_v2/platform_unique/snes94.pkl', 'rb'))

def snes_hot(n):
    pts = S_RAW[n-1]
    if not pts:
        return None
    a = np.array(pts)
    return (-int(a[:,1].min()), -int(a[:,0].min()))

DIM = [(1,1),(1,2),(1,3),(1,4),(2,1),(2,2),(2,3),(2,4),(3,1),(3,2),(3,3),(3,4),(4,1),(4,2),(4,3),(4,4)]

def load_gen_hot(rom, T=0x5DE84, ft=0x9E726):
    b = open(rom, 'rb').read()
    rel = ft-2
    n = struct.unpack('>H', b[ft:ft+2])[0]//2-1
    out = {}
    for i in range(n):
        o = struct.unpack('>H', b[ft+2*i:ft+2*i+2])[0]+rel
        o2 = struct.unpack('>H', b[ft+2*i+2:ft+2*i+4])[0]+rel
        if o2<=o:
            continue
        xs=[]; ys=[]
        for k in range((o2-o)//8):
            x,y,t,p,s = struct.unpack('>hhHBB', b[o+8*k:o+8*k+8])
            w,h = DIM[s&15]
            xs += [x, x+w*8]; ys += [y, y+h*8]
        if xs:
            out[i+1] = (-min(xs), -min(ys))
    return out

G_HOT = load_gen_hot('/workspace/NHL94Genesis/nhl94retail.bin')

def pc_hot(n):
    f,w,h,o,hx,hy = lib.H[n-1]
    return int(hx), int(hy)

# ---- joints ----
_s = open('/workspace/EA-NHL-Tools/sprite-textures/editor/data/bundle.js').read()
_B = json.loads(_s[_s.index('{'):_s.rstrip().rstrip(';').rindex('}')+1])
JOINTS = {}
for f in _B['frames']:
    if f.get('joints') and f['id'].split()[0] in ('skater','goalie'):
        JOINTS[(f['id'].split()[0], int(f['id'].split()[-1]))] = f['joints']

def bone(J,a,b):
    if a not in J or b not in J:
        return None
    x0,y0=J[a]; x1,y1=J[b]
    return float(math.hypot(x1-x0, y1-y0))

def chain(J, names):
    t=0.0
    for a,b in zip(names, names[1:]):
        L=bone(J,a,b)
        if L is None:
            return None
        t+=L
    return t

def part_lengths(J, kind):
    if kind=='skater' or ('L shoulder' in J):
        head=bone(J,'head','neck')
        torso=chain(J,['neck','chest','belly','pelvis'])
        legs=[chain(J,[f'{s} hip',f'{s} knee',f'{s} ankle',f'{s} skate']) for s in 'LR']
        legs=[x for x in legs if x]
        arms=[chain(J,[f'{s} shoulder',f'{s} elbow',f'{s} wrist',f'{s} glove']) for s in 'LR']
        arms=[x for x in arms if x]
        stick=chain(J,['stick butt','stick heel','stick toe'])
    else:
        head=bone(J,'head','neck')
        torso=chain(J,['neck','chest','belly','pelvis'])
        legs=[chain(J,seq) for seq in (['Lhip','Lknee','L ankle','Lank'],['Rhip','Rknee','R ankle','Rank'])]
        legs=[x for x in legs if x]
        arms=[chain(J,seq) for seq in (['Lsh','Lelb','L wrist','Lhand'],['Rsh','Relb','R wrist','Rhand'])]
        arms=[x for x in arms if x]
        stick=chain(J,['stick butt','stick heel','stick toe'])
    return dict(head=head, torso=torso,
                leg=(float(np.mean(legs)) if legs else None),
                arm=(float(np.mean(arms)) if arms else None),
                stick=stick)

def align_offset(a, b, pad=8):
    ma, mb = a.astype(bool), b.astype(bool)
    if ma.sum()==0 or mb.sum()==0:
        return 0,0,0.0
    ays,axs=np.nonzero(ma); bys,bxs=np.nonzero(mb)
    dy0=int(round(bys.mean()-ays.mean())); dx0=int(round(bxs.mean()-axs.mean()))
    best=(-1.0, dy0, dx0)
    Ha,Wa=ma.shape; Hb,Wb=mb.shape
    sa,sb=int(ma.sum()), int(mb.sum())
    for dy in range(dy0-pad, dy0+pad+1):
        for dx in range(dx0-pad, dx0+pad+1):
            y0,x0=max(0,dy),max(0,dx)
            y1,x1=min(Hb,dy+Ha),min(Wb,dx+Wa)
            if y1<=y0 or x1<=x0:
                continue
            inter=int((ma[y0-dy:y1-dy, x0-dx:x1-dx] & mb[y0:y1,x0:x1]).sum())
            uni=sa+sb-inter
            iou=inter/uni if uni else 0
            if iou>best[0]:
                best=(iou,dy,dx)
    return best[1], best[2], best[0]

def scale_mask(m, sy, sx):
    H=max(1,int(round(m.shape[0]*sy))); W=max(1,int(round(m.shape[1]*sx)))
    yy=np.clip((np.arange(H)/max(sy,1e-6)).astype(int),0,m.shape[0]-1)
    xx=np.clip((np.arange(W)/max(sx,1e-6)).astype(int),0,m.shape[1]-1)
    return m[yy][:,xx]

SCALES=[round(0.80+i*0.02,2) for i in range(26)]  # 0.80..1.30

def best_scale(ms, mg):
    best_u=(-1,1.0)
    for s in SCALES:
        S=scale_mask(ms,s,s)
        _,_,iou=align_offset(S,mg,pad=6)
        if iou>best_u[0]:
            best_u=(iou,s)
    s0=best_u[1]
    cands=[s for s in SCALES if abs(s-s0)<=0.12] or SCALES
    best_xy=(-1,1.0,1.0)
    for sy in cands:
        for sx in cands:
            S=scale_mask(ms,sy,sx)
            _,_,iou=align_offset(S,mg,pad=5)
            if iou>best_xy[0]:
                best_xy=(iou,sy,sx)
    return best_u, best_xy

def unique_cols(arr, pal, mask):
    if mask.sum()==0:
        return 0,0
    idx=np.unique(arr[mask])
    cols={tuple(int(x) for x in pal[int(i)]) for i in idx}
    return int(len(idx)), int(len(cols))

def is_black_idx(platform, arr, pal):
    """Black / outline pixels on the body (near-zero RGB after palette)."""
    # Use mapped RGB so team-black jerseys are not all counted as outline
    # on Boston: jersey blacks are zone 144-191, helmet 190-191 may be black/gold.
    # Outline/skates/gloves on console: index 34 (and maybe 33 dark).
    if platform!='PC':
        return np.isin(arr, [34])
    # PC: non-zone blacks
    return np.isin(arr, [11,15,16,111,133,134,140])  # 135 sometimes skin; leave out

def outline_stats(arr, body, platform, pal):
    if body.sum()==0:
        return {}
    black = is_black_idx(platform, arr, pal) & body
    edge = body & ~binary_erosion(body)
    # thickness: from each black edge pixel walk toward body centroid
    H,W=body.shape
    ys,xs=np.nonzero(edge & black)
    depths=[]
    if len(ys):
        pts=np.argwhere(body)
        cy,cx=pts.mean(0)
        for y,x in zip(ys,xs):
            vy,vx=cy-y,cx-x
            n=math.hypot(vy,vx) or 1
            dmax=1
            for t in range(1,6):
                yy=int(round(y+vy/n*t)); xx=int(round(x+vx/n*t))
                if not (0<=yy<H and 0<=xx<W) or not black[yy,xx]:
                    break
                dmax=t+1
            depths.append(dmax)
    return dict(
        black_frac=float(black.sum()/body.sum()),
        edge_black=float((black&edge).sum()/max(1,edge.sum())),
        thickness_med=(float(np.median(depths)) if depths else None),
        n_edge=int(edge.sum()),
        n_black=int(black.sum()),
    )

def dither_frac(arr, mask):
    H,W=arr.shape
    if H<2 or W<2 or mask.sum()<8:
        return 0.0
    n=0; d=0
    # vectorized-ish 2x2
    m00=mask[:-1,:-1]; m01=mask[:-1,1:]; m10=mask[1:,:-1]; m11=mask[1:,1:]
    ok=m00&m01&m10&m11
    a=arr[:-1,:-1]; b=arr[:-1,1:]; c=arr[1:,:-1]; e=arr[1:,1:]
    chk=(a==e)&(b==c)&(a!=b)&ok
    n=int(ok.sum()); d=int(chk.sum())
    return d/n if n else 0.0

def shades(arr, pal, body, platform):
    out={}
    if platform=='PC':
        groups=dict(jersey=range(165,177), pants=range(177,181), socks=range(181,190),
                    arms=range(144,159), helmet=[190,191], yoke=range(159,164),
                    arm_stripe=range(147,156), sock_stripe=range(184,190),
                    skin=[5,6,135])
        for name,idxs in groups.items():
            m=body & np.isin(arr, list(idxs))
            _,ncol=unique_cols(arr,pal,m)
            out[name]=ncol if m.sum() else 0
    else:
        # slot groups
        if platform=='S94':
            groups=dict(white_grey=[33,35,37,42,43,44], team=[36,40,41],
                        stripe_slots=[38,45], skin=[39], black=[34], stick=[46], shadow=[47])
        else:
            groups=dict(white_grey=[43,44,45], team=[35,36,37,40,41,42],
                        skin=[38,39], black=[34], stick=[46], shadow=[47])
        for name,idxs in groups.items():
            m=(arr>0) & np.isin(arr, idxs)
            nidx,ncol=unique_cols(arr,pal,m)
            out[name+'_idx']=int(nidx) if m.sum() else 0
            out[name+'_rgb']=int(ncol) if m.sum() else 0
    return out

def stick_len(stick):
    ys,xs=np.nonzero(stick)
    if len(ys)<2:
        return 0.0
    if len(ys)>250:
        return float(math.hypot(xs.max()-xs.min(), ys.max()-ys.min())+1)
    pts=np.stack([xs,ys],1).astype(float)
    d=0.0
    for i in range(len(pts)):
        dif=pts[i+1:]-pts[i]
        if len(dif):
            d=max(d, float(np.sqrt((dif**2).sum(1).max())))
    return d+1.0

def stripe_y(arr, body, platform):
    bb=tight(body)
    if not bb or body.sum()==0:
        return {}
    x0,y0,x1,y1=bb
    H=max(1,y1-y0+1)
    out={}
    if platform=='PC':
        for name,idxs in (('arm_band', range(147,156)), ('sock_stripe', range(184,190)),
                          ('pants_stripe',[178,179])):
            ys=np.nonzero(body & np.isin(arr, list(idxs)))[0]
            if len(ys):
                out[name+'_y']=float(((ys-y0)/H).mean())
                out[name+'_n']=int(len(ys))
    elif platform=='G94':
        m=body & np.isin(arr,[40,41,42])
        ys=np.nonzero(m)[0]
        if len(ys):
            rel=(ys-y0)/H
            for tag,sel in (('upper', rel<0.55), ('lower', rel>=0.55)):
                if sel.any():
                    out[f'{tag}_stripe_y']=float(rel[sel].mean())
                    out[f'{tag}_stripe_n']=int(sel.sum())
    else:
        m=body & np.isin(arr,[38,45,40,41])
        ys=np.nonzero(m)[0]
        if len(ys):
            rel=(ys-y0)/H
            for tag,sel in (('upper', rel<0.55), ('lower', rel>=0.55)):
                if sel.any():
                    out[f'{tag}_stripe_y']=float(rel[sel].mean())
                    out[f'{tag}_stripe_n']=int(sel.sum())
    return out

def reliable():
    out=[]
    for r in rows:
        if r['set']!='S94': continue
        if r['G94_class']!='match' or r['PC_class']!='match': continue
        if r['G94_mirror']!='False' or r['PC_mirror']!='False': continue
        if r['category'] not in ('player','goalie','celebration'): continue
        try:
            gs,ps=float(r['G94_scale']),float(r['PC_scale'])
        except ValueError:
            continue
        if not (0.9<=gs<=1.15 and 0.9<=ps<=1.15): continue
        s,g,p=int(r['frame']),int(r['G94_best']),int(r['PC_best'])
        if s not in A['S94'] or g not in A['G94'] or p not in A['PC']: continue
        if (A['S94'][s]>0).sum()<40 or (A['G94'][g]>0).sum()<40: continue
        out.append(r)
    return out

def summarize(vals):
    v=np.array([x for x in vals if x is not None and not (isinstance(x,float) and math.isnan(x))], float)
    if len(v)==0:
        return None
    return dict(n=int(len(v)), mean=float(v.mean()), median=float(np.median(v)),
                std=float(v.std(ddof=1) if len(v)>1 else 0.0),
                p25=float(np.percentile(v,25)), p75=float(np.percentile(v,75)),
                min=float(v.min()), max=float(v.max()))

def get(rec, path):
    v=rec
    for k in path.split('.'):
        if not isinstance(v, dict) or k not in v:
            return None
        v=v[k]
    return v

def main():
    R=reliable()
    print('reliable triples', len(R))
    recs=[]
    for i,r in enumerate(R):
        s,g,p=int(r['frame']),int(r['G94_best']),int(r['PC_best'])
        Sa,Ga,Pa=A['S94'][s],A['G94'][g],A['PC'][p]
        rec=dict(s94=s,g94=g,pc_pickle=p,pc_shown=p-1,
                 label=r['label'], category=r['category'], grp=r['spf_group'],
                 g_score=float(r['G94_score']), pc_score=float(r['PC_score']),
                 g_scale_census=float(r['G94_scale']), pc_scale_census=float(r['PC_scale']))
        M={}
        for name,arr,pal in (('S94',Sa,SP),('G94',Ga,GP),('PC',Pa,PP)):
            body,stick,shadow,a=masks(arr,name)
            arr=a  # 255 already cleared on PC
            M[name]=(body,stick,shadow,arr,pal)
            bb=tight(body)
            w,h=wh(bb)
            rec[f'{name}_canvas']=[int(arr.shape[1]),int(arr.shape[0])]
            rec[f'{name}_body_wh']=[w,h]
            rec[f'{name}_body_px']=int(body.sum())
            rec[f'{name}_stick_px']=int(stick.sum())
            rec[f'{name}_shadow_px']=int(shadow.sum())
            rec[f'{name}_stick_len']=stick_len(stick)
            rec[f'{name}_nidx'], rec[f'{name}_ncol']=unique_cols(arr,pal,arr>0)
            rec[f'{name}_outline']=outline_stats(arr,body,name,pal)
            rec[f'{name}_dither']=dither_frac(arr,body)
            rec[f'{name}_shades']=shades(arr,pal,body,name)
            rec[f'{name}_stripes']=stripe_y(arr,body,name)
            if name=='S94': hot=snes_hot(s)
            elif name=='G94': hot=G_HOT.get(g)
            else: hot=pc_hot(p)
            rec[f'{name}_hot']=list(hot) if hot else None
            if hot and bb:
                rec[f'{name}_hot_rel']=[hot[0]-bb[0], hot[1]-bb[1], w, h]
                # offset from body bottom-centre (typical foot anchor)
                rec[f'{name}_hot_from_bc']=[hot[0]-(bb[0]+w/2), hot[1]-(bb[3])]
        sw,sh=rec['S94_body_wh']; gw,gh=rec['G94_body_wh']; pw,ph=rec['PC_body_wh']
        rec['G_S_h']=gh/sh if sh else None
        rec['G_S_w']=gw/sw if sw else None
        rec['P_S_h']=ph/sh if sh else None
        rec['P_S_w']=pw/sw if sw else None
        rec['P_G_h']=ph/gh if gh else None
        rec['P_G_w']=pw/gw if gw else None
        rec['G_S_px']=rec['G94_body_px']/rec['S94_body_px'] if rec['S94_body_px'] else None
        rec['P_G_px']=rec['PC_body_px']/rec['G94_body_px'] if rec['G94_body_px'] else None
        rec['G_S_canvas_h']=rec['G94_canvas'][1]/rec['S94_canvas'][1]
        rec['G_S_canvas_w']=rec['G94_canvas'][0]/rec['S94_canvas'][0]
        rec['P_G_canvas_h']=rec['PC_canvas'][1]/rec['G94_canvas'][1]
        rec['P_G_canvas_w']=rec['PC_canvas'][0]/rec['G94_canvas'][0]
        bu,bxy=best_scale(M['S94'][0], M['G94'][0])
        rec['fit_u_iou'], rec['fit_u_s']=bu
        rec['fit_xy_iou'], rec['fit_sy'], rec['fit_sx']=bxy
        # also uniform S->PC and G->PC
        bu_p,_=best_scale(M['S94'][0], M['PC'][0])
        rec['fit_u_pc_iou'], rec['fit_u_pc_s']=bu_p
        bu_gp,_=best_scale(M['G94'][0], M['PC'][0])
        rec['fit_u_gp_iou'], rec['fit_u_gp_s']=bu_gp
        # joints
        is_goalie = (r['category']=='goalie') or r['spf_group'].startswith('g') or r['spf_group']=='Goalie'
        kind='goalie' if is_goalie else 'skater'
        J=JOINTS.get((kind,p)) or JOINTS.get(('skater',p)) or JOINTS.get(('goalie',p))
        rec['has_joints']=bool(J)
        rec['joint_kind']=kind if J else None
        if J:
            jkind='skater' if 'L shoulder' in J or 'R shoulder' in J else 'goalie'
            rec['PC_parts']=part_lengths(J,jkind)
            for name in ('G94','S94'):
                dy,dx,iou=align_offset(M['PC'][0], M[name][0], pad=10)
                rec[f'{name}_joint_iou']=iou
                if iou>=0.55:
                    Jt={k:(v[0]+dx,v[1]+dy) for k,v in J.items()}
                    rec[f'{name}_parts']=part_lengths(Jt,jkind)
                else:
                    rec[f'{name}_parts']=None
        recs.append(rec)
        if (i+1)%40==0:
            print('  measured', i+1, '/', len(R), flush=True)

    def S(key, pred=None):
        xs=[]
        for rec in recs:
            if pred and not pred(rec): continue
            v=get(rec,key) if '.' in key else rec.get(key)
            if v is not None:
                xs.append(v)
        return summarize(xs)

    players=lambda r: r['category']!='goalie' and not r['grp'].startswith('g') and r['grp']!='Goalie'
    goalies=lambda r: not players(r)
    high=lambda r: r['g_score']>=0.78 and r['pc_score']>=0.78

    summary=dict(
        n_triples=len(recs),
        n_player=sum(1 for r in recs if players(r)),
        n_goalie=sum(1 for r in recs if goalies(r)),
        n_high=sum(1 for r in recs if high(r)),
        body_G_over_S_h=S('G_S_h'), body_G_over_S_w=S('G_S_w'),
        body_G_over_S_px=S('G_S_px'),
        body_P_over_G_h=S('P_G_h'), body_P_over_G_w=S('P_G_w'),
        body_P_over_G_px=S('P_G_px'),
        body_P_over_S_h=S('P_S_h'), body_P_over_S_w=S('P_S_w'),
        canvas_G_over_S_h=S('G_S_canvas_h'), canvas_G_over_S_w=S('G_S_canvas_w'),
        fit_uniform_scale_S_to_G=S('fit_u_s'), fit_uniform_iou=S('fit_u_iou'),
        fit_sy=S('fit_sy'), fit_sx=S('fit_sx'), fit_xy_iou=S('fit_xy_iou'),
        fit_uniform_S_to_PC=S('fit_u_pc_s'), fit_uniform_G_to_PC=S('fit_u_gp_s'),
        fit_G_to_PC_iou=S('fit_u_gp_iou'),
        high_G_over_S_h=S('G_S_h', high), high_G_over_S_w=S('G_S_w', high),
        high_fit_u_s=S('fit_u_s', high), high_fit_u_iou=S('fit_u_iou', high),
        player_G_over_S_h=S('G_S_h', players), player_G_over_S_w=S('G_S_w', players),
        player_fit_u_s=S('fit_u_s', players),
        goalie_G_over_S_h=S('G_S_h', goalies), goalie_G_over_S_w=S('G_S_w', goalies),
        goalie_fit_u_s=S('fit_u_s', goalies),
        S_body_h=S('S94_body_wh') and None,  # placeholder
    )
    # body sizes as lists
    def dim(key, axis, pred=None):
        xs=[]
        for rec in recs:
            if pred and not pred(rec): continue
            xs.append(rec[key][axis])
        return summarize(xs)
    summary['S_body_w']=dim('S94_body_wh',0)
    summary['S_body_h']=dim('S94_body_wh',1)
    summary['G_body_w']=dim('G94_body_wh',0)
    summary['G_body_h']=dim('G94_body_wh',1)
    summary['P_body_w']=dim('PC_body_wh',0)
    summary['P_body_h']=dim('PC_body_wh',1)
    summary['S_body_px']=S('S94_body_px')
    summary['G_body_px']=S('G94_body_px')
    summary['P_body_px']=S('PC_body_px')
    for plat in ('S94','G94','PC'):
        summary[f'{plat}_black_frac']=S(f'{plat}_outline.black_frac')
        summary[f'{plat}_edge_black']=S(f'{plat}_outline.edge_black')
        summary[f'{plat}_thickness']=S(f'{plat}_outline.thickness_med')
        summary[f'{plat}_dither']=S(f'{plat}_dither')
        summary[f'{plat}_nidx']=S(f'{plat}_nidx')
        summary[f'{plat}_ncol']=S(f'{plat}_ncol')
        summary[f'{plat}_stick_len']=S(f'{plat}_stick_len')
        # hotspot from body bottom-centre
        xs=[rec[f'{plat}_hot_from_bc'][0] for rec in recs if rec.get(f'{plat}_hot_from_bc')]
        ys=[rec[f'{plat}_hot_from_bc'][1] for rec in recs if rec.get(f'{plat}_hot_from_bc')]
        summary[f'{plat}_hot_dx_from_bc']=summarize(xs)
        summary[f'{plat}_hot_dy_from_bc']=summarize(ys)
    # proportions from transferred joints
    for part in ('head','torso','leg','arm','stick'):
        for plat in ('S94','G94','PC'):
            xs=[]
            for rec in recs:
                P=rec.get(f'{plat}_parts')
                if P and P.get(part):
                    xs.append(P[part])
            summary[f'{plat}_{part}_len']=summarize(xs)
        # ratios
        for a,b,tag in (('G94','S94','G_S'),('PC','G94','P_G'),('PC','S94','P_S')):
            xs=[]
            for rec in recs:
                A_=rec.get(f'{a}_parts'); B_=rec.get(f'{b}_parts')
                if A_ and B_ and A_.get(part) and B_.get(part) and B_[part]:
                    xs.append(A_[part]/B_[part])
            summary[f'{tag}_{part}_len']=summarize(xs)
    # stripe y
    for plat,keys in (('PC',['arm_band_y','sock_stripe_y','pants_stripe_y']),
                      ('G94',['upper_stripe_y','lower_stripe_y']),
                      ('S94',['upper_stripe_y','lower_stripe_y'])):
        for k in keys:
            summary[f'{plat}_{k}']=S(f'{plat}_stripes.{k}')
    # shades
    for plat in ('S94','G94','PC'):
        # collect keys present
        keys=set()
        for rec in recs:
            keys |= set((rec.get(f'{plat}_shades') or {}).keys())
        for k in sorted(keys):
            summary[f'{plat}_shade_{k}']=S(f'{plat}_shades.{k}')

    # screen fractions (gameplay resolutions)
    # Console rink: 256x224. PC: 320x200.
    def screen_frac(pred=None):
        out={}
        for rec in recs:
            if pred and not pred(rec): continue
            sw,sh=rec['S94_body_wh']; gw,gh=rec['G94_body_wh']; pw,ph=rec['PC_body_wh']
            out.setdefault('S_w',[]).append(sw/256); out.setdefault('S_h',[]).append(sh/224)
            out.setdefault('G_w',[]).append(gw/256); out.setdefault('G_h',[]).append(gh/224)
            out.setdefault('P_w',[]).append(pw/320); out.setdefault('P_h',[]).append(ph/200)
            # 4:3 physical width using C-port H32 PAR 5:4 on a 240-line-tall frame,
            # VGA 320x200 stretched to 4:3 (PAR 5/6). Units = fraction of screen width.
            # Console display width frac = (px_w * 5/4) / (256 * 5/4) = px_w/256 (same).
            # Height frac console in 240-line 4:3 dest: px_h/240
            # PC height frac: px_h/200 (200 lines fill the 4:3 height).
            out.setdefault('S_h240',[]).append(sh/240); out.setdefault('G_h240',[]).append(gh/240)
        return {k:summarize(v) for k,v in out.items()}
    summary['screen_frac_all']=screen_frac()
    summary['screen_frac_player']=screen_frac(players)

    with open(os.path.join(OUT,'measurements.json'),'w') as f:
        json.dump(dict(summary=summary, records=recs), f)
    # slim csv
    keys=['s94','g94','pc_shown','label','category','grp','g_score','pc_score',
          'G_S_h','G_S_w','P_G_h','P_G_w','G_S_px','P_G_px',
          'fit_u_s','fit_u_iou','fit_sy','fit_sx','fit_xy_iou',
          'fit_u_gp_s','fit_u_gp_iou']
    with open(os.path.join(OUT,'measurements.csv'),'w',newline='') as f:
        w=csv.writer(f)
        w.writerow(keys+['S_wh','G_wh','P_wh','S_px','G_px','P_px'])
        for rec in recs:
            w.writerow([rec.get(k) for k in keys]+
                       [rec['S94_body_wh'],rec['G94_body_wh'],rec['PC_body_wh'],
                        rec['S94_body_px'],rec['G94_body_px'],rec['PC_body_px']])
    # print key numbers
    def fmt(st):
        if not st: return 'n/a'
        return (f"n={st['n']}  mean {st['mean']:.3f}  median {st['median']:.3f}  "
                f"IQR {st['p25']:.3f}–{st['p75']:.3f}  range {st['min']:.3f}–{st['max']:.3f}  sd {st['std']:.3f}")
    print('=== BODY BOX G/S height', fmt(summary['body_G_over_S_h']))
    print('=== BODY BOX G/S width ', fmt(summary['body_G_over_S_w']))
    print('=== BODY PX  G/S       ', fmt(summary['body_G_over_S_px']))
    print('=== CANVAS  G/S height ', fmt(summary['canvas_G_over_S_h']))
    print('=== CANVAS  G/S width  ', fmt(summary['canvas_G_over_S_w']))
    print('=== FIT uniform S->G   ', fmt(summary['fit_uniform_scale_S_to_G']))
    print('=== FIT uniform IoU    ', fmt(summary['fit_uniform_iou']))
    print('=== FIT sy, sx         ', fmt(summary['fit_sy']), fmt(summary['fit_sx']))
    print('=== BODY P/G h,w       ', fmt(summary['body_P_over_G_h']), fmt(summary['body_P_over_G_w']))
    print('=== FIT G->PC          ', fmt(summary['fit_uniform_G_to_PC']), 'iou', fmt(summary['fit_G_to_PC_iou']))
    print('=== HIGH-SCORE fit s   ', fmt(summary['high_fit_u_s']), 'iou', fmt(summary['high_fit_u_iou']))
    print('=== PLAYER fit s       ', fmt(summary['player_fit_u_s']))
    print('=== GOALIE fit s       ', fmt(summary['goalie_fit_u_s']))
    print('done', len(recs), '->', os.path.join(OUT,'measurements.json'))

if __name__=='__main__':
    main()
