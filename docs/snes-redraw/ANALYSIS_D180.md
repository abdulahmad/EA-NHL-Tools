# D180: table-derived facing, hard skeleton constraints, deep error analysis (Abdul t1015u–t1020u)

## A. Facing from the animation tables (ground truth)
- `dirmap.py` parses the animation tables in `NHL94Genesis/src/frames94.asm` (94G) and `NHL94SNES/src/data/frames94s.asm` (94S). For every animation whose 8 directions use disjoint frame sets, each frame gets (animation, step, direction). Direction 0 = N (away from the camera), counting clockwise: 1 NE, 2 E, 3 SE, 4 S (facing the camera), 5 SW, 6 W, 7 NW.
- **Coverage:**
  - 94G: **596 of 845** frames (45 of 67 animations are 8-way unique).
  - 94S: **687 of 976** frames (49 of 72).
  - There are 0 conflicts between tables.
  - The other frames (single-direction or exclusive) fall back to the classifier and are flagged `dsrc='classifier'` (low confidence).
- **Visual check:** `d180_dircheck.png` (not committed) shows skate, celebrate and crosscheck in all 8 table directions. Direction 0 shows the figure's back, 4 its front and 2 facing right, as expected.
- **Finding:** SNES frame numbers equal 94G numbers only up to 224. 94S inserts `SPFcupover` at 225, and its groups after that are different.
- **Corrected picks:** references now need the same table direction **and** the same sprite class (goalie = the SPFGoalie group range).

| SNES | table | facing | D178 pick | D180 pick |
|---|---|---|---|---|
| S196 | celebrate/pump2 step 2 | 5 SW | G192 (wrong) | G222, SW skater |
| S527 | crosscheck step 1 | 4 S | G207 (wrong) | G122, S skater |
| S800 | pump2 step 4 | 2 E | G498 (a goalie) | G168, E skater |

## B. Hard skeleton constraints (`skelcheck.py`)
- **The three checks:**
  1. **exist:** every joint and every 0.5 px bone sample lies on a non-transparent pixel.
  2. **zone:** each pixel's nearest bone is a part allowed for its colour zone. This uses the D174 table for Genesis, the material label for PC, and families for SNES.
  3. **cover:** every body pixel (ice and shadow excluded) is within reach of a bone. The reach is 2.5 px, widened to 6 for the torso, 5 for the pelvis, 4 for the head and 3.5 for upper arms/thighs, because line bones cannot cover a wide torso.
- **Enforcement:** `enforce()` moves auto-fit joints by up to 2 px. Hand-edited joints are never moved. The remaining violations are flagged in the editor's fix queue and add to the queue score.
- **Results:**

| set | exist | zone px | orphan px |
|---|---|---|---|
| SNES held-out (31): before → after | 311 → 81 | 1,996 → 1,793 | 1,716 → 694 |
| PC/Genesis sample (59 editor frames): before → after | 98 → 29 | 4,762 → 2,916 | 2,564 → 1,803 |

- **Honest note:** 48 of the 59 sample frames still have a violation, so moving joints alone cannot clear them.

## Fixed sample (t1020u)
- `sample_d180.json` holds 153 frames, about 5%. They are a systematic every-20th pick after sorting by platform, class, animation and direction: PC 57, S94 52, G94 42, Genesis exclusives 2, plus S196/S527/S800.
- To use it in the editor, run `launch.py --sample`. Full-set enforcement is opt-in (`SKC=1 build_bundle.py`).

## C. Deep analysis (31 held-out pairs; it6 = it5 + constraints + table facing)
- **Scores:** family 50.3%, exact 33.8% (it5: 50.7% / 33.9%). Silhouette IoU 0.737, joint error 3.43 px, parts accuracy 55.5%, 0 split zones, jagged 0.146.

| error cause (share of union pixels) | share |
|---|---|
| silhouette: converted pixel where 94G is empty | **20.4%** |
| shade only (family right, index wrong) | 16.5% |
| family wrong, jersey/pants interior | 12.0% |
| family wrong, outline/edge | 6.9% |
| silhouette: 94G pixel missing | 6.2% |
| family wrong, head area | 3.2% |
| family wrong, stick | 1.0% |

| variant | exact | family | sil |
|---|---|---|---|
| full it6 | 0.338 | 0.503 | 0.737 |
| without constraints | 0.339 | 0.504 | 0.738 |
| **without head paste** | **0.358** | **0.526** | 0.753 |
| without smoothing | 0.340 | 0.502 | 0.734 |
| without RF colouring | 0.313 | 0.482 | 0.739 |
| oracle: GT skeleton | 0.352 | 0.519 | 0.737 |
| **oracle: perfect silhouette** (94G shape, converter colours) | 0.467 | **0.686** | 1.0 |

## Ranked next steps (expected family gain)
1. **Shape/scaling stage: +5 to +15 points (ceiling +18).** Converted sprites are too fat (20% extra pixels). Learn per-part thickness and length from the training pairs. These are learned proportions, not a warp to a reference.
2. **Fix head placement: +2 now.** The current paste costs 2.3 points. Pick the head by table (animation, step, direction), anchor it on the head joint, and trim to its outline. The verbatim-head rule stays.
3. **Shade model: +10 exact, 0 family.** Learn the 94G shade per part and per light direction.
4. **Part-aware interior colour: +2 to +4.**
5. **Outline rule (b) on edges: +1 to +3.**
6. **Skeleton accuracy: ≤ +1.6.** The GT-joint oracle shows the skeleton is not the bottleneck.
