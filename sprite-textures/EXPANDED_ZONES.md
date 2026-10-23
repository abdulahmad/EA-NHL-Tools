# Expanded colour zones — sub-zone map (Stage 1: front torso)

Goal: every pixel of anthem frame **370**'s colour zones becomes its own **colour sub-zone** (one texel). Every other frame gets a
**sub-zone map**: frame pixel → sub-zone ID → texel. Stage 1 covers only the **front torso** (yoke corner, shoulder patch, yoke 1-3,
jersey, crest, waist 1/2/3). Arms, pants, socks, helmet and the back torso are later stages (wait for review).

## Texture
`subzones/stage1/tex_front_torso_<team>.png` — 10×11 px, 84 sub-zones. Each 370 torso pixel stays at its own position (origin =
370 torso bbox top-left), so the texture *is* the anthem front torso unwrapped. Magenta = not a sub-zone. `_x16.png` = labelled
(band per texel, band list per row). Sub-zone IDs = 370 torso pixels numbered row-major; full table in `stage1.json`
(`base_subzones`: id → texel, game index, band, band row j, across position s; `submap`: per frame `"y,x"` → id).
Texel value = the zone's **medium** colour (crest / flat zones: their own colour). Shading at render: if the target pixel's game index is
the light/dark member of the zone, the texel is looked up in the team palette ramp (medium→light/dark), so light/medium/dark is kept.

## Split rule (row by row, going up the torso)
For every stage-1 pixel (base and target) compute:
- **band** = game zone family (waist 1 odd 168 / even 169 / hidden 170 are ONE band; the crest grid belongs to the jersey band geometrically);
- **j** = band row counted **upwards from the band's bottom pixel in that column** (row by row going up);
- **s** = position across the torso row, `(x−L+0.5)/(R−L+1)`, L/R = torso extents on that screen row (0 = screen-left = player's right),
  so left and right halves stay separate.
Mapping of a target pixel:
1. crest pixel → the 370 pixel with the **same crest index** (crest identity is exact);
2. otherwise → among 370 non-crest sub-zones of the **same band**: nearest band row (j clamped to the band's top row in 370 if the
   target band is taller), then nearest s; ties → lower position. Plain jersey never lands on a crest sub-zone.
- Fewer pixels than 370 → some sub-zones unused on that frame; more → some sub-zones shared (counts in the table).
- **Waist 1**: the alternating odd/even row is one band row; each pixel's odd/even/hidden shade comes from its own game index, so the
  game's alternation is reproduced exactly (Leafs 252/224 grey, Rangers red/red/dark red). For a custom design the alternation shows as
  the light/medium shade of the texel.
- **Side frames 52 (d2) / 72 (d6)**: only the front (leading) half; s from a cylinder: q = depth from the leading edge (chest centre)
  over torso width, θ=acos(1−q), s = 0.5 ∓ 0.5·sinθ (d2 faces screen-right → player's right flank). Most pixels land on the outer
  columns — the flank needs its own side strip in a later stage.
- 57 (d3) / 67 (d5) three-quarter frames use the plain front rule (simplification; 67 shares the most sub-zones).

## Results (diff over stage-1 pixels, Leafs home + Rangers away)
| frame | dir | stage-1 px | diff | sub-zones used / 84 | shared | clamped rows |
|---|---|---|---|---|---|---|
| 370 | d4 base | 84 | 0 | 84 | 0 | 0 |
| 897 | d4 | 78 | 0 | 70 | 8 | 0 |
| 57 | d3 | 50 | 0 | 39 | 5 | 3 |
| 62 | d4 | 49 | 0 | 36 | 7 | 6 |
| 67 | d5 | 68 | 0 | 31 | 17 | 11 |
| 52 | d2 front half | 32 | 0 | 15 | 8 | 10 |
| 72 | d6 front half | 36 | 0 | 15 | 8 | 4 |

Synthetic test (`synthetic_compare.png`): left = unique random colour per sub-zone (asserted unique), right = hue by band + band row,
brightness by s. Waist stripes stay horizontal and ordered on all frames; left/right gradient is preserved.
First attempt let plain jersey pixels map onto crest sub-zones (3–16 px diff) → fixed by rule 2's crest exclusion.

## Reproduce
```
cd sprite-textures/out            # out/data -> game-derived data (see PER_PIXEL_MAP.md)
PYTHONPATH=../scripts python3 ../scripts/subzones/stage1.py   # writes out/subzones_stage1/
```
`scripts/subzones/backbase.py` (+ `backbase_metrics.json`, `backbase_candidates.png`) is preliminary evidence for the back-torso stage
(217 Stanley-cup back: untilted, all bands; 161 glide-back: arms down). No decision taken yet.
