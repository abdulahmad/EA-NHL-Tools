# Expanding console-exclusive frames to 95PC colour zones (D166)

## Why a palette map is not enough
Genesis (93G/94G) and SNES (94S) sprites use 15 indices (33-47, 47 = shadow) that are **colours**. 95PC indices are **zones**
(sleeve 144-158, torso BODYZ, pants 177-180, socks 181-189, helmet 190/191, skin 133-135/140, crest 192+, 136 face shade/stick).
One console index spreads over many PC indices (for example G94 43 -> 165/166/155/191...), so a lookup table cannot recover the zones.

## Method
1. **Translator.** An ExtraTrees classifier per source (G93, G94, S94). Each console pixel gets: its 5x5 index
   neighbourhood, relative y, rows to bottom/top, x offset from the centroid, and frame h/w. It predicts the 95PC index.
   - Training data: pixel-aligned shared frames (PC match score >= 0.7, scale 1.0, same crop shape).
   - S94 is trained through the chain S94 -> G94 (exact match) -> PC. S94 needs its own model because its indices are redistributed relative to G94.
   - "Transparent" is never predicted for a console pixel.
2. **Skaters.** The synthetic PC-index frame goes through the UNCHANGED PC skater pipeline: `skater_autofit` (v5 fit, backremap,
   column_map_v2, pantsremap, straighten). `frame()` and `DIRS` are injected after frames_v5 is exec'd. Directions come
   from the console SPA tables (93G fhigh 360 = dir 2, finjury 374 = dir 7, 94G boardfront 742 = dir 2/3). The D161 skeleton is not used (no editor joints).
3. **Goalies (simplified).** Translate, then `parts.segment` goalie branch for zones. The g28 same-index texel snap and the D155 pad snap were NOT
   run in this pass, so there is no texture render for goalies yet.
4. **SNES redraw (Part C).** Scale to the height of the closest PC pose, translate, then show the result in the PC palette. The PC shading bands
   come from the translator, which learned them from shared frames. "SNES is smaller" is not supported by the data: S94 frames that match
   G94 are the same size (median ratio 1.0), and the two samples scale by 1.05 and 0.94.

## Accuracy (held-out shared frames, every 5th frame)
| source | pairs | exact PC index | same family | coarse part |
|---|---|---|---|---|
| G94 | 357 | 0.59 | 0.70 | 0.82 |
| G93 | 374 | 0.59 | 0.70 | 0.82 |
| S94 | 154 | 0.55 | 0.68 | 0.81 |

The main confusions are sleeve<->torso (same console colours), sock<->pants, and stripe-band shifts.

## Sample results (honest)
- The skater error rings show **0 errors**, but this is only self-consistency against the *translated* frame. It is not ground truth.
- Of the skater sprite pixels, 85% get a texel. The rest are stick/shadow/ice, which keep their game colour.
- Translator confidence is below 0.5 on 55-62% of pixels for skaters and 73-83% for goalies.
- The Leafs render reads as the right team, but the arm and pants stripes are mostly lost or noisy.
- The horizontal and vertical test textures show scrambled rows and columns. The zones are roughly right, but the stripe geometry is not clean.
- Goalies: pads, blocker and mask are found on 94G gslambot/ghighl and 94S gbutterfly. **94S gcover failed**: it has no mask or pads and was segmented as a skater.
- Part C: the redraw is a recolour with PC shading bands, not a real redraw. The silhouettes and pixel detail are SNES. The closest-PC match for crosscheck 529 is
  a referee frame (score 0.61), so that "proportion" reference is meaningless.

## Next steps
- Add an arm/torso split from a skeleton fit (the main error).
- Train on mirrored and augmented pairs.
- Wire the goalie translation into g28 (`ppsnap` + D155 pads).
- For SNES, do a band re-quantisation per zone using the PC band count, and try upscaling with silhouette guidance rather than nearest neighbour.

Outputs (renders not committed): `/workspace/preview_v2/exclusive_samples/` B_G93_360.png, B_G93_374.png, B_G94_742.png, B_goalies.png, C_redraw.png.
