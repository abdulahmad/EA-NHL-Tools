# Test: expand 95 and 96 Genesis sprites to 95 PC colour zones (28 Nov 2026)

A small test of the 94G -> 95 PC zone pipeline (final3k/final3l: K plain zones and socks, J arms, goalies J) on **12 sprites from 95 Genesis and 12 from 96 Genesis** (8 skaters, 4 goalies each). Result summary:
- All 24 index arrays pass the SPIT round trip and the PNG + SH palette round trip, with no invalid indices (`out/95/results_95.json`, `out/96/results_96.json`).
- 95G and 96G are redrawn and store sprites differently from 94G, and each game lays out its palette differently (95 has fewer pants and stripe shades and a third team colour; 96 adds a helmet colour). The colours were mapped onto the 94G layout by reading the sprites, not the game code, so the 96 mapping in particular is partly a guess.
- Almost no scoring was possible: 95G and 96G skaters have no matching pose in 95 PC (which kept the 94 sprites). Only three 95G goalies had a close 95 PC frame; they matched 42-48% of pixels, against 74% on 94G goalies. The art itself does not line up exactly.
- Weak spots: the gold shoulder band on 95G skaters mostly turns white, and goalie pads come out too dark.
- Next step if wanted: confirm the 95 and 96 colour layouts from the disassembly, then retrain with some 95G and 96G examples.

| path | what |
|---|---|
| `code/` | `gdec.py` (Genesis sprite decoder), `gdec_maps.py` and `inj.py` (the 95G/96G -> 94G palette maps and the injection helpers), `specs.py` (the 24 frames), `match*.py`, `k_run.py`, `g3_run.py`, `merge.py`, `sheet.py`, `viz.py`, `cooc.py`, and `snap/` (snapshots of the arm and sock modules used). Paths point at the local pipeline folders and extracted game files. |
| `out/sheet_95G_to_95PC.png`, `out/sheet_96G_to_95PC.png` | the result sheets (Genesis original and 95 PC zones, Boston home) |
| `out/sheet95_test*.png`, `out/zoom95.png` | earlier test sheets |
| `out/95/`, `out/96/` | per frame: `g<game>_<n>_idx.png` (95 PC index PNG), `_pcidx.npy`, `_J_pcidx.npy` (joint-based base), and `results_*.json` (per-frame checks; `_<parts>.json` are the runner shards) |
| `logs/` | runner logs |
| `scratch_images/` | small diagnostic images from the first look |

Not here: `frames.pkl`, `match*.pkl` and the `inj/` arrays (they hold sprite arrays taken from the 95G/96G files). No game files are in this folder.

Frame numbers: Genesis counts from 1, 95 PC from 0.
