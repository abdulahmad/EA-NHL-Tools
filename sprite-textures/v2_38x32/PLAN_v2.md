# PLAN_v2 — making v2 (38x32) render identical to in-game

## 1. Control method (identical-to-game target)
For each team palette (Leafs HOME tor, Rangers AWAY nyr, Chicago HOME chi (white), Chicago AWAY chi (red), Montreal HOME mtl):
build a *control texture*: every v2 texel painted with its family's game colour (gear = black, idx### = palette[idx], else ramp 'medium'/'flat').
Render each of the 11 frames [370,897,57,62,67,52,72,889,42,47,77] through the v2 mapping, then compare per pixel with the game palette render (sp[q]).
Pass = 0 differing pixels and 0 occupancy differences, for all 5 teams x 11 frames. Harness: `mapped/ctrl.py`.

## 2. Why pants (and some torso) were broken in v2 — measured
The v1 packer grouped pixels by (zone,row) only, so a stripe pixel could land on a plain-pants texel and the other way round.
BEFORE totals: tor 132, nyr 155, chi-home 171, chi-away 171, mtl 155 px.
Example (Chicago): pantsF 370:19, 897:15, 57:16, 62:10, 67:11, 52:8, 72:4, 889:9, 42:6, 77:1. pantsB: 57:1, 52:2, 72:6, 889:4, 42:8, 47:8, 77:5.
FT: 897:6, 57:6, 62:8, 67:5, 52:4, 72:3 (yoke-corner and shoulder-patch family slips). BT: 889:2, 47:3, 77:1. Arms 0.
Full numbers: `mapped/control_before.json`.

## 3. Fix
Group by (zone,row,**family**). Targets are only the texels in that zone/row with the same family (FAM2).
If none exist, use the nearest row (±1..3) in the zone that has the family. For pants, if the family exists only in the other half, wrap to the other half on the same row (see D4).
Fewer pixels than texels: a contiguous block, centred (o=(n-m)//2). More pixels than texels: stretch evenly from the centre.
Crest, skin and gear texels are direct-mapped and are never used as targets.

## 4. Does the Chicago red home texture match in game?
Not texel-for-texel. `raw/chicago_home_top_v2.png` best matches the AWAY.json chi palette (the red jersey; HOME.json chi is white).
300 non-crest/non-gear texels still differ from the game colours:
- pants 44,44,44 vs game 28,28,28 (120 texels)
- helmet 44 vs 0 (55)
- skin placeholder green vs 224,128,128 (32)
- pants stripe 1 232 vs 136 (24)
- yoke 1 132,0,0 vs 160,0,0 (19)
- and smaller ones (`mapped/chimatch.py`).
These are texture colour choices, not mapping errors. The mapping itself is proven by the control diff = 0.

## 5. First-pass plan for the remaining parts (sequential)
1. pants: DONE (control 0).
2. socks: already direct (legs rows 23-31). Check the family stripes per column and run the control.
3. helmet: direct rows 0-5. Verify the control, then decide whether the helmet stripe needs its own family.
4. skates: gear, direct. Keep the game index colours; decide later whether to make them texture-driven.
5. gloves: use the glove columns 0, 19, 20, 37 (rows 18-20), currently unused. Map gear-family glove pixels there, centre-contiguous.
6. stick: not in the texture today (game index). Propose its own strip if wanted.
7. goalie mask, blocker, pads, glove: need goalie frames added to the test set first. Same harness, with new zones.
