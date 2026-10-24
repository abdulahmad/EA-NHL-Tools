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

## Goalie v9: straight-on view scan over all goalie frames (Abdul pt868u, 2026-10-24)
Folder `v2_38x32/goalie9/`. Abdul: "Can we find some sprites which have some better squared/straight on shots of the pads, blocker, mask". No texture built; Abdul picks.
- D70 **All goalie frames.** `g9common.goalie_frames()` parses every SPAg* table in `frames95pc.asm` (ready, ready2, glove L/R/L2, stick L/R, stack L/R, dive, swing, skate, poke, knee, kneehold, fall back/glove/stick; wall, cup and glide tables skipped): **246 frames**, each with its animation and facing (table row = d0..d7; d0 away from camera, d4 toward camera, d2/d6 side). v5-v8 only used 8 of them; the straight-on d4 frames (419 ready, 1022/1041/1065 butterfly, 987 poke, 1005 knee) and d0 frames (407, 487-490 skate, 519/520 dive) were never looked at.
- D71 **Generic segmentation + score (`g9scan.py`, numbers in `g9_scan.json`).** No per-frame boxes. Mask = HEAD-index blob touching the yoke; stick = 136 (+ small 0 blobs on it); gloves = 144-152 px reached from the sleeve (153-158), cut at the pants bottom (below it only outside the pants columns, max 4 rows); pads = remaining gear px at/below the pants, split into two legs at the widest empty column gap. Own leg L/R from the facing (back views screen-left = L, front views screen-left = R, side views near leg). Score = facing fit^2 x bbox rectangularity x sqrt(px / best px) x (1 - stick px in bbox) x content (pad front 144-148/164 share, pad back socks share, mask front 164 + eye holes, mask side one eye + face + shell, mask back no face) x [pads: leg verticality (PCA axis vs vertical, x0.3 if the pad is not below the mask) x pad separation]. Identical piece pixels (breathing frames 539-554 vs ready) are listed once.
  - Top candidates: pad front L 503 / 990 / 548 / 987 / 1022 / 1005; pad front R 505 / 1005 / 990 / 527 / 422 / 545; pad back L 487 / 520 / 489 / 979 / 432 / 519; pad back R 432 / 520 / 488 / 445 / 409 / 487; pad side 1035 / 1044 / 511 / 436 / 435 / 427; blocker 439 / 421 / 1021 / 453 / 1041 / 504; catcher 538 / 1042 / 1065 / 421 / 537 / 479; mask front 547 / 465 / 419 / 420 / 1022 / 548; mask side 543 / 523 / 497 / 511 / 1017 / 1025; mask back 1030 / 539 / 487 / 540 / 519 / 1058.
  - Known misses of the automatic score (check by eye on the sheets): 527 (dive, upside down) still reaches pad front R #4; 1058 (lying, face visible) reaches mask back #6; lying 1030 tops mask back on rectangularity although upright 539/487 are the usable backs; back-view masks are only ~11 px.
  - Sheets (local, game sprites): `/workspace/preview_v2/goalie9/g9_pads_chi_home.png`, `g9_gloves_chi_home.png`, `g9_mask_chi_home.png` (`g9sheet.py`, CHI HOME, piece outlined yellow on black), all-frame overview `overview_0..3.png` (`g9overview.py`), segmentation check `dbg.png` (`g9dbg.py <frames>`).


## Goalie v10: Abdul's hand-made goalie texture + zone palette (Abdul pt869u, 2026-10-24)
Folder `v2_38x32/goalie10/`. Inputs (Abdul's own art, committed): `goalie_texture_abdul.png` (23x23 RGB) and `goalie_zones_abdul.act` (768 B, made in NHL 9x Studio: every gear zone index has its own false colour). Scripts: `g10tex.py` (decode + pieces), `g10match.py` (zone-first fit + expansion, numbers in `g10_match.json`), `g10sheet.py` (sheets; local in `/workspace/preview_v2/goalie10/`, they contain game sprite renders).
- D72 **Texture -> palette indices.** Each texture colour is looked up in the .act. Unique colours give the index directly. Shared colours: (0,0,0) -> 0 (outline, eye holes, straps); (160,0,0) -> 147 (also 81); (0,160,0) -> 188 (also 51); magenta (252,0,252) -> 186 only when enclosed left and right inside a piece row (mask row 1), otherwise transparent (also 255); white (252,252,252) is shared by 75 indices and only appears in the pad strip, read as socks plain 181-183 (white family). Pieces (x0,y0-x1,y1):
  - **blocker** (0,0-9,6) 10x7: 147 border; face = vertical stripes 144 / 146 / 144 with a 146 bottom bar (cols 1-3); 3x5 black block (cols 6-8, the hand/finger opening).
  - **mask** (12,0-20,7) 9x8, a front-centred wrap: 189 top row, 177 shell sides, stripes 184-189 (186 185 188 185 186 / 187 184 184 184 187), face 164 with 0 eye holes, 135 strap at the sides of row 5, 22 at the chin corners. The centre 5 columns equal the in-game front mask (987 / 547) exactly.
  - **pad front** (0,9-9,22) 10x14: 155 outer trim (cols 0-1 and 9), face 164, the knee band 146 / 145 / 146 (double stripe 146 around the single 145, rows 10-12), three 0 strap bars, roll 152 / 151 (cols 7-8), 0 toe rows.
  - **pad strip** (10,9-12,22) 3x14: white (socks plain 181-183), stripe rows 187 188 189 / 184 185 155, 0 toe. These are the pad-back socks zones (D50), but the order is 187-189 above 184-186 while 520 draws 181-183 / 184-186 / 187-189 top to bottom (open question).
  - **catcher** (15,10-22,21) 8x12: arm stripe 2 (150-152) and 147/148 outline with a 144-146 palm.
  - No pad-back piece wider than 3, no separate mask-back or blocker-back piece.
- D73 **Zone-first matching (the player method).** Part pixels = goalie9 generic segmentation. Only sprite px whose index is one of the piece's zones take part in the fit; shading px (22, 30/31 toe, 88 ice shadow, 109, 136 stick) go to the shading layer and are never compared; px with zones the piece does not have are "out of zone". Fit per row (v2 rule: m px onto n texels, m<=n centred block + ox, m>n even stretch), V = oy + (y-y0)*sy, optional mirror; search sy 0.40-2.00, oy, ox -3..3, maximise exact index matches. Then **expand**: a diff px is accepted if its index is within Chebyshev 1 (then 2) of its mapped texel in the piece. 164 and 0 are compared because Abdul painted them as zones (pad face, eyes, straps); greys in the sprite that are not in the piece stay shading.
- D74 **Results (strict diff > diff after expansion, out-of-zone px), pixel perfect index compare:** 987 padF_L<-padF 21>4 (out 0) | 987 padF_R<-padF 21>0 (out 0) | 505 padF_L<-padF 5>0 (out 0) | 505 padF_R<-padF 11>2 (out 0) | 520 padB_L<-padStrip 8>3 (out 3) | 520 padB_R<-padStrip 7>2 (out 5) | 1044 pad_side<-padF 7>0 (out 0) | 1044 pad_side<-padStrip 7>4 (out 26) | 1021 blocker_face<-blocker 3>0 (out 0) | 538 catcher_face<-catcher 34>8 (out 2) | 547 mask_front<-mask 4>0 (out 0) | 543 mask_side<-mask 1>0 (out 1) | 539 mask_back<-mask 5>0 (out 2) | 416 padF_L<-padF 16>5 (out 29) | 416 padF_R<-padF 46>46 (out 18) | 422 padF_L<-padF 31>4 (out 15) | 422 padF_R<-padF 24>13 (out 3) | 413 mask_side<-mask 9>0 (out 0) | 416 mask_front<-mask 3>0 (out 0) | 373 wall_pad0<-padF 10>3 (out 0) | 373 wall_pad1<-padF 47>19 (out 0) | 374 wall_pad0<-padF 15>0 (out 2) | 374 wall_pad1<-padF 14>0 (out 12) | 375 wall_pad0<-padF 19>6 (out 17) | 375 wall_pad1<-padF 23>5 (out 12) | 376 wall_pad0<-padF 10>0 (out 0) | 376 wall_pad1<-padF 4>0 (out 13).
  - Clean straight-on frames: blocker 1021 3>0, mask 547 4>0, 543 1>0, 416 3>0, 413 9>0, 539 5>0, pad front 987 R 21>0 / L 21>4, 505 R 11>2, pad side 1044 7>0 with the pad-front piece (the 3-wide strip is worse, 26 out of zone). Pad backs 520 8>3 / 7>2 with the strip.
  - Catcher 538 is the weakest (34>8): the in-game catcher is wide and horizontal, the texture piece is upright.
  - 416 pads: the goalie9 generic segmentation is wrong on 416 (its "padF_L" is the glove and "padF_R" includes the body), so 46 px fail; use the goalie6 segmentation for the facing-truth frames next. 422 L 31>4 / R 24>13 (sy fit compresses the pad; the 147/148 strap zones are not in the piece).
- D75 **Error sprites: the wall frames.** Abdul: 373-375 use the wrong zone in the pad-top pattern. In this repo's numbering (`frame(n)` = `frames.json[n-1]`, the numbering used for all D-numbers) the bad frames are **374, 375 and 376**: their knee band is **144 / 145 / 144** (the double stripe drawn with forearm 144 instead of 146; out-of-zone px 14 / 29 / 13). **373 is correct** (146 / 145 / 146, 0 out of zone), like every other goalie frame: scanning all 246 goalie frames for a 145 run sandwiched by 144 above and below finds only 374-376. All four are the SPAgwallright/left frames (373,374,375,376 in both orders), which goalie9 already skips. If Abdul counts frames from 0, his 373-375 are exactly our 374-376. Rule: 373-376 stay excluded from texture building and matching; 374-376 are flagged as source-art errors (a fix would recolour their 144 knee-band px to 146). Sheet `g10_wall_373_376.png` (local) marks the 144 px with white boxes.
- **Open:** (a) Abdul: is his 373-375 0-based (= our 374-376)? (b) pad-strip stripe order (187-189 above 184-186) vs the 520 pad back; (c) a wider pad-back piece and a catcher piece drawn horizontally; (d) white in the strip = which socks index (181/182/183)?; (e) 164 is in the texture as the pad face, while goalie7 put 164 in the shading layer: keep 164 as a texture zone for Abdul's art?


## Goalie v10b: texture v2 (wide pad back + horizontal catcher), 164 as a texture zone (Abdul pt870u, 2026-10-24)
Scripts `g10b.py` (texture v2 + rerun, numbers `g10b_match.json`), `g10diagram.py` (Q1 diagram + before/after; local in `/workspace/preview_v2/goalie10/`).
- D76 **164 is a TEXTURE zone** (Abdul pt870u, final call after a first "shading" reply): the 164 pad face / mask face in Abdul's texture stays a texture colour and sprite 164 px are compared like any zone. This supersedes goalie7 D61 (164 -> shading) for Abdul's texture. Shading layer = 22, 30/31, 88, 109 (+ stick 136).
- D77 **Texture v2 = Abdul's 23x23 unchanged + two lifted pieces below it, 23x34** (`goalie_texture_v2_indexed.png`: 8-bit indexed with Abdul's .act, exact indices, white = 181; `goalie_texture_v2_rgb.png`):
  - **padBack** (0,24-7,33) 8x10 lifted from 520 left pad back, in the order the game draws it: 155 trims, rows 181 182 183 / 184 185 186 / 187 188 189 / 155 155 182 183, then the toe (30/31 toe shading set to 0). The right pad back is the mirror (520 R draws 183 182 181).
  - **catcherH** (9,24-21,30) 13x7 lifted from 538 (horizontal catcher, 144-152 incl. 149).
  - Abdul's pieces are kept as they were. 23 wide fits inside the 38-wide main layout if the gear block is ever merged into it.
