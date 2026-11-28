#!/usr/bin/env python3
"""Colour-blind-safe comparison sheets. Max width 1000 px. Square pixels (nearest)."""
import os, sys, json, math
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.ndimage import label

sys.path.insert(0, '/workspace/snes-style-compare')
sys.path.insert(0, '/workspace/EA-NHL-Tools/docs/snes-redraw')
import measure as M
from measure import A, SP, GP, PP, masks, tight

OUT = '/workspace/snes-style-compare'
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def font(n):
    return ImageFont.truetype(FONT, n)

# Colour-blind safe: no red-next-to-green. High luminance contrast.
BG = (22, 22, 22)
CELL = (36, 36, 36)
ICE = (28, 32, 38)
TXT = (255, 255, 255)
MUTED = (200, 200, 200)
YELLOW = (255, 208, 0)      # A labels / body box
CYAN = (80, 196, 255)       # SNES overlay
GOLD = (255, 179, 71)       # Genesis / stick
LILAC = (196, 180, 255)     # PC
WHITE = (255, 255, 255)
HOT = (255, 255, 255)

PALS = {'S94': SP, 'G94': GP, 'PC': PP}

# Selected matched poses (S, G, PC shown 0-based, short label, group)
# PC shown = pickle key - 1
PICKS = [
    (22, 22, 21, 'Skate w/ puck', 'skating'),
    (66, 66, 65, 'Skate / burst', 'skating'),
    (155, 155, 154, 'Stop', 'skating'),
    (124, 124, 123, 'Shot', 'shooting'),
    (237, 229, 228, 'Hip check', 'checking'),
    (254, 246, 245, 'Shoulder check', 'checking'),
    (494, 606, 597, 'Hook', 'checking'),
    (614, 487, 486, 'Goalie skate', 'goalie'),
    (663, 520, 519, 'Goalie dive', 'goalie'),
]

def get_arr(plat, n):
    return A[plat][n]

def prepared(plat, n):
    arr = get_arr(plat, n)
    body, stick, shadow, arr = masks(arr, plat)
    return arr, body, stick, shadow

def to_rgb(arr, pal, bg=ICE):
    rgb = pal[np.clip(arr, 0, len(pal)-1)].astype(np.uint8)
    rgb[arr == 0] = bg
    return rgb

def blit_sprite(rgb, scale, canvas_wh, body=None, stick=None, bbox_color=YELLOW, show_box=True):
    """Centre sprite on a canvas, nearest-neighbour scale, optional boxes."""
    h, w = rgb.shape[:2]
    im = Image.fromarray(rgb, 'RGB').resize((w*scale, h*scale), Image.NEAREST)
    cw, ch = canvas_wh
    cell = Image.new('RGB', (cw, ch), CELL)
    x = (cw - im.width)//2
    y = (ch - im.height)//2
    cell.paste(im, (x, y))
    d = ImageDraw.Draw(cell)
    if show_box and body is not None and body.any():
        bb = tight(body)
        if bb:
            x0,y0,x1,y1 = bb
            # rectangle in cell coords, 2 px
            a = (x + x0*scale, y + y0*scale)
            b = (x + (x1+1)*scale - 1, y + (y1+1)*scale - 1)
            d.rectangle([a, b], outline=bbox_color, width=2)
    if stick is not None and stick.any():
        ys, xs = np.nonzero(stick)
        # draw stick bbox in gold
        sx0,sy0,sx1,sy1 = int(xs.min()),int(ys.min()),int(xs.max()),int(ys.max())
        a = (x + sx0*scale, y + sy0*scale)
        b = (x + (sx1+1)*scale - 1, y + (sy1+1)*scale - 1)
        d.rectangle([a, b], outline=GOLD, width=1)
    return cell, (x, y)

def text_size(d, s, f):
    b = d.textbbox((0,0), s, font=f)
    return b[2]-b[0], b[3]-b[1]

