# QPP94-To-PNG handoff

Paused 2026-10-31 at a clean point. The decoder is complete and the format is documented in README.md.

## Done

- Ported both EA decompressors from NHL '94 PC HOCKEY.EXE seg004: Huffman `30/31/32 FB` (`Unpack`, 0430h) and BTree `46/47 FB` (`Expand`, 072Eh).
- Bank parser, Mode X PackBits shape decoder, palette lookup, and a PNG writer with no dependencies, all in `qpp94.js`.
- Checked all 128 retail QPPs (28 Huffman, 100 BTree): every bank unpacks to its exact size, matches an independent Python port byte for byte, and every plane fills exactly. 355 shapes were checked by eye.
- The bank layout is the same as 94 PC PPV, which the PPV thread decoded on its own and agrees with.
- Shared with the PPV thread: the decoded RINKPAL palettes are in `/mnt/project-files/qpp94/` along with contact sheets of every shape.

## Next

- Use the exported functions in NHL9X Studio's `pc94` profile (GAP-8 in its IMPLEMENTATION.md). `lib/pc95.js` currently treats `30 FB` as unsupported.
- Share the decompressors with the PPV94 decoder instead of keeping two copies.
- Optional: a QPP encoder for modding. The BTree compressor is the simpler one to write first.
- Optional: name `Unpack`/`Expand` callers in the disassembly that load each QPP, to confirm the borrowed palettes from code rather than from the name strings.

## Open questions

- Entry header `+12` (u16): `0201h` on most small shapes, other values on palettes and 320x200 screens. Its meaning is unknown.
- The borrowed palettes for banks without one (table in README.md) come from name strings in HOCKEY.EXE plus a visual check, not from tracing code. In-game recolouring (team colours, fades) isn't applied.
- `!ppp` palettes in some EMBxxx banks, and the `!bck` and `!err` palettes in RINKPAL, have no known use yet.