- D78 **Rerun (zones first, then expand; 416/422 pads now on the hand-checked goalie6 seg, `seg6.seg`):** 987 padF_L<-padF 21>4 (out 0) | 987 padF_R<-padF 21>0 (out 0) | 505 padF_L<-padF 5>0 (out 0) | 505 padF_R<-padF 11>2 (out 0) | 1044 pad_side<-padF 7>0 (out 0) | 520 padB_L<-padBack 0>0 (out 0) | 520 padB_R<-padBack 18>5 (out 0) | 520 padB_L<-padStrip 8>3 (out 3) | 1021 blocker_face<-blocker 3>0 (out 0) | 538 catcher_face<-catcherH 0>0 (out 0) | 538 catcher_face<-catcher 34>8 (out 2) | 547 mask_front<-mask 4>0 (out 0) | 543 mask_side<-mask 1>0 (out 1) | 539 mask_back<-mask 5>0 (out 2) | 413 mask_side<-mask 9>0 (out 0) | 416 padF_L(seg6)<-padF 12>9 (out 4) | 416 padF_R(seg6)<-padF 32>8 (out 13) | 416 padB_R(seg6)<-padBack 10>3 (out 5) | 422 padF_L(seg6)<-padF 28>13 (out 3) | 422 padF_R(seg6)<-padF 31>7 (out 13).
  - 520 L padBack and 538 catcherH are 0 because they are their own source frames (lifts); the test of the new pieces is 520 R padBack 18>5 (mirrored art, the per-row fit does not land the 183/182/181 order exactly) and 416 padB_R 10>3.
  - goalie6 seg fixes the 416 failure (was 46>46 on the goalie9 seg): 416 padF_L 12>9, padF_R 32>8; 422 padF_L 28>13, padF_R 31>7. The 416/422 out-of-zone px are 147/148 straps the pad-front piece has no texel for.
- D79 **Q1 diagram** (`g10b_q1_stripe_order.png`, local): 520 rows 24-27 read 181-183 (socks plain) / 184-186 (socks stripe 1) / 187-189 (socks stripe 2) top to bottom; Abdul's strip reads W / 187 188 189 / 184 185 155 / W, i.e. stripe 2 above stripe 1 and 186 replaced by 155. Waiting for Abdul (keep the strip as a design or reorder it to the game order).
- D80 **Pad back = Abdul's strip wrapping round (Abdul pt872u), goalie v10c.** The separate padBack piece (D77) is dropped. Pad backs are matched against a wrap view, not a new texture piece: padF right trim col (155) | padStrip (3 cols) | padF left trim cols (155 155), same rows 9-22 (`g10c.wrap`). texture v3 also drops catcherH (replaced by D84).
- D81 **The one extra in-game pad-back zone is 186 (socks stripe 1 dark); it is real.** (`g10c_padback.py`, `g10c_padback.json`.) For every 184 185 run in all 246 goalie frames, the 3rd px going away from 184 is 186 in 32 runs / 26 frames and 155 in 11 runs / 10 frames; 186 occurs in 80 frames over 15 anims (so not an errant frame like 374-376). It sits on both sides (184->left 21, 184->right 11), so it is not a mirror artefact. It is the dark end of the light-mid-dark triplet, exactly like 183 and 189. 181-183 are all white in Abdul's palette, so they read as one zone to him; 186 is the only one he can see. Minimal change: texel (12,16) 155 -> 186 (strip row 'stripe 1' = 184 185 186). The 155 variant (skate 487/494, fall 976/1032, ready 539/542/554, swing 433/443, dive 521) is still reached by expansion r1 from the wrap trim.
  - Abdul's palette gives 186 the transparent magenta, so `goalie_texture_v3_rgb.png` cannot carry it at the strip's right edge; `goalie_texture_v3_indexed.png` is authoritative.
