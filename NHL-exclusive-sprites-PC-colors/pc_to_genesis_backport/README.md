# 95 PC sprites with no 94G counterpart, backported to 94G Genesis colours

Built 28 Nov 2026. Committed to `exclusive-sprites-pc-colors` as `pc_to_genesis_backport/` (this folder is the build's `out/`; the working `.pkl` intermediates and logs are not included). Frame numbers: 95 PC counts from 0 (as in the game and NHL9X Studio); Genesis counts from 1. Census key = PC number + 1.

## Which PC frames
Source: the D165 census (`frames_matrix.csv`, column `G94_class`) plus the earlier visual review of slot redraws (`exclusive_frames.csv`, "not exclusive (resolved)").
- **A: no 94G match** (`G94_class` = none): 383 frames. 169 of them (all tiers) also have no match in 92G, 93G or 94S ("exclusive_all_sets" in `manifest.csv`).
- **B: unsure** (`G94_class` = ambiguous, a weak 94G look-alike exists): 137 frames. Converted too, listed separately, not claimed as exclusive.
- Dropped: 46 PC frames that the visual review already resolved as a redraw of a 94G frame in the same slot (skate/stop/Stanley/arrows/stars/siren/puck/goal/glass etc.).
- The census labels `player?` / `goalie?` are wrong for many of these frames (about 70 flip). Kind is decided from the pixels: any PC 164 (goalie mask) = goalie; else any helmet 190/191 = skater; else a random forest on the zone histogram (32 frames, listed in `manifest.csv` as `kind_basis=rf`). On the matched frames with a visible head this rule agrees with the census label on 505 of 519.
- Frames with no team-zone pixels at all (144-244) are **fixed-colour** frames: 223 frames, mostly referee poses, plus arrows, the cup presenter and a few small items. They are not team-coloured in 95 PC, so they cannot use team colours on Genesis either.

| group | frames | kind |
|---|---|---|
| A skaters | 142 | team model |
| A goalies | 91 | team model |
| A referees/items | 150 | nearest colour on palette lines 0/1 |
| B skaters | 37 | team model |
| B goalies | 27 | team model |
| B referees/items | 73 | nearest colour on palette lines 0/1 |

## How the mapping was learned
275 skater and 115 goalie matched PC/94G pairs (silhouette IoU 0.97 or better, aligned with mirror and a few px of offset). For every PC pixel the model predicts the 94G index 33-47.
- Fixed parts keep Genesis stock colours: black 0 -> 34, blades 8/28/31 -> 33, skin 133-135/140 -> 38/39, stick 136 -> 46, shadow 88 -> 47. Each PC index may only map to Genesis indices it was seen on (2% share or more).
- Team zones 144-191 (and crest 192-244) become Genesis ramps A (35-37), B (40/41), C (42), D (43-45). Per-zone majority alone is weak, so context is added: the 5x5 neighbourhood of PC zone families, the shade, position in the frame and run lengths. Model: gradient-boosted trees, one for skaters and one for goalies (`models/`).
- A PC index with fewer than 30 training pixels gets the nearest stock Genesis colour. Non-team object colours (Stanley Cup, puck, ref) go to palette line 0/1, as the real 94G Stanley frames do. A hardware-sprite tile has one palette line, so minority pixels in a mixed tile are recoloured to the nearest colour of the tile's majority line (697 px in total).
- Everything is limited to one 15-colour palette line per tile (max colours used per line: 15).
- The PC team zones do not predict the Genesis shade well because the Genesis art bakes in per-pose lighting. Stripe zones are weakest because PC stripes are per-team and the Genesis art only has two trim colours.

## Agreement with real 94G (held-out pairs, model never saw them)
`validation/agreement.json`, `validation/eval_by_family.json`.

| | pairs | pixels | exact index | same ramp/role | team-zone px exact | team-zone px same ramp |
|---|---|---|---|---|---|---|
| skaters | 55 | 17,752 | 69.2% | 85.5% | 51.6% | 78.6% |
| goalies | 23 | 8,607 | 65.1% | 79.0% | 56.1% | 74.8% |

Majority-per-index baseline on the same pixels: skaters 62.0% exact, 82.2% ramp, 44.7% / 78.1% on team pixels; goalies 56.8% / 73.8%, 47.7% / 70.7%.
Weak spots (exact index): arm stripes 28-33% (skaters), pants stripes 42-44%, sock stripes 35-38%, waist 2 36%, waist 3 43%, upper arm 38%, pants 43%. Strong: black 95%, shadow 99.5%, stick 96%, yoke 1 97%, yoke 2 85%, skin 87%.

## Flawed-zone flag (Abdul's caveat)
`ZONES?` on a sheet / `zone_flag` in `manifest.csv` means the PC zone pattern is unusual compared with the 95 PC frames that do have a 94G match. Two tests: a pair of touching team zones that occurs 2 times or fewer across all matched frames (for example arm stripe against socks, or crest against shoulder patch), or many isolated stripe pixels. Reasons are in `zone_flag_reasons`.
- Skaters: 44 of 142 in A and 4 of 37 in B are flagged. The same test flags 6.7% of matched skater frames.
- Goalies: 30 of 91 in A and 3 of 27 in B. The same test flags 11% of matched goalie frames.
- This is a heuristic for unusual patterns. Pose can also cause a rare contact (an arm across the legs). Nothing was proven broken by pixel-level review.
- Referees/items are not tested (no team zones).

## Round trip into 94G sprite encoding
There is no 94G sprite encoder in the repo (the tools only decode). `code/pack.py` packs each index array into 8x8 4bpp tiles plus hardware-sprite pieces in the layout the repo decoder (`gdec.py`) reads, and decodes it again. All 520 frames round-trip byte for byte (`roundtrip_ok`). `pack/pc_<n>_tiles.bin` and `pc_<n>_sprites.bin` hold the tile data (32 bytes per tile) and the piece list (8 bytes each: x, y, tile, attribute, size). These were not inserted into a ROM or checked in the game; sprite offsets/hotspots and the frame table are not produced. The packer also round-trips 811 of the 845 real 94G frames (the other 34 have pieces not on the 8-pixel grid).

## Files
- `idx/pc_<n>_g94idx.png`: mode P, pixel value = Genesis palette index (33-47 on line 2; 1-31 for lines 0/1), 0 = transparent, palette = BOS home.
- `preview_bos_h/` Genesis BOS home previews, `pc_bos_h/` the PC originals in BOS home, `preview_zones/` Genesis index colours (colour-blind safe zone view).
- `sheets/` contact sheets (A = 95 PC BOS home, B = Genesis backport BOS home). `validation/val_bos_*.png` and `val_zone_*.png` show held-out pairs A PC, B backport, C real 94G.
- `manifest.csv`: per frame tier, kind, flags, colours, tiles. `pc_to_g94_index_stats.csv`: per-PC-index Genesis shares.
- `code/` and `models/`: scripts and trained models (train-split models for the validation, final models trained on all pairs for the frames).
- BOS home on Genesis has near-identical colours for some indices (34 and 35 are both black, 42 and 44 both white-grey), so use `preview_zones/` to check the index choice.
