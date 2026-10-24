# sprite-textures

> **Start here (agents):** the current work is the **v2 38x32 texture layout**. Read the "v2 38x32 layout — entry point" section below, then `EXPANDED_ZONES.md` (decisions log) and `v2_38x32/PLAN_v2.md`.

Research tooling for per-pixel jersey textures on the NHL 95 PC player sprites. The target is the NHL Classic engine (the C port of NHL Genesis that is being converted to full colour). Retail palette limits do not apply there.

**Goal.** Give each sprite pixel a body part, a (U,V) texture coordinate and a shade value. A jersey can then be any texture painted in one shared atlas layout, instead of 48 palette zones. Stripes wrap around the body at a constant thickness, and the crest, numbers, socks, pants, helmet and gloves come from the same atlas.

## What is committed
- `scripts/`: the extraction and analysis pipeline (Node + Python).
- `textures/reference_atlas_*.png`: the 512×512 atlas layout. Regions are listed in `scripts/uv.py` `ATLAS`. Includes uv, checker, candy-stripe and design test textures, plus a labelled copy.
- `textures/jerseys/*_atlas.png`: six hand-authored jersey designs. Crests are downscaled team logos (committed with the owner's approval). Back torsos carry no name or number.
- `FINDINGS.md`, `PLAN.md` (v2) and `LOG.md`, plus JSON results: `broken_arm_crest.json`, `broken_metrics.json`, `broken_stick.json`, `goalie_part_presence.json`, `flat_stripe_check.json`.

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
- `audit.py <tag> WRAP_LIMBS SIDE_FIX ELEV FRONT_SMOOTH` runs the per-frame metrics, and `audit_stats.py` summarises them. Results: `AUDIT.md`, `FIX_PLAN.md`, `stats_before_vs_fix2.txt`.
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
