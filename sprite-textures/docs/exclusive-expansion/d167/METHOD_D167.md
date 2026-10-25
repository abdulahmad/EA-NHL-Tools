# D167: 94G Leafs texture from matched frames + hard-colour mapping of exclusive frames (Abdul pt988u)

## 1. Building the texture (`tex94.py`)
- Uses 601 PC skater frames with 0 errors under Leafs home (D163 export, same full.py error rules).
- Pairs: 94G frames whose best PC match has score >= 0.7, scale 1, and the same bounding box. That gives 257 pairs for 94G and 265 for 93G.
- Each 94G pixel takes the PC pixel at the same place. That PC pixel's texel gets a vote for the 94G colour.
- Colours are canonical Genesis colours from `TORh.pal`, so 41 counts as 35 and 42 counts as 36. 93G `TORh.pal` is byte-identical to 94G.
- Result: 668 of 768 used texels filled from votes. A gap is filled only when all filled neighbours in the same zone agree; 84 were filled that way, 16 are still unfilled.
- 665 texels got more than one colour. Mean agreement is only 0.515.
- The 93G-built texture differs from the 94G one on 22 of 752 texels, so the 94G texture is used for both.

## 2. Validation: not met
Rendering the matched 94G frames through their own PC maps reproduces 36,583 of 68,203 pixels (54%).
- Within one frame, texel-to-colour agreement is 0.89. Across frames it is 0.54.
- So the Genesis colour at a body spot changes with the pose. The Genesis art bakes in per-pose lighting (white 43/44/45, navy 35/36/37/40), and the PC frames are redrawn rather than pixel copies. (Silhouette IoU is 1.0 on 31 pairs, but even then only about 50% of interior colours line up through any PC-index-to-Genesis map.)
- Other keys don't help: (texel, PC index) gives 0.57; (PC index) alone gives 0.53.
- **A single flat Genesis texture cannot reproduce 94G exactly.** Shading would need a per-pixel shade term.

## 3. Hard-colour mapping of exclusives (`map3.py`, `assign.py`)
- Start texel comes from the translator plus the unchanged PC pipeline (D166).
- If that texel's 94G colour differs from the original pixel, the pixel moves to the nearest texel of the right colour. Preference order: same zone, then same column (weighted 2), then same row.
- Stick (46) and shadow (47) keep their game colour, as on PC. Source pixels are never relabelled.
- Fit failures on 7 frames: the translator had put the goalie-mask index 164 into skater frames. With `SKATER=1` that index is disallowed, which fixed 6. G93 353 (gloves on the ice, no body) still fails.

## 4. Results (40 frames: 93G 353-376, 94G boardfront 738-753)
- 11,501 textured pixels, 487 errors (4.2%).
- 7 frames have 0 errors, all 94G. 94G overall: 24 errors out of 4,467 pixels.
- Error causes:
  - 211 px are skin highlight 38, which never wins a texel vote;
  - 183 px are 93G blood (indices 1/2/28/29, palette rows 0/1), which are not jersey colours;
  - 93 px have no start texel (88 of them in 353, plus 5 elsewhere).
- 5,195 pixels (45%) had to move from the pipeline texel. The mean move is about 3-5 texels, and 630 moved out of their zone.
- Renders with the PC Leafs, vertical and horizontal textures show that stripes and columns are **not** coherent. The colour constraint drags pixels to whichever texel happens to have that shade, so geometry is lost. The 0-error result is colour-exact but not texture-meaningful.

## Recommendation
- Model colour as (zone texel colour) x (shade), not as texel colour.
- Build a Genesis base-colour texture per family (white / navy / skin) from votes, which agree 0.80.
- Constrain only the family. Take the shade from the original pixel (a shade map like PC's band index).
- Then the texel can stay at the pipeline position, and stripes stay coherent.
- Goalie (gslam/ghigh) was not done in this pass: there is no 0-error PC goalie map set in the export.
