# NHL9X Studio

Browse sprite frames and the animations that play them for NHL 92, NHLPA 93, NHL 94, and NHL 95 on the Genesis, NHLPA 93 and NHL 94 on the SNES, and NHL 95 on PC. Roadmap and platform priority: [`docs/DESIGN.md`](docs/DESIGN.md). Continuation notes for agents: [`../docs/AGENT-HANDOFF.md`](../docs/AGENT-HANDOFF.md).

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

- **Frame** scrubs a bank by index. `Sprites.anim` frame 1 is docs index 0. Use **Bank** on NHL 92 and on NHLPA 93 / NHL 94 Genesis to switch the player sheet, crowd, face-off sprites, zamboni, and other frame banks (NHL 94 also lists the playoff sprite sheet). SPF and SPA names still refer to the main player sheet only.
- **SPF** shows one named run. Runs laid out as eight facings get the compass.
- **SPA** plays a sequence. Q and E turn the facing, S spins.
- **Images** lists the other pictures in that game: titles, the rink, fonts, and the animation banks that are not the player sheet. Each Genesis and SNES picture pixel keeps its palette row (color plus row times 16). Color 0 of palette 0 is drawn. Color 0 of the other rows is transparent, so a tile on palette 1, 2, or 3 can sit on top of the ice instead of a black box. The Transparency checkbox on Images starts checked when the picture uses those holes, and clear when the picture is opaque. Turning it on or off overrides that for the picture you are looking at. The tab opens on the picture's own palette. Choosing a team in the jersey menu recolors that picture with the team colors, which is how the scoreboard, jumbotron clips, team blocks, and the fonts pick up a club's colors. A picture made of several frames stays on the first one until you press Play, and the filmstrip lists every frame of that picture. SPF and SPA still start playing on their own. Switching games stays on Images. A picture with the same name stays selected. Otherwise the app returns to the picture you last opened for that game during this session. Below 1100 pixels wide the list and the details slide off the stage; **List** and **Details** open them again. NHL 94 SNES pictures are the title letters, the title goalie, the title puck, the EA Sports screen and its backdrop, Ron Barr, the Stanley Cup, the window frame, the team logos, the rink, the center-ice marks, the letter sets, the menu font, the ice font, and the 160 player cards. The card bytes are expanded by the same routine the roster screen uses (`$9B85C2`). The NHL 94 SNES disassembly is still a segment split, so the refs, crowd, faceoff, and the other Genesis screens are not named there yet. NHLPA 93 SNES also draws the face-off box, the framer, the arrows, the team blocks, both ref windows, and the horizontal rink. The EASN backdrop uses the Ron Barr colors loaded with that screen. The frame and the big font use the ice palette after the same pixel remap the game uploads. NHL 92's frame does the same remap onto the ice-rink colors. NHLPA 93, NHL 94, and NHL 95 Genesis list every picture the disassembly extract scripts name: screens, the rink, fonts, team logos, player portraits, and the crowd, faceoff, and zamboni frame banks. A picture with no palette of its own uses the ice-rink colors. The crowd scale slider zooms from that fitted size. Those offsets are the retail ROM. An NHLPA 93 ROM whose header date is `1992.OCT` (Rev A) shifts every slice at or after `$16E53` by `0x2E` bytes, which covers the pictures and the player sprite sheet. NHL 96 is not a supported game; its extract script names palettes, not pictures. NHL 95 PC still lists every QFS picture.
- Jersey colors replace the home-jersey palette. That is slot 2 on the Genesis games and on NHLPA 93 SNES, and slot 4 on NHL 94 SNES. The menu uses the city and home or away, and it opens on Buffalo home so the jersey zones are all visible. Embedded stays in the menu for games whose own palette is trustworthy. NHL 92 uses the `ANIM-To-BMP` palettes. NHLPA 93 and NHL 94 Genesis use the `ANIM94-To-BMP` palettes. NHL 95 Genesis uses `ANIM95-To-BMP/Palettes/NHL95`. Both SNES games use the team `.snespal` files from the NHLPA 93 SNES disassembly. Switching games keeps the same city and side, stays on an SPA or SPF of the same name when the new game has one, and stays on Images when that tab is open.
- **NHL 95 (PC)** lists the DOS sprite ranges (frame 1 is docs index 0, through frame 1134). SPF browses those ranges. SPA is the animation table in `HOCKEY.EXE` (file offset `0x110471`, the same layout `updateanim` walks). Stored frame numbers are 0-based, so the viewer adds one and they line up with Genesis. The 119 names are the C strings at file offset `0x109030`. Copy the game's `PPV` and `QFS` files into `pc95/` and restart the server. Player sprites are the sequential sheets `000_049.PPV`, `050_099.PPV`, through `950_999.PPV`, then `10001049.PPV`, `10501099.PPV`, and `11001149.PPV`. Tag `0000` in the first file is frame 1, and each later file continues that count. Rink and crowd sprites are the same kind of series: `F000_049.PPV`, `F050_099.PPV`, `F100_149.PPV`, plus the wider `F000_149.PPV`. Choose **Rink and crowd** in the Bank menu on the Frame tab. A file named `sprites.ppv` or `players.ppv`, or anything under `pc95/sprites/`, still fills the player bank. Every other `QFS` is a picture. Numbered runs such as `CREDIT00.QFS`–`CREDIT19.QFS` and `PORTR000.QFS`–`PORTR023.QFS` play as one picture. QFS is EA RefPack (`10 FB`), the same unpacker as `sub_97CE0` in NHL95PC. A PPV file, and the bytes inside a QFS, are an SHPI bank. The size, count, and offsets are little-endian, which is how `sub_B30B4` reads them. Each entry is a SPIT shape: type 123 is raw pixels, and the other types use the same run as `SPIT-To-BMP`. SPIT bytes 8 and 10 are the console 0, 0 point (`DrawSprite` subtracts them). The hotspot is `GetHot`'s HotList, with Y flipped so it sits on the same point as Genesis. `HOMEPALS.BIN` and `AWAYPALS.BIN` supply the 28 team palettes (Buffalo is team 1). Player and goalie frames use the `createPal` from `PAL-To-ACT`: `rinkpalShadowfixed` merged with the 64 team colors, the 128 mapping bytes at team offset 320, then `createjerseyShadowfixed` for colors 0–143. The referee, puck, goal light, and the rink bank use the game palette (`rinkpal` plus the team colors, keeping rink colors 251–255) so the shadow fix does not recolor them. Pictures keep the `!pal` stored with them. City titles take `CTBKGD.QFS` `!pal`, the same palette `TonightsGameScreen` loads before those shapes. The player stat bar takes `PREZ2.QFS` `!pal`. Team emblems take `EMBPAL.QFS`. Jumbotron clips and the scoreboard open on the team palette. On sprites the blitter skips index 255, and index 0 is equipment black. Pictures draw every index.
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
pc95/000_049.PPV
pc95/050_099.PPV
pc95/F000_049.PPV
pc95/F050_099.PPV
pc95/F100_149.PPV
pc95/RINK.QFS
pc95/ARENA.QFS
```

`data/frames.asm` is from NHL92Genesis. `frames93.asm`, `frames94.asm`, and `frames95.asm` are from the matching Genesis disassemblies. `frames95pc.asm` is the NHL 95 DOS sprite index from `Docs/Sprites/Readme.md`. `frames93snes.asm` is generated from NHLPA93SNES. `frames94snes.asm` is generated from the animation tables in the NHL 94 SNES ROM; sequences whose vblank list matches NHLPA 93 SNES keep that name, and the rest are `SPAextra`. Goalie poses on that ROM sit in `SPFlater` rather than the Genesis goalie names. The NHL 94 SNES rink reuses the NHLPA 93 SNES rink palette. `node test.js` checks the parsers and checks every NHL 92 frame against BMPs written by `ANIM-To-BMP`.
