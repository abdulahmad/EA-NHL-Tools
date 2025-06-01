# EA-NHL-Tools 0.7
Tools for various EA NHL games

Recommend checking out Releases for latest stable release: https://github.com/abdulahmad/EA-NHL-Tools/releases

Note that this suite of tools have only been tested on a windows machine. Some of the tools (the ones designed for NHL94/95 PC) use `gfxpak`, which is a windows only application.

## Tools included

`95-Team-Swap-Mod` - Unfinished Mod for NHL95PC that allows you to use teams/rosters/jerseys/logos from the '22-'23 season

`ANIM-To-BMP` - Extracts NHL92 Genesis `.ANIM` Sprite Animation files to `.BMP`

`ANIM94-To-BMP` - Extracts NHL93/94 Genesis `.ANIM` Sprite Animation files (directly from the ROM) to `.BMP`

`ANIM95-To-BMP` - Extracts NHL95/96/97/98 Genesis `.ANIM` Sprite Animation files (directly from the ROM) to `.BMP`

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