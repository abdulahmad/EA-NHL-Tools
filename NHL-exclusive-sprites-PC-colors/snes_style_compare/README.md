# 94 SNES vs 94 Genesis vs 95 PC sprite style (28 Nov 2026)

Measurements of how the NHL 94 SNES player and goalie sprites differ from the 94 Genesis and 95 PC ones, to prepare converting SNES-only frames. **Read [FINDINGS.md](FINDINGS.md) first.**

Short answer: the drawn SNES body is *not* scaled down by 10% (median body 20x28 px on both SNES and 94 Genesis; the 9-11% gap is the Genesis 8x8 tile padding of the stored canvas). The real differences are shading: SNES has fewer team and white shades, one skin tone, almost no dither, and about 5% fewer body pixels. 95 PC is the one that is smaller (about 0.96x).

| file | what |
|---|---|
| `FINDINGS.md` | the full write-up: set, method, tables, recommended conversion |
| `measure.py`, `analyze.py`, `render.py` | scripts (they read the local census pickles and extracted sprites; no game data is in this folder) |
| `measurements.json`, `measurements.csv` | per-pair measurements for the 406 matched SNES / 94G / 95 PC pose triples (`pc_shown` is 0-based, SNES and Genesis are 1-based) |
| `sheet1_poses.png`, `sheet2_scale.png`, `sheet3_style.png` | the three comparison sheets (matched poses, the 10% scale test, zoomed style) |

The conversion that followed from this is in [`../snes_to_pc/`](../snes_to_pc/).
