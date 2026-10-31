# QPP94-To-PNG

Decodes NHL '94 PC (DOS) `.QPP` picture files and writes every shape to PNG. Pure Node.js, no dependencies, no `gfxpak`.

All 128 retail QPP files decode: 28 use EA Huffman (`30 FB`), 100 use EA BTree (`46 FB`). Every unpacked bank is exactly the size its header says, and every shape plane expands to exactly `width/4 × height` bytes.

## Usage

```
node qpp94.js list   <file.QPP|dir>              list entries (names, sizes, hotspots)
node qpp94.js unpack <file.QPP> [out.bin]        write the decompressed bank
node qpp94.js png    <file.QPP|dir> [outDir]     export every shape (and a swatch per palette)
   --pal <file.QPP[:!name] | file.pal>  use another palette (6-bit VGA .pal; add --pal8 for 8-bit)
   --palname <!name>                    pick one of the bank's own palettes (e.g. !ppp)
   --transparent <index>                mark one index as transparent
```

Example: `node qpp94.js png "C:\NHL94\" out` writes `out/ARENA/rink.png`, `out/EMBBOS/bkgd.png` and so on.

The module also exports `unhuff`, `unbtree`, `unpack`, `parseBank`, `decodeShape` for reuse (NHL9X Studio, the PPV decoder).

## Palettes

A shape uses the bank's own `!pal` when it has one (otherwise its first `!xxx` entry). Banks with no palette borrow the one the game loads beside them. The pairs come from the name strings in `HOCKEY.EXE` data (for example `embnhl bkgd tspal !pal`, `playoffs … embpal !pal`) and were checked by eye:

| Banks | Palette |
|---|---|
| `EMBxxx` team backgrounds, `EMBSCUP`, `PLAYOFFS` | `EMBPAL !pal` |
| `EMBNHL` | `TSPAL !pal` |
| `SETTING3`–`SETTING7`, `SOUND`, `SAVEGAME` | `EASNDESK !pal` |
| `EXHGAME2` | `LOCKRM !p01` |
| `SUMMARY2`, `SUMMARY3` | `SUMMARY !pal` |
| `NUMSHP`, `SCOREBRD`, `TRINKND` | `RINKPAL !pal` (in-game palette) |
| `CFLAG`, `CLAP`, `FANOM`, `GOAL`, `UFLAG` (jumbotron) | `FLAG !pal` |

In-game some screens recolour these (team colours, fades), so a borrowed palette is the base palette, not always the exact on-screen colours. Use `--pal` to try another.

## File format

### 1. Compression

The first two bytes pick the method, the same test `HOCKEY.EXE` makes in seg004 `TypeId` / `LoadBlock` (second byte `FB`, first byte the type).

#### `30 FB`, `31 FB`, `32 FB`: EA Huffman with run-length (seg004 `Unpack`, offset 0430h)

- Bytes 0–1: type. `31 FB` has 3 more header bytes, skipped.
- The rest is a big-endian, MSB-first bit stream. A "vnum" (seg004 `ReadVar`) is: count zero bits up to and including the first 1 bit (n = zeros + 2, v = 2^n), then read n bits; value = bits + v − 4. So `1 xx` = 0..3, `01 xxx` = 4..11, and so on.
- `u24` unpacked size, then `u8` clue byte.
- Code lengths: for length L = 1, 2, …, read a vnum = number of codes of that length. Codes are canonical (`code = (code << 1)`, then `code += count`). Stop after the first non-zero count where `code << (16 − L)` wraps to 0 (the tree is full).
- Symbols: for each code, read a vnum, add 1, and step that many still-unused byte values forward (wrapping at 256) from the last symbol. This lists the symbols in code order.
- Data: decode a symbol. If it is not the clue, output it. If it is the clue, read a vnum n:
  - n > 0: repeat the previous output byte n times.
  - n = 0 and the next bit is 0: output the next 8 bits as a literal (this is how the clue value itself is written).
  - n = 0 and the next bit is 1: end of stream.
