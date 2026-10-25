# Sprite textures: handoff (paused 2026-10-25, D163)

Abdul is pausing this project for 2-3 weeks. This file says where things stand and exactly how to resume.
Full history and every ruling: `EXPANDED_ZONES.md` (rulings log + one section per D-number). Never commit ROMs,
game data, renders or reference images; editor data JSONs hold game data and stay local.

## Current state

### Goalies: done, 0 errors
- D136-D140: pad knee->toe from the skeleton, cuff rows, blocker/catcher/mask rulings (resolved by pixel match).
- D141-D144: strict mapping, stick region (x14-16, rows 9-22), 0 errors on all 246 goalie frames (`v2_38x32/goalie28/g28all.py`).
- D145-D155: mask eye holes in texture v8, per-pixel custom textures, goalie part/skeleton editor, keep the 23x32 layout (D151),
  small pad pieces snapped (D155). Full render check over all 246 frames on default v8: **0 errors**.

### Skaters (38x32 v2 layout)
- D148-D154: skater part/skeleton editor, test textures, texture shown beside previews.
- D156: back-torso column remap on auto back views. D157/D158: straight texel columns per body segment (strict colour band kept).
- D159/D160: pants: every pants px now has a texel (unmapped 10512 -> 0 auto, 235 -> 0 hand), 0 wrong band.
- D161/D162: full skeleton on every frame (head, neck, chest, belly, pelvis, arms, legs, stick shaft + blade), confident/flagged
  checks; on falls/dives/crouches the skeleton axes drive texel column directions.
- D163 (this handoff): index 136 near the head is the face/neck shade, not stick (label fix in the editor export). Full render.
- Coverage: 601 of 881 frames have texture maps (11 hand-fitted, 590 auto). The other 280: 254 have no uniform px (not players:
  crowd, effects), 21 have no SPA facing, 5 contain goalie-mask px.
- **Full render on Leafs home (the editor's default texture), all 601 mapped frames: 0 errors** (no texel, unused texel or
  wrong colour band) on every textured part: crest 3316, glove 10450, helmet 11082, pants 27424, shoulder patch 845,
  skate 13061, skate blade 3179, skin 5990, sleeve 24076, sock 16970, torso 37335. Stick/other/ice keep the game colour.
- Skeleton (881): v5 fit 357 confident / 15 flagged; special-pose fit 184 / 32; hand-fitted 12 / 5; pose fit 3 / 1; labels only 272.
- Straightness on special-pose frames: column breaks 5669 / 45791 pairs, row breaks 4011 / 45021.

## Open issues (for the manual pass)
1. Hard frames need joints placed by hand in the skater editor: 273, 274, 276, 279, 302, 943 (also check 277, 301, 303).
   276 is marked confident but its hidden legs are drawn on the torso.
2. Frames 8 and 16: stick butt was at the neck. D163's face fix moves it to the real stick (8: 29,14; 16: 7,12); check the hands.
3. Frame 49: L skate above the knee. Frame 1: stick hand not at the stick.
4. `SKELROWS` stays off: skeleton-driven torso rows cut slant but add row breaks (D161 3153 -> 3252, D162 4011 -> 4133).
5. D157 changed the hand-fitted frames' columns too (65-97% agreement with their old per-row columns). Intended, but
   re-check these if the hand maps are revised.
6. The 3 hand-fitted skeletons flagged 'skate not on a skate' (and 2 others) should be re-checked in the editor.

## How to run
Run from `sprite-textures/`. Needs the local game data the scripts expect (see each script's header).
- Skater editor data: `python3 skater_editor/skater_export.py /workspace/serve/skater_editor_data.json [team]`
  then open `skater_part_editor.html` and load that JSON. Keys: 1-9/0 pick part, click/drag paints, J = skeleton,
  drag a joint ring to move it, A/D step frames, Export edits JSON (`skater_edits.json`), Import edits JSON to reload.
- Apply editor edits: `python3 skater_editor/skater_import.py skater_edits.json` (writes `/tmp/skater_edits.json`), then re-run
  the export. Edited labels/joints override the automatic ones; edited joints become hand-fitted anchors.
- Goalie editor: `python3 v2_38x32/goalie28/g28export.py` -> open `goalie_part_editor.html`; export `goalie_edits.json` ->
  `v2_38x32/goalie28/g28import.py` -> `v2_38x32/goalie28/g28all.py`.

### Env flags (skater export / autofit)
- `NOSKEL=1`: no skeleton axes (special poses use the PCA axis, as before D161).
- `SKELROWS=1`: skeleton-driven torso rows (off by default; not better).
- `NOPANTS=1`: skip the D159/D160 pants remap and pants straightening.
- `NOSTRAIGHT=1`: skip D157 column straightening. `NOBACK=1`: skip the D156 back-torso remap.

## Resume steps
1. `git fetch && git checkout main && git pull`.
2. Re-make the editor data: `python3 skater_editor/skater_export.py /workspace/serve/skater_editor_data.json`.
3. In `skater_part_editor.html`, fix joints on 273, 274, 276, 279, 302, 943 (then 49, 1, 8, 16, 277, 301, 303); Export edits.
4. `python3 skater_editor/skater_import.py skater_edits.json`, then re-run step 2. Check that the frames now say
   'edited in the editor' and that the full render still has 0 errors.
5. Then try `SKELROWS=1` again on the fixed frames; only switch it on if row breaks do not rise.
6. Each change: next D-number in `EXPANDED_ZONES.md` (+ rulings log if Abdul ruled) and one README line; small PR, normal merge.
