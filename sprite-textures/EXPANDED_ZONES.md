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

## v5 head roles (RGB -> role, rows 0-7, from the template file)
| template RGB | role | texture colour |
|---|---|---|
| 0,0,0 / 44,44,44 | helmet | team helmet |
| 220,148,104 / 200,132,92 / 184,120,80 / 96,56,28 / 164,108,72 / 176,113,79 / 198,127,89 | skin (face, eyes, ears, neck) | green (0,220,0) |
| 160,0,0 (row 6) / 132,0,0 (row 7) | yoke1 / yoke2 | team yoke |
| 168,132,0 (row 7: front cols 2,11, back cols 16,25) | shoulder patch (own role, `sp`) | Chicago home keeps gold 168,132,0; Leafs, Rangers, Chicago alt and Montreal have no patch, so it takes the yoke colour |

On the back figure the template has helmet in rows 0-3. Row 4 cols 20-22 (164,108,72 / 220,148,104 / 164,108,72) and all of row 5 are skin (neck), so they are green.
Run `scripts/playerlayout/compare_v5.py <outdir>` to rebuild the template-vs-texture x16 comparisons.

## v5 corrections (Abdul pt775u)
- Montreal waist stripes: w1 (row 14) baby blue 96,144,224; w2 (row 15) white 232,232,232; w3 (row 16) royal 0,40,160.
- Chicago alt torso, bottom-up, rows 16..9 (w3,w2,w1, then jersey/crest/number rows 13..9): K,W,K,R,W,K,W,R. Exactly 8 rows. This replaces the old CHICAGO band in rows 10-13.
- Chicago alt arms, bottom-up, rows 17..10 (forearm 17-15, arm stripes 14-12, upper arm 11-10): R,K,W,R,W,K,W,R; upper-arm rows 9-8 stay red (pt776u cut one leading red from the earlier R,R,K,W,R,W,K,W,R).
  The arm runs rows 8-17 (10 rows) and the pattern has 9, so upper-arm row 8 (4 texels: front cols 1-2, back cols 25-26) stays red.
- Front and back use the same row colours (row-based, so mirroring needs no change). Occupancy is unchanged and check_v5 shows 0 unexplained.

