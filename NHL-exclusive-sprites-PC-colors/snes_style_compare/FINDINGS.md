# 94 SNES vs 94 Genesis vs 95 PC style (t1529u)

Nothing was committed. Sources: census and decoded frames in
`/workspace/preview_v2/platform_unique/v2/` (`all.pkl`, `frames_matrix.csv`),
SNES points in `snes94.pkl`, Genesis hotspots from
`/workspace/NHL94Genesis/nhl94retail.bin`, PC frames and zones from
EA-NHL-Tools `sprite-textures`. Earlier canvas ratios in
`EA-NHL-Tools/docs/snes-redraw/RULES.md` are reused only as a comparison;
all body-box numbers below were measured again.

Scripts and outputs: `/workspace/snes-style-compare/`
- `measure.py`, `measurements.json`, `measurements.csv`
- `sheet1_poses.png` (906×3216)
- `sheet2_scale.png` (569×1676)
- `sheet3_style.png` (1000×981)

## Set

406 reliable matched triples (S94, G94, 95 PC), no mirrors, census class
`match`, census scale 0.9–1.15, player / goalie / celebration.
305 skaters (plus 8 celebrations) and 101 goalies, covering skate, skatewp,
skateb, stop, swing, sweep, hook, hip, shoulder, stumble, catch, duck,
turns, Goalie, gdive, and others.

PC frame numbers in the sheets are 0-based (pickle key − 1).
Genesis and SNES are 1-based. 94G frame N is the same pose as PC frame N−1
in these matches.

Body box = tight bounding box of the largest connected body components
after removing stick (console 46, PC 136 and 31) and shadow/ice
(console 47, PC 88, 82, 89). PC index 255 is padding, not a pixel
(the editor already treats `px==255` as empty). Stick-blade black left
behind when the shaft is removed is dropped as a tiny component.

## Are they scaled down by 10%?

**No, not the painted body.** That 8–11% figure is the *stored canvas*,
which on Genesis is padded out to 8×8 tiles. The drawing itself is
effectively 1:1.

| Comparison | n | median | IQR | mean | sd |
|---|---:|---:|---|---:|---:|
| Genesis / SNES body height | 406 | **1.000** | 1.000–1.000 | 0.999 | 0.033 |
| Genesis / SNES body width | 406 | **1.000** | 1.000–1.029 | 1.010 | 0.050 |
| Genesis / SNES body pixels | 406 | **1.050** | 1.019–1.085 | 1.054 | 0.059 |
| Genesis / SNES *canvas* height | 406 | 1.086 | 1.032–1.143 | 1.099 | 0.087 |
| Genesis / SNES *canvas* width | 406 | 1.103 | 1.043–1.212 | 1.133 | 0.120 |
| Best uniform scale SNES → Genesis (max IoU) | 406 | **0.980** | 0.980–0.980 | 0.986 | 0.024 |
| IoU at that scale | 406 | 0.895 | 0.861–0.931 | 0.892 | 0.051 |
| Same IoU, high-score subset (both scores ≥ 0.78) | 117 | 0.936 | 0.912–0.953 | 0.935 | 0.029 |
| Independent height, width scales | 406 | 0.980, 0.980 | — | 0.981, 0.983 | — |

Median body size: SNES 20×28 px (245 px), Genesis 20×28 px (262.5 px),
95 PC 18×24 px (217 px). Players only: SNES 19×28, Genesis 19×27, PC 17×24.

Genesis has about **5% more body pixels** (slightly thicker fill), not a
larger box. The best silhouette fit slightly *shrinks* SNES by 2%
(scale 0.98). Scaling SNES up by 10% (×1.10) makes the fit *worse*
(see sheet 2: IoU drops, e.g. 0.958 → 0.799 on the shot). Anisotropic
scale is the same as uniform (median 0.98 × 0.98), so this is not a
different aspect ratio in the pixels.

