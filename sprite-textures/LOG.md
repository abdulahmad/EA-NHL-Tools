# Progress log (v2)
01_goalie_index_groups_falsecolour.png — goalie frames with arm-stripe/forearm/sock-stripe index groups in false colour. WORKED: shows pads, blocker and catcher all reuse skater arm/sock zone indices.
02_crosscheck_889-904_diagnostic_palette.png — 95-only crosscheck frames in a diagnostic palette (hue = part, brightness = shade). Partly worked: structure looks normal at a glance; breakage needed metrics (see 05+ / broken4.py).
03_skaters_1-16_diagnostic_palette_reference.png — same palette on 94-era skater frames for comparison. WORKED (reference).
04_zoom_94front_vs_95cross_889_vs_94back5_vs_95_897.png — zoomed comparison. WORKED: 897/895/898 crest is missing crest row 2 (sprite 208-212); arm bands skip order (forearm next to stripe 1).
(not saved) 07 first atlas attempt — candy-cane polygons were not clipped and spilled across regions; yellow grid/outlines were baked into the sampled texture so every sprite edge came out yellow. FAILED; fixed by drawing regions separately and putting grid/labels only on the display copy.
05_equipment_attempt1_zoom.png — gloves/mask/catcher/blocker/pads auto-split (original | part map | recolour). Mostly works upright; sprawls fail (everything below pants median → pad).
06_equipment_attempt1_all_goalie_partmap.png — all 253 goalie frames part map. Mask 227/253, pads 225, catcher 163, blocker 141, both hands only 91 → weak.
08_reference_texture_atlas_v2_clipped.png — atlas: UV gradient / checker / candy cane / design (chest + waist + sleeve + sock stripes). WORKED.
09_uv_attempt1_8dirs.png — UV attempt 1 on 8 frames (orig | UV R=U G=V | checker | candy | design | 1px isoline stripe | 2px). Partial: limbs/legs follow body; torso V is skewed because only neck pixels anchored the top.
10_uv_attempt1_frame1_design_zoom.png — frame 1: chest stripe only on one side (V skew) and front misdetected as back (only 3 skin px). FAILED → fix: anchor yoke as top, front = crest or ≥2 skin.
07_equipment_attempt1_all_goalie_recoloured.png / 07b_..._all_skater_gloves.png — every goalie frame and every skater frame (1–352) recoloured: glove red, mask yellow, catcher green, blocker magenta, pads orange. Skater gloves found in 327/352 frames, skates in 343/352.
11_uv_attempt2_8dirs_yoke_anchor.png — UV attempt 2 (yoke anchored at V=0.12, better front/back detection). WORKED much better: the checker and candy cane wrap around torso/sleeves/socks, and the stripes follow the waist curvature.
12_uv_attempt2_bend_cross_goalie.png — attempt 2 on bent poses (100, 200, 300), crosscheck 889/897, shotblock 1080 and goalies 409/980. Mostly OK; goalie torsos are too small for the checker to read, and the 1080 dive looks rough.
13_zoom_checker_and_1px_isoline_stripe_attempt2.png — zoom (orig | checker | 1px chest stripe as V=0.5 isoline). WORKED: the stripe is 1px in every frame and tilts/curves with the torso (57, 889); on bent frame 17 it is short/partial.
14/15/16_arm_band_order_violations_*.png — red = arm band touching a non-adjacent band (e.g. forearm next to stripe 1). 94 skaters are nearly clean; 95 crosscheck/shotblock show clusters at elbows and hands → broken zones.
Final outputs in v2/: 10–13 (equipment), 20–22 (atlas + UV), PLAN.md, FINDINGS.md.
17_wrap_fix_before_after_200_1_409.png — torso V cylinder-wrap sag (ELEV=35°): frame 200 flat stripe -> arc. left before / right after. flat isolines 107/422 -> 6/434 (flatcheck.py)

## 2026-10-23
- Exported per-frame draw anchor (-minX,-minY) in dump.js. Grids are now aligned on it: rows share the anchor y (feet) and columns use the max left/right extent about the anchor. The pc95.js `hotspotFor` value is the stick/puck hotspot, not the body anchor, so it was not used.
- Wrap fix for flat torso stripes (frame 200). Flat isolines went from 107/422 to 6/434. Before/after is local only (out/jerseys/fix_wrap_before_after_200_1_409.png).
- Six jersey atlases authored in `jerseys.py`: Canadiens baby blue, Wild home, Blackhawks CHICAGO alt, Panthers home, Stars star alt, Thrashers home. Rendered on frames 1,9,…,57, 100, 200, 300, 889, 897, 1080, 409, 980.
  - Reads well: colour blocking, wide chest bands (Wild, Panthers, Blackhawks), sock stripes, and pants/helmet colours.
  - Reads poorly:
    - Crests on 10–15 px torsos are smudges and illegible.
    - The Stars star shape is lost.
    - The Thrashers vertical piping is mostly 1 px and flickers.
    - Thin stripes (1–2 % of V) drop out on small frames.
    - Sleeve left/right can swap between directions.
- 2026-10-23: removed back name/number from all jersey designs; jersey atlases now include the real crest (approved).
