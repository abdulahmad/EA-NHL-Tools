# final3k training data, code, and model

This folder is the **final3k** round of the 94 Genesis → 95 PC zone-mapping classifiers. It adds Abdul’s hand-completed exclusive-frame pixels (`frames_pc/`) on top of the earlier 94G/95 PC training pairs.

These scripts were trained in a separate conversion workspace. They are recorded here so the run can be reproduced when that workspace (pairs, joints, part maps) is available. **This folder does not contain ROMs, sprite banks, or pair dumps.**

## What is here

| file | what | size (approx.) |
|---|---|---|
| `train_final3k.py` | trains one HistGradientBoosting (or constant) model per Genesis colour 33–47 | — |
| `eval_and_build.py` | full hybrid eval on the held-out 94G skaters; 93G convert helper | — |
| `render_exclusive.py` | 94G exclusive animation sheets and GIFs (BOS home) | — |
| `build_exclusive_and_fight.py` | builds exclusive 94G npy + the 93G fight GIF/sheet | — |
| `compare_final3k.py` | A Genesis / B old hybrid / C final3k / D Abdul comparison sheet | — |
| `export_all_exclusive.py` | writes round-tripping index PNGs and BOS previews | — |
| `heldout_lists.json` | the 55 held-out 94G skater ids, 23 held-out goalie ids, and the 3 held-out Abdul frames | — |
| `pcpal_overrides.json` | pixels where the hidden grey IF layer disagreed with the PC PAL layer (only frame 354, 39 px). Training uses the PC PAL colour. | — |
| `train_summary.json` | classifier family-label accuracy (held 94G and held Abdul) | — |
| `percolor_report.json` | per-Genesis-colour breakdown | — |
| `eval_heldout.json` | full-pipeline held-out vs_pc / stripe / goalie numbers vs final3i, J, and K | — |
| `model_meta.json` | feature width (206), colours, date | — |
| `percolor_final3k.joblib` | the trained per-colour models, joblib compress=3 | **38 MB** (38,809,313 bytes) |

The 113 MB uncompressed `percolor.pkl` from an earlier round, the 104 MB feature dump, and the J arm/sock models are **not** copied here. J was not retrained in this round (93G exclusive frames have no joints / part maps). Re-rendering the 94G hybrid still uses the existing J arm models from the conversion workspace.

## Held-out rules (do not train on these)

- **55 94G skater frames** — same split as earlier rounds (`i % 5 == 0` of the 275 high-IoU skater pairs). Ids are in `heldout_lists.json`.
- **Held-out Abdul frames: 357, 360, 368** (ready, high punch, hit). Used only to score his style. In the fight GIF they still appear as ABDUL (his pixels), because they were held out of *training*, not withheld from display.
- Goalies are not trained in final3k; they stay on J.

Abdul training frames (completed pixels only; PART frames contribute only the pixels he painted):  
354, 355, 356, 359, 361, 362, 364, 365, 370–376, 633–644.

For training labels on 354, **all** 39 PC PAL overrides are applied (the helmet 194/195 → 190/191 mismatch plus smaller disagreements). The fight GIF applies only the 18-pixel helmet fix on 354, not the other 21 disagreements.

## How to retrain

You need the conversion workspace (94G/95 PC aligned pairs, `kfeats`, context features, and `frames_pc/`). Then:

```bash
python3 -u train_final3k.py
```

That writes `percolor_final3k.joblib` and the JSON reports. Unified features are context (53) + kfeats (152, zeros on Abdul 93G pixels) + an `is_abdul` flag = 206 dimensions. Do not put the 55 held-out skaters or (357, 360, 368) into the training set.

To score the full hybrid (new K plain zones + K sock choice + existing J arms; goalies = J):

```bash
python3 -u eval_and_build.py
```

## Results (this run)

Classifier family-label accuracy on 94G held pixels (n = 17,752): final3k **0.759** vs final3i 0.740 / final3j 0.741 / K 0.746.

Full-pipeline held-out **vs_pc** on 55 skaters (17,780 px):

|             | vs_pc | zone vs_pc | stripe vs_pc | vs Genesis |
|-------------|-------|------------|--------------|------------|
| final3i     | 79.3  | 72.5       | 43.8         | 84.9       |
| J           | 79.3  | 72.5       | 43.3         | 84.3       |
| K           | 79.7  | 73.1       | 47.8         | 85.1       |
| **final3k** | **79.8** | 72.9    | 47.5         | 85.2       |

Goalies (J, unchanged): vs_pc **73.5** (8,607 px). 55/55 held-out skater frames pass SPIT encode→decode and paletted PNG + SH palette round-trip. No invalid indices.

Weak colours (classifier family acc, 94G held):

- Colour **40**: 0.391 (was 0.349 / 0.354 / 0.354 on 3i / 3j / K), n = 868. Still the weakest colour. Common confusions: pants stripe ↔ waist 3 / socks.
- Colour **42**: 0.608 (was 0.576 / 0.577 / 0.600), n = 1,369.

Held-out Abdul frames 357/360/368: family acc **0.838** (n = 1,029). Colour 40 on Abdul holdout 0.790 (n = 62); colour 42 0.753 (n = 77).

Raw colour-34 (black) acc is lower than the hard pipeline map, so exclusive fills still use the fixed maps: 33→8, 34→0, 38→133, 39→135, 46→136, 47→88. Blood is Genesis 29→76 and 28→78; ice chips 1 and 2→89.

## How to re-render

Converted exclusive frames already live in `../rendered_final3k/` (index PNGs that round-trip, plus BOS home previews). To rebuild them from the model, run `export_all_exclusive.py` and `render_exclusive.py` in the conversion workspace, then `build_exclusive_and_fight.py` for the fight GIF. ABDUL frames are kept as-is (plus the 354 helmet fix). AUTO and unfilled PART pixels come from the new model.
