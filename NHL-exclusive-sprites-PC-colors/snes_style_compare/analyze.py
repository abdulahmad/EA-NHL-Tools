#!/usr/bin/env python3
"""Style difference: 94 SNES vs 94 Genesis vs 95 PC. Numbers only from decoded frames."""
import os, sys, json, csv, struct, collections, math
import numpy as np
from PIL import Image, ImageDraw, ImageFont

OUT = '/workspace/snes-style-compare'
V = '/workspace/preview_v2/platform_unique/v2/'
sys.path.insert(0, '/workspace/EA-NHL-Tools/docs/snes-redraw')
sys.path.insert(0, '/workspace/preview_v2/exclusive_samples/v2')
sys.path.insert(0, '/workspace/preview_v2/platform_unique/v2')
sys.path.insert(0, '/workspace/EA-NHL-Tools/sprite-textures/scripts')

from common import A, rows
from gpal import gpal as load_gpal_fn
import lib

FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def font(n):
    return ImageFont.truetype(FONT, n)

# ---- palettes (Boston home for display) ----
def snes_pal(path):
    P = np.zeros((256, 3), int)
    # rink palette at 0
    rink = '/workspace/NHL94SNES/Extracted/data/gfx/Pals/RinkPalette.pal'
    def rd(f, base, endian='little'):
        d = open(f, 'rb').read()
        for i in range(len(d) // 2):
            x = int.from_bytes(d[2*i:2*i+2], endian)
            P[base+i] = ((x & 31)*255//31, ((x >> 5) & 31)*255//31, ((x >> 10) & 31)*255//31)
    rd(rink, 0, 'little')
    rd(path, 32, 'little')
    return P

def gen_pal(path):
    # 16 colours, Genesis CRAM, placed at 32
    d = open(path, 'rb').read()
    P = np.zeros((256, 3), int)
    # fill rink-like defaults from existing GP-style if needed; stick/skin/ice live in team line
    w = [int.from_bytes(d[i:i+2], 'big') for i in range(0, min(len(d), 32), 2)]
    for i, x in enumerate(w):
        # Genesis 3-bit-per-channel, low bit unused: (x&14)*18 as in gpal.py
        P[32+i] = ((x & 14)*18, ((x >> 4) & 14)*18, ((x >> 8) & 14)*18)
    return P

SP_BOS = snes_pal('/workspace/NHL94SNES/Extracted/data/gfx/Pals/BOSh.pal')
GP_BOS = gen_pal('/workspace/NHL94Genesis/Extracted/NHL94/Graphics/Pals/BOSh.pal')
# keep stick/skin/ice readable: copy those slots from the Toronto/shared line if Boston overwrites badly
# Boston home is black/gold/white; slots still encode the same roles.
PP_BOS = lib.spritepal(lib.team('bos'))

# ---- family maps (SNES / Genesis index 32-47) ----
# 1 black, 2 white/grey, 3 team, 4 skin, 5 stick, 6 shadow/ice, 0 empty
def fam_rgb(c):
    r, g, b = map(int, c)
    mx, mn = max(c), min(c)
    if mx < 60:
        return 1
    if g > 130 and b > 130 and r < 170 and b - r > 40:
        return 6
    if b > r + 30 and b >= g:
        return 3
    if r > b + 60 and r > g + 20 and g > b + 20 and r < 240 and (r - g) < 90 and g > 90:
        return 4 if r > 150 and g < 170 and b > 60 else 5
    if r > b + 40:
        return 4 if b > 60 else 5
    return 2

FS = np.array([fam_rgb(c) for c in SP_BOS]); FS[0] = 0
# Genesis family from Boston pal + known slot roles (stick 46, shadow 47, black 34, skin 38/39)
FG = np.array([fam_rgb(c) for c in GP_BOS]); FG[0] = 0
# Force known Genesis slot roles (palette RGB can hide them on Boston)
# Standard 94G line: 34 black, 38/39 skin, 46 stick, 47 shadow — confirmed in prior mapping docs
for arr, pal in ((FS, SP_BOS), (FG, GP_BOS)):
    pass
FG[34] = 1
FG[46] = 5
FG[47] = 6
if 38 < len(FG):
    FG[38] = 4
if 39 < len(FG):
    FG[39] = 4
# SNES: same slot conventions in prior analysis
FS[34] = 1
FS[46] = 5
FS[47] = 6
FS[39] = 4

# PC families
# stick 136 (and nearby browns 12,13,31), shadow/ice 88 (also 82), black outlines 0/15/133-136 wait 136 is stick
# 136 is stick (MAPPING.md). Blacks: 15, 11, 16, 133, 134, 135, 140, and 0 is transparent
PC_STICK = {12, 13, 31, 45, 136}
PC_SHADOW = {8, 28, 82, 88, 89}
PC_BLACK = {11, 15, 16, 111, 133, 134, 135, 140}
# 135 was called skin tan in one fallback; act is black; after map may differ. Check later if needed.
# Body zones 144-191
PC_ZONE = {i for i in range(144, 192)}

def pc_fam(idx):
    i = int(idx)
    if i == 0:
        return 0
    if i in PC_SHADOW:
        return 6
    if i in PC_STICK:
        return 5
    if i in PC_BLACK:
        return 1
    if i in PC_ZONE:
        name = lib.ZN.get(str(i), '')
        if 'helmet' in name:
            return 2
        if 'mask' in name:
            return 2
        return 3  # team / garment
    # skin often 5,6 (mapped) or 135
    return 2

# ---- hotspots ----
# SNES: raw point lists, origin at (0,0) in piece coords; cropped min is (y0,x0)
S_RAW = __import__('pickle').load(open('/workspace/preview_v2/platform_unique/snes94.pkl', 'rb'))

def snes_hotspot(frame_1based):
    pts = S_RAW[frame_1based - 1]
    if not pts:
        return None
    a = np.array(pts)
    y0, x0 = int(a[:, 0].min()), int(a[:, 1].min())
    # hotspot (origin) in cropped image
    return (-x0, -y0)

# Genesis piece origins
DIM = [(1,1),(1,2),(1,3),(1,4),(2,1),(2,2),(2,3),(2,4),(3,1),(3,2),(3,3),(3,4),(4,1),(4,2),(4,3),(4,4)]

def load_gen_hotspots(rom_path, T=0x5DE84, ft=0x9E726):
    b = open(rom_path, 'rb').read()
    rel = ft - 2
    n = struct.unpack('>H', b[ft:ft+2])[0] // 2 - 1
    out = {}
    for i in range(n):
        o = struct.unpack('>H', b[ft+2*i:ft+2*i+2])[0] + rel
        o2 = struct.unpack('>H', b[ft+2*i+2:ft+2*i+4])[0] + rel
        if o2 <= o:
            continue
        xs, ys = [], []
        for k in range((o2 - o) // 8):
            x, y, t, p, s = struct.unpack('>hhHBB', b[o+8*k:o+8*k+8])
            w, h = DIM[s & 15]
            xs.append(x); ys.append(y)
            xs.append(x + w*8); ys.append(y + h*8)
        if not xs:
            continue
        x0, y0 = min(xs), min(ys)
        out[i+1] = (-x0, -y0)
    return out

G_HOT = load_gen_hotspots('/workspace/NHL94Genesis/nhl94retail.bin')

def pc_hotspot(pickle_key):
    f, w, h, o, hx, hy = lib.H[pickle_key - 1]
    return (int(hx), int(hy))

# ---- editor joints (PC pickle keys) ----
BUN = '/workspace/EA-NHL-Tools/sprite-textures/editor/data/bundle.js'
_s = open(BUN).read()
_B = json.loads(_s[_s.index('{'): _s.rstrip().rstrip(';').rindex('}')+1])
JOINTS = {}
for f in _B['frames']:
    if not f.get('joints'):
        continue
    kind, num = f['id'].split()[0], int(f['id'].split()[-1])
    if kind in ('skater', 'goalie'):
        JOINTS[(kind, num)] = f['joints']

def body_mask(arr, platform):
    """Opaque pixels that are not stick and not shadow/ice."""
    if platform == 'PC':
        fam = np.vectorize(pc_fam)(arr)
    elif platform == 'S94':
        fam = FS[np.clip(arr, 0, len(FS)-1)]
        # indices above 47 are rare; treat nonzero non-stick-shadow as body
        fam = np.where((arr > 0) & (fam == 0), 2, fam)
    else:
        fam = FG[np.clip(arr, 0, len(FG)-1)]
        fam = np.where((arr > 0) & (fam == 0), 2, fam)
    stick = (fam == 5)
    shadow = (fam == 6)
    body = (arr > 0) & ~stick & ~shadow
    return body, stick, shadow, fam

def tight_bbox(mask):
    ys, xs = np.nonzero(mask)
    if len(ys) == 0:
        return None
    return int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())  # inclusive

def bbox_wh(bb):
    if bb is None:
        return 0, 0
    x0,y0,x1,y1 = bb
    return x1-x0+1, y1-y0+1

def unique_colors(arr, pal, mask):
    if mask.sum() == 0:
        return 0, 0
    idx = np.unique(arr[mask])
    cols = {tuple(int(v) for v in pal[int(i)]) for i in idx}
    return int(len(idx)), int(len(cols))

def outline_stats(arr, fam, body):
    """Black fraction of body, and of body silhouette edge; typical thickness."""
    if body.sum() == 0:
        return dict(black_frac=None, edge_black=None, thickness=None)
    # erode body
    from scipy.ndimage import binary_erosion, binary_dilation
    edge = body & ~binary_erosion(body)
    black = (fam == 1) & body
    # thickness: for each edge black pixel, count consecutive black inward
    # approximate: distance from edge black to nearest non-black body, median
    thick = None
    if black.sum() and edge.sum():
        # simple: fraction of black pixels that have a black 4-neighbour toward interior
        # thickness in px: mean of distance transform of black restricted to components touching edge
        from scipy.ndimage import distance_transform_edt
        # for silhouette-edge pixels that are black, how deep does black go
        depths = []
        H, W = body.shape
        ys, xs = np.nonzero(edge & black)
        for y, x in zip(ys, xs):
            # walk toward centroid
            dmax = 0
            cy, cx = np.argwhere(body).mean(0)
            vy, vx = cy-y, cx-x
            n = math.hypot(vy, vx) or 1
            for t in range(1, 6):
                yy = int(round(y + vy/n*t)); xx = int(round(x + vx/n*t))
                if not (0 <= yy < H and 0 <= xx < W):
                    break
                if black[yy, xx]:
                    dmax = t
                else:
                    break
            depths.append(dmax if dmax else 1)
        if depths:
            thick = float(np.median(depths))
    return dict(
        black_frac=float(black.sum()/body.sum()),
        edge_black=float(((fam==1)&edge).sum()/max(1, edge.sum())),
        thickness=thick,
        n_edge=int(edge.sum()),
        n_black=int(black.sum()),
    )

def dither_frac(arr, mask):
    """Fraction of 2x2 windows inside mask that are a 2-colour checkerboard."""
    H, W = arr.shape
    if H < 2 or W < 2 or mask.sum() < 8:
        return 0.0
    n = 0; d = 0
    for y in range(H-1):
        for x in range(W-1):
            if not (mask[y,x] and mask[y,x+1] and mask[y+1,x] and mask[y+1,x+1]):
                continue
            n += 1
            a,b,c,e = arr[y,x], arr[y,x+1], arr[y+1,x], arr[y+1,x+1]
            vals = {int(a),int(b),int(c),int(e)}
            if len(vals)==2 and a==e and b==c and a!=b:
                d += 1
    return d/n if n else 0.0

def shades_per_zone(arr, pal, fam, body, platform):
    """Unique RGB counts in major families on the body."""
    out = {}
    if platform == 'PC':
        groups = {
            'jersey': list(range(165, 177)),
            'pants': list(range(177, 181)),
            'socks': list(range(181, 190)),
            'arms': list(range(144, 159)),
            'helmet': [190, 191],
            'yoke': list(range(159, 164)),
        }
        for name, idxs in groups.items():
            m = body & np.isin(arr, idxs)
            _, ncol = unique_colors(arr, pal, m)
            out[name] = ncol if m.sum() else 0
        # skin: mapped pinks (5,6) plus 135 if present as tan
        skin_idx = [5, 6, 135]
        m = body & np.isin(arr, skin_idx)
        _, ncol = unique_colors(arr, pal, m)
        out['skin'] = ncol if m.sum() else 0
    else:
        names = {2: 'white_grey', 3: 'team', 4: 'skin'}
        for k, name in names.items():
            m = body & (fam == k)
            _, ncol = unique_colors(arr, pal, m)
            out[name] = ncol if m.sum() else 0
    return out

def stick_length(stick_mask):
    ys, xs = np.nonzero(stick_mask)
    if len(ys) < 2:
        return 0.0
    # max pairwise distance (OK for thin sticks, n usually < 80)
    pts = np.stack([xs, ys], 1).astype(float)
    if len(pts) > 200:
        # fallback: bbox diagonal of stick
        return float(math.hypot(xs.max()-xs.min(), ys.max()-ys.min()) + 1)
    d = 0.0
    for i in range(len(pts)):
        dif = pts[i+1:] - pts[i]
        if len(dif):
            d = max(d, float(np.sqrt((dif**2).sum(1).max())))
    return d + 1.0  # inclusive pixel length

def align_offset(a, b, pad=8):
    """Best (dy,dx) placing mask a onto mask b by IoU. dy,dx is where a[0,0] lands on b's canvas (may be negative)."""
    ma, mb = a.astype(bool), b.astype(bool)
    if ma.sum()==0 or mb.sum()==0:
        return 0, 0, 0.0
    # search window: centroid align ±pad, plus bbox
    ays, axs = np.nonzero(ma); bys, bxs = np.nonzero(mb)
    cy_a, cx_a = ays.mean(), axs.mean()
    cy_b, cx_b = bys.mean(), bxs.mean()
    dy0 = int(round(cy_b - cy_a)); dx0 = int(round(cx_b - cx_a))
    best = (-1.0, dy0, dx0)
    Ha, Wa = ma.shape; Hb, Wb = mb.shape
    for dy in range(dy0-pad, dy0+pad+1):
        for dx in range(dx0-pad, dx0+pad+1):
            y0, x0 = max(0, dy), max(0, dx)
            y1, x1 = min(Hb, dy+Ha), min(Wb, dx+Wa)
            if y1<=y0 or x1<=x0:
                continue
            ay0, ax0 = y0-dy, x0-dx
            inter = (ma[ay0:ay0+(y1-y0), ax0:ax0+(x1-x0)] & mb[y0:y1, x0:x1]).sum()
            uni = ma.sum() + mb.sum() - inter
            iou = inter/uni if uni else 0
            if iou > best[0]:
                best = (iou, dy, dx)
    return best[1], best[2], best[0]

def scale_mask(m, sy, sx):
    H = max(1, int(round(m.shape[0]*sy)))
    W = max(1, int(round(m.shape[1]*sx)))
    yy = np.clip((np.arange(H)/sy).astype(int), 0, m.shape[0]-1)
    xx = np.clip((np.arange(W)/sx).astype(int), 0, m.shape[1]-1)
    return m[yy][:, xx]

def best_scale(ms, mg, scales):
    """Search uniform and independent sx,sy (from the same list) maximizing IoU of SNES body onto G body."""
    best_u = (-1, 1.0, 0, 0)
    best_xy = (-1, 1.0, 1.0, 0, 0)
    for s in scales:
        S = scale_mask(ms, s, s)
        dy, dx, iou = align_offset(S, mg, pad=6)
        if iou > best_u[0]:
            best_u = (iou, s, dy, dx)
    # anisotropic: fix a neighbourhood around best uniform
    s0 = best_u[1]
    cands = [s for s in scales if abs(s-s0) <= 0.12]
    if not cands:
        cands = scales
    for sy in cands:
        for sx in cands:
            S = scale_mask(ms, sy, sx)
            dy, dx, iou = align_offset(S, mg, pad=5)
            if iou > best_xy[0]:
                best_xy = (iou, sy, sx, dy, dx)
    return best_u, best_xy

def bone_len(J, a, b):
    if a not in J or b not in J:
        return None
    x0,y0 = J[a]; x1,y1 = J[b]
    return float(math.hypot(x1-x0, y1-y0))

def chain_len(J, names):
    t = 0.0
    for a,b in zip(names, names[1:]):
        L = bone_len(J, a, b)
        if L is None:
            return None
        t += L
    return t

def part_lengths(J, kind):
    """Head, torso, leg, arm, stick in px from joints."""
    if not J:
        return {}
    if kind == 'skater':
        # head: head to neck * 2 as a proxy? better head-neck plus a bit; also use head-neck only and report it
        head = bone_len(J, 'head', 'neck')
        torso = chain_len(J, ['neck','chest','belly','pelvis'])
        # legs: average of L and R hip-skate
        legs = []
        for side in ('L', 'R'):
            L = chain_len(J, [f'{side} hip', f'{side} knee', f'{side} ankle', f'{side} skate'])
            if L: legs.append(L)
        leg = float(np.mean(legs)) if legs else None
        arms = []
        for side in ('L', 'R'):
            L = chain_len(J, [f'{side} shoulder', f'{side} elbow', f'{side} wrist', f'{side} glove'])
            if L: arms.append(L)
        arm = float(np.mean(arms)) if arms else None
        stick = chain_len(J, ['stick butt', 'stick heel', 'stick toe'])
    else:
        head = bone_len(J, 'head', 'neck')
        torso = chain_len(J, ['neck','chest','belly','pelvis'])
        legs = []
        for side, hip, knee, ank, skate in (
            ('L','Lhip','Lknee','L ankle','Lank'),
            ('R','Rhip','Rknee','R ankle','Rank'),
        ):
            L = chain_len(J, [hip, knee, ank, skate])
            if L: legs.append(L)
        leg = float(np.mean(legs)) if legs else None
        arms = []
        for seq in (
            ['Lsh','Lelb','L wrist','Lhand'],
            ['Rsh','Relb','R wrist','Rhand'],
        ):
            L = chain_len(J, seq)
            if L: arms.append(L)
        arm = float(np.mean(arms)) if arms else None
        stick = chain_len(J, ['stick butt', 'stick heel', 'stick toe'])
    return dict(head=head, torso=torso, leg=leg, arm=arm, stick=stick)

def transfer_joints(J, dy, dx):
    return {k: (v[0]+dx, v[1]+dy) for k,v in J.items()}

def stripe_fractions(arr, body, platform):
    """Median relative y (0=top of body bbox) of arm-band and sock-stripe pixels."""
    bb = tight_bbox(body)
    if not bb or body.sum()==0:
        return {}
    x0,y0,x1,y1 = bb
    H = max(1, y1-y0+1)
    out = {}
    if platform == 'PC':
        arm = body & np.isin(arr, list(range(147, 156)))
        sock = body & np.isin(arr, list(range(184, 190)))
        pants_st = body & np.isin(arr, [178, 179])
        for name, m in (('arm_band', arm), ('sock_stripe', sock), ('pants_stripe', pants_st)):
            ys = np.nonzero(m)[0]
            if len(ys):
                out[name+'_y'] = float(((ys - y0) / H).mean())
                out[name+'_n'] = int(len(ys))
    else:
        # Genesis navy / SNES stripe slots
        if platform == 'G94':
            # 41/42 often stripes + some shadows; restrict to body
            m = body & np.isin(arr, [40, 41, 42, 36, 35])
        else:
            # SNES 38,45 (and 40/41 team) as possible stripe slots
            m = body & np.isin(arr, [38, 45, 40, 41])
        ys, xs = np.nonzero(m)
        if len(ys):
            rel = (ys - y0) / H
            # split upper (arm / yoke / waist) vs lower (sock)
            up = rel[rel < 0.55]; lo = rel[rel >= 0.55]
            if len(up):
                out['upper_stripe_y'] = float(up.mean()); out['upper_stripe_n'] = int(len(up))
            if len(lo):
                out['lower_stripe_y'] = float(lo.mean()); out['lower_stripe_n'] = int(len(lo))
    return out

# ---- collect pairs ----
SCALES = [round(0.80 + i*0.02, 2) for i in range(0, 26)]  # 0.80..1.30 step 0.02
# finer around 1.0 later if needed

def is_player_row(r):
    return r['category'] in ('player', 'goalie', 'celebration')

def reliable_rows():
    out = []
    for r in rows:
        if r['set'] != 'S94':
            continue
        if r['G94_class'] != 'match' or r['PC_class'] != 'match':
            continue
        if r['G94_mirror'] != 'False' or r['PC_mirror'] != 'False':
            continue
        try:
            gs, ps = float(r['G94_scale']), float(r['PC_scale'])
        except ValueError:
            continue
        if not (0.9 <= gs <= 1.15 and 0.9 <= ps <= 1.15):
            continue
        if r['category'] not in ('player', 'goalie', 'celebration'):
            continue
        s, g, p = int(r['frame']), int(r['G94_best']), int(r['PC_best'])
        if s not in A['S94'] or g not in A['G94'] or p not in A['PC']:
            continue
        # require some body pixels
        if (A['S94'][s] > 0).sum() < 40 or (A['G94'][g] > 0).sum() < 40:
            continue
        out.append(r)
    return out

def summarize(vals):
    v = np.array([x for x in vals if x is not None and not (isinstance(x, float) and math.isnan(x))], float)
    if len(v)==0:
        return None
    return dict(
        n=int(len(v)),
        mean=float(v.mean()),
        median=float(np.median(v)),
        std=float(v.std(ddof=1)) if len(v)>1 else 0.0,
        p25=float(np.percentile(v, 25)),
        p75=float(np.percentile(v, 75)),
        min=float(v.min()),
        max=float(v.max()),
    )

def main():
    R = reliable_rows()
    print('reliable triples', len(R))
    recs = []
    # measure all
    for i, r in enumerate(R):
        s, g, p = int(r['frame']), int(r['G94_best']), int(r['PC_best'])
        Sa, Ga, Pa = A['S94'][s], A['G94'][g], A['PC'][p]
        platforms = [('S94', Sa, SP_BOS), ('G94', Ga, GP_BOS), ('PC', Pa, PP_BOS)]
        rec = dict(
            s94=s, g94=g, pc_pickle=p, pc_shown=p-1,
            label=r['label'], category=r['category'], grp=r['spf_group'],
            g_score=float(r['G94_score']), pc_score=float(r['PC_score']),
            g_scale_census=float(r['G94_scale']), pc_scale_census=float(r['PC_scale']),
        )
        masks = {}
        for name, arr, pal in platforms:
            body, stick, shadow, fam = body_mask(arr, name)
            masks[name] = (body, stick, shadow, fam, arr, pal)
            bb = tight_bbox(body)
            w, h = bbox_wh(bb)
            rec[f'{name}_canvas'] = [int(arr.shape[1]), int(arr.shape[0])]
            rec[f'{name}_body_wh'] = [w, h]
            rec[f'{name}_body_px'] = int(body.sum())
            rec[f'{name}_stick_px'] = int(stick.sum())
            rec[f'{name}_shadow_px'] = int(shadow.sum())
            rec[f'{name}_stick_len'] = stick_length(stick)
            nidx, ncol = unique_colors(arr, pal, arr>0)
            rec[f'{name}_nidx'] = nidx
            rec[f'{name}_ncol'] = ncol
            rec[f'{name}_outline'] = outline_stats(arr, fam, body)
            rec[f'{name}_dither'] = dither_frac(arr, body)
            rec[f'{name}_shades'] = shades_per_zone(arr, pal, fam, body, name)
            rec[f'{name}_stripes'] = stripe_fractions(arr, body, name)
            # hotspot relative to body bbox
            if name == 'S94':
                hot = snes_hotspot(s)
            elif name == 'G94':
                hot = G_HOT.get(g)
            else:
                hot = pc_hotspot(p)
            rec[f'{name}_hot'] = list(hot) if hot else None
            if hot and bb:
                rec[f'{name}_hot_rel'] = [hot[0]-bb[0], hot[1]-bb[1], w, h]
        # ratios G/S and P/S and P/G on body box
        sw, sh = rec['S94_body_wh']; gw, gh = rec['G94_body_wh']; pw, ph = rec['PC_body_wh']
        rec['G_S_h'] = gh/sh if sh else None
        rec['G_S_w'] = gw/sw if sw else None
        rec['P_S_h'] = ph/sh if sh else None
        rec['P_S_w'] = pw/sw if sw else None
        rec['P_G_h'] = ph/gh if gh else None
        rec['P_G_w'] = pw/gw if gw else None
        rec['G_S_px'] = rec['G94_body_px']/rec['S94_body_px'] if rec['S94_body_px'] else None
        rec['P_G_px'] = rec['PC_body_px']/rec['G94_body_px'] if rec['G94_body_px'] else None
        # canvas ratios (for comparison with earlier work)
        rec['G_S_canvas_h'] = rec['G94_canvas'][1]/rec['S94_canvas'][1]
        rec['G_S_canvas_w'] = rec['G94_canvas'][0]/rec['S94_canvas'][0]
        # best scale SNES -> G94 on body masks (uniform + anisotropic)
        ms, mg = masks['S94'][0], masks['G94'][0]
        # skip very expensive if tiny
        bu, bxy = best_scale(ms, mg, SCALES)
        rec['fit_u_iou'] = bu[0]; rec['fit_u_s'] = bu[1]
        rec['fit_xy_iou'] = bxy[0]; rec['fit_sy'] = bxy[1]; rec['fit_sx'] = bxy[2]
        # joints
        kind = 'goalie' if r['category']=='goalie' or r['spf_group'] in ('Goalie','gdive','gready') or r['spf_group'].startswith('g') else 'skater'
        J = JOINTS.get((kind, p)) or JOINTS.get(('skater', p)) or JOINTS.get(('goalie', p))
        rec['joint_kind'] = kind if J else None
        if J:
            rec['PC_parts'] = part_lengths(J, kind if ('head' in J) else ('goalie' if 'Lsh' in J else 'skater'))
            # transfer to G94 and S94
            for name, arr in (('G94', Ga), ('S94', Sa)):
                # align PC body to dest body
                dy, dx, iou = align_offset(masks['PC'][0], masks[name][0], pad=10)
                rec[f'{name}_joint_iou'] = iou
                if iou >= 0.55:
                    Jt = transfer_joints(J, dy, dx)
                    rec[f'{name}_parts'] = part_lengths(Jt, kind if ('L shoulder' in J or 'R shoulder' in J) else ('goalie' if 'Lsh' in J else 'skater'))
                else:
                    rec[f'{name}_parts'] = None
        if (i+1) % 50 == 0:
            print('  measured', i+1, '/', len(R))
    # summaries
    def col(key, pred=None):
        xs = []
        for rec in recs:
            if pred and not pred(rec):
                continue
            v = rec
            for k in key.split('.'):
                v = v[k] if isinstance(v, dict) and k in v else (v.get(k) if isinstance(v, dict) else None) if not isinstance(v, dict) else v.get(k)
                # simpler:
            # use dotted only one level mostly
            v = rec
            for k in key.split('.'):
                if v is None:
                    break
                if isinstance(v, dict):
                    v = v.get(k)
                else:
                    v = None
                    break
            if v is not None:
                xs.append(v)
        return xs

    # fix col()
    def col(key, pred=None):
        xs = []
        for rec in recs:
            if pred and not pred(rec):
                continue
            v = rec
            ok = True
            for k in key.split('.'):
                if not isinstance(v, dict) or k not in v:
                    ok = False
                    break
                v = v[k]
            if ok and v is not None:
                xs.append(v)
        return xs

    # wait, recs is filled in loop - I used recs.append? I forgot! Fix below after I notice.
    # I'll append inside the loop by rewriting... actually I'll patch: the loop used recs = [] and never appended.
    # I'll fix this by changing approach: collect in the file properly.

    print('BUGCHECK recs', len(recs))
    return recs

if __name__ == '__main__':
    # The function above forgot recs.append — rewrite run path here more carefully
    pass
