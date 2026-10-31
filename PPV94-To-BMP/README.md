# PPV94-To-BMP v0.1

Decodes and displays the `.PPV` shape banks from **NHL Hockey '94 for DOS** (NHL 94 PC). No `gfxpak` needed.

NHL 94 PC's PPV is a different format from NHL 95 PC's PPV (which is an SHPI bank of SPIT shapes, see `PPV-To-BMP`). In NHL 94 PC each shape is stored as four Mode X planes, and each plane is packed with a PackBits-style run code. Every retail PPV decodes exactly: every plane ends on its terminator, every shape ends at the next entry's offset, and the bank's size field matches the decoded size.

- `ppv94.js` is the decoder library. It works in node and in the browser.
- `ppv94ToBmp.js` exports shapes to 8-bit `.BMP` files.
- `viewer.html` is a browser viewer. Open it from this folder, then drop in files.
- `test.js` checks every retail PPV. Pass it the game folder.

## Usage

```
node ppv94ToBmp <file.PPV | game folder> [...] [--out out] [--pal palette] [--key]
node ppv94ToBmp 000_049.PPV --pal RINKPAL.unpacked.bin --team MTL --side away --teampals <game folder>
node test <game folder>
```

For each bank, the exporter writes `out/<BANK>/<index>_<name>.bmp`, `out/<BANK>/<BANK>.json` (shape headers), and `out/<BANK>_sheet.bmp` (all shapes on one sheet). Index 255 is the transparent color, and `--key` paints it magenta.

Palettes:

- `--pal` takes a raw 768-byte VGA palette (6-bit or 8-bit), an `.ACT`, or any unpacked bank that has a `!pal` entry. The in-game palette is the `!pal` entry of `RINKPAL.QPP`. QPP files are EA-packed (`30 FB` Huffman or `46 FB`), so unpack them with `QPP94-To-BMP` first.
- If you don't pass `--pal`, a bank's own `!pal` is used. `STOP*.PPV` and `TROPBACK.PPV` have one. Banks without one are drawn with a grey ramp.
- `--team` recolors players using `HOMEPALS.BIN` or `AWAYPALS.BIN`, as described below.

## Format

All values are little-endian.

### Bank

| Offset | Type | Meaning |
| --- | --- | --- |
| 0 | u32 | Size of the bank once every shape is unpacked: `6 + 8*count + sum(16 + 4*(width/4)*height)`, with 784 per palette entry. The game allocates this much memory. |
| 4 | u16 | `count`, the number of entries |
| 6 | 4 chars × count | Entry names, not NUL-terminated. Player banks use `0000`…`0049` (frame numbers). Others use names like `logo`, `scrn`, `adms`, and `!pal`. |
| 6 + 4·count | u32 × count | Entry offsets, measured from the end of this table (`6 + 8*count`) |

Files are padded to a multiple of 16 bytes. The padding is leftover buffer bytes, not zeros.

### Shape entry (16-byte header)

| Offset | Type | Meaning |
| --- | --- | --- |
| 0 | s16 | Width ÷ 4: bytes per row in each plane |
| 2 | s16 | Height |
| 4 | s16 | Hotspot X. On player frames it sits near the skates. |
| 6 | s16 | Hotspot Y |
| 8 | s16 | Probably the X position in the original art sheet (not traced yet) |
| 10 | s16 | Probably the Y position in the original art sheet (not traced yet) |
| 12 | s16 | Unknown. Most player frames have `0x0201`. |
| 14 | u16 | `0x0010` in every retail file |
| 16 | … | 4 packed planes, plane 0 first |

Each plane holds `(width/4) * height` bytes, row by row. Pixel `x` of a row is in plane `x & 3`, at byte `x >> 2`, which is VGA Mode X order.

Plane packing. Read control byte `c`:

- `00`: end of this plane
- `01`–`7F`: repeat the next byte `c` times
- `80`–`FF`: copy the next `256 - c` bytes

This matches the clipped planar blitter in `HOCKEY.EXE` seg028 (file offset `0x11AF0` + `0x8EE`…`0xAEC`). It selects each plane through the VGA sequencer map mask (`out 3C4h`), then runs `lodsb / or al,al / jg run / jl literal / jz next plane`.

Index `FF` is transparent on sprites.

### Palette entry (`!pal`, `!bck`, `!err`)

Any entry whose name starts with `!` has the same 16-byte header (`C0 00 01 00 00 01 …`, which is 192×1 quads, 768 bytes), followed by 768 raw bytes of 6-bit VGA RGB. The bytes are not packed.

### Team palettes: `HOMEPALS.BIN` / `AWAYPALS.BIN`

These hold 26 records of 448 bytes each, in the order of the team table in `HOCKEY.EXE` (file offset `0x32DE2`): BOS BUF CGY CHI DET EDM HFD LA MIN MTL NJ NYI NYR OTT PHI PIT QUE STL SJ TB TOR VAN WSH WPG ASC ASW.

| Offset | Size | Meaning |
| --- | --- | --- |
| 0 | 192 | 64 colors (6-bit VGA), loaded into palette slots `0x80`–`0xBF` |
| 192 | 128 | Remap for sprite pixels `0x00`–`0x7F` |
| 320 | 128 | Remap for sprite pixels `0x80`–`0xFF` |

To draw a player pixel `v`, use `palette[remap[v]]`, where `palette` is RINKPAL `!pal` with the team's 64 colors placed at `0x80`. The remap was worked out from the data and checked visually on all 26 teams, home and away. The loading code has not been traced in the disassembly yet.

## Retail files

| File | Contents |
| --- | --- |
| `000_049.PPV` … `850_899.PPV` | In-game frames 0–875, 50 per file. Players and goalies use team colors. `750_799` onward are mostly the referee, and `850_899` ends with the Stanley Cup presentation. |
| `F000_049.PPV` … `F100_149.PPV` | Crowd frames (fans, signs, crowd strips), drawn with the RINKPAL palette |
| `STOPCHI/DET/MTL/VAN.PPV` | Center-ice logos, each with its own `!pal` |
| `TROPBACK.PPV` | Awards backdrop (`scrn`, 320×200) and sparkle frames, with `!pal` |
| `TROPHIES.PPV` | The 10 trophies (drawn with TROPBACK's palette) |
