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

# Stage 1b — rectangular rows, strict 1:1, expansion, 4 teams (supersedes the stage 1 split rule)
Script `scripts/subzones/stage1b.py` → `subzones/stage1b/` (run from `out/`, writes `out/subzones_stage1b/`).

**Mental model:** texture = front anthem torso (370) + texels added for pixels other frames show but 370 does not
(seam/flank columns at the sides, extra band rows). Strongly prefer one sub-zone ↔ one pixel per frame.

**Layout (18×17, 141 texels; 84 from 370, 57 expansions; the rest magenta = reserve).** Texture rows are
(group, j) from top to bottom: Y1 (yoke 1), Y2 (yoke 2 + shoulder patch), Y3 (yoke 3 + yoke corner), J (jersey + crest), W1, W2, W3;
inside a group, j = band row counted **up** from the band's lowest pixel in that column (non-torso occluders such as the stick are
walked through; a different torso band stops the walk). Each 370 pixel keeps its own column.
- **Waist rows are straight:** W1/W2/W3 are each one full-width row. In 370 the right body column has its waist one row higher; with
  per-band rows it drops into the W rows, leaving the top jersey texel of that column (under the armpit) empty = **reserve texel**.
- **Matching per frame:** crest pixels → the sub-zone with the same crest index. Other pixels: per (band, j), the target pixels and the
  existing sub-zones are both sorted by across position s and matched with an order-preserving DP (cost |Δs|; an unmatched pixel
  costs 0.30). An unmatched pixel gets a **new texel** in that band row, placed in the first free column next to its matched
  neighbour (so expansions grow outward = seam/flank columns), or a new row if j is above the band's top. Never shared.
- Expansion order: 370, 897, 62, 57, 67, 52, 72; later frames reuse earlier expansions. `stage1b.json` → `expansions`,
  `texel_table` (texel → band, j, s, xy, source frame/pixel), `submap` (frame pixel → texel).

**Expansions (texels added, why):** 897: 5 (one more pixel in each waist row, jersey j0 and yoke 2 — its torso is one pixel wider);
62: 11 (hunched shoulders show yoke 2 above *and* below yoke 1 → 7 new yoke-2 texels; yoke 1 +2; jersey +2); 57 (d3): 4
(jersey j2 +3, yoke 2 j1 +1); 67 (d5, 3/4): 22 (visible flank: jersey j0–j3 +11 seam texels, a 6th jersey row j5, tilted yoke
bands give 2–3 rows per column: yoke 1 j1/j2, yoke 2 j1, yoke 3 j1, yoke corner, waist 2/3 +1 each); 52 front half: 8 (yoke 3 +4,
jersey +3, yoke 2 j2); 72 front half: 7 (tilted yoke rows j1, jersey +2). Extra rows Y1 j1–j2, Y2 j1–j2, Y3 j1, J j5 come only from
tilted 3/4 and side frames.

**Results:** Leafs home and Rangers away: **0 diff on all 11 frames**; **0 shared/duplicate pixels on every frame** (no exceptions
needed). Back frames 889, 42, 47, 77: no front-torso pixels (back torso = next stage).
| frame | dir | front-torso px | matched to 370/earlier | new texels | duplicates | diff |
|---|---|---|---|---|---|---|
| 370 | d4 | 84 | 84 (20 crest) | 0 | 0 | 0 |
| 897 | d4 | 78 | 73 (15 crest) | 5 | 0 | 0 |
| 57 | d3 | 50 | 46 (9 crest) | 4 | 0 | 0 |
| 62 | d4 | 49 | 38 | 11 | 0 | 0 |
| 67 | d5 | 68 | 46 | 22 | 0 | 0 |
| 52 | d2 front half | 32 | 24 (4 crest) | 8 | 0 | 0 |
| 72 | d6 front half | 36 | 29 | 7 | 0 | 0 |
| 889, 42, 47, 77 | back | 0 | – | – | – | – |

**Leafs / Rangers textures** = each texel's band medium colour from the team palette (crest: crest index colour); render shades
light/dark through the team's palette ramp → exact. **Chicago / Montreal** (from the reference photos `blackhawks_alt`,
`canadiens_babyblue`): yoke rows = yoke colour; jersey j4 = the white line above the chest band, j0–j3 = chest band (black / navy)
with the photo crest pixelated to the 5×4 crest grid, j≥5 = body colour; W1/W2/W3 = hem stripes (Chicago red/black/white,
Montreal white/navy/blue); render shade light ×1.125, dark ×0.875. Only the front torso is redesigned — arms/pants/socks/helmet
stay Leafs until their stages.

Images: `tex_<team>.png` + `_x16.png` (labelled; cyan box = expansion texel; row labels at right) for leafs_home, rangers_away,
chicago, montreal, synthetic_unique, synthetic_rows; `compare_<team>.png`; `combined_4teams.png`; `synthetic_compare.png`.

**Issues:** the texture is sparse (141 of 306 texels used) because the extra rows from tilted bands only hold 1–3 texels each; the 67
flank seam texels sit at the right end of the jersey rows — a dedicated side-seam column per side is the cleaner layout once the back
torso is added. The crest at 5×4 is coarse (Montreal CH reads weakly).