- D82 **Stripe order: both orders are in the game art.** Stripe 1 above stripe 2 (520 order) occurs in ready, swing, dive, poke, glove and stack frames; stripe 2 above stripe 1 (Abdul's order) occurs in skate, stick, stack and fall frames (32 frames have more 2/1 columns than 1/2). Both occur at the same facing d0 (ready 539/540 vs skate 487/488, stick 471/472), so the order is an animation art variant, not facing, mirroring or wrap geometry. Abdul's order is kept. Rematch 1/2 frames lose 1-3 px to the swap (520 L 10>3, 520 R 7>2, 539 L 5>0, 488 L 4>0, 487 L 3>0, 976 R 5>0, 416 R seg6 8>1, 449 R seg6 16>5; full list in `g10c_match.json`).
- D83 **Catcher on the skeleton (`skel10.py`).** The catcher is the left hand (skel5 Lhand) with palm normal (-0.3,0,1) (palm toward the shooter, slightly outward). Facing d gives frontness: d3-d5 FRONT (palm/pocket visible), d0/d1/d7 BACK, d2/d6 SIDE. Screen side: left for d0/d1/d6/d7, right for d2-d5.
- D84 **Unified Fuhr-like catcher (texture v3 rows 24-30).** catcherF (0,24,12,30) is the palm view lifted from 538 (d4) and catcherB (12,24,22,29) is the back view lifted from 428 (d7). Index roles: 147/148 = rim/outline (Fuhr red trim, never fill); 144-146 = palm/pocket (dark 144 at the web/top, 146 at the heel); 149-152 = cuff/wrist band and the 152 web-lace row on the front; 150-152 inside a 147/148 rim = back of hand. Abdul's own 8x12 catcher piece is kept unchanged.
- D85 **Catcher match (best of F/B by strict diff ratio; strict>after expand).** 407 d0 B 4>1 | 409 d0 B 34>17 | 412 d1 B 6>2 | 418 d3 F 31>6 | 419 d4 F 33>14 | 421 d4 F 29>1 | 422 d5 B 5>1 | 424 d5 B 25>6 | 428 d7 B 0>0 (source) | 430 d7 F 32>15 | 519 d0 F 16>5 | 535 d0 B 20>4 | 538 d4 F 12>0 (source) | 545 d3 F 26>5 | 980 d0 B 22>2 | 987 d4 F 33>14 (same art as 419) | 1021 d4 F 24>9 | 1042 d4 F 32>8. Out of zone 0 everywhere. skel10 agrees with the best block in 14 of 18 frames; it disagrees on 422/424 (d5) and on 430 (d7) / 519 (dive d0), where the glove is turned toward the puck.
- D86 Images (local only): `g10c_p1_evidence_186.png`, `g10c_p1_padback_match.png`, `g10c_p2_catcher_layout.png`, `g10c_p2_skeleton_catcher.png`, `g10c_p2_catcher_match_1.png`, `g10c_p2_catcher_match_2.png`.
- D87 **Goalie skeleton v10d (Abdul pt874u: 413 faces RIGHT, 425 faces LEFT).** `goalie10/skel10.py` holds one full-body 3D goalie (skel5 base pose). The hands are moved out to the sides (Rhand (8,12,3), Lhand (-9,17,4)) so the 3/4 views put the blocker on the correct side. It is rotated 45deg x d, and each of the 8 ready frames 407-428 has hand-placed joints plus stick points. Facings, checked against the mask face side (164/0): d0 407 away; d1 410 away, turned right; d2 413 faces screen-RIGHT (right side toward camera); d3 416 camera, turned right; d4 419 camera; d5 422 camera, turned left; d6 425 faces screen-LEFT (left side toward camera); d7 428 away, turned left. The SPA direction numbers were already consistent; the v10c overlay was wrong because it used the generic fit and the old ADJ.
- D88 **Limb sides per facing (from the adjusted joints, relative to mid-shoulders; the rotated model agrees in all non-side views).** RH blocker + stick: screen right in d0, d1 and d7, left in d3-d5, in front in d2 (413) and behind/centre in d6 (425). LH catcher: left in d0, d1 and d7, right in d3-d5, in front (right) in d2 and in front (left, low) in d6. Pads: RL screen right in d0, d1 and d7, left in d3-d5. Catcher orientation by facing: FRONT d3-d5, BACK d7/d0/d1, SIDE d2/d6.
- D89 **Fuhr-style unified catcher (texture v4 rows 24-32, 22x9, `goalie_texture_v4_indexed.png`).** It is designed, not lifted, and replaces the v3 catcherF/catcherB lifts. Regions: BACK panel x1-5 (152 top / 151 / 150 bottom) | CUFF x7-10 (151/152 with a 150 logo block and a 149 wrist band) | PALM x12-16 (144 web end, 145, 146 heel) | POCKET/WEB x17-20 (152 lacing row + 144/145 mesh). Outline: 147 top, left and separators; 148 bottom and right. Pieces: catBack = x0-11, catFront = x6-21.
- D90 **Catcher match, 39 frames (ready, glove, swing, dive, poke, fall), piece chosen by the D88 facing.** Totals after expansion: Abdul 8x12 = 255, Fuhr layout = 445. By view: FRONT 20 frames 150 vs 335; BACK 14 frames 70 vs 83; SIDE 5 frames 35 vs 27. The layout wins in 10 frames (e.g. 519 0 vs 3, 436 5 vs 14, 980 6 vs 13, 554 3 vs 5, 439 6 vs 10). The rectangle palm/web is too wide for the per-row fit on front views, where the in-game catcher is a 148-rimmed oval. Full table in `g10d_catcher.json`; images `g10d_*.png` are local only.
- D91 **Catcher placement in side views confirmed by Abdul (pt875u).** In 413 (d2, facing right) the catcher is held high in front of the chest, so it is mapped with the FRONT piece. In 425 (d6, facing left) it is the low near-side piece, mapped with the back-panel piece. Neither frame has a catcher part in the goalie9 segmentation, so its pixels are the catcher-zone (144-152) pixels connected to the skel10 left hand: within 4 px, 5 px for 416 (`g10e.catcher_q`).
- D92 **Option B = texture v5 candidate (`goalie_texture_v5_candidate_indexed.png`, oval in `g10e_oval.txt`).** Rows 24-32 x0-11 keep the v4 back rectangle (back panel + cuff); the back piece is catBack x0-11. The front is a rimmed oval 11x8 at x12-22. Cuff (149-151) is on the left. The web lacing (152) and the 147 rim sit on top. The 148 ring surrounds the pocket (144, toward the web side) and the palm (145/146, toward the heel), with diagonal bands as in the in-game front views. The front piece is catFront x12-22.
  - **How the shape was found:** from the front catcher pixels of 419, 421, 538, 547, 987 and 1042. In all of them the cuff and forearm stripe come first in each row, before the 148 ring. A greedy cell search on alternate front frames confirmed this layout. The search's noisy result (36 after expand on the front frames) was discarded; the clean hand design c3 was kept.
- D93 **Catcher A/B match, 42 frames, strict>after expand (`g10e_catcher.json`).**

  | View | Frames | Abdul 8x12 | Option A (v4) | Option B (v5 candidate) |
  |---|---|---|---|---|
  | FRONT | 22 | 472>162 | 594>362 | 469>123 |
  | BACK | 15 | 274>83 | 226>95 | 226>95 |
  | SIDE | 5 | 81>35 | 63>27 | 63>27 |
  | All | 42 | 827>280 | 883>484 | 758>245 |

  Option B beats Abdul's piece on front views. Its back views are unchanged from Option A, still a little behind Abdul after expand. Images (`g10e_textures`, `g10e_opt{A,B}_{test,fuhr}.png`) are local only.
- D94 **Team palettes on the index textures (Abdul pt878u, `goalie11/g11.py`).** Teams: CHI AWAY and TOR, BUF, EDM HOME, read with the goalie9/goalie8 `spal(file, code)` (team colours 128-191 -> act, then the team map). The texture stays index-based; a team version is just the index texture coloured with that team's palette. A WHITE texel takes the sprite's own white-family colour, else team 181.
  - **Whole-goalie mapping per frame:** every goalie9 part is fitted zones-first, keeping the best piece: mask; blocker; padF / padWrap / padStrip for pads. The catcher uses the g10e piece chosen by skel10 facing. Option A and Option B differ only in the catcher.
- D95 **Team comparison, 11 frames (416 419 421 538 407 428 980 413 425 520 987), whole goalie, strict>after expand.**
  - Option A 706>270; Option B 652>194. These counts are palette-independent.
  - Wrong pixels that actually change colour (A/B): CHI 182/103, TOR 164/97, BUF 179/100, EDM 181/102. They are lower than the raw counts because some zone indices share a colour in a team palette. TOR is lowest because 147/155/186 are the same navy (0,0,96) and 182=183, 187=188 (208 grey).
  - Images are local only (`/workspace/preview_v2/goalie11/`).
- D96 **Abdul's 8x12 catcher piece removed (pt880u).** Since v10d no frame maps to `catcher` (15,10)-(22,21): the catcher always uses catFront/catBack from rows 24-32. The piece is cleared, and the empty row 23 is dropped, so the catcher moves up to rows 23-31. The textures are now 23x32 and still index-based: `goalie12/goalie_texture_v4b_indexed.png` (A) and `goalie_texture_v5b_candidate_indexed.png` (B). Layout: rows 0-8 blocker + mask, rows 9-22 pad front + strip (x0-12), rows 23-31 catcher.
- D97 **goalie12 sheets.** Each team and option has ORIGINAL 95 PC PALETTE | OPTION X TEXTURE APPLIED | OPTION X ERRORS MARKED side by side, with labels repeated every 4 frames.
  - **Missing parts:** 520's mask is now found (8 px, mask zones round the sprite's top centre). For 428, the 5 blocker-zone px near the skel10 right hand are already claimed by the catcher part, so it still has no separate blocker.
  - **Totals, 11 frames, strict>after:** A 709>271, B 655>195.
