# v4 progress (box paths under /workspace/out/zones/v2/poc5/v4/)
## Milestone 1 — fit370 with v4 layout: DONE (Fri Oct 23, 4:30 PM EDT)
- v4 vs v3: canvas 28x32 -> 54x32; new side-pants panel cols 29-53 rows 17-23 = [red|white] front pants (cols 31-39 = 370 x6..14, +25)
  [white|red|white] back pants (cols 43-51) [white|red] — the 3-stripe white/red/white hip pattern, wrapping at cols 53/29.
  Also (1,21),(1,22),(11,21),(11,22),(16,21),(16,22),(26,21),(26,22) grey 136 -> white (pants stripe now white).
- 370 pants pixels (rows 17-23) now map to the side panel; front-figure pants texels unused by 370.
- Flattened uniform colours (crest excluded): red 132,0,0 / black 44,44,44 / white 232,232,232, + gold shoulder patch 168,132,0 (2 texels each side, kept as design accent).
  helmet 1 colour, skin 1 colour, gear 1 green (0,220,0). Back number/back shading flattened to the single red. Counts: unique_colours.json
- Leafs round-trip on 370: 0 diff of 297 covered px. Abdul combined vs his drawing: 112 differ (expected: drawn shading now comes only from the shading layer; gear is green).
- Images: abdul_fit370_sheet.png, leafs_fit370_sheet.png, abdul_flat_x16.png, texel_assignment_x20.png, 370_abdul_flat_x10.png, 370_shading_x10.png, 370_abdul_combined_x10.png, abdul_layout_v4_x16.png

## Milestone 2 — v4 layout on all test frames, game-colour round trip: DONE
- Layout kept FIXED at v4 as drawn (no texels added). Per frame & zone family: one pixel per texel by min-cost assignment (frames/frames_v4.json).
- Leafs home & Rangers away diff = 0 on every frame (370, 897, 57, 62, 67, 52, 72 front/side; 889, 42, 47, 77 back). mapped + gear = all pixels.
- Exceptions: frame 62 (head-down) has 13 yoke-2 pixels vs 10 yoke-2 texels -> 3 shared texels (still 0 diff). Possible proposal only if Abdul wants strict 1:1 there.
- Index 135 = 4th skin shade -> skin texel + 'shadow' shading level. Index 136 next to skin/helmet = neck shadow -> skin texel + 'neck' level; elsewhere 136 = stick (green).
- Images: frames/leafs_home_gamecolours_all_frames_sheet.png, frames/rangers_away_gamecolours_all_frames_sheet.png, frames/<frame>_texel_overlay_x10.png

## Milestone 3 — team jerseys in v4 style: DONE
- frames/{leafs_home,rangers_away,chicago_away,montreal_home}_texture_x16.png and _all_frames_sheet.png (flat / shading / combined / game)
- Style = one shade per hue (game colours within L1 80 merged into the most used), crest as in game, gear green. Diffs vs game are expected (merged shades): teams_v4.json