# Player layout v4 (Abdul) — 370 fit, all test frames, team jerseys
Layout: `scripts/playerlayout/abdul_layout_v4.png` (54x32). v4 = v3 + side-pants panel, cols 29-53 rows 17-23:
`[red|white] front pants (cols 31-39 = frame 370 x6..14, offset +25) [white|red|white] back pants (cols 43-51) [white|red]` —
the white/red/white 3-stripe hip pattern, wrapping between col 53 and col 29. Also 8 texels (cols 1,11,16,26 rows 21-22) went from grey 136 to white.
370's pants pixels (rows 17-23) now map into the panel (the front-figure pants are partly hidden by the gloves on 370).

## Flattened texture rules (`fit370.py`)
Uniform = exactly one red (132,0,0), one black (44,44,44), one white (232,232,232). Exceptions: crest kept as drawn, gold shoulder patch
(168,132,0) kept, one skin (200,132,92), one helmet (0,0,0), gear (gloves/skates/blades/stick, fixed indices) = green (0,220,0).
Back-figure shading and the back number are flattened to the single red; all shading comes from the shading layer
(red 160/132/104, white 252/232/204, black 88/44/0). Per-region unique colours: `playerlayout/v4/unique_colours.json`.

## Other frames (`frames_v4.py`) — layout kept fixed, no texels added
Per frame and zone family, min-cost one-pixel-per-texel assignment (Hungarian). The frame's bbox is scaled onto 370's bbox. Every
texel has a canonical position in 370 space plus a figure tag (front, back, or side seam). Using the other figure costs +8. If a family
has more pixels than texels, the extras share their nearest texel (documented). Index 135 = 4th skin shade (skin texel + 'shadow' level);
index 136 connected to skin or helmet in the top 12 rows = neck shadow (skin texel + 'neck' level), otherwise stick (gear).
Ice (88) and other fixed indices < 133 are counted as gear and are not mapped.

| frame | view | px | mapped | gear | shared | Leafs RT diff | Rangers RT diff | Leafs styled | Rangers styled | Chicago styled | Montreal styled |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 897 | front | 395 | 248 | 147 | 0 | 0 | 0 | 81 | 49 | 32 | 37 |
| 57 | front | 252 | 170 | 82 | 0 | 0 | 0 | 54 | 29 | 19 | 22 |
| 62 | front | 251 | 160 | 91 | 3 | 0 | 0 | 56 | 38 | 27 | 28 |
| 67 | front | 298 | 201 | 97 | 0 | 0 | 0 | 61 | 33 | 28 | 28 |
| 52 | front | 302 | 204 | 98 | 0 | 0 | 0 | 60 | 26 | 21 | 23 |
| 72 | front | 306 | 211 | 95 | 0 | 0 | 0 | 67 | 35 | 27 | 30 |
| 370 | front | 354 | 255 | 99 | 0 | 0 | 0 | 69 | 42 | 31 | 34 |
| 889 | back | 366 | 274 | 92 | 0 | 0 | 0 | 73 | 40 | 32 | 32 |
| 42 | back | 324 | 222 | 102 | 0 | 0 | 0 | 68 | 32 | 22 | 23 |
| 47 | back | 281 | 209 | 72 | 0 | 0 | 0 | 56 | 32 | 31 | 30 |
| 77 | back | 294 | 222 | 72 | 0 | 0 | 0 | 66 | 37 | 26 | 29 |

RT = exact game-colour round trip (texel = team palette medium of the family, shading layer -> team ramp); styled = v4-style
team texture (team colours within L1 80 merged into the most used one, i.e. one shade per hue) vs game, so non-zero is expected.
Exception: frame 62 (head down) has 13 yoke-2 pixels but there are only 10 yoke-2 texels, so 3 texels are shared (still 0 diff).
No expansion proposed.

## Reproduce
```
cd sprite-textures/out   # out/data and out/jerseys = your extracted game data (not committed)
PYTHONPATH=../scripts python3 ../scripts/playerlayout/fit370.py ../playerlayout/v4
PYTHONPATH=../scripts python3 ../scripts/playerlayout/frames_v4.py ../playerlayout/v4/frames
```
Outputs: `playerlayout/v4/` (sheets, flat, shading, combined, texel_assignment_x20.png) and `playerlayout/v4/frames/`
(per-team `*_texture_x16.png`, `*_all_frames_sheet.png`, `<frame>_texel_overlay_x10.png`, frames_v4.json, teams_v4.json).

# v5 step 1 — flat team textures from Abdul's v4 template
Script: `scripts/playerlayout/textures_v5.py <outdir>`, which loads `templates/abdul_layout_v4_template.png`. Check: `scripts/playerlayout/check_v5.py <outdir>`.
- Occupancy (drawn vs magenta) is copied from the template for every texel: 0 differences in all 5 textures.
- Head rows 0-7 (front, back, side-helmet strips): each texel's role is taken from its template colour. Any skin shade -> green placeholder,
  black or dark grey -> team helmet, red -> yoke, gold -> shoulder patch (recoloured to team colour). 0 unexplained differences.
- The back figure is the front MIRRORED (u' = 27-u), as drawn in the template.
- Column alignment (striped parts only), 32 texels: torso col 10 / back col 17 hem stripes moved down one row to match cols 3-9;
  outer sock columns at rows 23-25 and the sock/skate edge at row 27 now follow the row sequence 23 pants, 24 socks, 25 stripe 1, 26 stripe 2, 27 socks.
  The full list with reasons is in `playerlayout/v5/textures/check_v5.json`.
- Teams: Leafs home, Rangers away (game colours snapped to one shade per hue), Chicago home = Abdul's template colours plus his crest,
  Chicago alt, Montreal baby blue (from the reference sheets). Skin, gloves, skates, blades and stick are green (0,220,0).