- D98 **Shading counts as gear on equipment (Abdul).** On pads, blocker, catcher and mask, pixels with shading indices (22, 30/31, 88, 109) are part of the gear, and the texture has to carry that shading itself; they are no longer excluded. The stick (136) and the body are unchanged. `goalie12/g12pad.py` counts them as errors when no texel holds them.
- D99 **Glove coherence.** The free catcher fit can mirror the glove inside one facing, squash it (sy<0.6 skips every other texture row), or start 3+ rows down, which drops the cuff and web. Those fits are "scrambled".
  - FRONT oval frames with a scrambled free fit now use a coherent fit (`goalie12/g12glove.py`): no mirror, oy -1..1, the whole piece covered top to bottom, sy 0.75-1.6.
  - BACK/SIDE keep the free fit. They already read as the glove back, and coherence made 425, 535, 554 and 980 worse.
  - Fixed, B: 418 424 437 439 440 441 548 549 1021 1042. Fixed, A: 416 418 419 424 437 439 441 545 547 548 549 987 1042.
  - 550 B has no coherent fit and stays mirrored.
  - Cost, 42 frames, strict>after: B 758>245 -> 814>287; A 883>484 -> 911>481.
- D100 **Pads as a cylinder with per-row UV** (`goalie12/g12pad.py`, `g12_pads.json`).
  - **Segmentation:** a pad part keeps only px that can be pad gear (pad zones, white family, shading). This removes 74 px of blocker/catcher/stick.
  - **Mapping:** the pad is a 13-wide cylinder (front x0-9 + strip x10-12, wrapping). Each sprite row is an arc with start, scale 0.5-2.0 texels per px and skew ±0.34/±0.5 rows per px, which covers the diagonal sock stripes in 3/4 back views. A DP keeps the rows monotonic, so both stripe orders remap rows without any change to the texture. Mirror is solved per leg.
  - **Result, 14 frames, 28 pad parts, strict:**
    - ok 1216; shading 54, which needs shading texels in the pad texture (D98); row content 98; missing texel 0.
    - Old v12 mapping: 368 strict errors on the same px.
  - **Not yet zero.** The 98 row-content px need a 2D UV beyond a per-row arc, or new texels. They are not proven impossible.

## goalie13 – strict pad remap (Abdul pt884u)
- **D101 Strict match.** Every pad pixel counts as texture (no shading exemption). W = index 181 only. The old WHITESET eq (155/177/181–183) hid wrong pixels, e.g. the missing straps on 538 R.
- **D102 Segmentation.** Subtract the catcher, blocker and mask from the pads. Drop other-gear indices (144/147/148/150/136) and stray helmet rows. Merge touching parts when the median row width is ≤9, then grow into unassigned pad-colour pixels. Fixes 425 (catcher pixels, one leg split) and 1044 (split pad, orphan row 23).
- **D103 Skate exclusion.** The skate is not mapped: index 31, plus black pixels that are not enclosed by leg pixels and reach the blade or bottom, within 6 rows of the leg bottom.
- **D104 Modes.** Row, diag/, diag\ (strap lines along anti-diagonals, as on 538 R) and column mode with per-column stripe order A/B (curved, reversed back-view sock stripes, as on 407). Non-row modes get a +0.75 tie penalty.
- **Result.** 95 strict errors (47 content + 48 missing texel) vs g12 152, all teams. Proposal: add sock-shade texels 182/183 to the texture, which would remove 48.

## goalie14 – segmented skeleton, stick out (Abdul pt904u)
- **D105 Segmentation map.** Each frame gets a per-pixel part map: body, mask, catcher, blocker, stick, pad L, pad R, skate, shadow. Index evidence comes first (136 stick, catcher_q, goalie9 blocker/mask/pad parts). Any pixel left over takes its nearest skel10 bone: hand-fit ADJ joints for the 7 ready facings, otherwise the 3D model projected at the frame's facing. Smoothing is a 3x3 majority filter (2 passes) plus cleanup of islands under 4 px. Debris that is not connected to the goalie becomes shadow. A pad label always needs a pad index. Pads and gloves are assigned from this map (`goalie14/g14seg.py`).
- **D106 Stick blade.** The blade is the black (0/8) pixels near the lowest 136 cluster that are not enclosed left and right by pad pixels. It and the shaft leave the pads. On 538 and 1044 the blade had been counted as skate inside the left/merged pad.
- **D107 Column shift.** Column mode may shift the sock column by ±1 once per sprite column. This follows a stripe that crosses texel columns on a turned leg (407 right pad: 185 above 189). 407 now has 0 mapping errors.
- **D108 No shading texels.** 182/183 occur nowhere in the 23x32 texture, so no mapping can hit them. They stay as missing-colour errors and are not added.
- **Result.** 89 strict errors = 41 mapping + 48 missing colour (all 182/183). g13: 95 (47 + 48). Same for all 4 teams.

