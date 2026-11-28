# final3l training data, code, and model

This folder is the **final3l** round of the 94 Genesis → 95 PC zone-mapping classifiers. It keeps the final3k training setup (94G pairs + Abdul’s completed exclusive-frame pixels, same holdouts) and adds a 35-dimensional **orientation / facing / crest-prior** feature from animation data and, when that is unclear, a visual estimate.

These scripts were trained in a separate conversion workspace. They are recorded here so the run can be reproduced when that workspace (pairs, joints, part maps, SPA tables) is available. **This folder does not contain ROMs, sprite banks, or pair dumps.**

## What is here

| file | what |
|---|---|
| `train_final3l.py` | trains one HistGradientBoosting (or constant) model per Genesis colour 33–47, with the 35-d orientation vector tiled onto every pixel |
| `eval_and_build.py` | full hybrid eval on the held-out 94G skaters; 93G convert helper; crest-zone scoring |
| `build_orientation.py` | SPA parser (frames93.asm / frames94.asm) + visual orientation from Genesis palette cues |
| `validate_orient.py` | facing vs spa95pc dirs on 275 skater pairs; crest-visibility vs PC 192–244 |
| `build_sister_sets.py` | renders the two exclusive sister sets (G = Genesis arm/sock locations, P = 95 PC locations) |
| `contact_sheets_final3l.py` | A / G / P contact sheets (≤1000 px, BOS home) |
| `contact_sheets_final3k.py` | contact sheets for the previous final3k set (saved under `../rendered_final3k/contact_sheets/`) |
| `heldout_lists.json` | the 55 held-out 94G skater ids, 23 held-out goalie ids, and the 3 held-out Abdul frames |
| `pcpal_overrides.json` | pixels where the hidden grey IF layer disagreed with the PC PAL layer (only frame 354, 39 px). Training uses the PC PAL colour. |
| `train_summary.json` | classifier family-label accuracy (held 94G and held Abdul) |
| `percolor_report.json` | per-Genesis-colour breakdown |
| `eval_heldout.json` | full-pipeline held-out vs_pc / stripe / goalie / crest-zone numbers vs final3i, J, K, and final3k |
| `crest_rule_ablation.json` | hard “back ⇒ strip crest” rule was tried and rejected (see below) |
| `model_meta.json` | feature width (241 = 206 + 35), holdouts |
| `percolor_final3l.joblib` | the trained per-colour models, joblib compress=3, **39,000,185 bytes** |
| `orient/orientation_table.json` | per-frame facing, body, yaw, near arm, crest prior, confidence, source (anim vs visual) for 94G and 93G |
| `orient/orient_validation.json` | accuracy vs 95 PC dir tables and crest pixels |
| `orient/orient_progress_sheet.png` | labelled facing / body check sheet (viewed) |
| `eval/heldout_progress_sheet.png` | held-out A Genesis / B final3k / C final3l / D 95 PC comparison (viewed) |

The 113 MB uncompressed `percolor.pkl`, the 104 MB feature dump, and the J arm/sock models are **not** copied here. J was not retrained (93G exclusive frames have no joints / part maps). Re-rendering the 94G hybrid still uses the existing J arm models from the conversion workspace.

## Held-out rules (do not train on these)

- **55 94G skater frames** — same split as earlier rounds (`i % 5 == 0` of the 275 high-IoU skater pairs). Ids are in `heldout_lists.json`.
- **Held-out Abdul frames: 357, 360, 368** (ready, high punch, hit). Used only to score his style. In the fight GIF they still appear as ABDUL (his pixels).
- Goalies are not trained in final3l; they stay on J.

Abdul training frames (completed pixels only; PART frames contribute only the pixels he painted):  
354, 355, 356, 359, 361, 362, 364, 365, 370–376, 633–644.

For training labels on 354, **all** 39 PC PAL overrides are applied. The fight GIF applies only the 18-pixel helmet fix on 354, not the other 21 disagreements. `frames_pc/93_354.png` is unchanged.

## Orientation features

Facing is taken from the SPA tables in `frames93.asm` / `frames94.asm` when a frame has a unique direction (convention verified on skatewp: 0 = toward camera / front, then clockwise 45°, 4 = away / back). Unique-anim facing is **100% exact** vs the 95 PC dir tables (183/183 train, 45/45 held). Overall facing including shared-script and visual-only frames is 237/275 exact (0.862), ±1 0.905.

