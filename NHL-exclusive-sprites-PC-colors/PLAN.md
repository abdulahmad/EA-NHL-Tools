# Plan: finish expanding the exclusive frames to 95 PC colours

Goal: every frame that NHL 95 PC does not have (NHLPA 93-only, NHL 94 Genesis-only, and any uncertain frame Abdul confirms) re-coloured to 95 PC colour depth, the way the PSD does it, and packed back into 95 PC sprite banks. Per-pixel texture mapping is the next phase and nothing here depends on it.

Working together: **Abdul** (guide-palette painting, the PSD) and **StaticEck** (95 PC-standard colouring through the jersey records and shade ramps, look-alike 95 PC frames as training data). Both end in the same thing — 95 PC indices — so the two approaches merge: StaticEck's transfer gives a first pass wherever a 95 PC look-alike frame exists, and Abdul's guide palette is how anyone reviews and fixes it.

## Source of truth: 95 PC indices, never RGB
- Every frame is stored as an indexed image whose **pixel values are 95 PC palette indices** (255 = transparent), like `frames_pc/93_355.png`. The palette inside the file is only for viewing; Abdul's guide palette works as is (`abdul/abdul_palette.bmp` uses the real indices).
- RGB previews (team colours, guide colours) are always made from the indices, never the other way round. Comparisons use **Abdul's guide palette** (indices missing from his BMP show in cyan with a black dot), because it shows which zone each pixel is in.
- Colours that must look the same for every team (blood, skin, stick) must use sprite indices 0–127 (not 8, 82, 88) or 128–143: see [PALETTE95.md](PALETTE95.md).
- Zones stay intact: 144–191 jersey/arm/pants/socks/helmet, 192+ crest (4 × 5), 133–140 skin and stick, 88 shadow, 0 black, 8/28/31 blades (`status/abdul_palette_indices.csv`).

## Gate: every frame must pass all of these
1. **Indices only**: every opaque pixel is an index the 95 PC sprites use; no Genesis colour, no off-palette colour (`tools/recon.py` + `tools/export_pc_indices.py`: status FULL, empty `_todo.png`).
2. **Silhouette**: same shape as the retail frame (or a change Abdul signed off), checked by the line-up in `recon.py`.
3. **Zones**: no pixel in the wrong zone family for its Genesis value, except the families the 95 PC artists also cross (black outlines); exceptions listed (`tools/zonecheck.py`).
4. **Round trip**: encode to a 95 PC picture → decode → identical indices (`export_pc_indices.py` runs it per frame).
5. **Bank rebuild**: the bank that receives the frame is rebuilt with `ppv95.build`; every untouched picture stays byte-identical (`tools/roundtrip_test.py` must stay at 1135/1135 and 23/23) and the new bank is tried in the game.

## Order, sizes and who does what
| # | group | frames | state now | automated | needs Abdul's eye |
|---|---|---|---|---|---|
| 1 | NHLPA 93 fights already in the guide palette: 354–357, 359–362, 368 | 9 | 96–99% | find and list stray pixels | confirm the stray-pixel indices proposed in PALETTE95.md: (0,170,0) → 178 *pants stripe 2*, (160,96,96) → 135 (shows exactly that colour), (255,199,154) → 133 or 132 |
| 2 | NHLPA 93 bloody injury 633–644 | 12 | 87–96%; only blood left | blood pixel lists per frame | **confirm the blood indices**: proposed Genesis 29 → 83 (96,0,0) and 28 → 78 (160,64,0), alternative 76 for 29 (PALETTE95.md); one 52-px blood splat in `IF0011 - 643` sits off the canvas |
| 3 | NHLPA 93 fights not started: 353 (gloves/sticks), 358, 363 (no layer), 364, 365, 366, 367 (`PC PAL` layer is still Genesis), 369, 370 | 9 | 0–19% (head/crest only) | first pass from the 93→95 PC answer key + the done fight frames (same players, same poses) | review every frame; decide between `IF0021?`/`IF0021etc??`/`IF0023??` (all 364) and `IF0022?`/`IF0022etc?` (365), `Layer 24`/`25` (369) |
| 4 | NHLPA 93 fight injury 371–376 | 6 | 11–14% (crest only) | first pass; blood as decided in 2 | review; `Layer 33` is a second copy of 374 |
| 5 | NHL 94 Genesis goalie: ghighl/ghighr 10, gstick2l/gstick2r 23, gslamtop 3, gslambot 4 | 40 | not started | first pass: 95 PC goalie frames as look-alikes (StaticEck's method) | goalie pads/mask zones (164 goalie mask) |
| 6 | NHL 94 Genesis checks: boardfront 13, boardback 11, boardleft 8, boardright 8 | 40 | not started | first pass from the skater answer key | review, 10 at a time |
| 7 | NHL 94 Genesis bench checks: benchcheckl 19, benchcheckr 15; crosscheck 8 | 42 | not started | as 6 | as 6 |
| 8 | NHL 94 Genesis slambot 7 (unused by any animation) | 7 | not started | as 6 | only if wanted |
| 9 | Uncertain 73 (gready 23, wallleft 3, look-alike 94G frames 47) | 73 | not started | — | **first decide which are really missing from 95 PC**; gready probably uses 95 PC's own 539–554 set |

Totals: 36 NHLPA 93 frames (21 nearly done, 15 to do) + 129 NHL 94 Genesis frames + up to 73 uncertain.

## How a first pass is made (automated, then reviewed)
- For each Genesis value, `status/answerkey_cooc.json` says which 95 PC indices the 95 PC artists used for it (e.g. 47 → 88; 35–37 → 177/180). Single-choice values (shadow, pants, skin, stick) can be filled automatically.
- Values that split into several 95 PC zones (Genesis jersey and trims → arm stripes, yoke, waist, socks stripes, crest) are filled from the nearest 95 PC look-alike frame lined up on the Genesis frame, as StaticEck does; where there is none, they are left for Abdul and shown in yellow on the status sheet.
- Each first pass is written straight to `frames_pc/` as indices and goes through the gate.

## Review checkpoints
1. After group 1 + 2: Abdul picks the stray-pixel indices and the blood index; re-run `recon.py`, `statussheet.py`, `export_pc_indices.py`; the 21 frames should be FULL and pass the gate.
2. After the first automated pass of group 3: Abdul and StaticEck compare it with the hand-done fight frames before anything else is automated.
3. After each NHL 94 Genesis group (5, 6, 7): status sheet + zone check + one rebuilt bank tried in the game.
4. Before group 9: Abdul goes through `sheets/sheet_uncertain_94G_*.png` and marks keep / drop.

## Re-running the checks
```
cd tools
python recon.py && python statuscsv.py && python statussheet.py && python zonecheck.py && python export_pc_indices.py
python roundtrip_test.py <folder with the NHL 95 PC NNN_NNN.PPV files>
NHL95_DIR=<same folder> python palette95.py   # status/palette95_indices.csv + palette95_rink.png
```