## goalie15 – sock shading, cross-referenced skeleton (Abdul pt907u)
- **D109 Sock shading in the texture.** Texture v6 (`goalie15/goalie_texture_v6_indexed.png`) puts 181/182/183 into the sock strip (x10–12) on texture rows 13, 14 and 17. The shades are part of the texture, not a separate layer. This replaces D108: all 48 missing-colour errors are gone.
- **D110 Colour zones.** The catcher label is allowed only on indices 144–152. It is cut down to the 4-connected piece holding the core colours 148/149/150, which stops 421's left-pad trim being read as glove. Ice spray (connected runs of 3 or more pixels with index 1–30, not 8) is labelled shadow, which takes the spray off 538's right pad.
- **D111 Fitted skeleton.** Facings without ADJ joints are fitted to the sprite, not just projected:
  - The head and neck come from the mask, and the pelvis sits above the pad tops.
  - Shoulders and hips are skel10 offsets rotated to the facing. Ankles come from the pad bottoms and hands from the glove centroids.
  - Knees and elbows use 2-bone IK with the skel10 bone lengths, bending to the same side as the rotated 3D pose. Joints that land off the sprite snap to the goalie.
  - Labelling and fitting alternate until the labels stop changing (at most 4 rounds).
- **D112 Mask and grow rules.** The skeleton only assigns mask when a frame has no mask evidence (980). Body pixels with a pad colour that touch a pad, within 4 rows of the pelvis, join that pad (421 left pad). The D105 smoothing is unchanged.
- **Result.** 50 strict errors = 50 mapping + 0 missing colour (g14: 89 = 41 + 48), the same for all 4 teams. Mapping changed per frame: 407 0→1, 428 4→5, 980 1→6, 425 6→7, 987 6→7, and every other frame is unchanged. Open questions: 538 (19,19)/(19,21)/(20,21) may be stick paddle, and 1044 (24,9) is unidentified.

## goalie16 – joint fit of all facings (Abdul pt907u, full cross-reference)
- **D113 One pose per animation frame.** The siblings of a frame are the frames at the same sequence index in the other 7 facings' sequences (980 poke d0 → 982…994; 538 gglovel2 has only d0/d4). One 3D skel10 pose is fitted to all of them at once (`goalie16/g16seg.py`). It is rotated to each facing (yaw 45°·d, pitch 30), with a scale and offset per sprite.
- **D114 Cost.** Each facing contributes several terms:
  - Part targets from its current labels: head → mask, hands → blocker/catcher, ankles → pad bottoms, hips → pad tops.
  - Every bone, sampled at 7 points, must stay on the goalie. Distance to the nearest px that is not background, shadow or stick is penalised.
  - Pad bones must sit on pad-colour px and the hand ends on glove px.
  - Bone lengths are held to the skel10 BASE lengths, with a weak prior toward the BASE pose.
  - Facings with hand-fit ADJ joints pin the pose.
  - The loop is fit, label every facing, refit, until no facing's labels change (at most 4 rounds). Siblings without goalie9 parts use colour zones only. No pad label may sit above hip level − 4 unless index evidence puts it there.
- **D115 Guards.** A frame keeps its g15 legs if g16 maps it worse (this never triggered). 538 (19,19), (19,21), (20,21) and 1044 (24,9) keep their g15 labels until Abdul answers.
- **Result.** 49 strict errors (49 mapping + 0 missing). g15 had 50, and 987 went from 7 to 6. Bone samples off the sprite, g15 → g16: 421 15→0, 538 8→4, 980 6→0, 520 6→5, 987 14→1, 505 6→0, 1044 2→0 (of 98 each). Since D109 put 182/183 into the texture, an unmatched shade px counts as mapping, where g14 counted it as missing colour. Per frame, total strict errors are ≤ g14 (980: 12 → 6, 407: 13 → 1), but 980/407/428/425 mapping alone is above g14's mapping-only count.

## goalie17 – Abdul's g15 corrections as ground truth (D116–D121)
- D116: SKATE labels grow back into their pads before post-rules; legs() maps L/R separately and merges only if one side < 8 px (replaces D102 narrow merge that joined 416/428 legs).
- D117: R1 stick butt – trace the 136 shaft and label up to 2 px of index 0/8 past its upper end as STICK.
- D118: R2 blade px (0/8) directly under pad/skate and touching skate/31 → SKATE; re-applied after legs() (fixes 1044 (33,10)).
- D119: R3 pad-only indices {151,152,155,164} labelled blocker that touch a pad → pad; R4 catcher-zone body touching catcher → catcher; pad labels above pelvis-4 → body.
- D120: R5 READY d6 frames with hidden right hand (425): blocker → body. R6 legs_assign: side views take the near leg as the larger mass; blobs cut off from their own leg but touching the other flip.
- D121: g17checks.py verifies each of Abdul's corrections (416,419,538,407,428,980,425,1044,422 + all-frames butt); g17inspect.py writes per-frame coordinate sheets (clean + lettered labels, x/y axes). Result: 42 strict errors (g15 50), every frame ≤ g14. 416 5→6 and 407 1→2 come from the ground-truth pad pixels.

## goalie18 – 538 blocker from Abdul's green marks (D122)
- D122: Abdul painted 538's blocker green on the clean inspect panel (pt918u). Registered against the panel (30.5 px cells, stick column x17 as anchor): 23 cells (17,10-12) (18,9-13) (19,8-13) (20,8-12) (21,9-11) (22,10) are BLOCKER (ground truth). The other 11 old blocker cells (21,5) (20,6) (21,6) (19-22,7) (21-23,8) (22,9) sit on the shoulder/jersey, touch no pad and have no shaft index, so they become BODY (STICK if index 136). Open questions are shown as images in g18questions.py. 42 strict errors, all g17 checks pass.

## goalie19 – Abdul's answers + arm vs glove (D123)
- D123: Ground truth (pt918u answers): 980 x13-15 y19-21 = inner edge of RIGHT pad; 1044 (x9,y24) = pad (upper design stripe, frozen label lifted, now pad R); 538 non-green old blocker cells stay body; 428 has no blocker (any blocker → body). Arm vs glove: a catcher/blocker-labelled px that is not catcher core (148-150), 4-touches body and lies within 1.5 px of the skeleton shoulder→hand segment before t=0.8 (proximal to the wrist) becomes body (arm/arm stripe); iterated. Changes 413 bottom catcher px, 416/419/407/428/520/505/422/987/421 stripe px. Skeleton hands are coarse, so 980/416/419 glove/arm limits are asked as images (g19questions.py). 538 green cells re-applied after. Strict errors unchanged at 42 (glove/arm labels do not enter pad mapping). The g15-era 422 check (catcher should cover catcher-colour body below it) now FAILS by design: those 5 px are treated as arm.

## goalie20 – Abdul's goalie19 answers (D124)
- D124: 980 ringed former-catcher px (x6-9, y8-14) = arm (body). 416 ringed catcher px stay catcher. 419 catcher arm: white/black/white stripes run across the arm (constant x+y); stripes 1-2 (x+y<=38) = body, stripe 3 (white 148 at x+y 39-40) kept as catcher cuff border — both options give identical mapping (42), and the white 148 line continues unbroken around the cuff, so it is the border. 419 blocker = Abdul's 31 green cells (registered on the Q4 panel by the gold pixel (14,6)), other old blocker cells = arm stripe (body). 42 strict errors.

## goalie21 – 419 catcher from Abdul's green marks (D125)
- D125: Abdul painted every 419 catcher cell green on the g20 clean panel (pt925u). Registered by the two gold pixels (14,6) and (25,5) (21 px/cell): 41 cells are the catcher (ground truth). This adds 8 cuff cells, (29,7) (28-30,8) (28-29,9) (27-28,10), that g20 had as arm; every old catcher cell was green, so none were dropped. 42 strict errors.