When the animation list is missing (skater slambot 714–737) or a frame is shared across several directions, a visual estimate uses Genesis palette cues (face/eyes, arm bands, waist, pants, yoke, gloves, pant lines, sock stripes, skates, stick). Visual-over-ambiguous-anim is weak on the held set (0/10 exact) and is kept only as a feature, not a hard override of a unique anim dir.

Body / crest prior: front and qfront ⇒ crest visible; side ⇒ partial; back and qback ⇒ none. That prior is a feature for the classifiers. A hard rule that stripped crest pixels on back/qback views was tested on the 55 held-out skaters and **rejected**: 111 of 148 stripped pixels were correct 95 PC crest (full 5×4 logos appear on some unique-anim dir 3/4/5 frames, including poses whose torso is not a clean rear view). `paste_crest` in the existing hybrid remains the placement rule. Crest-zone IoU on held skaters stays **0.419**, the same as final3k.

## Results (this run)

Classifier family-label accuracy on 94G held pixels (n = 17,752): final3l **0.756** vs final3k 0.759 / K 0.746 / final3j 0.741 / final3i 0.740.

Full-pipeline held-out **vs_pc** on 55 skaters (17,780 px):

|             | vs_pc | zone vs_pc | stripe vs_pc | vs Genesis | crest IoU |
|-------------|-------|------------|--------------|------------|-----------|
| final3i     | 79.3  | 72.5       | 43.8         | 84.9       | 0.425     |
| J           | 79.3  | 72.5       | 43.3         | 84.3       | 0.442     |
| K           | 79.7  | 73.1       | 47.8         | 85.1       | 0.419     |
| final3k     | 79.8  | 72.9       | 47.5         | 85.2       | 0.419     |
| **final3l** | **79.7** | 72.7    | 47.1         | 85.3       | **0.419** |

Goalies (J, unchanged): vs_pc **73.5** (8,607 px). 55/55 held-out skater frames pass SPIT encode→decode and paletted PNG + SH palette round-trip. No invalid indices.

Weak colours (classifier family acc, 94G held):

- Colour **40**: 0.386 (final3k 0.391, 3i / 3j / K = 0.349 / 0.354 / 0.354), n = 868. Still the weakest colour. Common confusions: pants stripe ↔ waist 3 / socks.
- Colour **42**: 0.598 (final3k 0.608, 3i / 3j / K = 0.576 / 0.577 / 0.600), n = 1,369.

Held-out Abdul frames 357/360/368: family acc **0.838** (n = 1,029), same as final3k. Colour 40 on Abdul holdout 0.774 (n = 62); colour 42 0.753 (n = 77).

Orientation features did not improve overall vs_pc versus final3k (79.7 vs 79.8). They are still in the model because unique-anim facing is a reliable signal and the crest prior is the right place to put it, even though a hard crest strip disagreed with 95 PC.

Raw colour-34 (black) acc is lower than the hard pipeline map, so exclusive fills still use the fixed maps: 33→8, 34→0, 38→133, 39→135, 46→136, 47→88. Blood is Genesis 29→76 and 28→78; ice chips 1 and 2→89.

## How to retrain / re-render

You need the conversion workspace (94G/95 PC aligned pairs, `kfeats`, context features, SPA tables, and `frames_pc/`). Then:

```bash
python3 -u build_orientation.py
python3 -u validate_orient.py
python3 -u train_final3l.py
python3 -u eval_and_build.py
python3 -u build_sister_sets.py
python3 -u contact_sheets_final3l.py
```

Unified features are context (53) + kfeats (152, zeros on Abdul 93G pixels) + an `is_abdul` flag + orientation (35) = 241 dimensions. Do not put the 55 held-out skaters or (357, 360, 368) into the training set.

Sister-set renders (G = FORCE_ARM `'G'` + FORCE_SOCK `'G0'`; P = FORCE_ARM `'P'` + FORCE_SOCK `'P'`) are in `../rendered_final3l_genesis_locs/` and `../rendered_final3l_pc_locs/`. ABDUL frames are kept as-is (plus the 354 helmet fix). AUTO and unfilled PART pixels come from this model. 93G has no joint-based arm/sock relocation, so those 36 frames are identical in both sets. 94G goalies stay on J, so they also match. 88 of 89 94G exclusive skaters differ between G and P (frame 775 is identical).
