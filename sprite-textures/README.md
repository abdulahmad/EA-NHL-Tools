# sprite-textures

Research tooling for per-pixel jersey textures on the NHL 95 PC player sprites. The target is the NHL Classic engine (the C port of NHL Genesis that is being converted to full colour). Retail palette limits do not apply there.

**Goal.** Give each sprite pixel a body part, a (U,V) texture coordinate and a shade value. A jersey can then be any texture painted in one shared atlas layout, instead of 48 palette zones. Stripes wrap around the body at a constant thickness, and the crest, numbers, socks, pants, helmet and gloves come from the same atlas.

## What is committed
- `scripts/`: the extraction and analysis pipeline (Node + Python).
- `textures/reference_atlas_*.png`: the 512×512 atlas layout. Regions are listed in `scripts/uv.py` `ATLAS`. Includes uv, checker, candy-stripe and design test textures, plus a labelled copy.
- `textures/jerseys/*_atlas.png`: six hand-authored jersey designs. Crests are downscaled team logos (committed with the owner's approval). Back torsos carry no name or number.
- `FINDINGS.md`, `PLAN.md` (v2) and `LOG.md`, plus JSON results: `broken_arm_crest.json`, `broken_metrics.json`, `broken_stick.json`, `goalie_part_presence.json`, `flat_stripe_check.json`.

**Not committed:** any game data or any image rendered from retail sprites. `out/` is git-ignored.

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
