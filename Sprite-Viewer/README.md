# Sprite Viewer

Browse sprite frames and the animations that play them for NHL 92, NHLPA 93, NHL 94, and NHL 95 on the Genesis, NHLPA 93 and NHL 94 on the SNES, and NHL 95 on PC.

NHL 92 pictures come from the `.ANIM` files in `ANIM-To-BMP`, or from the same bytes in a retail ROM when one is present. NHLPA 93, NHL 94, and NHL 95 Genesis read a player sprite sheet out of the ROM. The SNES ports read planar 4bpp tiles from their ROMs. Names come from each game's `frames.asm`: an **SPF** symbol is a run of frames, and an **SPA** entry is an 8-facing sequence of those frames. Genesis pixels are 4bpp column-major tiles, nibble 0 transparent, four Genesis palettes.

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
- **Images** lists the other pictures in that game: titles, the rink, fonts, and the animation banks that are not the player sheet. Screens and fonts draw color 0. Sprite pictures, such as the team logos, leave color 0 transparent. The tab uses the embedded palette. Switching games stays on Images, and leaves the last jersey selected for when you go back to frames. NHL 94 SNES pictures are the title letters, the EA Sports screen, the team logos, the rink, the center-ice marks, and the two letter sets. NHLPA 93, NHL 94, and NHL 95 Genesis do not have those extra pictures in the viewer; with the ROM already loaded, the tab says so instead of asking for the file again.
- Jersey colors replace the home-jersey palette. That is slot 2 on the Genesis games and on NHLPA 93 SNES, and slot 4 on NHL 94 SNES. The menu uses the city and home or away, and it opens on Buffalo home so the jersey zones are all visible. Embedded stays in the menu for games whose own palette is trustworthy. NHL 92 uses the `ANIM-To-BMP` palettes. NHLPA 93 and NHL 94 Genesis use the `ANIM94-To-BMP` palettes. NHL 95 Genesis uses `ANIM95-To-BMP/Palettes/NHL95`. Both SNES games use the team `.snespal` files from the NHLPA 93 SNES disassembly. Switching games keeps the same city and side, stays on an SPA or SPF of the same name when the new game has one, and stays on Images when that tab is open.
- **NHL 95 (PC)** lists the DOS sprite ranges (frame 1 is docs index 0, through frame 1134). SPF browses those ranges. The SPA scripts live in `HOCKEY.EXE` and are not in the picture files, so that tab stays empty. Pictures are drawn when you put the game's `PPV`, `QFS`, or unpacked SPIT files in `pc95/` and restart the server. A shape bank with 200 or more numbered shapes, a file named `sprites.ppv` or `players.ppv`, or anything under `pc95/sprites/`, fills the sprite frames. Tag `0000` is frame 1. Other QFS and PPV files show up under Images. QFS is EA RefPack (`10 FB`), the same unpacker as `sub_97CE0` in NHL95PC. The bytes inside are an SHPP bank of SPIT shapes, which is what `sub_B30B4` looks up. `HOMEPALS.BIN` and `AWAYPALS.BIN` supply the 28 team palettes (Buffalo is team 1). Colors 0–127 come from `rinkpal` or `RINKPAL.QFS` when that file is present, and the 128 mapping bytes in each team block recolor sprite indexes 128–255. Pictures keep the `!pal` stored with them. Index 0 is transparent on sprites and opaque on pictures.
- The game menu switches catalogs. NHL 92 draws its sprite banks from `ANIM-To-BMP` immediately, and from `roms/nhl92.bin` when that file is there (the ROM also supplies the title, rink, and other pictures). The other games need a ROM. A 512-byte SMD or SNES copier header is stripped. Put the file in `roms/` and restart the server:

```
roms/nhl92.bin
roms/nhlpa93.bin
roms/nhl94.bin
roms/nhl95.bin
roms/nhlpa93snes.sfc
roms/nhl94snes.sfc
```

NHL 95 PC art is not a ROM. Put it here instead:

```
pc95/HOMEPALS.BIN
pc95/AWAYPALS.BIN
pc95/sprites.ppv
pc95/RINK.QFS
```

`data/frames.asm` is from NHL92Genesis. `frames93.asm`, `frames94.asm`, and `frames95.asm` are from the matching Genesis disassemblies. `frames95pc.asm` is the NHL 95 DOS sprite index from `Docs/Sprites/Readme.md`. `frames93snes.asm` is generated from NHLPA93SNES. `frames94snes.asm` is generated from the animation tables in the NHL 94 SNES ROM; sequences whose vblank list matches NHLPA 93 SNES keep that name, and the rest are `SPAextra`. Goalie poses on that ROM sit in `SPFlater` rather than the Genesis goalie names. The NHL 94 SNES rink reuses the NHLPA 93 SNES rink palette. `node test.js` checks the parsers and checks every NHL 92 frame against BMPs written by `ANIM-To-BMP`.
