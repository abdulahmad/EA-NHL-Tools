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