- `32 FB` only: afterwards replace every output byte with the running sum of all bytes so far (mod 256).

#### `46 FB`, `47 FB`: EA BTree (seg004 `Expand`, offset 072Eh)

- Bytes 0–1: type. `47 FB` has 3 more header bytes, skipped.
- `u24` big-endian unpacked size, `u8` clue, `u8` node count N.
- N entries of 3 bytes: `node, left, right`. Byte value `node` stands for the pair `left right`; each may itself be a node, so expand recursively.
- Data: a byte equal to the clue means the next byte is a literal. A node byte is expanded. Any other byte is output as-is. Stop at the unpacked size.

### 2. Bank (after unpacking)

The unpacked data is a shape bank, the same layout as an NHL '94 PC `.PPV` bank. All values are little-endian.

| Offset | Size | Field |
|---|---|---|
| 0 | u32 | Size of the bank once every shape is expanded: header + table + 16-byte header and `w×h` pixels per shape, 784 per palette. The game allocates this much. |
| 4 | u16 | Entry count N |
| 6 | 4 × N | Entry names, 4 ASCII characters, space-padded (`!pal`, `rink`, `0000`, `LA  `) |
| 6 + 4N | 4 × N | u32 offset of each entry, relative to the end of this table (6 + 8N) |

Names starting with `!` are palettes; the rest are shapes. The game finds entries by name (strings such as `arena`/`!pal`/`rink` sit together in `HOCKEY.EXE`).

### 3. Entry header (16 bytes)

| Offset | Type | Field |
|---|---|---|
| 0 | s16 | Width / 4 (bytes per row in one Mode X plane) |
| 2 | s16 | Height |
| 4 | s16 | Hotspot X |
| 6 | s16 | Hotspot Y |
| 8 | s16 | Screen X (default position) |
| 10 | s16 | Screen Y |
| 12 | u16 | Unknown (often `0201h` on small shapes; varies on palettes) |
| 14 | u16 | Always `0010h` |

### 4. Palette entries (`!pal`, `!p01`, `!BOS`, …)

Header (`w/4 = 192, h = 1` or `64, 3`, i.e. 768 bytes), then 768 raw bytes: 256 × RGB, 6-bit VGA DAC values (0–63). Multiply by 255/63 for 8-bit. Some banks hold several (`RINKPAL`: `!bck`, `!err`, `!pal`; `CRESTS4`: one per team).

### 5. Shape pixels

Four VGA Mode X planes in order 0–3. Plane k holds the pixels at `x % 4 == k`, row by row, `width/4` bytes per row. Each plane is a PackBits stream that ends with a `00` byte:

- `01`–`7F` (n): repeat the next byte n times.
- `80`–`FF` (c): copy the next `256 − c` bytes.
- `00`: end of plane.

Pixels are 8-bit palette indices. Index 0 is usually the background/transparent colour for sprites.

## What is in the retail files

- Full screens (320×200): `ARENA`, `AWARDS`, `EADESK0`–`2`, `EASCRN`, `EASNDESK`, `LOCKRM`, `SUMMARY`, 28 `EMBxxx` embossed backgrounds (26 teams, NHL, Stanley Cup).
- 50 `JERxxxH` / `JERxxxV` home and away jersey pictures with their own `!p01` palette.
- Jumbotron animations (`CFLAG`, `UFLAG`, `FLAG`, `CLAP`, `FANOM`, `GOAL`), 124×76 frames.
- Menu dialogs (`SETTING3`–`7`, `SOUND`, `PLAYER`, `DIALOGBX`, `SAVEGAME`, `PLAYOFFS`, `EXHGAME2`), scoreboard parts (`SCOREBRD`, `SCRBRD1`, `SCRBRD2`, `NUMSHP`), pointers, crests (`CRESTS4`), plaques, Stanley Cup logos (`STOPxxx`), title (`TITLE2`) and summary pieces.
- Palette-only banks: `RINKPAL`, `TSPAL`, `TPAL`, `EMBPAL`, `EDBPAL`.
