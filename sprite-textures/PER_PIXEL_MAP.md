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
