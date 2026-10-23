# v10: square pixels, and mask_b at its real on-sprite size

The target is a customised build with square pixels. Every texel is now treated as square.

## Where non-square pixels came from
I searched all the scripts and found no explicit NHL95 pixel-aspect constant (no 1.2, 5/6 or 320x200 correction). The non-square pixels were implicit, in two places.

1. **Measuring gear from the reference photos** (`measure_ref.gear_measure` → `grid_mode`, `build_v7.gear_measure` / `pad_back` → `grid_shaded`, `blocker_v8`, `mask_back_v9`). Each photo crop was squeezed into the sprite's on-screen bounding-box grid, so the texels were rectangular in the photo:

   | gear | photo w/h | old grid | cell w:h in photo |
   |---|---|---|---|
   | blocker | 0.65 | 10x10 | 1:1.55 |
   | pad | 0.50 | 19x21 | 1:2.0 |
   | pad_b | 0.72 | 19x21 | 1:1.26 |
   | catcher | 1.19 | 10x10 | 1.19:1 |
   | goalie_mask | 0.92 | 7x6 | 1:1.27 |
   | gloves (after trim) | about 0.57 | 6x7 | 1:1.5 |

2. **Local comparison renders.** In the v8/v9 local blocker and mask-back comparisons, the texture was stretched to the photo's shape: 10x10 shown at 224x347, and 7x6 at 310x306. These were local only. The `ATLAS 512` column of `*_compare.png` is a fixed UV slot (sampling is normalised), so it still stretches texels; read the FLAT column instead.

Sprite renders (`toimg`, `grid_px`, `anchored`) already used square integer scaling. Jersey textures are unchanged: their sizes are the sprite surface capacity, and stripe and band positions are fractions of the garment, not photo cells.

## Fix
`build_v10.sq(A,W,H)` keeps the sprite pixel budget A = w×h. It picks w and h from the trimmed reference aspect, so each cell is square in the photo. This is patched into gear measurement only, then restored before any jersey work.

| texture | before | after |
|---|---|---|
| pad | 19x21 | 14x28 |
| pad_b | 19x21 | 17x24 |
| blocker | 10x10 | 8x12 |
| catcher | 10x10 | 11x9 |
| goalie_mask (front) | 7x6 | 6x7 |
| gloves (3) | 6x7 | 5x9 |
| mask_b | 7x6 | **5x6** (measured, see below) |
| stick | 1x26 | 1x26 (unchanged) |

## mask_b size: measured on the sprites
`head_extent.py` finds the goalie head in every goalie frame (the top-most blob of head palette indices 164/177/184–189 plus the 135 strap row). It counts sprite pixels as-is, with no aspect correction.
- **Back view** (navy back-shell index 177 present, no face index 164): 71 clean frames (77 before dropping blobs merged with the body).
  - Width is 5 px (5 at both quartiles), height 6 px (5–6).
  - So **mask_b = 5x6**. The old 7x6 was about 1.7× too many texels.
- **Front view** (sanity check): 40 frames.
  - Width is 5 px (5–5), height 8 px (6.75–8), counting the cage and chin rows.
  - The front `goalie_mask` texture is now 6x7 (42 texels, square cells from the photo). It is close to the on-sprite 5x8 = 40, but narrower and taller on the sprite. Leave the exact fit to the sprite-mapping phase.

mask_b is still measured from `01M5MRFQ67SC2AWJK05N1EM5SV.jpg`, the only back-of-helmet reference. Tight crop, no forced symmetry, cream-coverage cells, VGA 6-bit snap.

## Follow-up: symmetric chin
The front goalie_mask is 6 wide, so its chin is the 2 centre pixels of the bottom row. Both are now orange (247,49,12), matching Fuhr's symmetric mask. Before, only the right-of-centre pixel was orange and the left one was white.