def draw_centered(d, xy, s, f, fill=TXT):
    w,h = text_size(d,s,f)
    d.text((xy[0]-w//2, xy[1]), s, font=f, fill=fill)

# ---------- Image 1: contact sheet ----------
def sheet1():
    scale = 6
    # max sprite after scale: look at canvases
    maxw = maxh = 0
    data = []
    for s,g,ps,label,grp in PICKS:
        p = ps+1
        row = []
        for plat,n in (('S94',s),('G94',g),('PC',p)):
            arr,body,stick,shadow = prepared(plat,n)
            row.append((plat,n,arr,body,stick,shadow))
            maxw = max(maxw, arr.shape[1])
            maxh = max(maxh, arr.shape[0])
        data.append((label,grp,row,(s,g,ps)))
    pad = 8
    # left label col + 3 sprite cols
    lab_w = 118
    col_w = maxw*scale + pad*2
    col_h = maxh*scale + pad*2
    cap_h = 36
    head_h = 86
    foot_h = 70
    n = len(PICKS)
    W = lab_w + 3*col_w + 20
    # shrink if needed
    if W > 1000:
        scale = 5
        col_w = maxw*scale + pad*2
        col_h = maxh*scale + pad*2
        W = lab_w + 3*col_w + 20
    H = head_h + n*(col_h+cap_h) + foot_h
    W = min(W, 1000)
    img = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(img)
    d.text((16, 8), 'Matched poses, Boston home. Yellow box = body (no stick, no shadow). Gold box = stick.', font=font(14), fill=MUTED)

    letters = [('A', '94 SNES', YELLOW), ('B', '94 Genesis', GOLD), ('C', '95 PC', LILAC)]
    for i,(let,lab,col) in enumerate(letters):
        cx = lab_w + i*col_w + col_w//2
        draw_centered(d, (cx, 28), let, font(32), col)
        draw_centered(d, (cx, 62), lab, font(16), col)

    y = head_h
    for label,grp,row,ids in data:
        # row label
        d.rectangle([0,y,lab_w-4,y+col_h+cap_h-2], fill=(30,30,30))
        # wrap label
        fl = font(14)
        d.text((8, y+col_h//2-18), label, font=fl, fill=TXT)
        d.text((8, y+col_h//2+2), grp, font=font(12), fill=MUTED)
        s,g,ps = ids
        d.text((8, y+col_h//2+18), f'S{s}  G{g}  P{ps}', font=font(11), fill=(160,160,160))
        for i,(plat,n,arr,body,stick,shadow) in enumerate(row):
            rgb = to_rgb(arr, PALS[plat])
            cell,_ = blit_sprite(rgb, scale, (col_w-2, col_h), body, stick, YELLOW, True)
            x = lab_w + i*col_w
            img.paste(cell, (x, y))
            bb = tight(body)
            if bb:
                bw,bh = bb[2]-bb[0]+1, bb[3]-bb[1]+1
            else:
                bw=bh=0
            cap = f'{bw}×{bh} px   {int(body.sum())} body px'
            draw_centered(d, (x+col_w//2, y+col_h+4), cap, font(12), MUTED)
        y += col_h + cap_h
    # footer legend
    d.rectangle([10, H-foot_h+8, 28, H-foot_h+26], outline=YELLOW, width=2)
    d.text((34, H-foot_h+8), 'Body box  (stick + shadow/ice excluded)', font=font(13), fill=TXT)
    d.rectangle([10, H-foot_h+34, 28, H-foot_h+50], outline=GOLD, width=2)
    d.text((34, H-foot_h+34), 'Stick box     Sprites at 1:1 pixels, nearest ×{}  |  width {} px'.format(scale, W), font=font(13), fill=TXT)
    path = os.path.join(OUT, 'sheet1_poses.png')
    img.save(path)
    print('wrote', path, img.size)
    return path

# ---------- Image 2: is it 10%? canvas vs body, overlays ----------
def overlay_pair(Sa_body, Ga_body, sy, sx, colors, scale, cell):
    """Draw SNES body scaled (sy,sx) in color0 and G body in color1 on a shared canvas."""
    def sc(m, sy, sx):
        H=max(1,int(round(m.shape[0]*sy))); W=max(1,int(round(m.shape[1]*sx)))
        yy=np.clip((np.arange(H)/max(sy,1e-6)).astype(int),0,m.shape[0]-1)
        xx=np.clip((np.arange(W)/max(sx,1e-6)).astype(int),0,m.shape[1]-1)
        return m[yy][:,xx]
    S = sc(Sa_body, sy, sx) if (sy,sx)!=(1,1) else Sa_body
    G = Ga_body
    dy,dx,iou = M.align_offset(S, G, pad=8)
    Hs,Ws=S.shape; Hg,Wg=G.shape
    y0=min(0,dy); x0=min(0,dx)
    Ht=max(dy+Hs, Hg)-y0; Wt=max(dx+Ws, Wg)-x0
    canvas = np.zeros((Ht,Wt,3), np.uint8)
    canvas[:] = ICE
    # G first
    gy,gx = -y0, -x0
    # S
    sy_,sx_ = dy-y0, dx-x0
    def paint(mask, oy, ox, rgb, alpha_on_top=False):
        ys,xs=np.nonzero(mask)
        for y,x in zip(ys,xs):
            yy,xx=oy+y, ox+x
            if 0<=yy<Ht and 0<=xx<Wt:
                if alpha_on_top and canvas[yy,xx].any() and tuple(canvas[yy,xx])!=ICE:
                    # mix
                    canvas[yy,xx] = ((canvas[yy,xx].astype(int)+np.array(rgb))//2).astype(np.uint8)
                else:
                    canvas[yy,xx]=rgb
        return
    # colour code: only S = cyan, only G = gold, both = white
    both = np.zeros((Ht,Wt), bool)
    sm=np.zeros((Ht,Wt), bool); gm=np.zeros((Ht,Wt), bool)
    sm[sy_:sy_+Hs, sx_:sx_+Ws] = S
    gm[gy:gy+Hg, gx:gx+Wg] = G
    rgb = np.zeros((Ht,Wt,3), np.uint8); rgb[:]=ICE
    rgb[sm & ~gm] = CYAN
    rgb[~sm & gm] = GOLD
    rgb[sm & gm] = (230,230,230)
    im = Image.fromarray(rgb).resize((Wt*scale, Ht*scale), Image.NEAREST)
    cell_im = Image.new('RGB', cell, CELL)
    x=(cell[0]-im.width)//2; y=(cell[1]-im.height)//2
    cell_im.paste(im, (x,y))
    return cell_im, iou

def sheet2():
    # Four poses, three overlay columns: 1:1, SNES ×1.10 (the 10% question), SNES ×0.98 (best fit)
    poses = [PICKS[i] for i in (0,1,3,4,7)]  # skate puck, burst, shot, hip, goalie skate
    scale = 5
    # measure max
    maxw=maxh=0
    prepared_rows=[]
    for s,g,ps,label,grp in poses:
        Sa,Sb,Sst,_=prepared('S94',s)
        Ga,Gb,Gst,_=prepared('G94',g)
        prepared_rows.append((label,s,g,ps,Sa,Sb,Ga,Gb))
        maxw=max(maxw, Sa.shape[1], Ga.shape[1], int(round(Sa.shape[1]*1.12)))
        maxh=max(maxh, Sa.shape[0], Ga.shape[0], int(round(Sa.shape[0]*1.12)))
    lab_w=100
    col_w = maxw*scale + 16
    col_h = maxh*scale + 16
    cap_h=40
    head_h=110
    foot_h=86
    cols_titles = [
        ('A  Body 1:1', 'SNES cyan  +  Genesis gold'),
        ('B  SNES ×1.10', 'the “scaled down 10%” test'),
        ('C  SNES ×0.98', 'best uniform fit (median)'),
    ]
    W = lab_w + 3*col_w + 16
    if W>1000:
        scale=4
        col_w = maxw*scale + 16
        col_h = maxh*scale + 16
        W = min(lab_w + 3*col_w + 16, 1000)
    H = head_h + len(poses)*(col_h+cap_h) + foot_h
    img=Image.new('RGB',(W,H),BG)
    d=ImageDraw.Draw(img)
    d.text((14,8), 'Is 94 SNES a 10% shrink of 94 Genesis?', font=font(24), fill=YELLOW)
    d.text((14,40), 'Overlays of the body mask only (stick and shadow removed). White = overlap.', font=font(13), fill=MUTED)
    d.text((14,58), 'If SNES were 10% smaller, column B would fit. It overshoots. Column A already lines up.', font=font(13), fill=MUTED)
    for i,(t,sub) in enumerate(cols_titles):
        cx=lab_w+i*col_w+col_w//2
        draw_centered(d,(cx,78), t, font(15), YELLOW if i==0 else (GOLD if i==1 else CYAN))
        draw_centered(d,(cx,96), sub, font(11), MUTED)
    y=head_h
    for label,s,g,ps,Sa,Sb,Ga,Gb in prepared_rows:
        d.rectangle([0,y,lab_w-4,y+col_h+cap_h-2], fill=(30,30,30))
        d.text((8,y+col_h//2-10), label, font=font(14), fill=TXT)
        d.text((8,y+col_h//2+8), f'S{s}  G{g}', font=font(11), fill=(160,160,160))
        for i,(sy,sx) in enumerate(((1.0,1.0),(1.10,1.10),(0.98,0.98))):
            cell,iou = overlay_pair(Sb, Gb, sy, sx, None, scale, (col_w-2, col_h))
            x=lab_w+i*col_w
            img.paste(cell,(x,y))
            draw_centered(d,(x+col_w//2, y+col_h+4), f'IoU  {iou:.3f}', font(14), TXT)
        y += col_h+cap_h
    # legend
    ly=H-foot_h+8
    for col,name,xx in ((CYAN,'SNES only',14),(GOLD,'Genesis only',180),((230,230,230),'Overlap',360)):
        d.rectangle([xx,ly,xx+16,ly+16], fill=col)
        d.text((xx+22,ly), name, font=font(13), fill=TXT)
    d.text((14, ly+28), 'Canvas (tile padding) is ~9–11% larger on Genesis; the painted body is not.', font=font(13), fill=MUTED)
    d.text((14, ly+46), f'Square pixels, nearest ×{scale}  |  width {W} px', font=font(12), fill=(150,150,150))
    path=os.path.join(OUT,'sheet2_scale.png')
    img.save(path)
    print('wrote', path, img.size)
    return path

# ---------- Image 3: style + aspect + conversion notes as diagram ----------
def zoom_crop(arr, pal, body, scale, pad=1):
    bb=tight(body)
    if not bb:
        return Image.new('RGB',(8*scale,8*scale),CELL)
    x0,y0,x1,y1=bb
    x0=max(0,x0-pad); y0=max(0,y0-pad)
    x1=min(arr.shape[1]-1,x1+pad); y1=min(arr.shape[0]-1,y1+pad)
    rgb=to_rgb(arr[y0:y1+1,x0:x1+1], pal)
    return Image.fromarray(rgb).resize((rgb.shape[1]*scale, rgb.shape[0]*scale), Image.NEAREST)

def sheet3():
    """Shades, outline, stripe, aspect, sizes."""
    # Use skate 22 as the worked example, plus a face-on if possible — 22 is 3/4.
    # Also frame 66.
    W=1000
    H=1200
    img=Image.new('RGB',(W,H),BG)
    d=ImageDraw.Draw(img)
    d.text((16,8), 'Style, not scale: shading, outline, display size', font=font(24), fill=YELLOW)

    # Row of three zoomed bodies (frame 22) at large scale
    s,g,p=22,22,22
    items=[('A  94 SNES', 'S94', s, SP, YELLOW),
           ('B  94 Genesis', 'G94', g, GP, GOLD),
           ('C  95 PC', 'PC', p, PP, LILAC)]
    preps=[]
    for lab,plat,n,pal,col in items:
        arr,body,stick,shadow=prepared(plat,n)
        preps.append((lab,plat,n,pal,col,arr,body,stick))
    scale=8
    col_w=300
    y0=50
    d.text((16, y0-2), 'Same pose (S22 / G22 / PC 21), Boston home, ×8  —  look at helmet, jersey shades, face', font=font(13), fill=MUTED)
    y0=70
    for i,(lab,plat,n,pal,col,arr,body,stick) in enumerate(preps):
        im=zoom_crop(arr,pal,body,scale,pad=1)
        x=20+i*col_w
        # centre in 280x  (maxh*8 ~ 25*8=200)
        box=Image.new('RGB',(280, 230), CELL)
        box.paste(im, ((280-im.width)//2, (230-im.height)//2))
        img.paste(box,(x,y0))
        draw_centered(d,(x+140, y0+232), lab, font(18), col)
        bb=tight(body)
        bw,bh=bb[2]-bb[0]+1, bb[3]-bb[1]+1
        draw_centered(d,(x+140, y0+254), f'body {bw}×{bh} px   {int(body.sum())} px', font(13), MUTED)

    # Callout facts as three columns
    y= y0+280
    facts=[
        (YELLOW, 'A  94 SNES',
         [
            'Body box matches Genesis on this pose (17×25).',
            'Team colour: 3 slots, only 2 unique RGBs.',
            'White/grey: 6 slots but only 4 unique RGBs (several whites are the same colour).',
            'Skin: 1 tone (slot 39).',
            'Outline slot 34: 17.5% of body pixels (median).',
            'Little dither (0.5% of 2×2 windows).',
            'Stripe slots sit at about 30% and 67% of body height.',
         ]),
        (GOLD, 'B  94 Genesis',
         [
            'Same body box overall (median 20×28, ratio 1.00).',
            'About 5% more body pixels (thicker fill).',
            'Team colour: 6 slots and 6 unique RGBs.',
            'White/grey: 3 slots and 3 unique RGBs.',
            'Skin: 2 tones (slots 38 and 39).',
            'Outline slot 34: 14.7% of body pixels.',
            'More dither (2.3%) at shade edges.',
            'Stripes at about 32% and 69% of body height.',
            'Stored canvas is 9–11% larger (8×8 tile padding).',
         ]),
        (LILAC, 'C  95 PC',
         [
            'Same pose, slightly smaller body: median 18×24 px (0.92× width and 0.89× height vs Genesis).',
            'Best uniform fit scale Genesis to PC is 0.96.',
            'About 18% fewer body pixels than Genesis.',
            'Many zone indices (median 52) and about 18 unique colours on Boston.',
            'Arm, sock and waist are separate zones.',
            'Index 255 is padding, not a drawn pixel.',
            'Screen is 320×200, not 256×224.',
         ]),
    ]
    def wrap_draw(d, x, y, text, f, fill, max_w):
        words=text.split()
        line=''
        yy=y
        for w_ in words:
            trial=(line+' '+w_).strip()
            tw,_=text_size(d, trial, f)
            if tw>max_w and line:
                d.text((x,yy), line, font=f, fill=fill)
                yy+=16
                line=w_
            else:
                line=trial
        if line:
            d.text((x,yy), line, font=f, fill=fill)
            yy+=16
        return yy
    fact_bottom=y
    for i,(col,title,lines) in enumerate(facts):
        x=16+i*col_w
        # clip width: leave 12 px gutter
        max_w=col_w-16
        d.text((x,y), title, font=font(17), fill=col)
        yy=y+26
        for line in lines:
            yy=wrap_draw(d, x, yy, line, font(13), TXT, max_w)
        fact_bottom=max(fact_bottom, yy)

    # Aspect / on-screen bar chart — start below the tallest fact column
    y = fact_bottom + 24
    d.text((16,y), 'On-screen size on a 4:3 display  (median player body)', font=font(18), fill=YELLOW)
    y+=28
    d.text((16,y), '94 SNES and 94 Genesis rinks are both 256×224 (Genesis H32). 95 PC is 320×200 VGA.', font=font(13), fill=MUTED)
    y+=22
    # bars: fraction of screen width and height
    # S/G width frac 0.074, height 0.125 (of 224) or 0.117 of 240
    # P width 0.053, height 0.120 of 200
    bars=[
        ('Width, fraction of screen', [
            ('A  SNES  19/256 = 7.4%', 19/256, YELLOW),
            ('B  Genesis  19/256 = 7.4%', 19/256, GOLD),
            ('C  PC  17/320 = 5.3%', 17/320, LILAC),
        ]),
        ('Height, fraction of screen', [
            ('A  SNES  28/224 = 12.5%', 28/224, YELLOW),
            ('B  Genesis  27/224 = 12.1%', 27/224, GOLD),
            ('C  PC  24/200 = 12.0%', 24/200, LILAC),
        ]),
    ]
    bar_x=260
    bar_w=520
    for title, rows_ in bars:
        d.text((16,y), title, font=font(14), fill=TXT)
        y+=20
        for name,frac,col in rows_:
            d.text((16,y), name.split('  ')[0], font=font(13), fill=col)
            d.rectangle([bar_x, y+2, bar_x+int(bar_w*frac/0.15), y+14], fill=col)  # scale so 15% = full
            d.text((bar_x+int(bar_w*frac/0.15)+8, y), name.split('  ',1)[1], font=font(13), fill=TXT)
            y+=20
        y+=6
    d.text((16,y), 'The SNES vs Genesis size difference is not an on-screen aspect effect: both use 256-wide pixels.', font=font(13), fill=MUTED)
    y+=18
    d.text((16,y), 'PC is narrower as a fraction of a 4:3 screen, because 320-wide VGA plus a slightly smaller sprite.', font=font(13), fill=MUTED)
    y+=18
    d.text((16,y), 'C-port H32 PAR is 5:4; VGA PAR is 5/6. Same pixel height looks taller, relatively, on VGA.', font=font(13), fill=MUTED)
    y+=28
    d.text((16,y), 'Conversion: copy SNES at 1:1 (not ×1.10). Pad to Genesis 8×8 canvas by hotspot. Thicken fill ~5%.', font=font(14), fill=YELLOW)
    y+=20
    d.text((16,y), 'Map by slot/zone, not RGB. Add Genesis shade levels and a second skin tone. Keep stripe positions.', font=font(14), fill=YELLOW)
    path=os.path.join(OUT,'sheet3_style.png')
    img.save(path)
    print('wrote', path, img.size)
    return path

if __name__=='__main__':
    p1=sheet1(); p2=sheet2(); p3=sheet3()
    print('done', p1,p2,p3)