The earlier converter that scaled SNES by ×1.08 × 1.12 was resizing the
canvas, which is why those conversions looked too fat.

High-score and goalie subsets say the same thing (median box ratio 1.00,
fit 0.98).

## 95 PC vs Genesis / SNES (pixels)

| Comparison | median | IQR |
|---|---:|---|
| PC / Genesis body height | 0.885 | 0.846–0.923 |
| PC / Genesis body width | 0.917 | 0.857–1.000 |
| PC / Genesis body pixels | 0.824 | 0.784–0.894 |
| Best uniform scale Genesis → PC | 0.960 | 0.960–0.980 |
| IoU at that scale | 0.812 | 0.774–0.868 |

PC bodies are a little smaller in pixels (about 8–12% in the box, 18%
fewer pixels). They are the same poses, not a 10% SNES shrink.

## Pixel aspect and on-screen size

This difference is **in the pixels** for SNES vs Genesis, not an aspect
effect. Both rinks are 256×224: 94 SNES is 256-wide, and the 94 Genesis
cartridge rink is H32 (256-wide). `VDPR_MODE4` / `df32c` and the C-port
README agree: the cartridge rink is 256 wide; the C-port's 320-wide rink
is a port change.

95 PC is 320×200 VGA.

Median player body as a fraction of the gameplay screen:

| | Width | Height |
|---|---|---|
| 94 SNES | 19/256 = 7.4% | 28/224 = 12.5% |
| 94 Genesis | 19/256 = 7.4% | 27/224 = 12.1% |
| 95 PC | 17/320 = 5.3% | 24/200 = 12.0% |

On a 4:3 set, SNES and Genesis bodies are the same size. PC is clearly
narrower as a fraction of the screen (wider 320 raster plus a slightly
smaller sprite) and about the same height fraction (the 200-line screen
and the slightly shorter sprite roughly cancel).

Pixel shape, if you need it: the C-port treats H32 as PAR 5:4 (224 lines
in a 240-line 4:3 dest). A 256×224 image filling 4:3 would be 7/6.
VGA 320×200 filling 4:3 is PAR 5/6. Same pixel height looks relatively
taller on VGA than on the consoles.

## Outline

Index 34 (the outline slot), measured on the cleaned body:

| | Black fraction of body (median) | Edge pixels that are black | Thickness (median) |
|---|---:|---:|---:|
| SNES | 0.175 | 0.252 | 2 px (IQR 1–2) |
| Genesis | 0.147 | 0.230 | 2 px (IQR 1–2) |
| 95 PC | 0.017* | 0.027* | 1.5 px (n=243) |

\*PC outlines are mostly not a single index; dark edges often live in
zone shades (helmet dark, jersey dark, etc.), so this undercounts a
visible outline. Console numbers are the dedicated outline slot.

Earlier work that counted all RGB-black pixels, including stick and
padding, found Genesis "blacker" (19% vs 14%). On the body, using slot
34, SNES actually uses a bit more of that slot. Both are 1–2 px outlines,
not a different outline *style* of thickness.

## Shading and colour count (Boston home)

| | Median unique indices | Median unique RGBs | Team shades | White/grey | Skin |
|---|---:|---:|---|---|---|
| SNES | 15 | 9 | 3 slots, 2 RGBs | 6 slots, 4 RGBs (several whites are the same) | 1 tone (slot 39) |
| Genesis | 14 | 12 | 6 slots, 6 RGBs | 3 slots, 3 RGBs | 2 tones (38 and 39) |
| 95 PC | 52 | 18 | Many body-part zones (jersey, yoke, arm, waist, pants, socks, helmet), typically 6–9 shade slots per garment | — | Present, usually 1 mapped tone on a given frame |

Dither (2×2 checkerboards, median fraction of windows): SNES 0.5%,
Genesis 2.3%, PC 0.6%. Genesis uses dither at shade boundaries.