# v5 step 2 — the 5 flat v5 textures on all 11 frames (`scripts/playerlayout/frames_v5.py`)
Run from `sprite-textures/out` (out/data → game data): `PYTHONPATH=../scripts python3 ../scripts/playerlayout/frames_v5.py <out>/v5/frames [<out>/v5/textures]`.
Committed output: `playerlayout/v5/frames/` — per team `<team>/<frame>_{flat,shading,combined}.png`, `<team>_sheet.png`
(flat | shading layer | combined | game, each sprite centred in its column), `all_teams_all_frames_sheet.png` (game + 5 teams combined),
`all_teams_flat_sheet.png`, `mapping_overlay_sheet.png` (which figure each pixel's texel is in), `frames_v5.json` (maps + all counts).
The template `templates/abdul_layout_v4_template.png` is used unchanged; no texels added.

**Mapping fixes vs v4 (frames_v4.py):**
1. **Texel family = v5 role.** v4 assigned pixels to texels by the v4 FAM tags; those disagree with the column-aligned v5 roles on
   ~75 texels (e.g. waist-2 pixels on a forearm texel, pants pixels on pants-stripe texels, socks-stripe-2 on skate texels) → colours
   bled between zones in the team renders. v5: a pixel of game family F only lands on texels whose v5 role is F (crest by exact index).
2. **Stripe rows follow the body.** Jersey (+number/crest band), upper arm and forearm carry row stripes in the v5 designs (Chicago alt,
   Montreal band). Their target row = band row counted from the anchor stripe along the body (geodesic inside the family: jersey up from
   the waist stripes, upper arm up from arm stripe 1, forearm down from arm stripe 3), not the bbox-scaled row → continuous stripes on
   bent/twisted frames (42, 47, 77, 57, 62, 67).
3. **Direction table.** d3-5 (57, 370/897/62, 67) front figure; d0/1/7 (889, 42, 47, 77) back figure; d2/d6 (52, 72) side: leading
   half → front figure, trailing half → back figure, both on the visible side (d2 = player's right, d6 = left), helmet → that side's
   helmet strip (cols 2-3 / 9-10), pants → side-pants panel (cols 29-53, rows 17-23). Left/right crossing of the centre line is penalised.
4. Body bbox excludes stick, blades and ice shadow (v4 used the full bbox, so a long stick squeezed the body mapping).
5. Gloves/skates (fixed-colour 0/1/8/28/31) are mapped onto glove/skate texels (green); stick (136 off the neck) has no texel by
   design → green; ice shadow (82/88) is not part of the player and is drawn in its game colour in every render.

**Results (all 11 frames):** every non-stick, non-ice sprite pixel is mapped 1:1, **0 shared texels on every frame including 62**
(v4's 3 shared yoke-2 pixels on 62 are gone: with role families the yoke-2 row has enough texels, the overflow goes to the back
figure's yoke-2 row). Round trip in the game's own colours (tor home, nyr away, chi home, chi away, mtl home): **0 px different, 0
occupancy difference** on every frame. Team renders: 0 magenta (empty-texel) hits, 0 occupancy difference, skin/gloves/skates/stick
exactly green, nothing else green.

**Allowed exception (documented):** where a frame shows more pixels of a family than that figure has texels, the overflow goes to the
other figure's texels of the same family and row (front views: yoke 1/2 on 57/62/67, jersey j on 67, a few socks/pants-stripe rows;
back views: 889 arms/helmet/yoke 2, 42/47/77 a few socks/forearm texels). Checked: in all 5 textures each such texel has exactly the same
colour as a same-row same-role texel of the correct figure, so it is invisible; the alternative would be shared texels.
Gear overflow (glove/skate texels of the other figure) is ignored — all green.

# v5.1 — skeleton segmentation + geometry-driven stripe rows (Abdul pt784u)
Scripts: `scripts/playerlayout/seg_v5.py` (segmentation + stickman), `frames_v5.py` (mapping), `stripe_checks_v5.py` (checks, overlays,
stretch proposal). Run from `sprite-textures/out`: `PYTHONPATH=../scripts python3 ../scripts/playerlayout/stripe_checks_v5.py <out>/v5/frames [before/frames_v5.json]`.

**Root causes of the flagged renders (PR #47 stripe_diagnostic).**
* 42 (d0 back, kink): jersey rows came from a 4-connected geodesic distance to the waist zones plus a one-pixel-per-texel Hungarian
  assignment. A back-figure jersey row has only ~8 texels; when a sprite row needed more, the overflow pixels were pushed to the nearest
  free texel on another row (e.g. a row-12 texel inside the row-10 line, a row-13 texel in the row-11 line) -> the wiggle. The back
  jersey zone is also splashed: jersey pixels inside the yoke-3 line (row 5), a yoke-corner pixel in the middle of the back, upper-arm
  pixels on the torso edge, so the geodesic fronts started from ragged seeds.
* 47 (d1 back) and 72 (d6 side), thick black: the geodesic isolines of a leaning torso are diagonal (|dx|+|dy|), so the same row repeats
  down a column; and every jersey pixel more than 5 steps from the waist was clamped onto row 9 (black), stacked on yoke-2 row 7 (black).
  72 also mixed arm columns of both template arms in one arm.

**Method.** The game zone is only a validity filter: a pixel may only take a texel of its own family (that keeps the game-colour round
trip at 0 diffs; no two families share colours in all 5 palettes, so no cross-family texel is allowed). Inside that, the texel comes from
geometry: torso stripe direction = least-squares slope of the waist-1/2/3 bands; sheared line index `k = y - round(s(x-xc))`; jersey row
`= 14 + k - k(waist 1)` clamped to 9..13 — straight digital lines, one row per pixel per column. Arms: segmentation splits arm-zone
components, assigns player L/R (front: right = screen-left; back: right = screen-right; side d2 near = right, d6 near = left), upper arm
rows counted from the arm-stripe-1 line along shoulder->elbow, forearm from the arm-stripe-3 line along elbow->glove, across-arm position
-> arm column (inner/mid/outer), and only that arm's template columns. Texels may be reused (no more forced row jumps).
Parts: 1 head, 2/3 torso upper/lower, 4/5 R/L upper arm, 6/7 R/L lower arm, 8/9 R/L glove, 10/11 R/L upper leg, 12/13 R/L lower leg,
14/15 R/L skate, 16 pants (hips), 17 stick. Overlays: `skeleton_<frame>.png`, `skeleton_overlay_sheet.png` (numbers + black borders).

**Checks** (`stripe_checks_v5.json`): kink = scan line (torso column / arm line along its axis) whose row sequence reverses; split into
`mapping` and `forced` (the reversing pixel's zone has texels on one row only: yoke/waist/arm stripe/crest index = game-zone scatter);
run>1 on rows we choose, split into `capacity` (segment longer than the template rows) and `other`; contiguity red flag = same-segment
4-neighbours whose texels are >2 apart. Totals over 11 frames, before -> after: mapping kinks 10 -> 3, forced kinks 21 -> 21,
run other 10 -> 2, run capacity 31 -> 47, red flags 265 -> 53. Errors, occupancy and round trip stay 0.

**Not applied — stretch proposal** (`stretch_proposal_v5.json`, needs Abdul's approval): sheared rows needed vs template rows. Jersey: 42 and 47
7/5 (factor 0.71), 72/889/77 6/5, 67 10/5, 52 12/5 (side-view slope fit poor). Forearm 3 rows vs 5-7 needed in 47 (7), 52/72/889 (6), 77 (5).
Without a stretch the extra lines repeat at the clamped end (row 9 / row 17): that is the remaining 2-px band at the top of 42/47.

**Game-zone defects** (flagged, not forced): 889 (95-only crosscheck 889-904, see AUDIT #5) forearm zone on both sides of arm stripe 3
on both arms; front views 57/62/67 and side 52 have yoke 1 under yoke 2 (row 7,6,7) and crest-index rows out of order.

# v5.2 — smooth torso + approved gradual torso stretch, curved arms, stick model (Abdul pt789u)
Skating-left frame = **72** (d6, faces/skates screen-left). Its torso stripe angles jumped (PR #48: one rigid waist-band slope for the
whole torso, the yoke band at -45 deg) -> max angle step between adjacent rows 50 deg.
* **Torso (applied):** every jersey pixel gets a fractional spine position `u = d_waist1/(d_waist1+d_yoke3)` (Euclidean distance fields to
  the two fitted bands), row = `13 - floor(5u)`. Iso-lines blend continuously from the waist angle (bottom) to the yoke angle (top) — a
  continuous spine rather than 3-4 rigid sections — and the n sheared lines are sampled evenly onto the 5 jersey rows (approved stretch,
  extra lines spread out, top row not repeated). Twisted torsos (waist and yoke bands over different columns, 67/52) work too.
* **Arms (applied, no stretch):** upper arm row = `11 - floor(d(arm stripe 1) - 0.5)`, forearm `15 + floor(d(arm stripe 3) - 0.5)` — curved
  distance field shoulder -> elbow -> wrist. `ARM_STRETCH_PREVIEW=1` samples `u = d_stripe/(d_stripe+d_end)` onto 4/3 rows = gradual arm
  stretch, rendered only to `v5/preview_arm_stretch/` (PREVIEW, not approved, not the main mapping).
* **Stick model:** shaft (grip at the glove -> heel) and blade (heel -> toe), fitted from the 136 stick pixels; drawn SH/BL in the overlays,
  stored in `skeleton_v5.json`. No texel (model/alignment only).
* **New metrics:** torso and per-arm max angle step between adjacent texel rows (PCA line angle per row); stripe thickness
  = min(vertical, horizontal run) of a row at a pixel (1 for a 1-px line at any angle); adjacent doubles.

# v5.2 control test — do game-jersey textures through the v5.2 mapping match the game? (Abdul pt792u)
`scripts/playerlayout/control_v5.py` -> `playerlayout/control_v5/` (control textures `textures/control_<team>.png`, per frame
flat/shading/combined renders, sheets `A_control_<team>_sheet.png`, `B_blind_geometry_<team>_sheet.png`, counts `control_v5.json`).
* **A, control (approved v5.2 mapping, full pipeline):** texel = medium colour of the game zone the texel stands for (crest = own index,
  skin, gear); shading layer from the game pixel's light/medium/dark/shadow; combined via the game ramps; stick/ice/gear in game colours.
  **0 mismatched pixels on all 11 frames x 5 teams, occupancy diff 0.** This is expected by construction: the game zone is the validity
  filter, so every pixel lands on a texel of its own zone and the in-game colours cannot differ. It proves the pipeline (texture, shading,
  ramps, fixed colours) is exact; it CANNOT see stripe-row choices inside one zone (jersey rows 9-13 are one game colour).
* **B, blind geometry (diagnostic only, no mapping change):** nearest texel by skeleton geometry alone, no zone filter (torso row from the
  fitted waist/yoke lines, arm row from arc length shoulder->elbow->glove, legs/helmet by bbox). Mismatches (colour-visible in that team):
  tor 743, nyr 842, chi home 857, chi away 853, mtl 771. Classes per frame in control_v5.json: R wrong stripe row (~60%), P wrong part
  (~30%, mostly arm-over-torso on the twisted/crossed frames 67, 52, 62, 72), S wrong shade 0, D game-zone defect 3-22 per frame (most on
  897 and 889, the 95-only crosscheck frames). The crude blind rules are a lower bound on what the zone filter fixes, not a proposal.
* **Stick fit fix (v5.2b):** toe = max(distance from grip + drop below grip) (was: farthest from the grip -> picked the butt end on
  370/889/42/67), heel searched within 8 px of the toe, blade fallback = last 4 px, isolated stray 136 px dropped (42 x29 y13).

# v5.3 — one 3D stick man per SPA pose across the 8 directions + stick from the drawn stick pixels (Abdul pt793u)
`scripts/playerlayout/spa_groups_v5.py` parses the SPA tables in `Sprite-Viewer/data/frames95pc.asm` (8 directions per SPA, frame/duration
pairs). Groups found for the test frames:
* **SPAskate phase 0**: 42 d0, 47 d1, 52 d2, 57 d3, 62 d4, 67 d5, 72 d6, 77 d7 (all 8 directions are already test frames).
* **SPAcrosscheck phase 0**: 889 d0, 891 d1, 893 d2, 895 d3, 897 d4, 899 d5, 901 d6, 903 d7 (siblings 891-903 added; idx 30, missing from
  zn.json, treated as gear on 891/893/901/903).
* **SPAanthem1 phase 0**: 370 is the same frame for all 8 directions -> nothing to rotate; single-view only.
`scripts/playerlayout/pose3d_v5.py` fits ONE set of 3D joints per group (body frame right/up/forward, incl. head, 4 torso segments, arm and
leg segments, stick butt/heel/toe). Per direction only the yaw (45 deg x d; d0 facing away, player right = screen right; d4 facing camera;
d2 near = right; d6 near = left) and a 2D offset change; one scale and one camera pitch per group. Soft-L1 least squares on the 2D joints of
every sibling frame + bone samples kept on the sprite silhouette + equal left/right limb lengths. Per-frame L/R swap test: no swap improves.
Mean / max joint error (px) and bone-on-sprite share in `pose3d_v5.json`. Worst: 891 and 903 (stick ends 17-19 px off; the 2D stick fit
there disagrees with the shared pose: the stick is drawn differently or the end is misread), 77 stick butt 13.6, 57 L skate 11.1.
**Stick (2D, per frame, from the drawn pixels):** shaft = the straight line holding the most stick pixels (a glove on the line counts 2),
its far end = the drawn butt (370 reaches eye level), extended to a glove beyond it (42: both hands); blade = off-line stick pixels or
black tape (idx 0, not skates) within 4-6 px of the heel; straight sticks: blade = last 3 px. 72 still has blade >= shaft (shaft hidden
behind the body); flagged, not changed. Texture mapping unchanged.

## v5.4 — per-direction pose refinement + free yaw

Script: `sprite-textures/scripts/playerlayout/pose3d_v5.py`; outputs in `sprite-textures/playerlayout/pose3d_v54/`.

- Stage 1: one shared 3D pose per SPA, each frame's yaw fitted freely (weak prior to 45°×d, 0.3 per 10°). Yaw scan every 5° checks it's a real minimum.
- Stage 2: per frame, the shared pose is the prior; joints can move with a penalty of 0.8 per px and 0.12 per degree of bone-direction change. Stick is still fitted from drawn pixels.
- Sheets: 6 px padding plus columns sized to fit their labels (no clipping), split into `_a`/`_b`.

| frame | nominal | fitted yaw | scan best (err best / at nominal) | shared mean/max err | refined mean/max err | dev mean/max px | dev max bone ° |
|---|---|---|---|---|---|---|---|
| 42 | 0 | -2.5 | 0 | 1.23/5.27 | 0.60/2.08 | 0.72/2.98 | 8.8 |
| 47 | 45 | 32.3 | 30 (0.98/1.19) | 0.98/1.50 | 0.61/1.00 | 0.31/0.69 | 4.9 |
| 52 | 90 | 90.9 | 90 | 1.36/3.38 | 0.75/2.21 | 0.63/1.20 | 8.5 |
| 57 | 135 | 179.1 | 180 (1.60/2.40) | 1.60/5.28 | 1.17/4.42 | 0.51/1.30 | 9.0 |
| 62 | 180 | 179.0 | 180 | 1.53/3.73 | 0.94/3.04 | 0.68/1.35 | 6.2 |
| 67 | 225 | 224.2 | 220 | 2.85/6.41 | 1.66/4.11 | 1.00/3.11 | 13.1 |
| 72 | 270 | 274.5 | 275 | 1.36/4.08 | 0.72/2.05 | 0.72/2.26 | 6.6 |
| 77 | 315 | 289.6 | 290 (2.59/2.84) | 2.60/11.38 | 1.74/9.27 | 0.83/2.22 | 8.2 |
| 889 | 0 | -2.9 | 355 | 1.00/2.90 | 0.62/1.68 | 0.47/1.65 | 5.2 |
| 891 | 45 | 94.0 | 90 (2.89/4.28) | 2.88/10.49 | 1.67/5.52 | 1.07/4.48 | 11.9 |
| 893 | 90 | 93.2 | 95 | 2.02/4.21 | 1.12/2.97 | 0.71/2.47 | 5.7 |
| 895 | 135 | 142.3 | 140 | 1.41/2.86 | 0.78/1.36 | 0.62/1.95 | 5.6 |
| 897 | 180 | 174.3 | 170 | 0.77/1.57 | 0.47/1.03 | 0.38/0.82 | 2.9 |
| 899 | 225 | 210.8 | 210 (1.36/1.72) | 1.34/2.59 | 0.80/1.98 | 0.56/1.26 | 4.9 |
| 901 | 270 | 266.0 | 265 | 1.73/3.45 | 0.88/1.92 | 0.66/1.99 | 5.8 |
| 903 | 315 | 267.8 | 275 (2.81/3.58) | 2.85/8.45 | 1.61/4.51 | 1.09/4.63 | 13.8 |

Flags: 57, 891 and 903 snap to the neighbouring direction's yaw (about 180°, 93° and 268°). The art may really be drawn that way, or the 2D joints may not pin down the yaw, so check them by eye. Crosscheck yaws are 3–14° off the 45° grid. 77's stick butt is still the largest error (9.3 px). 62's torso still looks compact; that comes from the crouched front-on art.

## v5.5: legs allowed to move, plus occlusion (Abdul pt800u)

Outputs are in `sprite-textures/playerlayout/pose3d_v55/`.
- **Old limit (v5.4):** 0.8 per px of joint movement and 0.12 per degree of bone-angle change, for all joints. Observed deviations reached 9–14° and up to 4.6 px.
- **New limit:** leg joints 0.1/px and 0.01/deg (effectively free); other joints 0.4/px and 0.05/deg. Bone lengths are held (1.5 per px of length change), so nothing stretches.
- **Leg pixels:** each leg's bones must lie on that leg's own pixels (seg parts 10/12/14 for R, 11/13/15 for L, plus 16 for the hips). This applies in both stages, so it also affects yaw.
- **Occlusion:** a side with fewer than 3 upper- or lower-leg pixels counts as occluded. Its 2D leg joints are dropped. On 57 the "L skate" was stray pixels by the stick. The occluded leg is placed on the near leg's pixels and pushed behind it in depth.
- **Seg fallback:** where the segmentation put hip == knee, that knee is ignored.

Needed deviation from the shared pose for the reported legs (°):

| frame | R thigh | R shin | R skate | L thigh | L shin | L skate | legs visible |
|---|---|---|---|---|---|---|---|
| 57 | 18.8 | 23.8 | 5.8 | 2.4 | 4.7 | 1.1 | R only (L behind) |
| 891 | 24.7 | 31.6 | 39.1 | 18.2 | 23.0 | 39.5 | both |
| 903 | 30.0 | 26.8 | 55.8 | 27.0 | 41.3 | 35.3 | both |

Yaw / error (shared → refined mean/max px; deviation max px / max bone °):

| frame | nominal | shared yaw | refined yaw | 5° check best | shared err | refined err | dev |
|---|---|---|---|---|---|---|---|
| 42 | 0 | 6.2 | -13.5 | 0 | 1.85/7.59 | 0.59/3.16 | 6.45/58.9 |
| 47 | 45 | 43.5 | 44.5 | 45 | 0.96/1.89 | 0.27/0.77 | 2.45/30.2 |
| 52 | 90 | 98.6 | 99.4 | 95 | 1.52/2.80 | 0.51/1.51 | 2.81/34.1 |
| 57 | 135 | 158.6 | 153.7 | 165 | 1.35/3.16 | 0.39/1.03 | 2.50/23.8 |
| 62 | 180 | 180.4 | 175.6 | 180 | 1.62/3.94 | 0.59/2.32 | 3.34/49.9 |
| 67 | 225 | 224.5 | 225.7 | 220 | 2.75/7.30 | 0.67/1.26 | 5.17/48.1 |
| 72 | 270 | 277.8 | 278.1 | 275 | 1.44/5.32 | 0.42/1.36 | 4.99/27.0 |
| 77 | 315 | 236.4 | 269.3 | 290 | 4.35/7.93 | 0.72/1.90 | 9.52/45.5 |
| 889 | 0 | 0.4 | -1.4 | 0 | 1.19/4.40 | 0.56/2.99 | 2.28/33.5 |
| 891 | 45 | 83.7 | 89.5 | 85 | 2.79/10.16 | 0.65/1.66 | 8.86/39.5 |
| 893 | 90 | 81.9 | 82.2 | 85 | 2.04/3.94 | 0.78/2.15 | 3.05/27.3 |
| 895 | 135 | 197.5 | 197.7 | 195 | 1.34/3.46 | 0.44/1.19 | 3.26/24.1 |
| 897 | 180 | 186.1 | 187.2 | 185 | 0.93/1.45 | 0.38/0.90 | 1.54/29.0 |
| 899 | 225 | 204.0 | 205.1 | 205 | 1.06/2.48 | 0.39/0.89 | 4.23/44.3 |
| 901 | 270 | 256.3 | 256.7 | 255 | 1.75/3.55 | 0.60/1.75 | 3.70/29.7 |
| 903 | 315 | 263.3 | 257.2 | 265 | 3.16/9.30 | 0.64/2.50 | 6.91/55.8 |

With the legs corrected, 57 moved off the 180° snap to about 154°. 891 (about 90°) and 903 (about 257°) still sit near the neighbouring direction, and 895 moved to about 198°. So yaw on the crosscheck art is still poorly constrained; check by eye.

## v5.6: approved forearm stretch on 72 L and 77 R (Abdul pt807u)
- **Mapping (`frames_v5.py`, `ARM_STRETCH={(72,'L'),(77,'R')}`):** forearm row = `15 + floor(3u)`, with `u = d_stripe3 / (d_stripe3 + d_end)`. Template rows 15-17 are spread evenly over the drawn forearm (4 rows, factor 1.33). Every other arm stays at factor 1.0.
- **No skipping:** the row is capped at the unstretched `15 + floor(d_stripe3 - 0.5)`, so a stretch can only slow the rows down and never skips a texel row. Without the cap, 72 jumped from arm stripe 2 (row 13) straight to row 16.
- **77 R has no glove pixels:** the forearm's far tip (the pixels furthest from arm stripe 3) is used as the end.
- **Mapping changes:** 72 changes 1 pixel (17 -> 16); 77 changes 2 pixels (17 -> 16, and 17 moves one column). Both forearms are short, so the change is small.
- **Checks:**
  - Round trip with game colours: 0 on 5 teams x 11 frames.
  - Team render errors: 0 on all 6 textures.
  - Control test A: 0 mismatches.
  - Texture vs template (`check_v5`): occupancy 0, unexplained 0.
  - Stripe checks:
    - kinks: unchanged (5 total; 0 on 72 and 77).
    - red flags (contiguity): unchanged (41).
    - 72 capacity runs: 10 -> 9.
    - 77: one new 'other' run at row 16 (4 -> 5). This is the repeated row the stretch introduces.
    - 77 R forearm angle step: 16.8 -> 26.6°.
    - Arm thickness: unchanged.
- **Sheets:** `playerlayout/v5/frames/stripe_diagnostic_with_texture_sheet.png` (the texture at 6x with row numbers, forearm rows 15-17 boxed, beside every frame) and `stretch_72_77_closeup.png`. Script: `scripts/playerlayout/stretch_sheet_v5.py`.

## v5.7: per-frame skeleton source, 2D vs v5.5 3D fit (Abdul pt816u)
`pose3d_v5.py` now saves the projected refined per-frame joints (`joints2d`) in `pose3d_v55/pose3d_v5.json`. `frames_v5.py` can take a frame's
arm and chest joints from it: `SKEL3D_FRAMES` defaults to `67,42,47`, `all` uses every frame, and an empty value uses none. Pixel segmentation, torso bands and arm distance fields
are unchanged, so only the arm axis and column side use these joints.

Blind geometry test (mismatches summed over 5 teams; R wrong row / P wrong part / S shade / D zone defect):

| frame | 2D | 3D | adopted |
|---|---|---|---|
| 370 | 301 | 301 (no 3D fit, single frame) | 2D |
| 897 | 334 | 348 | 2D |
| 57 | 361 | 361 | 2D |
| 62 | 387 | 418 | 2D |
| 67 | 595 | 583 | **3D** |
| 52 | 477 | 477 | 2D |
| 72 | 446 | 462 | 2D |
| 889 | 328 | 385 | 2D |
| 42 | 280 | 279 | **3D** |
| 47 | 274 | 272 | **3D** |
| 77 | 283 | 321 | 2D |

Per team, before → after (mismatch, R/P/S/D):
- tor: 743 (442/220/0/81) → 740 (440/217/0/83)
- nyr: 842 → 840
- chi home: 857 → 856
- chi away: 853 → 851
- mtl: 771 → 764

All-3D would be worse: tor 773, nyr 877, chi home 882, chi away 889, mtl 786. Stripe checks (kinks, red flags, 2-px runs, angle steps, thickness) are identical for the 2D, 3D and mixed sources. Round trip, team errors and control A are all 0.

## v5.8: torso row-balance review of 67, 52, 62 (all kept as main)

**Frame 67** (Abdul asked whether row 12 rises too high and squeezes row 10). Variants compared (preview only, never committed):

| variant | rows 9-13 px | kinks | max torso angle step | result |
|---|---|---|---|---|
| MAIN | 7/6/10/4/2 | 1 | 57.7° | **kept** |
| u^1.8 stretch | - | - | - | squeezed row 10 and moved the lower-left island (rejected) |
| A | - | - | - | crowded row 9 with a 3-px-thick row (rejected) |
| B: equal-count rows, island pinned to row 11 | 6/5/10/5/3 | 1 | 38.8° (also 30.5°) | rejected |
| C: harmonic field, island free (`TORSO_HARMONIC=67 TORSO_NOISLAND=1 TORSO_MODE=eq`) | 6/6/5/6/6 | 0 | 26.4° | rejected |

C row angles: 103.4/77.1/95.2/119.2/126.9°, but the 4 island pixels (x7-8, y8-10) move to row 9 and ~19 body pixels shift down one row. Control errors are 0 in all variants. Decision: keep MAIN.

**Frame 52**: rows r6:4 r7:8 r8:8 r9:6 r10:5 r11:4 r12:2 r13:2 r14:1; 4 kinks (6 forced), max step 56.7° between row 7 (117.9°) and row 8 (61.2°). The jump is between yoke rows 6-8, fixed by game art (~120°), and the jersey (~60°); harmonic equal-count smoothing changed 0 pixels. Decision: keep MAIN.

**Frame 62**: rows r12:7 r13:8 r14:8 r15:7 r16:3; 0 kinks (6 forced), max step 8.3°. Forearms are 1-2 px long and only reach rows 15-16 (row 17 is never drawn); harmonic forearm smoothing changed 0 pixels. Decision: keep MAIN.

Preview scripts lived outside the repo (scratch); no code change.


## v2 38x32 mapping decisions (2026-10-23, from DECISIONS_v2.md)
- D1 2026-10-23: The control-diff harness (ctrl.py) is the acceptance test: 5 teams x 11 frames, 0 px diff, 0 occupancy diff. Before the fix it was 132/155/171/171/155 px.
- D2: Packing groups by (zone,row,family), not (zone,row). Reason: all mismatches before the fix were family slips (pants stripes, yoke corner, shoulder patch). After the fix: 0 on all 55 team-frames.
- D3 (Abdul's rule): fewer pixels than texels means a contiguous block centred in the row, offset (n-m)//2, with the outer columns dropped first. This replaced the min-|ds| best-fit offset. Anthem 897 uses 234 texels (was 242).
- D4: The back pants have no 'pants stripe 2' texel, because wide col 74 (old 53, a duplicate of old 29) was dropped. Back-pants stripe-2 pixels (row 17, 3 groups, 3 px in frames 57/72/42) therefore wrap to the front-half stripe-2 texel on the same row (v2 col 3). The panel physically wraps there, so this is the same texel the game duplicated. The verifier reports these as 3 'wrong_zone' px; this is intentional.
- D5: Fallback order for a missing family: same row, then nearest row ±1..3 in the zone, then the pants wrap. Only D4 was triggered.
- D6: Crest (idx), skin and gear texels are direct-mapped and are never targets for ordinary pixels.
- D7: Overflow (more pixels than texels) is unchanged: stretch evenly from the centre.

## v2 first pass: socks, helmet, skates, gloves, stick (2026-10-24)
Script: `v2_38x32/scripts/v2map3.py`. The `PARTS` env var turns on family-aware remapping per part, cumulatively in the order socks → helmet → skates → gloves. `parts.py <part>` runs the 5-team control diff, the part stats and the sheet. `gearcons.py` runs the gear consistency check. Results are in `v2_38x32/part_<part>.json`.
- D8 Socks: the zone is the existing leg texels (rows 23-31, socks / socks stripe 1/2 families, front cols 4-14 and back 25-34). No canvas change. Socks are remapped by (zone,row,family) with the centre and stretch rules. Control diff is 0 on 5 teams x 11 frames, with 0 family and 0 zone mismatches. 58 texels are used. 1-8 shared texels per frame because of overflow, worst in 67 (33 px on 25 texels).
- D9 Helmet: the zone is the helmet-family texels in rows 0-5 (front cols 5-13, back 27-31). No change. Control 0. 40 texels used. 1 px per texel in every frame except 889 (23 px on 20 texels, 3 shared).
- D10 Skates: the zone is the gear texels in leg rows 28-31. They are now remapped among gear texels only, and skin/crest texels stay protected. Control 0. 52 texels used.
  **Limit:** in game, skates are 76% index 0 (black). The rest is per-frame detail: index 8 (14%), 28 (8%), 1 and 31. That detail does not belong to a texel. Even the original direct mapping has 63 of 292 skate pixels that disagree with their texel's majority index (64 of 292 after the remap). So skates can only be texture-driven if we accept those ~22% detail pixels drawn as fixed game index. The renderer keeps the game index for gear, so the control stays 0.
- D11 Gloves: the zone is the gear texels in arm rows 18-20, including the added columns 0, 19, 20 and 37 (these are now used). No further expansion. Remapped family-aware with centre and stretch. Control 0. 38 texels used. Glove pixels per frame are 9-34 on 6-21 texels, so stretch-sharing is heavy (up to 13 shared texels in frame 57); a 4-wide glove block would reduce it. In game, every glove pixel is index 0 at a flat level, so texture-driven gloves would be exact (0 conflicts).
- D12 Stick: the stick is not in the jersey texture in game. It is fixed palette index 136, at 6-24 px per frame (frame 47 has no index-136 pixels). New zone: **rows 0-1, cols 14-26**, which were magenta, so the canvas does not grow.
  - Pixels are ordered along the stick's main axis, with t=0 at the end nearest the gloves.
  - Steps along the length map to columns: centre-contiguous when there are ≤13 steps, stretched evenly when there are more.
  - The central pixel of each step goes to row 0; a second, thicker pixel goes to row 1.
  - Control 0. 22 of 26 texels are used. Sharing only in 370 (6) and 897 (11) and 62 (1).
  - Shadow/ice indices 88 and 82 stay fixed and are not part of the texture.
- D13: The diff sheets show the part's pixels in the test-texture colours. Sheets with game sprites are kept local and not committed.

## Goalie gear first pass (2026-10-24)
Script: `v2_38x32/scripts/gmap.py <part>`. Results: `v2_38x32/goalie/g_<part>.json`.
- D14 **Goalie test frames (8):**
  - 413: front/side stance
  - 416: back, catcher visible
  - 422: back with blocker raised
  - 428: front, catcher up
  - 449: front blocker save
  - 519: pad save / wide stance
  - 980: front glove save
  - 1000: stack/dive (lying)
  These were chosen from a candidate sheet of 15 frames: 375, 410, 413, 416, 419, 422, 428, 447, 449, 471, 519, 521, 980, 1000, 1040. They cover front, back, side, save poses and a dive, each shows at least one gear part, and their segmentation looked plausible. Rejected: 419 and 1040 (pads/blocker segmentation bled into the arms and torso), 375 (fall pose, mostly mask).
- D15 **Goalie needs its own texture layout.** The gear is not in the skater 38x32. Its pixels come from the older `uv.py` part segmentation (`goalie_mask/blocker/catcher/pad`) and per-pixel U,V, not from the v5 per-texel maps. It also does not fit the skater v2: there are 448 free (magenta) texels, but they are fragmented, and a pad alone needs a 19x21 block.
  - Draft **goalie companion texture, 38x32:**
    - pad: cols 0-18, rows 0-20 (both pads share it; the back view is mirrored as in uv.py)
    - blocker: cols 19-28, rows 0-9
    - catcher: cols 19-28, rows 10-19
    - mask: cols 29-35, rows 0-5
  - Sizes are the measured max capacities (`capacity.json`: pad 19x21, blocker/catcher 10x10, mask 7x6).
  - Goalie jersey/pants are meant to reuse the skater v2 zones, but that is **blocked**: the per-texel skater maps (v5 `MAPS`) do not exist for goalie frames. Next step is to extend the v5 per-pixel mapper to goalie frames.
- D16 **Rules applied to the gear:**
  - Row = round(V·(h-1)).
  - Group by (connected component, row, family). Pads are separate components that share texels.
  - Order by U; centre-contiguous if fewer pixels than texels, stretch from centre if more.
  - Families: the goalie gear is drawn with skater palette zones (arm stripe 1/2/3, forearm, upper arm, socks/socks stripes, plus fixed idx0/idx135). Each texel's family is the majority vote of naive-UV placements across the 8 frames; texels never hit take their row's nearest family (edge extension).
  - Fallback: nearest row ±3 with the family, otherwise any texel in the row (counted as wrong).
- D17 **Control.** Each pixel is rendered as the palette entry of its texel's family at the pixel's own shade level, then compared with in-game for tor HOME, nyr AWAY, chi HOME/AWAY and mtl HOME.

| part | px wrong per team | texels used | note |
|---|---|---|---|
| mask | 3 (all teams) | 22/42 | the 3 px are idx135 cage pixels; no texel holds that family. Fix: give the cage its own texel |
| blocker | 0 | 49/100 | 0 shared except 1 in 519 |
| pad | 10 (9 for mtl) | 280/399 | the families idx0 and upper arm are missing from some rows (5+5 px); 169 px used a row fallback; 11-39 shared texels per frame |
| catcher | 0 | 57/100 | |

- D18 **Known limits:**
  - Segmentation quality: pads include some sleeve-coloured pixels, and the "mask" in back frames is the helmet back.
  - The front/back flag from uv.py is heuristic.
  - Before a second pass: hand-check the segmentation on the 8 frames, add a cage family texel, and consider separate left/right pad blocks.
- D19: The goalie sheets contain game sprites and are kept local.

## Skate texture v1 (2026-10-24)
- D20 **Problem:** the first pass rendered skates with the game index (gear), so the skate texels did not drive colour. In-game, skate pixels use 5 fixed indices: 0 (boot black, 76%), 8 (dark grey, 14%), 28 (steel blue 0,64,128, 8%), 31 (dark blue 0,32,64) and 1 (white 232). They are the same in every team palette and all LEV flat.
- D21 **Layout (no canvas expansion needed):** the existing 26 skate texels per zone (legF cols 4-7/11-14, legB cols 24-27/31-34, rows 28-31) get a dedicated family each. Per foot, left foot as written and the right foot mirrored:
  - row 28: boot boot boot
  - row 29: hilite(1) boot boot grey(8)
  - row 30: boot boot grey blade(28)
  - row 31: blade-dark(31) blade(28)
- D22 **Mapping:** skate pixels are grouped by (zone, row, in-game index) and placed on texels of that family with the usual centre-contiguous / stretch-from-centre rules. Fallback is the nearest row in the zone (59 of 292 px across the 11 frames). Stretch happens on boot rows (22 groups) and a few grey/blade groups.
- D23 **Result:** the control texture paints each skate texel with its family colour, and the skate pixels render the texel colour (not the game index). Diff is **0 on 11 frames x 5 teams**, and the rest of the figure also stays at 0.
- D24 **Textures:** `skates/skate_texture_test.png` uses the in-game colours and `skate_texture_realistic.png` is black boot / grey / silver blade (176,180,190) / blade shadow / white highlight. Magenta = non-skate texels (overlay these onto a jersey texture). The sheet with game frames stays local.
- D25 **Gloves/stick on extra frames:** `scripts/glovestick.py` covers 20 extra frames with no v5 per-texel maps. It uses an approximate uv.py placement: glove arm by screen side and front/back, glove row 18+round(2V), and the stick by the SVD axis. It is for visual inspection only, not control-verified.
- D26 **Fuhr:** `scripts/fuhr_build.py`. Grant Fuhr is #31 G, team index 1 = BUF, from the NHL95 PC KEY.DB player record. No per-goalie colour data exists, so his gear uses the Buffalo HOME/AWAY palettes. The draft goalie texture filled by family gives 13 wrong px over the 8 goalie frames (the known mask-cage and pad family limits, D18).

## Abdul decisions pt857 (2026-10-24)
- D27 **Glove block 3 -> 4 columns (YES).** FR (cols 0-2) and BR (35-37) were 3 wide; FL and BL were already 4. The canvas stays 38 wide: FR takes pants-front col 3 and BR takes pants-back col 34, **on glove rows 18-20 only** (no free cells exist beside them; the free cells at rows 21-22 cols 0-2 are below the glove, not beside it).
  - Result over 11 frames: glove texels shared by 2+ px 79 -> 65, glove texels used 157 -> 171.
  - Cost: pants rows 18-20 shared 14 -> 19 (pants front 13 -> 12 cols and back 11 -> 10 cols on those rows only).
  - Control diff 0 on 5 teams x 11 frames. Files: `decisions/glove4*.json`, `glove4_sheet.png`.
- D28 **Keep 38 wide, no spacers (decision).** Per-texel lookup is unaffected by touching zones; spacers only matter for filtering/bleed, which we don't use.
- D29 **Arm rows 11 / 15 (illustration only, layout unchanged).** Measured on the current mapping (arm groups by zone/row/family, 11 frames):
  - row 11: 5/22 groups overflow (23%), 4 frames, 8 shared texels
  - row 15: 7/18 (39%), 6 frames, 10 shared
  - every other arm row 8-17: <=14%, rows 12-14 0%
  - The earlier ~45%/~35% figures were "frames needing >=1 extra column", a different metric.
  - Most overflow is in the BACK arms (BL/BR). The front arms could take the free cells col 4 / col 15 on rows 11/15 (8 -> 7 and 10 -> 9 shared). Fixing the back needs a whole column (canvas 40 or back torso -1): 8 -> 3 and 10 -> 3 with all 4 arms. Awaiting Abdul's decision.
- D30 **Goalie: pads split L/R + cage texel (YES).**
  - padL is (0,0,9,21) and padR is (9,0,10,21). Pad pixels are split per frame at the widest empty-column gap (else median x).
  - The cage (index 135) gets its own texel at (36,0), beside the mask block.
  - The family lookup falls back to the nearest row anywhere in the block when the family is missing within +-3 rows.
  - Control: mask 3 -> 0 and pads 9-10 -> 0 px per team; blocker and catcher stay 0.
  - Cost: pad shared texels 181 (one block) -> 95 + 117 (narrower blocks).
- D31 **Stick blade (recommendation, not applied).** Over all 588 skater frames that have a stick:
  - blade width (last 4 steps): 1 px 265, 2 px 300, 3 px 23 (96% fit in 2 rows)
  - shaft 1 px thick in 559
  - length median 13, p90 21, max 31; 263 frames (45%) are longer than the 13-col strip
  - Recommendation: no extra blade rows needed. Length is the bigger limit; consider ~20 cols. A 3rd blade row only if 3-px blades look wrong. See `stick/stick_analysis.png`.
- D32 **Oilers Fuhr from Abdul's v12 art** (`textures/v12/tex_gear_*`, the latest per git cef5d05). Laid into the D30 layout using `goalie2/fuhr_oilers.py`. Every resize is in `fuhr_oilers_resize_log.json` with the kept rows/cols:
  - pad 15x25 -> 9x21 (L) and mirrored -> 10x21 (R), nearest
  - blocker 8x12 -> 10x10: rows dropped 2 and 8, width edge-extended +2
  - catcher 11x9 -> 10x10: col 5 dropped, +1 edge row
  - mask 6x7 -> 7x6: row 3 dropped, +1 edge col
  - cage = the darkest mask texel
  - mask_b is reserved 1:1 at cols 29-33 rows 6-11, not mapped yet
  - pad_b is not placed (needs a layout decision for rows 21-31)
  - Measured 8-frame sprite extents (max px per row): pad 7-8 per side (12-13 when sprawled), blocker 6, catcher 6, mask 4-5. The blocks are kept at the capacity.json sizes.
- D33 **Player gloves** (v12 edmonton/ottawa/redblack, 5x9) -> 4x3 per arm on the D27 block. Kept cols 0,1,3,4 and rows 1,4,7 (nearest); left arms mirrored. This is a large vertical reduction (9 -> 3 rows) because the glove block has 3 rows. Script `gloves/gloves_tex.py`, textures `gloves/glove_*_v2block.png`.

## Goalie layout v3: pad backs, default-gear control 0, Fuhr redo (Abdul pt859u, 2026-10-24)
Folder `v2_38x32/goalie3/`. Scripts: `g3map.py` (mapping + control), `g3sheet.py` (sheets), `fuhr3.py`, `layout_diagram.py`, `diag_g3.py` (numbers below, in `diagnosis_numbers.json`).

- D34 **Why the Oilers Fuhr pass (D32) looked wrong.** These are measured on the D30 mapping over the 8 goalie frames:
  1. **Pad backs were never used.** uv.py has a single `pad` region and only mirrors U on back-facing frames. D30 therefore drew back views (416, 422, 519, 1000) from the pad FRONT art: 597 of the 1020 pad pixels (59%). The `pad_b` art was not placed at all. The same applied to the mask: 67 of the 94 mask pixels are back-of-helmet pixels, and they were drawn from the mask-front art. `mask_b` was reserved but not mapped.
  2. **Placement was by family run, not by position.** D30 grouped pixels by (component, row, family) and packed each run centre-contiguously onto that family's texels in the row. A pixel's column therefore depended on how many same-family pixels were in its row, not on where it sits on the pad. 547 of the 1020 pad pixels (54%) landed 2 or more columns away from their geometric column (mean shift 2.7 columns on padL and 2.9 on padR). Blocker, catcher and mask shifted by a mean of 1.5-1.9 columns. Control colours do not show this. Real art does: it gets scrambled.
  3. **Blocks were sized to capacity, not to the art or the sprite.** Blocker and catcher were 10x10 blocks, but the sprite parts are at most 6x7 (blocker) and 6x8 (catcher), and the art is 8x12 and 11x9. To fit the 10x10 blocks, the art had rows or columns dropped (blocker rows 2 and 8, catcher col 5, mask row 3) and then edge-extended (+2 blocker cols, +1 catcher row, +1 mask col). Only the centre texels were ever hit (blocker 49 of 100 texels, catcher 57 of 100), so the art's edges and design were mostly lost.
  4. **Segmentation noise put wrong pixels into the head part.** Index 164 ("goalie mask") is also drawn on the lower body (pad straps): 62 px on 413, 416, 422 and 449. These sat in the mask region, so the mask bbox stretched from the head to the feet and mask art appeared at the skates. Small helmet-crown blobs drawn with socks colours or idx0 were labelled catcher or blocker (14 + 9 px on 428, 980 and 519).
  5. **U had no fixed direction.** The side_anchor sign is arbitrary per component, so the inner/outer pad edge flipped between frames (for example, 413 L increased right-to-left while 413 R increased left-to-right). The two pads of 413 are one merged component, so V on its left pad also ran toe-to-knee.
- D35 **Layout v3 (38x32), every Fuhr part fits including the pad backs.** See `goalie_layout_v3.png`.
  - Pads, named by SCREEN side:
    - front L (0,0,9,20) and front R (9,0,10,20)
    - back L (19,0,9,20) and back R (28,0,10,20)
  - blocker (0,20,8,12), catcher (8,20,11,9), mask front (19,20,6,7), mask back (25,20,5,6)
  - cage texel (30,20)
  - The pads are the only parts resized: front 15x25 -> 9/10x20 and back 17x24 -> 9/10x20, nearest, with the kept rows/cols in `fuhr_oilers_resize_log_v3.json`. Blocker, catcher, mask and mask_b are now 1:1 (no edge extension). Screen-right pads are the art mirrored, so the inner edge matches on both sides.
- D36 **Mapping v3: geometric first, family as a fallback.**
  - Front-facing frames (uv.py flag: crest or skin visible) use the front pad and mask blocks. Back-facing frames use the back blocks. Pad pixels in 416, 422, 519 and 1000 now hit pad-back texels: 651 px, with 155+161 of 380 back texels used.
  - Pads: each screen side gets its own PCA frame. V runs along the long axis from the end nearest the body (knee) to the toe. U runs across, increasing with screen x. The same rule is used front and back.
  - Blocker, catcher and mask: U,V come from the part's bbox in that frame.
  - Each texel's family is the majority vote of geometric hits. A family that has pixels in a block but no texel steals its best texel (1 case: arm stripe 3 in padF_L, 1 px).
  - A pixel keeps its geometric texel when the families match. Otherwise it moves to the nearest texel of its family in the same block. Result: 157 of 1082 pad pixels (15%) move 2 or more texels (was 54%). Mean shift is 0.5-0.7 on pads and 0.1-0.4 on the other parts.
  - Pure geometric mapping without the family fallback would give 303-386 wrong px per team.
- D37 **Segmentation clean-up applied before mapping.**
  - Mask = only the mask components starting within 3 rows of the topmost one. The others (index 164 on the legs, 62 px) are treated as pad pixels.
  - Blocker/catcher blobs inside rows 0-4 that start at row <=1 become mask pixels (helmet crown, 23 px), but only when the head is near the top (mask top <=5). This rule does not fire on the dive frame 1000.
- D38 **Default-gear control = 0.** The texture is family-labelled. Each texel is rendered at the pixel's own shade level (as in D17). Diff vs in-game is **0 px on all 8 frames x 5 teams** (tor HOME, nyr AWAY, chi HOME/AWAY, mtl HOME), with 0 fallbacks to wrong families. Per-team textures (medium shade): `default_gear_<team>.png`.
- D39 **Fuhr Oilers redo.** `fuhr_oilers_texture_v3.png` on the v3 mapping:
  - Back views now show the pad-back art (blue straps) and the mask_b art.
  - The red pad band sits on the upper pad.
  - Remaining speckle comes from the 15% of pad pixels relocated by the family fallback (D36), plus in-game idx0 outline pixels that now take art colours.
  - Sheets with game sprites stay local.
- D40 **Player glove test colours (Abdul is colour blind: luminance contrast, no red/green).** Edmonton navy (0,28,65) has only 1.24:1 contrast against the black sprite outline, which is why it is hard to see. Two options in `gloves/gloves_v3.py`:
  - A `glove_brightblue_v2block.png`: navy -> sky blue (140,210,255). That is 12.8:1 against black and 2.0:1 against the orange (255,77,0). A mid blue such as (0,120,255) would match the orange's luminance (1.2:1), so it was rejected.
  - B `glove_hc_check_v2block.png`: a white / blue (0,120,255) checker over each 4x3 arm block. Every neighbour pair is 4.1:1, and blue against the black outline is 5.1:1.
- **Open:**
  - (a) Keep idx0 outline pixels in the goalie gear fixed (not textured), like the stick shadow in D12? This would sharpen the art and remove some fallbacks.
  - (b) 519 is classed as back-facing by the crest/skin rule. Confirm by eye.
  - (c) Choose A or B for the glove test colour.

## Goalie segmentation v4 from palette zones, default gear rebuilt, glove contrast options (Abdul pt860u, 2026-10-24)
Folder `v2_38x32/goalie4/`. Scripts: `zones.py` (one sheet per zone family), `idxmap.py` (per-frame index grids), `seg4.py` (segmentation), `segsheet.py`, `g4map.py` (mapping and control), `g4sheet.py`. Layout v3 (D35) is unchanged.
- D41 **The goalie is drawn with skater zone indices.** The zone names in `zn.json` are skater names, so I worked out each index's goalie role from where it appears in the 8 frames (one zone highlighted at a time, `zones_*.png`) and from the index grids (`idx_<frame>.png`):
  - **Pad front:** outer side roll is arm stripe 2 (150-152), trim is arm stripe 1 dark (155), and the face is the socks zones (181-189: plain 181-183, stripe rows 184-186 and 187-189). Straps are 164. Toe/boot is 0, 31, 30 and 109. For example, 519 left pad row 23 reads `150 155 184 185 186 155`.
  - **Pad back:** arm stripe 2 (151/152), forearm (144-146), arm stripe 3 (147/148), 164 straps, 155 and 0. No socks face.
  - **Blocker:** the face is forearm (144-146) and the outline is arm stripe 3 (147-149), plus 0. The stick (136) touches it in 413, 416, 422, 449, 519 and 1000.
  - **Catcher:** the face is arm stripe 2 (150-152) and the outline is 147/148, plus 22.
  - Back views show the back of the glove with the same pattern on both hands: `150 151 152 151 / 149 148 147 148 / 144 145 146 145`.
  - **Mask:** the shell is pants dark (177), the helmet stripes are the socks-stripe zones (184-189), plus 164, 0 and 22. The cage is 135. On 519 and 980 the cage bars are drawn with 134 and with stick-colour 136 placed beside 134/135.
  - **Not gear:** 153/154 (arm stripe 1 light/medium) are sleeve stripes, never gear. 156-158 are the upper arm. Jersey, yoke, waist and pants are body. 136 elsewhere is the stick and 88 is the ice shadow (both stay fixed).
  - Because zones are shared between parts (arm stripe 2 is used by the catcher, pad sides and pad backs), colour alone cannot separate the parts. Each part = its zones AND a logical mask.
- D42 **Logical masks (`seg4.py`, rules applied in order).**
  1. Mask = head box ∩ head zones. Front if a cage pixel (135, or 134 and its bars) is present, otherwise back. 519 has a 134 cage row, so it is FRONT. This resolves open item (b): the crest/skin rule had called it back.
  2. Blocker = the glove that holds the stick, using blocker zones.
  3. Catcher = the other glove (front views: screen-left; back views: screen-right).
  4. Pads = the gear zones below the waist, split per row:
     - two segments → by side;
     - one segment (pads touching) → cut after the k-th 155 trim run (k=1 on 413, where the right pad shows its side; k=2 on 428, 449, 519 and 980);
     - back views use a fixed column (416 col 9, 422 col 22);
     - 1000 (lying) is split by rows: upper pad = L (rows 7-12), lower pad = R (rows 13-20).
  - Boxes per frame are in `SPEC`.
  - Facing: front 413, 428, 449, 519, 980, 1000; back 416, 422.
  - Pixels: pads F 564 / B 270, blocker 211, catcher 180, mask F 146 / B 63, cage 13 (1447 gear px).
  - Frames with no catcher: 413 and 449. It is hidden behind the body.
- D43 **Uncertain:** 1000 (dive): the facing (one 134 pixel), which pad is L/R, and the catcher (cols 27-31). 428 blocker is only 5 px, raised edge-on by the stick. 413 col 7-8 rows 13-18 (155/152 line) is left as arm, not pad. 416 blocker vs catcher is decided by stick contact; the D14 note "catcher visible" agrees.
- D44 **Default gear from seg v4 (`g4map.py`).**
  - Position-based mapping:
    - pads: V knee→toe (top→bottom; on 1000 from the body end to the toe), U per row from screen-left to screen-right. Inner edge = art right on L blocks; R blocks hold the art mirrored.
    - gloves and mask: per-frame bbox, mirrored on back views.
  - Texel family = vote-smoothed (geometric hits in a 3x5 window for pads, 3x3 for other parts). Without smoothing the texture looked speckled.
  - **Control = 0 px on 8 frames x 5 teams** (tor HOME, nyr AWAY, chi HOME/AWAY, mtl HOME).
  - **Colour-driven relocation: 535 of 1447 px (37%); 259 moved 2+ texels.** Per block (relocated / of which 2+ texels): padF_L 98/45, padF_R 145/95, padB_L 30/14, padB_R 48/28, blocker 54/14, catcher 66/18, maskF 72/37, maskB 22/8, cage 0.
  - Without smoothing: 433 relocated (149 moved 2+), still control 0, but the texture is scrambled.
  - 23 family steals, for families with no texel in the block (e.g. idx0 in the blocker, 10 px).
  - The default texture now reads as gear: red trims down both pad edges, white face, black toe rows, dark back straps, and a dark mask shell with cage bars. Files: `default_gear_<team>.png`.
- D45 **Fuhr Oilers on seg v4.** The real art is drawn with the **position map** (no relocation; relocation only exists to make the family control exact). The A row uses the EDM HOME palette. Sheets (local, they contain game sprites): `fuhr_oilers_sheet_v4.png` (position) and `fuhr_oilers_sheet_v4_relocated.png` (for comparison; it scrambles the masks and gloves). Texture: `goalie3/fuhr_oilers_texture_v3.png`, unchanged.
- D46 **Glove contrast options v4 (`gloves/gloves_v4.py`).** WCAG contrast ratios. The Edmonton orange (255,77,0) is 6.31:1 against black. Option A from D40 (sky blue) was 12.78:1 against black but only 2.02:1 against orange.
  - **A white** (navy → 255,255,255): 21:1 vs black, 3.33:1 vs orange (the maximum possible against this orange for any colour lighter than it).
  - **B white / dark (40,40,40) vertical stripes**, orange kept: white–dark 14.74:1, white–black 21:1, white–orange 3.33:1, dark–orange 4.43:1. The dark stripe against the outline is only 1.42:1; the white stripes carry the edge.
  - **C white + deep orange (215,65,0)**: 21:1 vs black, white–deep orange 4.52:1, deep orange–black 4.65:1. This orange luminance balances both pairs (best min-pair contrast of the three).
  - Caveat: white gloves on white home jerseys have little contrast against the sleeve.
  - Textures: `glove_v4{A,B,C}_v2block.png`. Numbers: `glove_v4_contrast.json`.
- **Open:** (a) choose glove option A/B/C; (b) Abdul to check the D43 uncertain frames on `segmentation_v4.png`; (c) whether to keep vote smoothing (coherent texture, 37% relocation) or raw votes (30%, speckled).

## Goalie skeleton v5: facing corrected (Abdul pt861u, 2026-10-24)
Folder `v2_38x32/goalie5/`. Scripts: `skel5.py` (base 3D pose, rotation, per-frame joints, L/R swap test), `skelsheet.py`, `seg5.py`, `segsheet.py`, `g5map.py`, `g5sheet.py`. Layout v3 (D35) is unchanged.
- D47 **Abdul's facing is authoritative and replaces D42.** 413 front (mask seen from the side, kept in the front texture), 416 front, 422 front, 428 back + front side, 449 back, 519 back, 980 back, 1000 back + front side (uncertain). D42 had 449, 519 and 980 as front and 416, 422 as back: it was inverted.
  - Why D42 was wrong: index 135 is not the cage. It is the **helmet back strap**, drawn at the back of the head on 413 (screen-left of the head, the goalie faces right), 428, 449 and 980; 519 and 1000 draw the strap with 134/136. The real mask front is the white face 164 with black eye holes 0 (413 (11,4), 416 (14,4)/(15,4), 422 (17,4)/(19,4)). The "cage present = front" rule therefore picked out back views.
  - The cage texel (30,20) is kept and renamed `strap`; it holds index 135 (13 px, same family on all frames, control 0).
- D48 **Skeleton (the player v5.3 method).** The SPA tables in `frames95pc.asm` give the goalie directions: SPAgready 407 d0, 410 d1, 413 d2, 416 d3, 419 d4, 422 d5, 425 d6, 428 d7 (same pose at 8 facings); 449 SPAgstackr d1/d2; 519 SPAgdive d0; 980 SPAgoaliepoke d0; 1000 SPAgoalieknee d1.
  - One 3D base pose (15 joints: head, neck, shoulders, elbows, hands, pelvis, hips, knees, ankles) is rotated by yaw 45 deg x d (d0 away, goalie right = screen right; d2 right side to camera, faces screen-right; d4 toward camera; d6 left side to camera), camera pitch 30 deg, and fitted per frame by scale + offset. Sheet `skeleton_base_rotation.png` (local).
  - The joints are then adjusted per frame by hand from the index grids (`ADJ` in `skel5.py`). Sheet `skeleton_v5.png` (local): yellow = goalie RIGHT, blue = goalie LEFT, white = spine; black outlines; sprite dimmed.
  - L/R swap test (sum of joint distances, base vs adjusted, unswapped / swapped): 413 66/78, 416 38/107, 422 57/127, 428 42/112, 449 52/110, 519 28/144, 980 44/134. The base identity wins on every frame except 1000 (153/151, a tie: the lying pose is not a rotation of the ready pose).
  - The directions agree with Abdul's calls: d0/d1/d7 are back views, d3/d5 front, d2 front side.
- D49 **What follows from the skeleton.**
  - Front views (413, 416, 422): goalie right = screen-left. Blocker (right hand, holds the stick) screen-left on 416/422; on 413 (profile, faces right) the near right hand holds the stick on screen-right and the catcher is hidden.
  - Back views (428, 449, 519, 980, 1000): goalie right = screen-right, so the blocker is screen-right and the catcher screen-left (519 cols 0-6, 980 cols 0-5, 428 cols 0-9). 449 catcher is hidden.
  - Pads by goalie leg: each pad pixel goes to the nearer leg bone (hip-knee-ankle). Blocks: front of the RIGHT leg -> `padF_L` (0,0), front of the LEFT leg -> `padF_R` (9,0), back of the LEFT leg -> `padB_L` (19,0), back of the RIGHT leg -> `padB_R` (28,0). On pure front/back frames this is exactly the old screen-side naming, so the inner-edge convention of the art (D35) still holds.
  - 1000 (lying, head screen-right): the lower (nearer) pad is the right leg (d1: right side near). Uncertain.
- D50 **Palette zones revised (D41 had the pad surfaces swapped).** D41 read the pad front from 519, which is a back view, and the pad back from 416/422, which are front views.
  - **Pad FRONT** = forearm 144-146 (white face) + arm stripe 3 147/148 (straps/trim), with 150-152 roll, 155 trim, 164 straps, 0. Example 422 right pad row 14 `148 146 148 151 150 155 155`.
  - **Pad BACK** = the socks zones 181-189 (the leg/sock seen between the back straps), with 155, 150-152, 164, 0. Example 519 left pad row 23 `150 155 184 185 186 155`.
  - Rule in `seg5.py`: socks -> back, 144-148 -> front; shared indices take the surface of the nearest zone-decided pixel of the same leg, except 413 right leg (shows only its outer roll/trim, set to front per Abdul), 422 (front), 449/519/980 (back).
  - The rule matches the rotation: socks appear on the pads of d2 413 (left leg, 29 px) and d3 416 (right leg's outer back, 30 px), none on d5 422, and both legs on d7 428 and the back views.
  - Gloves: the pattern `150 151 152 151 / 149 148 147 148 / 144 145 146 145` that D41 called "back of glove" is from front views (416, 422). Glove zones are the same in front and back views; the view only mirrors U.
  - Mask: front = 164 face + 0 eyes + 177 shell + stripes; back = 177 shell + 184-189 stripes + 135 strap (134/136 on 519/1000). 428: head cols <= 6 (face side, 4 px) -> mask front, the rest back.
- D51 **Segmentation v5 (`segmentation_v5.png`, local).** Pixels: padF_L 147, padF_R 158, padB_L 254, padB_R 285, blocker 211, catcher 180, maskF 94, maskB 115, strap 13 (1457 gear px). Per frame in `seg5_stats.json`.
  - Pad-back px went 270 (v4) -> 539; pad-front 564 -> 305. Mask back 63 -> 115 px, mask front 146 -> 94.
  - Uncertain: 1000 (which pad is which leg; catcher cols 27-31; mask all back); 428 blocker only 5 px; 413 has one stray padB_R pixel (a socks pixel next to the right leg); 416 right-leg back (30 px) is the leg's outer side, which Abdul may prefer as front.
- D52 **Default gear and Fuhr on seg v5 (`g5map.py`, same mapping rules as D44).** Control **0 px on 8 frames x 5 teams** (tor HOME, nyr AWAY, chi HOME/AWAY, mtl HOME). Relocation **539 of 1457 px (37%); 265 moved 2+ texels** (padF_L 50/31, padF_R 48/27, padB_L 102/61, padB_R 123/72, blocker 61/19, catcher 66/18, maskF 38/9, maskB 51/28, strap 0). 14 family steals. Textures `goalie5/default_gear_<team>.png`.
  - Fuhr Oilers (`fuhr_oilers_sheet_v5.png`, local, position map, texture unchanged `goalie3/fuhr_oilers_texture_v3.png`): the red-band front pad art now shows on 413/416/422 and the strap pad-back art on 449/519/980 (v4 had it the other way).
  - D44 check: the "259 moved 2+ texels" figure was recomputed from `g4map.py` (Chebyshev shift >= 2): 259, which is also the sum of its per-block numbers (45+95+14+28+14+18+37+8). Euclidean >= 2 also gives 259; Manhattan gives 322. No count gives 262, so D44 is left at 259.
- D53 **Player gloves baby blue + red (Abdul pt861u, `gloves/gloves_v5.py`).** Navy -> baby blue (170,215,255), orange -> red (210,0,0). WCAG: baby blue vs black 13.87:1, red vs black 3.74:1, baby blue vs red 3.71:1. The red is set so that its two contrasts are equal (the best minimum-pair contrast for this blue); a darker red (150,0,0) gives 5.2:1 against the blue but only 2.3:1 against the outline. Texture `gloves/glove_v5BR_v2block.png`, numbers `glove_v5_contrast.json`, sheet `glove_v5BR_sheet.png` (local).
- **Open:** (a) Abdul to check 1000 legs/catcher and the 416 right-leg outer side (front or back); (b) idx0 outline pixels still take art colours (D39 open item).

## Goalie v6: stick, skeleton UV, default gear from the sprites, mask wrap strip (Abdul pt863u, 2026-10-24)
Folder `v2_38x32/goalie6/`. Scripts: `skel6.py` (v5 joints + stick), `skelsheet6.py`, `seg6.py`, `segsheet6.py`, `g6map.py` (mapping + control), `g6sheet.py`, `layout6.py`, `fuhr6.py`. Sheets with game sprites are local (`/workspace/preview_v2/goalie6/`).
- D54 **Abdul's review of v5.** 416 good and 1000 pad/leg correct: kept unchanged. 422: stick pixels taken as pad front (fixed, D55). 428: blocker hidden (D55).
- D55 **Goalie stick in the skeleton; seg v6.**
  - `skel6.STICK` per frame: butt (index 0 knob or top 136), visible shaft polylines (index 136), heel/toe, blade box (index-0 tape), holding hand. The blocker hand (goalie RIGHT) holds the stick on all 8 frames.
  - Stick px (shaft within 1.5 px of a segment + blade): 413 23, 416 39, 422 34, 428 12, 449 10, 519 17, 980 5, 1000 11.
  - Seg v6 = seg v5 minus stick px. Freed from gear: **422 3 px** (17,23) (17,24) (18,24) were padF_L (the "FR" Abdul saw); 416 3 px (17,24-26) padF_R (blade heel; the rest of 416 unchanged); 428 3 px (6,23-25) padF_R (blade, uncertain: could be pad toe outline). Gear px 1457 -> 1448.
  - **428 blocker by rotation:** the base pose at d7 puts the right hand at depth -9.2, the farthest of the 15 joints (d0 407 -7.0, d1 410 -0.7 where the blocker is visible screen-right at (23,15)). Projected hand (11.6,11.8) is inside the torso silhouette, so the blocker is behind the body; only the cuff where the shaft meets the hand, (16-17,7-9), is visible. Blocker stays 5 px; nothing else in 428 is blocker.
  - Skeleton sheet `skeleton_v6.png`: labels RH/LH (hands) and RL/LL (legs, at the knee); stick pink (dashed = hidden behind gear, square = butt, boxes = blade).
- D56 **Layout v6 (38x32): mask is one wrap strip.** Pads, blocker and catcher rectangles are unchanged from v3 (D35) so the Fuhr pad/glove art still fits. Mask front 6x7 + mask back 5x6 -> one **12x7 strip at (19,20)**, strap texel moved (30,20) -> (31,20).
  - Strip column = ((180 - theta) mod 360)/360 x 12: back centre col 0, goalie right side col 3, FRONT cols 3-8 (front art reads left->right as seen from the front), left side col 9, back cols 9-11. Why: v5 cut the head into two boxes by a front/back label, so profile and three-quarter heads (413, 428, 1000) jumped between unrelated art; the strip is continuous around the head. Diagram `goalie6/goalie_layout_v6.png`.
- D57 **Geometric UV from the skeleton (`g6map.py`).**
  - Pads: V = projection on the leg's knee->ankle axis, pad top -> toe (1000 lying: along = screen-left). U = angle around the leg: theta = c - asin(s), s = across-leg offset / half-width in that V row, c = (4 - d) x 45 deg (d = SPA direction; 0 = goalie front, +90 = goalie right). Front blocks use theta in [-90,90], back blocks [90,270]; on pure front/back views this equals the old row normalisation, on d1/d2/d3/d5/d7 it follows the rotation.
  - Mask: same angle rule around the head (head row centre and half-width), V = head top -> chin.
  - Gloves: per-frame box, mirrored in back views (as v5). Tried V along elbow->hand: relocation 420 -> 431, so not used (joints too rough at glove scale).
- D58 **Default gear texture built from the sprites (Abdul's anthem method).** Each texel takes the family of the clearest frame that reaches it (`CANON`): pad fronts 422 then 416; pad backs 519, 980, 449; gloves 416, 422, 519; mask 416 (front), 413 (side), 449, 980 (back). Texels these frames miss: all-frame vote (186); never reached: extended from the nearest texel in the block (297). 5 family steals. Texel sources: 416 133, 422 174, 519 118, 449 56, 980 62, 413 9.
  - **Control = 0 px on 8 frames x 5 teams** (tor HOME, nyr AWAY, chi HOME/AWAY, mtl HOME).
  - **Relocation 415 of 1448 px (28.7%; v5 539 of 1457 = 37%). Moved 2+ texels: 93 (6.4%; v5 265 = 18%).** Per block (relocated / 2+): padF_L 30/7, padF_R 25/13, padB_L 72/16, padB_R 91/14, blocker 63/7, catcher 59/11, mask 75/25, strap 0. 2+ here = Chebyshev >= 2 or weighted distance >= 2 (at least the v5 count).
  - Pure all-frame vote instead of canonical frames: 376 relocated (26%), 88 moved 2+; kept canonical because the texture then reads as one frame's gear instead of a mix. No vote smoothing (D44 smoothing raised relocation).
  - Largest remaining sources: 1000 (lying: padB_R 31/70, mask 19/27, blocker 19/51), 428 (padB 32/89, catcher 15/39), 980 catcher 20/41, 519 mask 17/30.
  - Files: `goalie6/default_gear_<team>.png`, numbers `goalie6/g6_map.json`.
- D59 **Fuhr Oilers on layout v6.** `fuhr_oilers_texture_v6.png`: pad/blocker/catcher blocks as v3; mask strip = front art 6x7 at cols 3-8, back art resized 5x6 -> 6x7 (nearest) and split: its goalie-right half (art cols 3-5) -> strip cols 0-2, goalie-left half (art cols 0-2) -> cols 9-11. Drawn with the pure position map (no relocation). Sheet `fuhr_oilers_sheet_v6.png` (local, EDM HOME as A): front views show the white mask with the red top and black cage, 413 shows back art on the back of the head and the face on the front, back views show the back plate.
- D60 **Player gloves v6: stick excluded (`gloves/gloves_v6.py`).** Player glove pixels are all index 0, the same as the stick blade/butt tape. Rule: keep an old glove pixel only if it is within 2 px (8-connected, through glove pixels) of an arm/jersey pixel (128-191 without 134-136); runs touching only the shaft are blade/butt. Excluded px: 370 1 (butt), 897 6, 57 10, 62 10, 52 12, 72 9, 889 6, 42 9, 77 6, 67 0, 47 0 (69 total; glove px 238 -> 169; per frame in `glove_v6_contrast.json`). **Stick px changed by the recolour: 0 on all 11 frames** (stick = 136 + excluded). Colours unchanged from D53. Texture `glove_v6BR_v2block.png` (same as v5), sheet `glove_v6BR_sheet.png` (local).
- **Open:** (a) 428 (6,23-25) blade vs pad toe; (b) 449 (14,17-18) index-0 below the hand could be the paddle, left as pad back; (c) 1000 still the worst frame for relocation; (d) whether Abdul prefers the canonical texture or the vote texture (26%).

## Goalie v7: shading layer split from base colours (Abdul pt864u, 2026-10-24)
Folder `v2_38x32/goalie7/`. Scripts: `g7map.py` (v6 mapper + shading split), `g7sheet.py` (control / art sheets), `g7extra.py` (team textures, shading layer files, illustration), `fuhr7.py`. Sheets with game sprites stay local (`/workspace/preview_v2/goalie7/`).
- D61 **Which gear indices are shading, not base colour.** I checked every gear index in the 5 control palettes (tor HOME, nyr AWAY, chi HOME/AWAY, mtl HOME):
  - The light/medium/dark members of a team zone (forearm 144-146, arm stripe 3 147-149, arm stripe 2 150-152, socks 181-183, socks stripes 184-189) are already shade levels. The texel keeps the family and the shading layer keeps light/medium/dark, as for players (D17). Note that the zone names do not give the luminance order in every team: TOR "forearm dark" 144 = 252 is the brightest.
  - Families from different zones are NOT shades of one colour. For example, the TOR pad face forearm is white and the arm stripe 3 straps are navy; NYR forearm is navy and arm stripe 2 is red. They stay as separate base colours.
  - **To the shading layer:** 164 (near-white in all 5 teams, 204-236; this is the CHI light grey Abdul saw on the pads, 63 px on pad fronts) and 22 (fixed grey 228). Also idx0/109 (black outline, 185 px), 30/31 (fixed dark navy toe shading, 34 px) and 134/136 (fixed cage/strap bars on the mask back, 5 px). None of these indices changes with the team colours. **319 of 1448 gear px.**
  - Shading-layer pixels do not vote for a texel family and are never relocated. The default render outputs their fixed index, and a custom texture uses texel x level: light x1.125, dark x0.875, grey_hi x0.88, grey_lo x0.95, toe x0.3/0.4. Outline is black and the cage keeps its game colour.
  - Strap 135 stays as its own texel (31,20).
- D62 **Shading layer storage.** `goalie7/shading/<frame>.png`: 8-bit, one value per frame pixel (0 = not gear). Codes from `levels.json`: 1 dark, 2 medium/flat, 3 light, 4 grey_hi (164), 5 grey_lo (22), 6 outline, 7/8 toe shadow (31/30), 9/10 cage (134/136). Illustration `shading_illustration_v7.png` (local): A in-game / B base colour only / C shading as luminance, on frames 413, 416, 449, 519.
- D63 **Default gear v7 = base colours only.** `goalie7/default_gear_<team>.png` (medium shade). Big view: `default_gear_texture_v7_big.png` (local). It shows white pad faces, red trims/pad backs, dark grey straps and a black/red mask, with no light-grey or black speckle.
  - **Control 0 px on 8 frames x 5 teams.**
  - **Relocation 275 of 1448 px (19.0%; v6 415 = 28.7%). Moved 2+ texels: 50 (v6 93).** Per block (relocated/2+): padF_L 11/3, padF_R 17/10, padB_L 35/6, padB_R 57/11, blocker 52/2, catcher 56/9, mask 47/9.
  - Edge-extended texels: 436 (v6 297), because shading pixels no longer claim texels.
  - The all-frame vote mode gives 244 (16.9%), but canonical was kept (D58 reason).
  - The remaining relocation is between real team zones where the geometry does not line up: blocker forearm <-> arm stripe 3 (47), catcher arm stripe 2/3/forearm (53), pad back socks <-> arm stripe 1 (21+), and mask pants <-> socks stripe 2/1 (45). The worst frames are 1000 (76) and 428 (52). These conflicts are not shading, so "near 0" is not reachable without merging distinct team colours.
- D64 **Fuhr Oilers v7.** The v3/v6 Fuhr art itself carried baked grey shading. `fuhr7.py` snaps neutral greys (chroma < 30) to white (L >= 96, 623 texels) or black (67 texels); colours are untouched. The result is `fuhr_oilers_texture_v7.png`, drawn with the v7 mapping x the gear shading layer (`fuhr_oilers_sheet_v7.png`, local, EDM HOME as A). The pads read white with the red front band (416/422) and blue back straps, the mask is white with a red top, and the shading comes only from the layer.
- D65 **Player gloves v7: deep purple (70,0,120) + lime (170,255,0)** (`gloves/gloves_v7.py`, glove mask = v6, so the stick is excluded). WCAG contrast: purple vs lime 11.11:1, lime vs black 17.01:1, purple vs black **1.53:1**. Stick px changed: 0 on all 11 frames. Texture `gloves/glove_v7PL_v2block.png`, numbers `glove_v7_contrast.json`, sheet `glove_v7PL_sheet.png` (local).
- **Open:** (a) Purple almost disappears against the black outline (1.53:1). A lighter violet such as (150,90,255) would give about 5:1 against black, but it is only about 2.5:1 against lime. (b) Should the mask pants dark (0) vs socks stripe 2 (44 in CHI) count as one black? They differ in TOR (navy vs grey), so they were kept apart. (c) The Fuhr grey snap threshold (L 96) was chosen by eye.

## Player gloves v8: aligned comparison grid, light violet option (Abdul pt866u, 2026-10-24)
- D66 **Glove comparison sheets use a fixed grid** (`gloves/gloves_v8.py`). Each of the 11 frames gets the same cell, 120x108 px at x3 (the largest frame is 40 wide and 36 tall). Sprites sit bottom-aligned and centred in their cells. There are 3 pairs per row (6 fixed columns A|B A|B A|B), so all A's line up and all B's line up. Each pair has its frame number above it and large A/B labels, and the swatch repeats on every row. Sheets are 953 px wide. The script regenerates `glove_v7PL_sheet.png` (deep purple + lime) and adds `glove_v8VL_sheet.png` (both local).
- D67 **Player gloves v8 option: light violet (150,90,255) + lime (170,255,0)**, using the v6/v7 glove mask. WCAG contrast: violet vs black **5.2:1** (v7 purple 1.53), lime vs black 17.01:1, violet vs lime **3.27:1** (v7 11.11). Stick px changed: 0 on all 11 frames for both v7 and v8. Texture `gloves/glove_v8VL_v2block.png`, numbers `glove_v8_contrast.json`.
- **Open:** pick v7 (purple/lime are very distinct, but purple is lost on the outline) or v8 (violet reads on black, but violet vs lime is lower).


## Goalie v8: default gear as a v1-style lifted texture (Abdul pt867u, 2026-10-24)
Folder `v2_38x32/goalie8/`. Scripts: `g8cut.py` (cut + texture + mapping + numbers), `g8sheet.py` (sheets; local in `/workspace/preview_v2/goalie8/` because they contain game sprite renders).
- D68 **Default gear texture = real sprite pixels lifted per part, like the v1 player texture from the anthem sprite.** The v7 texture was a per-texel family vote and did not read as gear. v8 cuts each part with the goalie6/7 segmentation (skeleton + seg6, stick removed), 1 sprite px = 1 texel, kept in its on-screen arrangement (bbox crop):
  pad fronts L/R from 422 (73/79 px), pad backs L/R from 519 (58/48), blocker face 422 (35), catcher face 416 (38), mask front 416, side 413, back 519 (32/27/30). Texture 39x26, transparent between pieces; placement in `g8_map.json` `pieces`.
  - Two versions per team: `default_gear_v8_<team>_base.png` (team base colour = medium of the family; shading-layer px, i.e. goalie7 OVR outline/164/22/toe/cage, filled from the nearest base texel of the same piece: 118 texels) and `_shaded.png` (the lifted in-game colours, shading baked in). Teams: chi/tor HOME, chi/nyr AWAY, mtl HOME.
- D69 **Mapping back.** Each gear px keeps its goalie7 (u,v) on its part; it takes the piece texel with the nearest (u,v) (mask: union of the three lifts, u wraps; tie -> 416, 413, 519). Colour = texel family at the target px's own shade level; shading-layer px pass through. No relocation and no family steals, so diffs are reported as they are.
  - **CHI HOME diff 397 of 1435 gear px:** 413 36 | 416 56 | 422 17 | 428 70 | 449 43 | 519 24 | 980 58 | 1000 93. TOR HOME 417: 413 35 | 416 58 | 422 18 | 428 74 | 449 43 | 519 25 | 980 63 | 1000 101. CHI AWAY 440, NYR AWAY 434, MTL HOME 249.
  - Source frames reproduce their own lifted parts exactly (0 px in-source); the remaining diffs in 416/422/519 are parts lifted from other frames.
  - Where and why: (1) pad straps vs face trim - forearm/arm stripe 1/2/3 bands sit at different heights per facing, so a fixed front picture lands a stripe one or two rows off (413, 416, 428); (2) pad backs in 449/980/1000 - socks vs arm stripe 1 bands, the 519 back picture is narrower than the side-on backs; (3) blocker/catcher forearm vs arm stripe 3 cuff - glove boxes have no real geometry; (4) mask pants vs socks stripe 1/2 in back/3-4 views; (5) 1000 lying is the worst (93) because the uv for lying pads is a straight projection.
  - v7 (family vote + relocation) had 0 but did not read as gear; v8 trades that for a readable texture, as asked.
- **Open:** (a) mask back lift from 519 includes 3 pink/skin px at the neck (seg labels them maskB); (b) whether pad backs should come from 980 (more side-on) or a 519+449 merge; (c) whether to add a side-pad strip from 413/428; (d) next step to bring diff down: per-part row alignment of the stripe bands (the v1 player method), not relocation.
