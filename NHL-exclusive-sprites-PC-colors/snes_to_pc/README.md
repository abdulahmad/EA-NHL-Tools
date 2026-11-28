# 94 SNES-exclusive frames -> Genesis style -> 95 PC zones (28 Nov 2026)

Every SNES 94 frame that has no confident match in 94 Genesis or 95 PC, converted twice: SNES to a **94 Genesis style index array** (1:1 pixels, no resize), then to **95 PC zone indices** that pass the SPIT encode/decode and PNG + SH-palette round trips. Boston home preview colours. Method, numbers and weak spots: [FINDINGS.md](FINDINGS.md).

## The set
393 SNES frames have no `match` in 94G or 95 PC (`out/snes_exclusive_list.csv`): 143 player, 147 goalie, 53 celebration, 50 non-player (fonts, zamboni, bench, rink bits). 133 of the 343 player/goalie/celebration frames are **clear** (none in both games), 210 are **ambiguous** (a weak look-alike exists, so they may be redraws).

## What is here
| path | what |
|---|---|
| `FINDINGS.md` | method, agreement numbers on held-out frames, weak spots |
| `oof_eval.json`, `check_frames.json` | out-of-fold agreement numbers and the six check frames |
| `code/` | `make_pairs.py`, `run1.py` (pairs and forests), `s2g.py` (SNES to Genesis style converter), `eval_oof.py` (grouped cross-validation), `build.py`, `buildall.py`, `sheets.py`, `allsheets.py`, `npsheet.py` (sheets), helpers. Paths in the scripts point at the local census and extracted sprites. |
| `out/snes_exclusive_list.csv` | the 393 frames with category, animation, class and best-match scores |
| `out/sheets/` | sample sheets of 16 frames and the 6 check sheets (A SNES, B Genesis style, C 95 PC style, plus D real 94G and E real 95 PC on the check sheets) |
| `out/genesis_idx/`, `out/pc_idx/`, `out/check_pc_idx/`, `out/npy/` | the 16 sample frames and 6 check frames as index PNGs and arrays |
| `out/all/` | **all 343 converted frames**, see `out/all/README.md`: `sheets/` (51 contact sheets by animation + 2 non-player SNES-only sheets), `genesis_idx/`, `pc_idx/`, `npy/`, `manifest.csv` |

## Not here, and why
- The trained random forests (`rf_all.pkl` 1.7 GB, `rf_chk.pkl` 1.3 GB): far over the size limit. `code/make_pairs.py` then `code/run1.py` rebuild the pairs and retrain them (about 30 s for the forests).
- The pickles of SNES and Genesis pixel arrays (`pairs.pkl`, `res.pkl`, `rows.pkl`, `oof_*.pkl`): they hold arrays taken from the game files. Re-create them with the scripts from your own extracts.
- `snes_exclusive_all_sheets.zip`: a zip of the same sheets that are in `out/all/sheets/`.
- No game files are in this folder.

Frame numbers: SNES and Genesis count from 1, 95 PC from 0.
