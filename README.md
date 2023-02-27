# EA-NHL-Tools 0.4
Tools for various EA NHL games

Recommend checking out Releases for latest stable release: https://github.com/abdulahmad/EA-NHL-Tools/releases

## Tools included

`95-Team-Swap-Mod` - Very WIP Mod for NHL95PC that allows you to use teams/rosters/jerseys/logos from the '22-'23 season

`DIG-To-WAV` - Converts NHL94/95 PC `.DIG` files to `.WAV` (in-game sounds)

`HOCKEY32` - Documentation on potentially expanding NHL95 PC to 32 teams

`IFF-To-WAV` - Converts NHL95 PC `.IFF` files to `.WAV` (out of game music files)

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
- Documentation on Centire Ice logos in `TIL-To-BMP`
- Added palette support to `SPIT-To-BMP`

## Future version plans (May not be in this order)
- Make similar functionality in PPV-To-BMP to extract with palette
- Create structure to compile 95 Team swap mod
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
- Set up assets for Team Swap Mod