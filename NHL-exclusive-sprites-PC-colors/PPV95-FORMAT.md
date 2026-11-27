# NHL 95 PC player sprite files (`NNN_NNN.PPV`) and how frames go back into them

Checked on the 23 retail player banks (`000_049.PPV` … `950_999.PPV`, `10001049.PPV`, `10501099.PPV`, `11001149.PPV`), 1,135 pictures.
`tools/ppv95.py` reads and writes this format. `tools/roundtrip_test.py` proves it (results below).

## File
All numbers little-endian.

| offset | size | field |
|---|---|---|
| 0 | 4 | `SHPI` |
| 4 | 4 | file size |
| 8 | 4 | picture count (50 in a full bank) |
| 12 | 4 | bank id, kept as is (`SPIT` in the player banks) |
| 16 | 8 × count | directory: 4-byte ASCII tag (e.g. `0600` = frame 600) + 4-byte offset of the picture |

The first picture starts right after the directory (16 + 8 × count). Pictures follow each other with no padding, in directory order.

## Picture
16-byte header, then the pixels.

| offset | size | field |
|---|---|---|
| 0 | 4 | not decoded; kept byte for byte. Retail values: `FB 00 00 00` (550 pictures), `81 02 04 08` (256), `FB` + another 24-bit value (218), `80 00 00 00` (70), and about 40 one-offs. All 1,135 pictures decode with the run-length rule below whatever these bytes hold. (NHL9XStudio `pc95.js` treats a first byte of `0x7B` as raw, unpacked pixels; none of the player pictures has it.) |
| 4 | 2 | width |
| 6 | 2 | height |
| 8 | 2 | x offset (signed) |
| 10 | 2 | y offset (signed) |
| 12 | 2 | x position |
| 14 | 2 | y position |

Pixels are 95 PC palette indices, row after row, packed as a run-length stream that does **not** restart at row ends:

| byte `d` | meaning |
|---|---|
| 0 | end of picture |
| 1 … 127 | repeat the next byte `d` times |
| 128 … 255 | copy the next `256 − d` bytes as they are |

Index 255 is transparent: retail frames use it as the background, and NHL9XStudio `pc95.js` skips it when drawing. The zone indices (144–191 jersey/pants/socks/helmet, 192+ crest, 133–140 skin and stick, 88 shadow, 0 black) are what the team palettes recolour, so a frame stored as these indices takes every team's colours.

## EA's packing rule (matches all 1,135 retail pictures byte for byte)
- Transparent (255) is always written as a run, even a run of 1.
- Any other colour is written as a run when it repeats 3 or more times; shorter repeats go into the current literal.
- Runs stop at 127, literals at 128.
- The picture ends with a single 0.

Things that do **not** reproduce EA's bytes (tested and rejected): restarting runs at each row (2/1135), a minimum run of 2 (9/1135) or 4 (16/1135) for all colours, and treating 255 like any other colour (24/1135).

## Round-trip results (`python tools/roundtrip_test.py <folder with the PPVs>`)
- Retail: decode every picture → re-encode → **1135/1135 pictures byte-identical**; rebuild every bank → **23/23 files byte-identical**.
- Synthetic: 500 random index images (runs of 1–300, transparent, zone and crest indices) → encode → decode → **500/500 identical**.
- The 34 frames exported from the PSD (`frames_pc/`): encode → decode → **34/34 identical indices** (`tools/export_pc_indices.py`).

## Putting a new frame into a bank
`ppv95.build(bank_id, [{'tag': '0600', 'bytes': encode_pic(header, w, h, indices)}, …])` writes a whole bank with fresh offsets.
Keep the 16-byte header of the slot you replace (or copy one from a similar frame) and set the width and height; `encode_pic` rewrites those two fields. The x/y offsets decide where the frame sits relative to the player's anchor, so new frames need them set by eye against a similar retail frame.

Open question: what the game does with header bytes 0–3. Until that is known, keep the slot's own bytes, and test every rebuilt bank in the game before relying on it.