## goalie22 – two-piece pad mapping (D126)
- D126: labels unchanged (g21 = ground truth, pad/skate pixel sets reused exactly). A pad leg may be cut once (sprite row, column, or either 45° diagonal) into two pieces, each mapped with its own best g14 mode (row/diagonal arcs or column paths); a split costs 1.5 so it is kept only if it removes ≥2 strict errors. Same texture, no new texels, strict index equality. Strict errors 42 → 14: 416 6→2, 419 2→0, 538 3→0 (Abdul's frozen 538 pixels now map), 407 2, 428 5→3, 980 6→2, 413 1, 425 2→0, 520 1, 987 6→0, 505 0, 1044 1, 422 7→2, 421 0. g22pad.py (driver), g22images.py (local before/after sheets).

## goalie23 – zero strict pad errors (D127)
- D127: g22 split made recursive (depth 2: a piece may be cut once more, so a leg has up to 4 pieces, each ≥6 px, each with its own best g14 mode) and the split cost lowered to 0.9, so a cut that removes a single error is kept. Labels unchanged, same texture, no new texels, strict index equality. Strict errors 14 → 0 in all 14 frames (1127 ok + 170 skate). Extra cuts sit at the knee/boot-cuff rows (y≈20-26) where the pad bends. g23pad.py, g23images.py (local sheets).

## goalie24 – Fuhr test render, next group SPAgglover (D128)
- D128: (a) Fuhr test render (local only): pad pixels of the 14 g23 frames take `goalie7/fuhr_oilers_texture_v7.png` pad blocks (front L/R, back L/R) at row v*20/14, col u*w/10 of each g23 (v,u); sock (u>=10/-1), skate and all non-pad pixels stay the original sprite in the EDM home palette (no mapping exists yet for blocker/catcher/mask in the current layout). (b) Next group SPAgglover 408,411,414,417,420,423,426,429: `g24seg.py` = g16 joint fit + g21 R rules; `g24inspect.py` sheets and `g24questions.py` ringed questions are local only. Open: 408 mask over jersey, 417 right-side group pad vs catcher, 426 back-view catcher location.
- D129 **Fuhr v8 in the current layout; mask strip = centre FRONT, back split onto both sides (Abdul pt930u).**
  - Why Fuhr looked different: `goalie7/fuhr_oilers_texture_v7.png` is the old 38x32 RGB layout v6 (D35/D59: separate pad front L/R and pad back L/R blocks 9-10x20, blocker 8x12, catcher 11x9, mask strip 12x7 at (19,20)). The team textures since D96 are Abdul's 23x32 indexed layout (`goalie15/goalie_texture_v6_indexed.png`): blocker rows 0-6 x0-9, mask rows 0-7 x12-20, one pad front x0-9 rows 9-22 (back views wrap round it, D80) + sock strip x10-12, catcher back x0-10 / front x11-21 rows 23-31. Fuhr was never moved to it.
  - The D128 texture image boxed v7's mask with the v3 boxes (front 6 wide, back 5 wide), i.e. it split the front in two. In the v6/v7 strip and in Abdul's layout the centre is the front (v7 x22-27; current x14-18) and the back is split: goalie-right half on the left side (current x12-13), goalie-left half on the right (x19-20). No pipeline code used the wrong boxes (g10 mask matches use the whole mask block).
  - `goalie24/fuhr24.py` builds `goalie24/fuhr_oilers_texture_v8.png` (23x32 RGB, same drawn cells as the team texture): blocker <- v7 blocker resized nearest to 10x7; mask front 5x8 and back halves 2x8 from Abdul's front/back mask reference images (mode colour per cell); pad front <- v7 padF_L resized nearest to 10x14; catcher front <- v7 catcher 1:1; sock strip and catcher back (no Fuhr art) = EDM home palette. Test renders use texel (9+v,u) of v8 through the g23 maps (pads only; no blocker/catcher/mask maps in this layout yet). Images local only.

## goalie25 – high-res Fuhr, geometric pad snap, blocker/catcher/mask maps (D130)
- D130 (Abdul pt931u)
  - **Texture v9** (`goalie25/fuhr25.py`, `fuhr_oilers_texture_v9.png`): built straight from `textures/v12/tex_gear_*` (v8 resampled the pad twice: 15x25 -> 9x20 -> 10x14). Blocker art 8x12 is portrait but the layout's blocker block is 10x7 landscape: v8 squashed it (height x0.58, width x1.25); v9 rotates it 90 deg first (12x8 -> 10x7, ~5% change). Pad 15x25 -> 10x14 keeps 2 of 3 columns and 14 of 25 rows (red band and navy stripe kept, thin rows dropped). Mask front ref (wide, ~1:1) -> 5x8 is narrowed ~1.6x; that is the cylinder: the sides of the face sit in the back columns. `hires()` draws the same layout at 20 px/texel with the source art resampled into each box.
  - **Pads**: the g23 maps are index-equal but not geometric (the solver takes any texel with the same index, so v jumps between the identical 164 rows: 987 L reads v 3,7,9,3 down one column). Invisible with Abdul's index texture, scrambles art. `g25map.py` gives each pad px a geometric (v,u) (long axis knee->toe, across per slice, screen-right pad mirrored) and snaps to the nearest same-index texel: 1127 ok / 0 strict errors (unchanged). The art still cannot follow the geometry exactly where Abdul's index design differs from the art (e.g. index 0 px can only hit the black strap texels); a pure-geometry variant (`geo_*` maps, not strict) is kept for comparison.
  - **Blocker / catcher / mask** maps (same snap inside each block of the 23x32 layout; catcher block by facing with fallback to the other catcher block; mask as a cylinder, front views x13-19, back views 19,20|12,13). Strict on the original index texture, 14 frames: mask 335 ok / 2 err (538, idx 45), catcher 519 / 1 (idx 0), blocker 304 / 73 (idx 145, 148-152 glove colours and 153-180 jersey/arm colours that the blocker block has no texel for; 1044 26, 421 11). Open question to Abdul (ringed images, local).

## goalie26 – Fuhr v10 from Abdul's DR high-res gear, NHL95 cage mask (D131) + 1044 arm ruling (D132)
- D131 (Abdul pt932u) **Fuhr v10** (`v2_38x32/goalie26/fuhr26.py`, `fuhr_oilers_texture_v10.png`). Built from Abdul's high-res DR textures (kept local in `preview_v2/goalie26/refs/`, never committed): blocker = REFLEX board of the logo blocker/glove sheet rotated 90 deg into 10x7; pad front = pad sheet (top cuff trimmed) 10x14; pad back = strap panel rotated 90 deg (straps across the leg) into the D80 wrap strip x10-12; catcher back = white DR glove (backhand) x0-10; catcher front = red/white DR trapper x11-21. Cells take the mode colour (1/16 quantised). Mask: front cylinder-warped per texel row (each row's silhouette extent sampled with a sin warp, so the outer columns land on the mask edge and meet the back halves); face hole filled with the NHL95 cage look (texel 164 light grey bars, 0 black eye gaps, as in the game masks); chin (6,16),(7,16) orange, (6,15),(6,17) blue. Renders (local): strict = g26 maps, geometric = `geo_*` pads. Pad back views still map into the pad front block (g23 maps), so the new pad back strip is not yet shown in the renders.
- D132 (Abdul ruling, pt932u chain) **1044: the 26 'blocker' px ringed in goalie25 questions_1 are arm/body.** `goalie21/g21seg.py` ARM1044 relabels them BODY; `goalie26/g26_map.json` = g25 map minus them. Blocker strict now 304 ok / 47 err.

