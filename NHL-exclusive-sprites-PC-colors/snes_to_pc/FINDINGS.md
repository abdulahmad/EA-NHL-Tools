# 94 SNES-exclusive -> Genesis style -> 95 PC zones (t1531u). Nothing committed.

Scripts: s2g.py (converter), eval_oof.py (grouped-CV check), build.py, sheets.py. Outputs in out/.
Data: pairs.pkl (SNES placed on real 94G canvas), oof_B.pkl, oof_eval.json, check_frames.json.

## Exclusive count (frames_matrix.csv, S94 rows, none 'match' in 94G and none in 95 PC)
393 frames: 147 goalie, 143 player, 53 celebration, 50 non-player (fonts, rink bits). 343 are player/goalie/celebration.
Strict none/none (no match, no ambiguous in 94G or PC): 146 (84 player, 33 goalie, 16 celebration, 13 non-player).
The other ~247 are "ambiguous" (best score 0.6-0.75: probably redraws of an existing pose).

## Method
1. SNES arrays copied 1:1, no resize. Random forest (120 trees) on a 7x7 window of SNES slot one-hots + relative position + goalie flag
   -> Genesis slot, trained on 403 matched SNES/94G pairs (SNES placed on the G canvas by best mask IoU). May add a 1-px ring
   where P(empty)<0.5 (this brings pixel count to 99% of real 94G; plain argmax gave 96%). Isolated pixels dropped.
   Canvas padded to 8x8 multiples. Eye rule: dark pixel (34) in 2nd row of the skin blob, facing side (matches real 94G eye position on 44/76 frames with an eye; fires on few SNES frames).
2. Genesis-style array -> PC zones with convert_93 (final3l per-colour zone models, no joint data, no frame orientation).
   NOT the full K+J hybrid: that needs ROM frame ids/joints, which these frames do not have.
3. Round trips on all 16 exclusive + 6 check outputs: Genesis PNG, PC PNG/SH palette, SPIT encode->decode all pass; no invalid indices.

## Agreement (held out)
Step 1 SNES->94G, 5-fold CV held out by animation group, 403 pairs: exact index (over union of masks) 53.2% (slot map only 46.3%),
colour family 70.4%, silhouette IoU 0.90. Skaters 57.8 exact, goalies 39.5.
On the 61 matched frames also held out of the PC zone model (45 skaters, 16 goalies):
 SNES->G: skaters exact 58.0%, family 74.8%, IoU 0.917; goalies 41.1%, 57.4%, 0.877.
 End to end C vs real PC (pixels where both drawn; same in-game colour / zone-aware / exact index):
   skaters 70.5 / 60.2 / 47.9 (14262 px); goalies 49.7 / 36.9 / 29.2 (5723 px)
 Zone step alone, real 94G -> PC with the same no-joint converter: skaters 77.6 / 66.7 / 52.7; goalies 60.8 / 45.2 / 35.0
 Reference, full final3l hybrid with joints (real 94G): skaters 79.9 / 73.1 / 62.8; goalies (J) 73.0 / 65.7 / 55.8
Six check frames (sheet check1/2): see check_frames.json. B/D exact idx, C/E same colour:
 S86 turnl 62 / 77; S250 shoulderchkl 63 / 75; S321 fallfwd 65 / 74; S489 hook+1 66 / 74; S667 gdive 44 / 53; S167 glideback+3 62 / 71.
Check frames' animation groups were held out of the SNES model.

## Weak spots
- Goalies: pads lose their black outline and turn grey; gloves can turn Boston gold; goalie zones 50% same colour end to end.
- No crest/logo placement (no orientation data); helmet/yoke zones dominate.
- Eye pixel rarely placed. SNES faces are 1 tone blobs.
- Stripes: arm/sock stripe zones are chosen without joints, so they follow Genesis slot colours, not PC stripe positions.
- Agreement is measured on pixels both drawn; silhouette differences (IoU 0.88-0.92) are not counted in the PC numbers.
- Genesis shades make BOS whites greyer than SNES (Genesis palette), which is a style change, not a bug.
