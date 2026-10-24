# EA-NHL-Tools 0.8
Tools for various EA NHL games

Recommend checking out Releases for latest stable release: https://github.com/abdulahmad/EA-NHL-Tools/releases

Note that this suite of tools have only been tested on a windows machine. Some of the tools (the ones designed for NHL94/95 PC) use `gfxpak`, which is a windows only application.

- goalie14: segmented skeleton + stick/blade exclusion, 89 strict errors (41 mapping + 48 missing colour), D105–D108.
- goalie15: sock shades 182/183 in texture v6 + colour-zone/fitted-skeleton segmentation, 50 strict errors (50 mapping + 0 missing colour), D109–D112.
- goalie16: all facings of each animation frame fitted jointly (one 3D pose), 49 strict errors (49 mapping + 0 missing colour), D113–D115.
- goalie17: Abdul's g15 segmentation corrections as ground truth (pads by connected leg, stick butt, skate vs blade, catcher), per-correction checks + coordinate inspection sheets, 42 strict errors, D116–D121.
- goalie18: frame 538 blocker taken from Abdul's green marks, leftover old blocker cells → body, 42 strict errors, D122.
- goalie19: Abdul's answers (980 right pad edge, 1044 pad stripe, 428 no blocker) and skeleton-bounded arm vs glove, 42 strict errors, D123.
- goalie20: Abdul's goalie19 answers (980 arm, 416 catcher kept, 419 arm stripes and green blocker), 42 strict errors, D124.
- goalie21: frame 419 catcher = Abdul's green cells (8 cuff cells added), 42 strict errors, D125.
- goalie22: two-piece pad mapping per leg (one straight cut, best mode per piece), 14 strict errors (was 42), labels unchanged, D126.
- goalie23: recursive pad splits, 0 strict pad errors in all 14 frames, D127.
- goalie24: next group SPAgglover (8 frames) auto-labelled for inspection, 3 open questions; Fuhr pad test render local only, D128.
- goalie24 (Fuhr v8): Fuhr Oilers art remapped into the current 23x32 goalie layout, mask = centre front / back on both sides, D129.
- goalie25: Fuhr v9 from the v12 source art (+ high-res build), geometric-snap pad maps and new blocker/catcher/mask maps; strict: pads 1127/0, mask 335/2, catcher 519/1, blocker 304/73 (open question), D130.
- goalie26: Fuhr v10 from Abdul's DR high-res gear (pads, blocker, catcher front/back), NHL95 cage-style mask with warped edges and orange/blue chin, 1044 arm ruling, Abdul rulings log (D131, D132).
- goalie26 v11: Fuhr mask mirrored symmetric with the orange flame on top (D133).
- goalie27: pad test patterns + geometric pad maps v2 (straight columns/rows, 22 frames), Fuhr v12 with a clean straight navy stripe; pad-bottom transparency confirmed as Abdul's original (D134, D135).
- goalie27 D136: pad direction from the skeleton hip->ankle line when the blob axis disagrees; highlighted cuff test.
- goalie27 D137: the 12 still-off pad frames are left as they are (Abdul).
- goalie27 D138: blocker orientation and pad mapping confirmed as they are (Abdul).
- goalie27 D139: open questions resolved by pixel match; back-view pads use the strap strip.
- goalie27 D140: Fuhr knee cuff and mask V tip stay as v12 (Abdul).
- goalie28: strict mapping 0 errors on blocker/catcher/stick (mask 2 left: index 45 eyes on 538), new stick region, Fuhr v13 (D141, D142).
- goalie28 editor: goalie_part_editor.html (paint parts, drag skeleton, export) + g28all/g28export/g28import (D143).
- goalie13: strict pad remap, 95 strict errors (g12 152), D101–D104.

## Tools included

`95-Team-Swap-Mod` - Unfinished Mod for NHL95PC that allows you to use teams/rosters/jerseys/logos from the '22-'23 season

`ANIM-To-BMP` - Extracts NHL92 Genesis `.ANIM` Sprite Animation files to `.BMP`

`ANIM94-To-BMP` - Extracts NHL93/94 Genesis `.ANIM` Sprite Animation files (directly from the ROM) to `.BMP`

`ANIM94SNES-To-BMP` - Extracts NHL94 SNES `.ANIM` Sprite Animation files (directly from the ROM) to `.BMP`

`ANIM95-To-BMP` - Extracts NHL95/96/97 Genesis `.ANIM` Sprite Animation files (directly from the ROM) to `.BMP`

