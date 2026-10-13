# Sprite Viewer

Browse Genesis sprite frames and the animations that play them for NHL 92, NHLPA 93, NHL 94, and NHL 95.

NHL 92 pictures come from the `.ANIM` files in `ANIM-To-BMP`. The other three games read a player sprite sheet out of the ROM. Names come from each game's `frames.asm`: an **SPF** symbol is a run of frames, and an **SPA** entry is an 8-facing sequence of those frames. Pixels are 4bpp column-major tiles, nibble 0 transparent, four Genesis palettes.

**Groups** sorts the list into skating, shooting, and the other sidebar categories. **File** keeps the order of the symbols in `frames.asm`.

Timing follows `updateanim`. A step of N vblanks stays on screen for N + 1 vblanks, because the vblank that expires the counter still draws the old picture. The game also refuses a new picture until 4 vblanks after the last change (`glitch`). **Game timing** applies both. A negative time is the last step, so the stride back to the first frame waits out that full hold. Flags bit 0 is the loop bit.

Facing 0 is north on a vertical rink (`dirtab` in `logic.asm`), then clockwise. A horizontal rink subtracts 2 from the facing before the lookup. Spin walks the compass where an animation actually has more than one sequence.

Pin holds one point in the middle of the stage. **0, 0** is the default: the player's position, which sits at the skates. **Hotspot** is the pair `GetHot` reads (file offsets `0x18` and `0x1A`), where the puck sits in possession. An amber mark is 0, 0 and a red cross is the hotspot. A dashed rectangle is the canvas size from the frame header (`0x06` and `0x08`, stored as twice the pixel size). On these banks that size matches the sprite bounds.

## Run

```
node server.js
```

Open http://localhost:8732

- **Frame** scrubs a bank by index. `Sprites.anim` frame 1 is docs index 0.
- **SPF** shows one named run. Runs laid out as eight facings get the compass.
- **SPA** plays a sequence. Q and E turn the facing, S spins.
- Jersey colors replace palette slot 2. NHL 92 uses the `ANIM-To-BMP` palettes. NHLPA 93 and NHL 94 use the `ANIM94-To-BMP` palettes. NHL 95 uses `ANIM95-To-BMP/Palettes/NHL95`.
- The game menu switches catalogs. NHL 92 draws immediately. For the later games, put a headerless (or SMD) ROM in `roms/` and restart the server:

```
roms/nhlpa93.bin
roms/nhl94.bin
roms/nhl95.bin
```

`data/frames.asm` is from NHL92Genesis. `frames93.asm`, `frames94.asm`, and `frames95.asm` are from the matching disassembly repos. `node test.js` checks the parsers and checks every NHL 92 frame against BMPs written by `ANIM-To-BMP`.
