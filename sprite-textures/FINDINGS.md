# v2 findings (honest status)

## Equipment zones (all 1134 frames; parts.py, equip_proof.py)
- Skater frames 1–352: glove found in 327/352, skate in 343/352.
  - Gloves, skates and stick tape are all index 0 (black), the same index as the outlines; they are split by geometry.
  - Misses: gloves touching only the jersey or outline, and gloves merged with stick tape.
- Goalie frames (373–380, 408–554, 975–1072; 253 frames):

| Part | Frames found (of 253) |
|---|---|
| Mask | 227 |
| Pads | 225 |
| Catcher | 163 |
| Blocker | 141 |
| Both hands | 91 (36 %) |

- Goalie gear reuses skater arm-stripe, forearm and sock-stripe indices, so blocker, catcher and pads have no zone of their own in the data.
- Pad detection works on upright and butterfly frames. It fails on sprawls and dives, where the "below the pants median" rule marks the torso as pad.
- Blocker vs catcher (touches stick or not) is unreliable when the stick is hidden or held in both hands.
- Visual estimate:

| Frame type | Usable as a starting point |
|---|---|
| Upright skaters | ~85–90 % |
| Goalies | ~60 % |

- Images: 10_equipment_zoom_orig_partmap_recolour.png, 11_all_goalie_frames_recoloured.png, 12_all_goalie_frames_partmap.png, 13_all_skater_frames_gloves_recoloured.png, 10b_part_legend.png.

## UV / reference texture (uv.py, atlas.py, uv_proofs.py)
- 20_reference_texture_atlas.png, four panels:
  - UV gradient (R=U, G=V)
  - checker
  - candy cane
  - design: chest stripe, waist, sleeve and sock stripes
- Regions: torso front/back, sleeve L/R, pants, sock L/R, helmet, glove, skate, goalie mask, pad, blocker, catcher.
- 21_uv_proofs_8dirs.png (8 skater frames) and 22_uv_proofs_bend_cross_goalie.png (bent poses, crosscheck, shotblock, goalies). Columns: orig | UV vis | checker | candy cane | design | 1px isoline chest stripe | 2px.
- What works:
  - The patterns wrap around the torso, sleeves and socks and bend with the waist stripes.
  - The isoline chest stripe is exactly 1px (or 2px) in every frame and follows the torso tilt, perpendicular to the body axis (see progress/13).
- What doesn't yet:
  - Checker squares are blocky and non-uniform on 10–15px torsos.
  - Left/right arm identity is decided by screen side, not true anatomy, so stripes can swap between sleeves across directions.
  - Arms crossing in front of the torso.
  - Pants are a single region.
  - Dives and sprawls are rough.
  - Goalie gear only gets bounding-box UV.
  - No temporal smoothing.
- Shade is still derived from the 3 original zone shades; the layer is per-pixel continuous, but nobody has painted a real shade layer yet.

## 95-only frames with broken zones (broken4.py, broken_arm_crest.json; progress/14–16)
- 95-only ranges (frames95pc.asm, 1-based):

| Frames | Animation |
|---|---|
| 889–904 | crosscheck |
| 905–974 | boards |
| 975–1072 | goalie95 |
| 1073–1128 | shotblock |
| 1129–1134 | ref |

  NHL 94 PC has 876 frames.
- Arm-band order metric: the fraction of arm-zone transitions where a band touches a non-adjacent band (e.g. forearm directly next to stripe 1, skipping 2 and 3). In 94 art the order runs upper arm → 1 → 2 → 3 → forearm.

| Range | Mean violation rate |
|---|---|
| 94 skaters | 0.03 |
| crosscheck | 0.13 (4×) |
| shotblock | 0.16 |
| boards | 0.08 |
| goalie95 | 0.19 (vs 0.12 for 94 goalies) |

- Crest: frames 895, 897 and 898 (crosscheck) use crest rows 1, 3 and 4 but skip row 2 (sprite indices 208–212), so the crest renders with a missing row.
  - 94-era frames 244, 278, 360, 363 and 378 also skip a row, so a skipped row is not unique to 95.
- Frames above the 94-skater 95th percentile (flag as untrusted; infer from geometry/neighbours):
  - crosscheck: 890 892 895 896 899 900 904
  - boards: 907 915–917 940–942 948–950 954–957 965 972
  - goalie95: most of 977–1072
  - shotblock: 1073–1076 1079–1084 1086 1087 1089 1091 1094–1100 1103 1109 1127 1128
  - also bench 885
  - full list in broken_arm_crest.json
- Caveat: these metrics found arm-band order and crest-row errors only. I could not confirm the specific breakage Abdul means by eye. The waist and sock bands in crosscheck look plausible, and the stick uses 136 correctly. Abdul should say what he sees as broken so a dedicated check can be written.

## Capacity-limited flat textures (2026-10-23)
- **Method** (`capacity.py`):
  - For every frame, each UV region's connected components are measured.
  - Limbs and torso use their across-axis width W and along-axis length L (PCA axis). Compact parts use their bounding box.
  - The texture size of each region is the 95th percentile over all frames. Paired regions (front/back torso, the two sleeves, the two socks) share the larger value.
  - Goalie gear is measured only on goalie frames.
- **Resulting sizes, in texels (W×L):**

  | Region | Size |
  |---|---|
  | torso | 12×15 |
  | crest | 6×4–6 |
  | sleeve | 8×14 |
  | sock | 6×10 |
  | pants | 14×9 |
  | helmet | 6×6 |
  | glove | 6×7 |
  | skate | 8×6 |
  | goalie_mask | 7×6 |
  | pad | 19×21 |
  | blocker | 10×10 |
  | catcher | 10×10 |
  | stick | 1×26 |

- Textures are authored at these sizes, so every band is at least 1 texel. They are nearest-neighbour upscaled into the 512 atlas for sampling, so the flat texture never has more detail than the sprites can carry.
- **Gloves.** V is the geodesic distance from the cuff (pixels touching the sleeve or forearm; otherwise the end nearest the torso), and U comes from the side anchors. Texture rows: cuff 0–.3, back of hand .3–.72, fingers .72–1. The palm/thumb is the left 30 % of the columns below the cuff.
- **Pads.** V is the geodesic from the knee (touching the pants, else the top row) to the toe.
- **Stick.** V is the geodesic along the largest index-136 component, from the knob (the end nearest the torso centre) to the blade. Black blade pixels within 3 px of the tip get V=1.
- **Camera.** The rink faceoff circles measure h/w ≈ 0.61–0.63 and the rink length/width ratio gives 0.667, so ELEV ≈ 38–42°. 40° is used.
- **Frame numbers.** The SPA tables in `frames95pc.asm` use the same 1-based frame numbering as here. SPAgready = 407, 410, …, 428 are the 8 directions of a standing goalie.
