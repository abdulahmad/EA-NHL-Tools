# sprite-textures

**Start here:** [docs/WORKFLOW.md](docs/WORKFLOW.md), covering the roadmap, pipelines, editor, rules, status and how to resume.

> **Start here (agents):** the current work is the **v2 38x32 texture layout**. Read the "v2 38x32 layout — entry point" section below, then `EXPANDED_ZONES.md` (decisions log) and `v2_38x32/PLAN_v2.md`.

Research tooling for per-pixel jersey textures on the NHL 95 PC player sprites. The target is the NHL Classic engine (the C port of NHL Genesis that is being converted to full colour). Retail palette limits do not apply there.

**Goal.** Give each sprite pixel a body part, a (U,V) texture coordinate and a shade value. A jersey can then be any texture painted in one shared atlas layout, instead of 48 palette zones. Stripes wrap around the body at a constant thickness, and the crest, numbers, socks, pants, helmet and gloves come from the same atlas.

## What is committed
- `scripts/`: the extraction and analysis pipeline (Node + Python).
- `textures/reference_atlas_*.png`: the 512×512 atlas layout. Regions are listed in `scripts/uv.py` `ATLAS`. Includes uv, checker, candy-stripe and design test textures, plus a labelled copy.
- `textures/jerseys/*_atlas.png`: six hand-authored jersey designs. Crests are downscaled team logos (committed with the owner's approval). Back torsos carry no name or number.
- `FINDINGS.md`, `AUDIT.md`, `EXPANDED_ZONES.md` (decision log) and `HANDOFF.md`, plus JSON results: `broken_arm_crest.json`, `broken_metrics.json`, `broken_stick.json`, `goalie_part_presence.json`, `flat_stripe_check.json`.

**Not committed:** ROMs and original game files. `out/` is git-ignored. Since 2026-10-23, game-derived renders and extracted control textures may be committed (see `perpixel/`, `PER_PIXEL_MAP.md`).

## Regenerate from your own NHL 95 PC files
Requirements: Node 18+, Python 3.10+, `pip install -r requirements.txt`, and a checkout of NHL9XStudio (for `lib/pc95.js` and `lib/pc-jersey.js`).

```sh
cd sprite-textures/scripts
NHL9XSTUDIO=/path/to/NHL9XStudio NHL95_DIR=/path/to/NHL95/files node dump.js   # needs *.PPV, HOMEPALS.BIN, AWAYPALS.BIN -> ../out/data/
cd ../out
python3 ../scripts/uv_proofs_aligned.py      # UV / checker / stripe proofs
python3 ../scripts/equip_proof_aligned.py    # equipment segmentation proofs
python3 ../scripts/flatcheck.py              # flat-stripe regression check (needs out/jerseys/)
mkdir -p jerseys/ref                         # optional: put the reference jersey images here (names in scripts/jerseys.py)
python3 ../scripts/jerseys_render.py         # per-jersey grids + 00_summary_all6.png
```
Run the Python scripts from `out/` with `../scripts` on `PYTHONPATH` (for example `PYTHONPATH=../scripts python3 ...`).

## Audit and fix pipeline (2026-10-23)
- `audit.py <tag> WRAP_LIMBS SIDE_FIX ELEV FRONT_SMOOTH` runs the per-frame metrics, and `audit_stats.py` summarises them. Results: `AUDIT.md`, `stats_before_vs_fix2.txt` (the per-version fix plans and results logs were removed; git history has them).
- `capacity.py` measures each region's pixel capacity (`capacity.json`). `jerseys_render3.py` renders the capacity-limited textures (`textures/capacity/*_flat.png` show the exact texels).
- Demo scripts:
  - `glove_demo.py`: gloves (`textures/gloves`).
  - `fuhr.py`: goalie gear (`textures/goalie_fuhr`).
  - `stick_demo.py`: stick (`textures/stick`).
- Reference images (jersey photos, glove renders, the Grant Fuhr goalie textures from a third-party NHL 2004-era mod, the stick photo) are kept local in `out/jerseys/ref/` and are not committed. The committed gear and stick textures are my own low-resolution redraws at sprite capacity.


## v2 38x32 layout — entry point (2026-10-23)
**Layout spec / column map:**
- `v2_38x32/textures/layout_v2_38x32_abdul.png` is the layout Abdul hand-edited.
- `v2_38x32/column_map_v2.md` / `.json` give the mapping from the 75-wide atlas to the 38-wide one (rules, the added glove columns 0/19/20/37 on rows 18-20, and new→old column).
- Layout:
  - Front: right arm 0-3, torso 3-16 (rows 6-8) / 5-14 (rows 9-16), left arm 16-19.
  - Back: left arm 20-23, torso 23-34 / 24-33, right arm 34-37.
  - Pants rows 17-22: front 3-15, back 24-34.
  - Legs rows 23-31.
  - Crest cols 7-11, rows 10-13.

**Mapping rules (sprite pixel → texel):**
1. 1 pixel per texel where the counts match.
2. Fewer pixels than texels: a contiguous block centred in the row, offset `(n-m)//2`, with the outer columns dropped first.
3. More pixels than texels: stretch evenly from the centre, sharing texels.
4. Pixels are grouped by (zone, row, family). They only land on texels of the same family. Fallbacks: nearest row in the zone, then the pants wrap (EXPANDED_ZONES D4).
5. Crest (idx###), skin and gear texels are direct-mapped and never used as targets for ordinary pixels.
6. Texels new in v2 (no old source) are filled by extending the edge texel outward in the same row (the texture authoring rule).

**Test frames:** 370, 897 (anthem), 57, 62, 67, 52, 72, 889, 42, 47, 77.

**Control-diff verification:** `v2_38x32/scripts/ctrl.py`.
- Paint every v2 texel with its family's game colour.
- Render the 11 frames through the mapping, then compare per pixel with the game palette render.
- Teams: Leafs HOME, Rangers AWAY, Chicago HOME and AWAY, Montreal HOME.
- Pass = 0 px diff and 0 occupancy diff.
- Run: `before.py` (old packer) / `after.py` (current); the results are in `control_before.json` / `control_after.json`.

**Status:**
- v2map2 control diff is **0 on all 5 teams x 11 frames**. It was 132-171 px per team, all pants/torso family slips.
- Chicago red texture vs the in-game colours: 300 texels differ because of colour choices (pants grey, helmet, stripe shade), not because of the mapping. See `PLAN_v2.md` §4.

**First pass done (2026-10-24):**
- socks, helmet, skates, gloves and stick all have control diff 0.
- The stick strip is at rows 0-1, cols 14-26.
- Skate detail limit: see EXPANDED_ZONES D8-D13 and `v2_38x32/part_*.json`.

**Goalie first pass (2026-10-24):**
- There are 8 goalie test frames (EXPANDED_ZONES D14) and a draft goalie companion texture, 38x32 (pad 19x21, blocker and catcher 10x10, mask 7x6). The script is `v2_38x32/scripts/gmap.py`.
- Control: blocker 0 and catcher 0; mask 3 px per team (cage); pad 9-10 px per team. See D14-D19.

**Skate texture v1 (2026-10-24):** `v2_38x32/skates/` - every in-game skate index has its own texel family, control diff 0 on 11 frames x 5 teams; test + realistic textures (EXPANDED_ZONES D20-D24). Fuhr goalie demo and gloves/stick extra-frame scripts: D25-D26.

**Decisions pt857 (2026-10-24):** 4-wide glove block (D27), 38 wide kept (D28), arm rows 11/15 illustrated (D29, pending), goalie pads L/R + cage texel with control 0 (D30), stick blade analysis (D31), Oilers Fuhr texture (D32), player glove textures (D33). Folders: `v2_38x32/decisions`, `goalie2`, `stick`, `gloves`.

**Goalie layout v3 (2026-10-24, pt859u):** `v2_38x32/goalie3/`.
- The Fuhr part shapes now include pad backs and mask back. Layout diagram: `goalie_layout_v3.png`.
- Default-gear control is **0 on 8 frames x 5 teams**.
- Why the D32 Oilers pass failed: D34 (pad backs never mapped, 59% of pad px; family-run packing; capacity-sized blocks; segmentation).
- Fixes: D35-D39. Brighter or high-contrast glove test colours: D40.

**Goalie segmentation v4 (2026-10-24, pt860u):** `v2_38x32/goalie4/`.
- Gear parts are now segmented from their own palette zones plus logical masks (EXPANDED_ZONES D41-D43): pads front = 150-152 / 155 / socks 181-189, blocker = 144-146 + 147-149, catcher = 150-152 + 147/148, mask = 177 + 184-189 + 164, cage 135. 519 is front-facing.
- Default gear rebuilt from it: control **0 on 8 frames x 5 teams**; 535 of 1447 px relocated by colour (D44).
- Fuhr Oilers redone on the position map (D45). Glove contrast options A/B/C (D46).

**Goalie skeleton v5, facing corrected (2026-10-24, pt861u):** `v2_38x32/goalie5/`.
- Facing per Abdul: front 413 (side), 416, 422; back 449, 519, 980; mixed 428 and 1000. Index 135 is the helmet back strap, not the cage (D47).
- Skeleton: SPAgready 407-428 is one pose at 8 facings; a 3D base pose is rotated and adjusted per frame (D48-D49).
- Zones revised: pad back = socks zones 181-189, pad front = 144-148 (D50). Segmentation v5 (D51).
- Default gear control **0 on 8 frames x 5 teams**; 539 of 1457 px relocated (D52). Gloves baby blue + red (D53).

**Goalie v6: stick, skeleton UV, default gear from sprites (2026-10-24, pt863u):** `v2_38x32/goalie6/`.
- Skeleton v6 adds the goalie stick (butt, shaft, blade, held by the right/blocker hand) and labels RH/LH vs RL/LL (D55). Seg v6 removes stick px from gear: fixes the 422 "FR" blade pixels (D55). 428 blocker hidden behind the torso by the rotation check (D55).
- Layout v6: mask is one 12x7 wrap strip (front centred, sides, back), other blocks unchanged (D56). UV = angle around leg/head from the skeleton (D57).
- Default gear built from the clearest frames: control **0 on 8 frames x 5 teams**; relocation 415 of 1448 px (28.7%, v5 37%), moved 2+ texels 93 (v5 265) (D58). Fuhr Oilers re-projected (D59).
- Player gloves v6: recolour limited to glove px, stick px changed 0 on 11 frames (D60).

**Goalie v7: shading layer split from base colours, player gloves purple + lime (2026-10-24, pt864u):** `v2_38x32/goalie7/`.
- Non-team indices in the gear (164/22 greys, idx0/109 outline, 30/31 toe navy, 134/136 cage) moved to a per-frame shading layer (`goalie7/shading/<frame>.png`, codes in `levels.json`); the texture holds team base colours only. Control 0 px (8 frames x 5 teams). Relocation 415 -> 275 px (28.7% -> 19.0%) (D61-D63).
- Fuhr texture v7 with baked greys snapped to white/black, drawn as texture x shading (D64). Player gloves v7 deep purple + lime, stick untouched (D65).

**Player gloves v8 (2026-10-24, pt866u):** comparison sheets now use a fixed grid, so the A and B columns line up (D66). Added a light violet (150,90,255) + lime option: violet vs black 5.2:1, violet vs lime 3.27:1, stick px changed 0 (D67).

**Goalie v8: default gear lifted from sprites, v1 style (2026-10-24, pt867u):** `v2_38x32/goalie8/`. Each part cut from its clearest frame (pads F 422, B 519, blocker 422, catcher 416, mask 416/413/519), base + shaded textures, mapped back by nearest uv: CHI HOME diff 397 / 1435 px, TOR HOME 417 (D68-D69). Readable texture first, diff reduction next.

**Goalie v9: straight-on view scan (2026-10-24, pt868u):** `v2_38x32/goalie9/`. All 246 goalie frames from the SPA tables scanned with a generic segmentation and ranked per piece (pad front/back L/R, pad side, blocker, catcher, mask front/side/back) for facing, squareness, size, verticality and stick occlusion (D70-D71). Contact sheets are local; Abdul to pick the new source frames.

**Goalie v10: Abdul's texture + zone palette (2026-10-24, pt869u):** `v2_38x32/goalie10/` holds Abdul's 23x23 goalie texture and NHL 9x Studio .act (pieces: blocker, front-centred mask wrap, pad front, 3-wide pad strip, catcher, D72). Zone-first fit then expansion on the goalie9 straight-on frames: blocker 1021 and masks 547/543/539 reach 0 diff, pad fronts 987/505 0-4, pad backs 520 2-3, catcher 538 8 (D73-D74). Wall frames 374-376 (Abdul's 373-375 if 0-based) draw the pad knee band 144/145/144 instead of 146/145/146 and stay excluded (D75).

**Goalie v10b (2026-10-24, pt870u):** texture v2 23x34 adds a pad-back piece lifted from 520 L and a horizontal catcher from 538; 164 is a texture zone (D76, supersedes D61 for this texture); rerun incl. 416/422 pads on the goalie6 seg (D77-D79).

**Goalie v10c (2026-10-24, pt872u):** texture v3 (23x31, `goalie_texture_v3_indexed.png`). The pad back is Abdul's strip wrapping round; the padBack piece is dropped. 186 is the real extra pad-back zone (strip 155 -> 186). Both stripe orders exist in the game art, per animation. The unified catcher (FRONT from 538, BACK from 428) replaces catcherH, and the catcher orientation is added to the skeleton (`skel10.py`). See D80-D86.

**Goalie v10d (2026-10-24, pt874u):** full-body ready skeleton for all 8 facings (`skel10.py`): 413 faces right, 425 faces left. Limb sides per facing re-derived. Fuhr-style designed catcher in texture v4 (`goalie_texture_v4_indexed.png`). Abdul's 8x12 catcher still matches better on front views (255 vs 445 px after expansion over 39 frames). See D87-D90.

**Goalie v10e (2026-10-24, pt875u):** two catcher options compared. A is the v4 rectangle; B is the v5 candidate, a back rectangle plus a rimmed front oval (`goalie_texture_v5_candidate_indexed.png`). B wins on front views: 469>123 against Abdul's 8x12 at 472>162 and A at 594>362. 413 uses the high front catcher and 425 the low near-side piece. See D91-D93.

**Goalie v11 (2026-10-24, pt878u):** team palettes (CHI away, TOR/BUF/EDM home) on texture Option A vs B. Whole-goalie mapping over 11 frames gives A 706>270 and B 652>194. See D94-D95; scripts in `v2_38x32/goalie11/`.

**Goalie v12 (2026-10-24, pt880u):** removed the unused 8x12 catcher and repacked the textures to 23x32. Per-team sheets show original | applied | errors per option. Totals over 11 frames: A 709>271, B 655>195. See D96-D97.

**Goalie v12 pads/glove (2026-10-24, pt880u):** shading counts as gear (D98). FRONT catchers whose free fit was scrambled now use a coherent fit (D99). Pads use cylinder per-row UV: strict errors 368 -> 152 (54 shading, 98 row content) (D100).

**Next steps:**
1. Extend the v5 per-pixel mapper to goalie frames so the goalie jersey/pants can reuse the skater v2 zones.
2. Hand-check the goalie segmentation.
3. Add a cage texel to the mask block; split the pads left/right.
4. Make gloves texture-driven (skates done, D20-D24).
5. Second pass on stretch-sharing hotspots.

**Where scripts live:** `v2_38x32/scripts/`.
- They expect the scratch layout used in development: `/workspace/preview_back/root/sprite-textures/out` as cwd with `scripts/` on PYTHONPATH, and `/workspace/preview_v2` for outputs.
- `v2map2.py` builds the mapping.
- `ctrlsheet.py` writes the control diff sheets; `anthem.py` writes the frame 897 before/after.

**Textures:** `v2_38x32/textures/raw/` (all test jerseys in v2) and `textures/redraw/` (Dallas and East94 redrawn natively). Renders that contain game sprites are kept local.
- D169: 94G family texture straightened into row bands and all 100 gaps filled (92 by row band). Fight-frame errors rose from 1,559 to 1,805 out of 11,318 px, so the next fix is the pipeline texel map. See `docs/exclusive-expansion/d169/`.
- D170: D169 texture frozen (pt994u); exclusive maps re-fit with family constraint, row snapping and part split. 0 of 11,318 px errors (was 1,805), but the test-pattern renders are still incoherent. See `docs/exclusive-expansion/d170/`.
- D171: smooth per-part affine warp vs the D169 texture. 1,581 errors and 1,986 exceptions out of 11,318 px; more coherent than D170 but not clean. See `docs/exclusive-expansion/d171/`.
- D172: outline ruling (b) plus per-bone warp. 1,284 errors and 1,243 nudges out of 11,318 px; 93G 353 has 0 errors. See `docs/exclusive-expansion/d172/`.
- D173: full skeleton for the 40 Genesis exclusives (24 flagged) plus skeleton-driven warp. 1,938 errors and 1,080 nudges; worse than D172. See `docs/exclusive-expansion/d173/`.
- D174: joint+warp fit with palette-index key and palette-zone constraint (docs/exclusive-expansion/d174).
- D175: shade groups collapsed in the 94G control; joint+warp refit (docs/exclusive-expansion/d175).

## Sprite editor (skater + goalie, turnkey)

    python3 sprite-textures/editor/launch.py        # --rebuild to regenerate data, --no-browser

Builds one self-contained editor file `editor/data/sprite_editor.html` locally from your ROM-derived exports (gitignored; game data is never committed).
The two built files are committed (D188), so a pull is enough to open them. Rebuild and recommit both when the data changes: `python3 sprite-textures/editor/launch.py --rebuild` (and `--sample`), then commit `editor/data/sprite_editor.html` and `editor/data/sprite_editor_sample.html` (D188: these two built files are tracked on purpose; the rest of data/ stays ignored).
D190: all editor data is committed (bundles, `out/data/`, `editor/inputs/`). From a fresh clone, rebuild with `python3 sprite-textures/editor/build_bundle.py --from-inputs`, then `skc_sample.py`. No ROM or local assets are needed. A normal build refreshes `editor/inputs/`; commit it along with the bundles.
Open it directly from disk (no server; Save downloads sprite_edits.json), or let launch.py serve it on 127.0.0.1:8765 and opens a worst-first fix queue. A/D or arrows = prev/next, O labels, J skeleton, Z undo, S save.
Saves go to `editor/edits/<kind>_edits.json`.

## Work log (goalie13 to D164)

Moved here from the repo README. Decision numbers (Dnnn) are the ones in the logs of this folder.

- goalie13: strict pad remap, 95 strict errors (g12 152), D101–D104.
- goalie14: segmented skeleton + stick/blade exclusion, 89 strict errors (41 mapping + 48 missing colour), D105–D108.
- goalie15: sock shades 182/183 in texture v6 + colour-zone/fitted-skeleton segmentation, 50 strict errors (50 mapping + 0 missing colour), D109–D112.
- goalie16: all facings of each animation frame fitted jointly (one 3D pose), 49 strict errors (49 mapping + 0 missing colour), D113–D115.
- goalie17: Abdul's g15 segmentation corrections as ground truth (pads by connected leg, stick butt, skate vs blade, catcher), per-correction checks + coordinate inspection sheets, 42 strict errors, D116–D121.
- goalie18: frame 538 blocker taken from Abdul's green marks, leftover old blocker cells → body, 42 strict errors, D122.
- goalie19: Abdul's answers (980 right pad edge, 1044 pad stripe, 428 no blocker) and skeleton-bounded arm vs glove, 42 strict errors, D123.
- goalie20: Abdul's goalie19 answers (980 arm, 416 catcher kept, 419 arm stripes and green blocker), 42 strict errors, D124.
- goalie21: frame 419 catcher = Abdul's green cells (8 cuff cells added), 42 strict errors, D125.
- goalie22: two-piece pad mapping per leg (one straight cut, best mode per piece), 14 strict errors (was 42), labels unchanged, D126.
- goalie23: recursive pad splits, 0 strict pad errors in all 14 frames, D127.
- goalie24: next group SPAgglover (8 frames) auto-labelled for inspection, 3 open questions; Fuhr pad test render local only, D128.
- goalie24 (Fuhr v8): Fuhr Oilers art remapped into the current 23x32 goalie layout, mask = centre front / back on both sides, D129.
- goalie25: Fuhr v9 from the v12 source art (+ high-res build), geometric-snap pad maps and new blocker/catcher/mask maps; strict: pads 1127/0, mask 335/2, catcher 519/1, blocker 304/73 (open question), D130.
- goalie26: Fuhr v10 from Abdul's DR high-res gear (pads, blocker, catcher front/back), NHL95 cage-style mask with warped edges and orange/blue chin, 1044 arm ruling, Abdul rulings log (D131, D132).
- goalie26 v11: Fuhr mask mirrored symmetric with the orange flame on top (D133).
- goalie27: pad test patterns + geometric pad maps v2 (straight columns/rows, 22 frames), Fuhr v12 with a clean straight navy stripe; pad-bottom transparency confirmed as Abdul's original (D134, D135).
- goalie27 D136: pad direction from the skeleton hip->ankle line when the blob axis disagrees; highlighted cuff test.
- goalie27 D137: the 12 still-off pad frames are left as they are (Abdul).
- goalie27 D138: blocker orientation and pad mapping confirmed as they are (Abdul).
- goalie27 D139: open questions resolved by pixel match; back-view pads use the strap strip.
- goalie27 D140: Fuhr knee cuff and mask V tip stay as v12 (Abdul).
- goalie28: strict mapping 0 errors on blocker/catcher/stick (mask 2 left: index 45 eyes on 538), new stick region, Fuhr v13 (D141, D142).
- goalie28 editor: goalie_part_editor.html (paint parts, drag skeleton, export) + g28all/g28export/g28import (D143).
- goalie28 D144: strict 0 errors on all 246 frames (pixel-match relabel, index-exact pads).
- D145-D147: eye holes in the mask texture (v8 / Fuhr v14), audit of the D144 relabels plus the region rule, per-pixel measurement and glove/mask per-pixel targets.
- D148: skater part/skeleton editor (skater_part_editor.html + skater_editor/skater_export.py, skater_import.py).
- D149: test textures (lines, checker, grid, part regions, solid cuff) in both part editors; live texture preview in the skater editor.
- D150: draft per-pixel goalie layout measured (review only; pipeline unchanged).
- D151: keep the current 23x32 goalie layout; D150 draft dropped.
- D152: leg px D146 made body are pads again (540, 1040, 1059); 407 back-view helmet is mask.
- D153: earlier test textures added to both part editors; skater texture preview auto-fitted on 601/881 frames.
- D154: both part editors show the active texture image next to the preview.
- D155: pad pieces with 1-3 pixels get strict pad texels (30 px in 19 frames); full goalie render has 0 errors.
- D156: auto-fitted skater back views use the back-torso column remap; 100% agreement with all 11 hand frames.
- D157: skater texel columns straightened per body segment (one across-axis per segment, strict same-family match); auto and hand frames.
- D158: ruling, keep D157 strict colour-band columns (straight-column options a/b rejected).
- D159: skater pants px now get texels (unmapped 10512 -> 1162 auto, 235 -> 7 hand), strict colour band, straightened per pants zone.
- D160: last skater pants px (old hem row) mapped onto the row-23 pants texels: no-texel pants px 1162 -> 0 auto, 7 -> 0 hand, 0 wrong band.
- D161: full skater skeleton (limbs, stick, blade) for all frames; skeleton axes straighten columns on falls/dives/crouches; editor shows/edits/imports it.
- D162: skater skeleton refit: skates/stick snapped to their px, stick hand at the stick, new sanity checks; SKELROWS still off.
- D163: wrap-up: face shade 136 labelled skin (wrong band 1086 -> 0), full skater render 0 errors, HANDOFF.md.
- D164: docs/PROCESS_HISTORY.md: illustrated history of how the sprite texture work was directed.
