# Per-pixel texture map (PoC2, 2026-10-23)

Replaces the oversized 512×512 atlas + raw-extent resampling of PoC1, which round-tripped 370/889 at 0 px but missed ~20 % of pixels on 897/42
(pants side stripes squeezed, yoke/shoulder off one band, sleeve/waist stripes off by one, crest landing on plain jersey, socks wrong).
Cause: texel row/column came from the pixel's fractional position inside the sprite extent, so a band that is 2 px thick in one frame and 3 px in another landed in different texture rows.

## Design
Every sprite pixel maps to exactly one whole texel. There is no resampling and no fractional UV. Texel address:

| field | meaning |
|---|---|
| part | torso, sleeve, pants, sock, helmet (+ crest) |
| side | R/L for sleeves and socks = the player's own side. Facing the camera, screen-left is R; in back views they swap (screen-left is L) |
| half | front / back from the game's direction (SPA script table `dirtable.json`: d3–5 front, d0/1/7 back). Side views (d2/d6) split at the part's middle column: leading half → front, trailing half → back |
| band | the game's own colour zone from the palette index (`zn.json`): yoke corner, shoulder patch, yoke 1/2/3, jersey, waist 1 odd/even/hidden, waist 2, waist 3; upper arm, arm stripe 1/2/3, forearm; pants, pants stripe 1/2; socks, socks stripe 1/2; helmet |
| row | 8-connected geodesic distance inside the band from its proximal edge (the pixels touching the previous band in the chain, or the parent part: helmet/skin → torso → sleeves/pants → socks). Disconnected pieces of a band are seeded at their own top row |
| col | rank of the pixel by screen x (by y for horizontal limbs) among the band's pixels on the same row. Back views are mirrored, so the column runs player-right → player-left in both halves |
| crest | indices 192–196, 208–212, 224–228, 240–244 are the game's 5×4 crest grid → texel (grid row, grid col) directly |

Shading is not in the texture. A texel stores the zone's **medium** RGB. Pixels drawn with the zone's light or dark index are re-shaded through a per-zone lookup `(zone, light|dark) → RGB` extracted alongside the texture. The output is RGB and pixels are square (1 texel = 1 sprite pixel).

### Sizing
`measure.py` runs the addresser over **all 596 skater frames** referenced by the SPA scripts (goalie frames 373–380/408–554/975–1072, `SPAref*` and `SPAg*` excluded, frames with < 10 jersey pixels excluded). For each (part, side, half, band) block it keeps the max row + 1 (= band thickness) and max col + 1 (= widest band row). That gives 62 blocks (`perpixel/measure.json`, which also records the frame that set each width).

### Layout (`perpixel/layout.json`): 225 × 46 texels
One vertical strip per (part, side, half), packed left → right in this order:
helmet F|B, torso F|B, sleeve R F|B, sleeve L F|B, pants F|B, sock R F|B, sock L F|B, then the crest 5×4.
Inside a strip the bands are stacked top → bottom in body order (e.g. torso: yoke corner, shoulder patch, yoke 1, yoke 2, yoke 3, jersey, waist 1 odd/even/hidden, waist 2, waist 3), so each texel row is one sprite-pixel band row. The strip width is the widest band in it. The height is 46 because the torso-front strip (sum of its band thicknesses) is the tallest.
Examples: front jersey 33×11 (widest frame 613), back jersey 16×13, front pants 21×12, back sleeve stripe 3 is 1 row thick.

## Results (Leafs home `tor`, Rangers away `nyr`)
Extraction from 370 (anthem, all 8 dirs → front) + 889 (crosscheck, d0 back). Texel collisions while extracting: 0.
Unseen texels inside a block that was observed are filled with that block's colour (a block is one colour zone). The `filled` column counts pixels that used such texels.