`Asset-Extractor` - Extracts assets from the various EA NHL Genesis rom files. WIP.

`DIG-To-WAV` - Converts NHL94/95 PC `.DIG` files to `.WAV` (in-game sounds)

`Docs` - Documentation on various aspects of the NHL games.

`IFF-To-WAV` - Converts NHL95 PC `.IFF` files to `.WAV` (out of game music files)

`JIM-Tools` - Tools to import/export images from/to NHL 92 Genesis

`MID94-Tools` - Experiment in extracting music from NHL 94 Genesis

`PAL-To-ACT` - Convert NHL95 PC `!<palname>` & `<HOME/AWAY>PALS.bin` files to `.ACT`. For use with sprites extracted from PPV files & centre ice logos extracted

`PPV-To-BMP` - Extracts NHL95 PC `.PPV` files (in-game sprites), WIP: with ability to pass in .ACT palette

`QFS-To-BMP` - Convert NHL95 PC `.QFS` files to `.BMP` using defined mapping to ensure correct palette is used

`Roster-Generator` - Pulls Teams, Players & Stats from public NHL APIs & scrapes `nhlratings.net` for NHL23 ratings to create a base for a modern roster for NHL 94/95

`SPIT-To-BMP` - Converts NHL95 PC SPIT format files to `.RAW` & `.BMP`, with ability to pass in .ACT palette

`Sprite-Viewer` - **NHL9X Studio** (moving to [NHL9XStudio](https://github.com/abdulahmad/NHL9XStudio)) — browser app for NHL 9x sprites, SPF/SPA, and pictures

`TIL-To-BMP` - WIP Converts NHL95 PC TIL/MAP format to .BMP (centre ice logos)

`VIV-To-WAV` - Converts NHL95 PC `.VIV` files to `.WAV` (menu & rink announcer sound)

## Release Notes

### 0.1
- First release of PPV-SPIT-Tools

### 0.2
- First release of IFF-To-WAV and DIG-To-WAV

### 0.3
- First release of VIV-To-WAV
- Moved gfxpak to common 3rd party tools folder

### 0.4
- `95 Team Swap Mod` added (WIP), included prototype jerseys for NSH, CBJ, WPG, MIN, SEA, VGK, All-Star Teams
- Documentation on expanding NHL95 PC to 32 teams added
- First release of `PAL-To-ACT`
- First release of `QFS-To-BMP`
- First release of `Roster-Generator`
- Split out `SPIT-To-BMP` from `PPV-To-BMP`
- Documentation on Centre Ice logos in `TIL-To-BMP`
- Added palette support to `SPIT-To-BMP`

### 0.5 ALPHA
- move source files to central `./NHL94INST` and `./NHL95CD`) folder
- WIP: Create batch to extract homepals & awaypals
- WIP: Create rinkpal-03-ingame
- WIP: Create rinkpal-01-jersey

### 0.6
- First release of `ANIM-To-BMP`

### 0.7
- First release of `ANIM94-To-BMP`
- First release of `JIM-Tools`
- clean up on documentation for various tools
- added command line usage info to all of the tools
- tools (outside of the ones that use gfxpak) are now mac/linux compatible
- support for batch export of NHL 95 PC sprites with specific team palette

### 0.8
- First release of `ANIM95-To-BMP`
- First release of `Asset-Extractor`

## New future version plans
- Refactor ANIM tools to be able to extract .anim files directly from rom, and dynamically parse .anim file.
- Add hotspot support to .anim tools
- Update `ANIM-To-BMP` & `ANIM94-To-BMP` & `ANIM95-To-BMP` to extract sprite components from `.ANIM` files
- Create tool to build `.ANIM` file from frame/sprite metadata/components
- SND extractor/builder

## Postponed future version plans
- Template to create in-game team specific assets (PALs/CRESTS/TIL) -- all share same palette
- Build tools to create in-game team specific assets (PALs/CRESTS/TIL) -- all share same palette
- TIL-To-BMP / BMP-To-TIL (include MAP/centre ice logo config)
- Tool to import/export rosters from NHL95PC
- Tool to import into QFS files
- Figure out how to rebuild CALLOGO Palette for new teams
- Tool to import IFF
- Tool to Export unknown viv format
- Tool to import unknown viv format
- .ACT to !PAL
- Reorg to use central NHL95CD folder
- Make similar functionality in PPV-To-BMP to extract with palette