## Abdul's rulings log (keep every ruling here)
- pt775u v5 corrections; D3 centred-row rule for fewer px than texels; pt807u forearm stretch on 72 L / 77 R.
- D47 facing: 413 front, 416 front, 422 front, 428 back + front side, 449/519/980 back, 1000 back + front side. D87: 413 faces RIGHT, 425 faces LEFT.
- D54: 416 good, 1000 pad/leg correct, 422 stick px are not pad, 428 blocker hidden. D75: wall frames 374/375 use the wrong pad-top zone.
- D76: 164 is a texture zone. D80: pad back = strip wrapping round the pad front. D91: 413 catcher = FRONT piece, 425 = BACK piece. D96: 8x12 catcher piece removed. D98: shading on gear counts as gear. D40/D53: Abdul is colour blind, use luminance contrast (gloves baby blue + red).
- D116–D121 (goalie15 corrections 416,419,538,407,428,980,425,1044,422 + stick butt), D122 538 blocker = green cells, D123: 980 x13-15 y19-21 inner edge of RIGHT pad, 1044 (x9,y24) pad, 538 non-green old blocker = body, 428 no blocker, glove px proximal to the wrist = arm.
- D124: 980 ringed former-catcher px = arm; 416 ringed stay catcher; 419 catcher arm stripes 1-2 = arm; 419 green blocker cells = blocker. D125: 419 catcher = the 41 green cells.
- D129: mask strip = centre FRONT, back split onto the left and right sides. D132: 1044 ringed blocker px = arm/body.
- D133: Fuhr mask symmetric (front mirrored about centre, back halves mirror) and more orange on top of the mask.
- D134-D135: pads must render with straight vertical stripe and straight row bands, consistent across frames (test patterns); a solid cuff must be clearly visible on 987; Fuhr navy pad stripe = one clean straight column.
- D136: cuff = pad knee rows 9-12 (pt938u); pad knee->toe direction forced to the hip->skate (ankle) skeleton line (pt938u).
- D137: leave the 12 still-off pad frames as they are, no hand-marked knees (pt940u).
- D138: blocker orientation kept (no rotation); pad front not mirrored; check pixel matches myself instead of asking when the match is visible (pt942u).
- D139: 421 ringed px = blocker glove; 408 ringed = body; 417 group = pad; 426 left edge = mask; strap rotation, catcher back x0-10 and back views on the strip confirmed by pixel match (pt942u rule).
- D141-D142: strict 0 errors via seg + glove-atlas texel fixes; stick gets region x14-16 rows 9-22 (pt947u).
- D140: Fuhr cuff and V tip stay as NOW (v12); do not re-ask settled questions (pt943u).

## goalie26 v11 – symmetric mask, orange on top (D133)
- D133 (Abdul pt934u "make the fuhr texture symmetrical, and more of the orange needs to be on top") **Fuhr v11** (`goalie26/fuhr26.py` `small11`, `fuhr_oilers_texture_v11.png`). Mask front x14-18 mirrored about x16 (x14-15 -> x18-17); back halves mirror each other (x12-13 -> x20-19); the orange flame/V of the mask reference is brought into the top: row 1 x14,15,17,18 and row 2 x15-17 orange (row 1 x16 keeps the darker red point); chin kept (orange (6,16),(7,16), blue (6,15),(6,17)). Pad front was NOT mirrored: Abdul's DR pad reference itself is asymmetric (navy stripe right of centre, logo bottom-left/right differ; 86 of 140 texels differ from their mirror), so it follows the reference. Blocker/catcher refs are not symmetric designs either.

