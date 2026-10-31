# PPV94-To-BMP handoff

Paused on 2026-10-31 at Abdul's request. Open PR: EA-NHL-Tools #154. Companion doc PR: NHL94PC #51 (`docs/PPV_FORMAT.md`).

## Done

- Worked out the NHL 94 PC PPV format: Mode X planar shapes, each plane PackBits-packed. The full spec is in `README.md`. The plane code matches the clipped blitter in `HOCKEY.EXE` seg028 (file `0x11AF0`, around `+0x8EE..+0xAEC`).
- `ppv94.js` (decoder), `ppv94ToBmp.js` (BMP exporter with `--pal`, `--team`, `--side`, `--key`), `viewer.html` (drag-and-drop viewer), and `test.js`.
- `node test.js <folder>` passes on all 27 retail banks (1002 shapes) and all 21 demo banks (981 shapes). Each plane ends on its terminator, each shape ends at the next entry's offset, and the decoded size matches the size field.
- Team colors: `HOMEPALS.BIN`/`AWAYPALS.BIN` hold 26 × 448-byte records, in the team order at EXE `0x32DE2`. I checked them visually on all teams, home and away. The base palette is `RINKPAL.QPP` `!pal`, decoded by the QPP thread (`QPP94-To-BMP`).
- A published viewer with a sample loaded (Montreal players): https://claude.ai/artifact/3nQ72HH3yyN5zKkbmZawZz

## Next

1. Merge #154 and #51. Neither repo runs CI on them.
2. Once `QPP94-To-BMP` lands, let the viewer and exporter read `.QPP` directly. QPP files are the same bank layout inside EA `30 FB` Huffman or `46 FB` packing, so this needs a JS port of the unpacker (or a reuse of NHL9XStudio `lib/snespak.js`, which already handles `30 FB`).
3. Add an `nhl94pc` profile to Sprite-Viewer (see `Sprite-Viewer/docs/DESIGN.md` §2), reusing `ppv94.js`.
4. When seg028 is disassembled in NHL94PC, name the blitter (for example `DrawPackedShape`), then trace the bank loader that expands shapes into `unpackedSize` bytes.

## Open questions

- Shape header words `+8`/`+10` look like x/y in the original art sheet, but this is not traced.
- Shape header word `+12` is unknown. Most player frames have `0x0201`, and the palette entries hold checksum-like values.
- The team remap was inferred from the data. The code that loads HOMEPALS/AWAYPALS has not been traced.
- Hotspot use: on player frames, (hotX, hotY) sits near the skates. The draw code that uses it has not been traced.
- The tall `F050_099.PPV` crowd strips look wrong with RINKPAL, so they may use a different palette.