The real style gap SNES → Genesis is **shading**, not scale: more distinct
team and white levels, a two-tone face, a stronger top-light (older
work: lum-weighted centroid −1.5 px vs −1.1), slightly thicker fill.

## Stripes, stick, anchors

Stripe-slot pixels as a fraction of body height (median):

- SNES: upper ~0.30, lower ~0.67
- Genesis: upper ~0.32, lower ~0.69
- PC (named zones): arm band ~0.45, pants stripe ~0.67, sock stripe ~0.81
  (PC arm-band is a narrower zone than the console "upper stripe" bag)

Positions are already close. Convert by recolouring slots, not by moving
bands a lot.

Stick length (max span of stick-index pixels; not the joint skeleton):

- SNES median 21.6 px, Genesis 20.7 px — similar
- PC median 27.1 px — longer span in indices 136/31 (shaft + blade)

Hotspot, relative to the body-box bottom centre (median):

- SNES: (−0.5, −3)
- Genesis: (+0.5, −3)
- PC: (+0.5, 0)

All three put the origin near the skates, a few pixels left or right of
centre. Use the hotspot when padding SNES art onto a Genesis canvas so
the game’s registration stays right.

## Recommended conversion (SNES → Genesis / PC style)

1. **Rescale:** copy at **1:1** (nearest). Do not upscale by 10%. A
   uniform 0.98 is the measured best fit and is visually almost 1:1 on
   these 20–30 px bodies. Then place the sprite on a Genesis-sized
   8×8-padded canvas using the hotspot, not a tight SNES crop.
2. **Fill:** thicken interiors by about 5% (Genesis has more body
   pixels at the same box). This is a shade/fill pass, not a resize.
3. **Palette:** map by **slot / zone, not RGB**. SNES “white” slots 38
   and 45 are often stripe or shadow on Genesis (they become navy).
   Expand SNES’s 2 team RGBs into Genesis’s 3–6 distinct team shades,
   lighting from above (highlights on helmet, shoulders, upper back;
   darker on lower torso, pants, back of legs). Give the face two skin
   tones (G38 light, G39 shadow) and a dark eye pixel. Helmet: Genesis
   uses a light helmet with a grey shade line (team-coloured on Boston).
4. **Outline:** keep the 1–2 px slot-34 outline. Don’t invent a heavy
   new outline. A later pass can put a little more black on the lower /
   shadow side of limbs, which older work saw on Genesis.
5. **Stripes / arm bands / socks:** keep their places (upper ~30%,
   lower ~67% of the body). Recolour those SNES slots into Genesis
   stripe / team shades. For 95 PC, assign the zone indices (arm
   147–155, sock 184–189, waist, yoke, etc.) — the existing
   `g94-to-pc-zones` pipeline is the right second step.
6. **Stick and shadow:** keep SNES length and angle (already close).
   Genesis shaft is 1 px with a short black blade; shadow/ice stays
   slot 47 under the skates.
7. **Pose:** these are redraws, but the silhouette is already very
   close (IoU 0.90, 0.94 on high-score pairs at scale ~1). Adjust
   limbs by 1–2 px where they disagree; don’t re-proportion the body.
   The old 0.72 IoU came from comparing padded canvases and including
   the stick.

For 95 PC after a Genesis-coloured pass: optionally scale about 0.96
if you want the tighter PC body, expand to PC zones, and remember the
320×200 vs 256×224 screen when judging on-screen size.

## Images (all viewed)

- `sheet1_poses.png` — 9 matched poses, columns A SNES / B 94 Genesis /
  C 95 PC, body and stick boxes, pixel sizes.
- `sheet2_scale.png` — body-mask overlays: 1:1, SNES ×1.10 (the 10%
  test, worse IoU), SNES ×0.98 (best fit, almost the same as 1:1).
- `sheet3_style.png` — zoomed same pose, shade counts, on-screen
  fractions, conversion line.