## goalie27 – test patterns, geometric pad maps v2, Fuhr v12 straight stripe (D134-D135)
- D134 (Abdul pt935u) **Geometric pad maps v2** (`goalie27/g27map.py` -> `g27_map.json`, `geo2_<leg>` = texel (v,u) in pad front rows 9-22 x0-9; old g25 `geo_` kept for comparison), 14 frames + SPAgglover 8 (legs = g24 seg PADL/PADR). Test-pattern sheets (local only): horizontal-lines (colour per texel row), vertical-lines (colour per column) and a solid cuff (rows 9-12 blue, Abdul's stripe cols 7-8 orange), Okabe-Ito colours with alternating luminance, no red/green pairs. Before: columns zig-zag (u normalised inside rounded slices cut across the tilted PCA axis) and the stripe side was chosen by leg name. Fixes: (1) u per sprite scanline for legs within 40 deg of vertical; diagonal legs use the two leg edges fitted as straight lines along the axis -> texel columns are straight; (2) stripe side from the sprite's own 151/152 px (texel cols 7-8), fallback inner; (3) v = long axis knee 0 -> toe 13 (a 145 knee-band anchor was tried and dropped: it over-stretched 987). After: 987/419/505/1044/422/429 lines straight and aligned, solid cuff + stripe clearly visible on 987; still imperfect where the pad blob is short/occluded (407 R, 414, 408, 420). Strict path untouched (pads stay 1127 ok / 0 err).
- D135 (Abdul pt935u follow-up) **Fuhr v12** (`goalie27/fuhr27.py`, `fuhr_oilers_texture_v12.png`) = v11 + the navy pad stripe as one clean straight column: texel col 7 rows 9-20 solid navy; the noisy downsampled navy texels in cols 6/8 go back to the row's pad white. **Pad bottom transparency is Abdul's original, not ours:** `goalie10/goalie_texture_abdul.png` (his 23x23 texture) rows 21-22 x0-9 are magenta except the toe (row 21 x3-5, row 22 x4 black); `goalie15/goalie_texture_v6_indexed.png` rows 21-22 are the same (255 except 0 at row 21 x3-5, row 22 x4). Fuhr v8-v12 only copy that mask, so nothing was filled.
- D136 (Abdul pt937u/pt938u) **Pad knee->toe direction from the skeleton.** `g27map.py`: when a pad blob's PCA axis is more than 25 deg off the skeleton's hip->ankle line (g16 joints for the 14 frames, g24 for SPAgglover; merged legs average both sides), the skeleton line becomes the long axis (v and the u edge fit follow it); otherwise PCA is kept, so 987/1044 are unchanged and the rest is as D134. 25 of 41 legs switched. Checked with a highlighted cuff test (cuff = pad texel rows 9-12 bright yellow, rest of the pad dark grey, cuff outlined, next to the game sprite; local only) plus H/V patterns. Now right: 987, 419 (R pad better), 1044, 505, 422, 520 (both), 428, 414 R, 426, 538 better, 407 R better. Still off: 407 L, 416 L, 421, 980, 413, 425, 408, 411, 417 L, 420, 423, 429 (short/occluded/foreshortened pads; the cuff ends up as a sliver on one edge). Strict path untouched.
- D137 (Abdul pt940u) **The 12 still-off pad frames are left as they are.** After D136 the cuff/pad direction is still off on 407 L, 416 L, 421, 980, 413, 425, 408, 411, 417 L, 420, 423, 429 (short/occluded/foreshortened pads). Abdul decided not to hand-mark knee points; the D136 skeleton-axis maps are final for these. Memory note: do not reopen these frames unless Abdul asks.
- D138 (Abdul pt942u, on the q137 question images) **(1) Blocker orientation stays as is, no 90 deg rotation**: with the default EDM texture the current mapping matches the game sprite on 987/419/1044/505 (1044 white centre stripe), CW/CCW both misplace the black block. Abdul: the pixel match was visible, so check matches myself instead of asking. **(2) Pad mapping stays as is, the left pad front is not mirrored**: default texture AS IS keeps the 151/152 stripe on the game's edge (987/419/422); real goalies' left/right pad designs are normally mirror images, which the current mapping already gives. His only concern was the wonky stripe in the old Fuhr texture, fixed in v12 (D135).
- D139 (pt942u: resolve open questions by pixel match, D138 rule) **Open questions answered from the game pixels.**
  - 421 ringed blocker px (goalie25 q2): the 11 px use glove indices 145/148-152 sitting on top of the blocker (arm/jersey is 153+; the 1044 arm px of D132 were jersey 153-180) -> blocker glove, label stays BLOCKER. No blocker texel has those indices, so they stay unmapped (sprite colour) and the default render stays pixel-perfect.
  - 408 (goalie24 q1): the 53 px labelled MASK below helmet row 4 use jersey indices 153-173 (no mask texel has them) -> BODY (`g24seg.evidence`).
  - 417 (q2): the right-side LEFT PAD group uses exactly the pad-front indices (155/164/151/152/146/145/0; the catcher has no 155/164) -> stays pad.
  - 426 (q3, back view): the left-edge px use mask indices 164/177/184-189/135 -> MASK (helmet back, 24 px relabelled), not catcher. The catcher is behind the body; only 2 catcher-index px (149/150) show.
  - Pad-back strap rotation: Abdul's strip x10-12 has constant-index rows (181..., stripes 187-189 row 15, 184-186 row 16), i.e. bands across the leg, and the game back views (407/980/428/520) show the bands across the leg -> the D131 90 deg strap rotation is right.
  - Catcher-back choice: in back views (407/428/980/520/425) the game catcher px are the 149-152 ramp (block x0-10) and the strict maps pick x0-10 -> catcher back stays x0-10.
  - Back views use the strap strip: `g27map.py` geo2 now sends every pad px whose sprite index is 181-189 to the strip texel with the same index nearest its geo2 row (226 px over 22 frames; the same px the strict maps send to the strip). Default texture renders now match the game on those px (407/980/428/520/425/429/408/411 checked, local images).
  - Still for Abdul (art, no pixel answer): Fuhr knee-cuff colour; the dark red pixel at the tip of the mask V.
- D140 (Abdul pt943u + correction) **Fuhr knee cuff and mask V tip stay as NOW** (v12): grey/white knee cuff from his reference, dark red pixel at the tip of the mask V. No orange-cuff v13 was made or merged. Settled questions are not re-asked.

## goalie28 – strict 0 errors for blocker/catcher/mask, stick part (D141-D142)
- D141 (Abdul pt947u steering) **Strict mapping to 0 errors** (`goalie28/g28strict.py` -> `g28_map.json`, 14 frames). Totals: blocker 348 ok / 0 err (was 47 err), catcher incl. cuff 519 / 0 (was 1), mask 335 / 2, stick 437 / 0, pads unchanged 1127 / 0. Fixes, none by leaving px unmapped: segmentation - 416 (17,6), 407 (14,16), (15,16) blocker px with jersey indices 177/169/173 -> BODY; 425 (27,3) idx 0 'catcher' px is the stick's black butt -> STICK; 1044 (33,9) idx 8 'stick' px is skate colour -> SKATE; D132 1044 arm px applied. Texel mapping - a glove px whose index is not in its own block takes the nearest same-index texel of the other glove blocks (blocker <-> catcher front/back are one atlas, as D130 for the catcher): the 44 blocker-glove px with 145/148-152 (D139) map into the catcher blocks. **Cannot reach 0:** 538 mask (row 4, the two eye holes) index 45 - no texel in the layout has index 45 (Abdul's mask eyes are 0); needs a layout/palette decision.
- D142 (Abdul pt947u steering) **Stick part.** New region in the free area x14-16 rows 9-22 (`goalie28/goalie_texture_v7_indexed.png` = v6 + region): col 15 rows 9-19 = 136 shaft, cols 14/16 rows 9-19 = 0 outline, rows 20-22 = 0 blade/tape. Strict map: v along the stick's long axis (hand 0 -> blade), u across, snapped to the nearest same-index texel; 437 ok / 0 err. Fuhr v13 (`goalie28/fuhr28.py`, `fuhr_oilers_texture_v13.png`) = v12 + the stick region in the game colours (EDM 136 (192,96,96), 0 black).
- D143 (Abdul pt947u) **Part/skeleton editor + full-set mapping.** `sprite-textures/goalie_part_editor.html` (static, no game data): load a local `goalie_editor_data.json` made by `goalie28/g28export.py` (sprite indices, labels b/M/C/B/S/L/R/K/s, joints, EDM palette, both textures; it holds game data, so keep it local); Okabe-Ito overlay with a letter per px (toggle O), part picker 1-9/0, paint per px, drag joints (toggle J), A/D or arrows step frames, live previews default / Fuhr v13 / game, export `goalie_edits.json` -> `goalie28/g28import.py` -> `/tmp/g28_edits.json`, which `goalie28/g28all.py` (texel maps for all 246 goalie frames: strict same-index snap for blocker/catcher/mask/stick, geo2+strip for pads) uses in place of the automatic seg. Frames without an orient ruling count as back views when the mask has no 0 (eye/face) px inside.
- D144 (Abdul pt948u-pt950u) **Strict 0 errors on all 246 goalie frames** (`goalie28/g28all.py`). Pixel-match relabel (like D139): a blocker/catcher/mask/stick/pad px whose sprite index no texel of that part has takes the most common 8-neighbour label that can hold it, else BODY (jersey/skin 153-180; mask/glove px) or SKATE (pad/stick px, boot greys 22/30/31). 5283 px relabelled on the auto-segmented frames (mostly mask->body 2270, blocker->body 2067, pads->shadow/skate 548). Pads are now index-exact too: geo2 picks the position and the px snaps to the nearest SAME-index texel of the pad front/strip (x0-12 rows 9-22). Totals: blocker 5376 / 0 err, catcher incl. cuff 10710 / 0, mask 5388 / 0, stick 7151 / 0, pads 17348 / 0. The two 538 eye-hole px (index 45, no texel) are BODY (face seen through the cage), not unmapped. Remaining seg mistakes (e.g. orange/red patches where body is labelled catcher on 455, 1041) are for the D143 editor.

## D145 — Eye holes in the mask texture (Abdul's ruling)
- Ruling: eye holes belong in the mask texture. Texture v8 (`goalie29/goalie_texture_v8_indexed.png`) adds the game's eye shade 45 at (7,15),(7,17) and helmet-strap variant 134 at (6,12),(6,20). Fuhr v14 copies Fuhr's own eyes/strap into these cells.
- Frame 538's eye pixels (and 537) are mask again, not relabelled.

## D146 — Audit of the D144 relabels; region rule
- Audit (raw auto labels): the colours each part uses that its texture lacks were blocker 2186 px (jersey 153-180 and stripes 181-189), mask 2375 px (jersey), catcher 126 px (pad 155/164), pads ~600 px (skate 31/30/22). The only real texture gaps were 45 (eyes) and 134 (strap), which D145 fixed. Everything else was wrong labels from the auto segmenter: whole torsos labelled blocker (540, 462) and chests labelled mask (521, 1071).
- Rule (auto frames only; hand-checked FR frames are left alone): a glove pixel must be glove colour 144-152 or its black outline; a mask pixel must lie in the top 9 rows of the mask; a glove-labelled pixel at or above the neck in a mask colour becomes mask. Each moved pixel goes to the neighbouring part whose texture has its colour, never back to the part it came from. Otherwise it becomes body (jersey colours) or skate.
- Relabels kept (pixel is not that part): mask→body 2279, blocker→body 1915, blocker→mask 240, pad→shadow 367, pad→skate 181, catcher→body 90, plus small classes. Evidence images are kept locally (preview_v2/d145/kept_*.png).

## D147 — Per-pixel mapping for custom textures
- Measure: the share of neighbouring sprite pixels whose texels are exactly one step apart (no stretch, no skip). Before → now (across/down): blocker 25/42% → 30/50%, catcher 29/28% → 34/31%, mask 50/69% → 52/70%, pads 34/45% (unchanged).
- Blocker, catcher and mask now aim at a per-pixel target and snap to the nearest texel with the same colour. A pure per-pixel pad target scored worse (30/25%), so it is off (PADPP=1 turns it on).
- Conflict: with this 23x32 layout, pure per-pixel placement matches the game's colours on only ~26% of blocker, 15% of catcher and 36% of mask pixels. A control with 0 errors and full per-pixel mapping can't both hold until the texture layout matches the game art pixel for pixel.
