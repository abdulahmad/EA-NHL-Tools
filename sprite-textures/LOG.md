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
18_A01 sides+wrap 8 dirs, top=before bottom=after (asym test atlas: red=player-right sleeve/sock, grey=back torso). Back views now put player-right on screen-right.
19_A02 limb wrap before/after on frames whose sleeve/sock stripes were straight. Straight vertical-limb isolines 122/646 -> 49/732.
20_A03 frames 100-107: frame 101 flipped to back (grey) before; front smoothing fixes. Front/back flips in near-identical consecutive pairs 32/232 -> 0 (by construction of chain vote; eyeball-verified on this strip).
21_A04 crosscheck 889-903 (odd): forearms holding the stick are labelled glove (yellow) on 893/895/897: equipment-zone error from the broken 95 zones. NOT fixed.
22_A05 goalies: front flip fixed on 409; pads ok; catcher/blocker still swap on some saves.
23_A06 arms in front of torso: sleeve UV ok but arm/torso occlusion makes stripes jump.
24_A07 stride frames: pants are one region, so a pants stripe can't follow each leg. NOT fixed.
25 v3 summary: capacity-limited textures + fixes. 26 Wild flat texture at capacity.
27-28 gloves (Ottawa, red/black, Edmonton) at 6x7, geodesic cuff->fingers UV.
29-30 Fuhr gear redraw at pad 19x21, blocker/catcher 10x10, mask 7x6; SPAgready frames 407..428 (asm frame numbers = our 1-based numbering).
31-32 McDavid stick 1x26 (knob tape/shaft/blade tape) on Oilers-ish jersey.