| frame | facing | mapped px | filled | diff (both teams) | reason |
|---|---|---|---|---|---|
| 370 | front d4 | 235 | 0 | **0** | |
| 889 | back d0 | 271 | 0 | **0** | |
| 897 | front d4 | 228 | 36 | **0** | |
| 42 skate | back d0 | 219 | 19 | 7 | back waist 1 hidden (2), back pants stripe 1 (5) |
| 47 | back d1 | 203 | 15 | 3 | back waist 1 hidden (1), back pants stripe 1 (2) |
| 52 | side d2 | 188 | 25 | 8 | back waist 1 hidden (1), front pants stripe 2 (7) |
| 57 | front d3 | 154 | 20 | 6 | front waist 1 hidden (1), front pants stripe 2 (5) |
| 62 | front d4 | 144 | 23 | 1 | front waist 1 hidden (1) |
| 67 | front d5 | 188 | 33 | 8 | front waist 1 hidden (1), front pants stripe 2 (7) |
| 72 | side d6 | 199 | 12 | 6 | back waist 1 hidden (1), back pants stripe 1 (5) |
| 77 | back d7 | 219 | 22 | 6 | back waist 1 hidden (1), back pants stripe 1 (5) |

**Every remaining diff pixel is a zone that 370 and 889 never draw on that half.** These are not mapping errors. Palette-index pixel counts:

| index | zone | 370 (front) | 889 (back) | 42 | 57 |
|---|---|---|---|---|---|
| 170 | waist 1 hidden | 0 | 0 | 2 | 1 |
| 178 | pants stripe 2 | **0** | 9 | 8 | 5 |
| 179 | pants stripe 1 | 6 | **0** | 5 | 5 |

The front and back halves are separate by design, so front pants stripe 2, back pants stripe 1 and waist 1 hidden (both halves) have no source pixels. Those pixels render magenta in the compare sheets.

**Proof that the map is complete:** add two more skate frames that are *not* in the test set as sources (43 = skate d0 phase 2, 58 = skate d3 phase 2), with `SRC=370,889,43,58 TAG=_plus43_58`. Then **all 11 test frames × 2 teams diff 0** (`perpixel/report_plus43_58.json`, `compare_*_plus43_58.png`).

Caveat: within a block every texel has the zone's colour. So a 0 diff here proves that every pixel lands in the correct zone band, row and side. It does not test texel-level detail inside a band. That detail is the point of the map for custom textures, and each pixel already has its own texel for it.

## Files
- `scripts/perpixel/dirtable.py`: SPA scripts (`Sprite-Viewer/data/frames95pc.asm`) → `poc/dirtable.json` (frame → anim, dir, phase)
- `scripts/perpixel/ppmap.py`: the addresser (`address(n)` → {(y,x): texel key})
- `scripts/perpixel/measure.py`: block sizes over all skater frames → `poc2/measure.json`
- `scripts/perpixel/roundtrip2.py`: layout, extraction, shade LUT, re-apply, diff, compare sheets, report
- `perpixel/`: committed outputs (game-derived renders are allowed in this folder since 2026-10-23; ROMs and original game files are still never committed):
  - `compare_<team>[_plus43_58].png`: game | texture → frame | diff, each sprite centred in its column
  - `tex_<team>[_tag]_raw.png` (magenta = unseen), `_filled.png`, and `_x12` labelled versions with block outlines
  - `report*.json`, `layout.json`, `measure.json`

## Reproduce end to end
```sh
cd sprite-textures/scripts && NHL9XSTUDIO=... NHL95_DIR=... node dump.js    # -> ../out/data (frames.bin/json, HOME/AWAY.json, zn.json)
cd ../out && mkdir -p poc poc2 && export PYTHONPATH=../scripts
python3 ../scripts/perpixel/dirtable.py
python3 ../scripts/perpixel/measure.py
python3 ../scripts/perpixel/roundtrip2.py                                # sources 370+889
SRC=370,889,43,58 TAG=_plus43_58 python3 ../scripts/perpixel/roundtrip2.py
```
This was verified on 2026-10-23 from a clean `out/`: the outputs are byte-identical to the committed ones.

## Next
- Choose source frames by coverage: a greedy set cover over the 62 blocks, so that every block is observed.
- Hand-authored textures: paint directly in the 225×46 layout, with real per-texel detail. Then check stripe continuity across directions.
- Goalies (pads use sock/arm indices): a separate pass.

---
# v3 (2026-10-23): aligned waist stripes + Chicago/Montreal

Abdul asked for the bottom three horizontal stripes in the texture to be aligned, as they appear on frame 42.

**What frame 42 shows:** the three jersey hem stripes appear as three straight, 1-px rows, stacked directly on top of each other across the full hem width:
- row 12: waist 1 (index 168/169/170, odd/even alternating with a "hidden" pixel at the edge)
- row 13: waist 2 (171–173)
- row 14: waist 3 (174–176)

370 shows the same (rows 14–16). 889 shows them bent into a V. Across all 596 skater frames, 467 frames have every waist stripe exactly 1 px thick per column.

**What was wrong in v2:**
- Waist 1 was split into three separate blocks (odd / even / hidden), stacked vertically, each with its own width.
- Waist 2 and waist 3 had their own widths, and their columns were "rank in row".
- So screen column x landed in a different texture column for each stripe.

**What changed in v3:**
1. **Waist 1 is one band.** The game's odd/even/hidden indices are that stripe's light/medium/dark. Leafs: 252/224/196 grey. Rangers: 208,0,0 / 208,0,0 / 156,0,0. They now go through the shade lookup like every other zone.
2. **Waist 1/2/3 share one column range per half.** The column is the signed offset from the waist's centre column, `(min x + max x)//2` of the union of the three stripes, mirrored in back views. The three blocks have the same x and width (front 13, back 12), so a screen column maps to the same texture column in all three stripes.
3. **Waist rows are per column.** The row is the distance from the stripe's top pixel in that screen column. The geodesic row used in v2 collided with offset columns 481 times; this gives 0 collisions over all 596 frames.

**Size:** 225 × 54 (was 225 × 46). The waist blocks are now as deep as the deepest per-column run. That tail comes from a few frames where the hem runs near-vertical:
- skate back 163: 12 rows
- skate 3/5/43/45: 9 rows
- falls and sweep checks: 6–8 rows

Front waist blocks are 13×8 ×3; back waist blocks are 12×9, 12×7 and 12×12.

**Diffs (Leafs and Rangers identical):**
- Sources 370+889+43+58: all 11 test frames diff 0.
- Sources 370+889 only: same as v2 (370/889/897 diff 0; the skate frames miss only the zones those two frames never draw).

**Chicago / Montreal (`designs.py`):**
- Built from the v3 hand-authored designs in `jerseys.py` (`blackhawks_alt`, `canadiens_babyblue`: stripe colour lists + the crest crop of the reference photo; the reference photos stay local).
- Each zone block gets the design colour of the matching stripe (yoke, waist 1/2/3, arm stripes 1–3, sock stripes 1–2, pants, helmet).
- The crest is the reference crest pixelated to the game's 5×4 crest grid (20 px, which is all the game draws).
- Rendering is 1 texel = 1 sprite pixel × shade (light 1.05 / medium .85 / dark .62, from the palette index).
- A first try that voted old-atlas colours through the old fractional UV smeared stripes diagonally across zone blocks, so I dropped it.

Known limits, seen in the sheets:
- (a) The Chicago "CHICAGO" wordmark is unreadable at 5×4: it shows as a grey/red box.
- (b) The Montreal crest is a red blob.
- (c) Montreal's white/navy chest band (`torso` .34–.55) and Chicago's red chest band have no game zone, so they are not drawn. The jersey zone is one block.
- (d) Montreal socks: the white gap between the two navy stripes is drawn as sock-body baby blue.

Outputs in `perpixel/v3/`:
- `tex_<team>[_plus43_58]_{raw,filled}[_x12].png`, `compare_<team>[_plus43_58].png`, `report*.json`, `layout.json`, `measure.json`
- `tex_{chicago,montreal}_*`, `compare_{chicago,montreal}.png` (Leafs game render | team), `combined_4teams.png` (Leafs | Rangers | Chicago | Montreal per frame; each sprite centred in its column; Leafs/Rangers there are the game renders, which equal the texture renders at 0 diff)

Reproduce (from `out/`, `PYTHONPATH=../scripts`; `designs.py` also needs `out/jerseys/ref/` with the reference photos):
```sh
mkdir -p poc poc3 && python3 ../scripts/perpixel/dirtable.py
python3 ../scripts/perpixel/v3/measure.py
python3 ../scripts/perpixel/v3/roundtrip3.py
SRC=370,889,43,58 TAG=_plus43_58 python3 ../scripts/perpixel/v3/roundtrip3.py
python3 ../scripts/perpixel/v3/designs.py
```
I verified this from the repo copy: the outputs are byte-identical to the working run.
