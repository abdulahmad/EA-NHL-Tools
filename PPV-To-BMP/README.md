# PPV-To-BMP v0.3
Exports In-game sprites from NHL95 PC in SPIT format to Photoshop RAW and Windows BMP format. The sprites are extracted as stored-- which means they are in grayscale. 

The sprites with a dynamic palette (player/goalie sprites) have a multi-step mapping done, which means you can't just apply the in-game palette to them. However, the sprites with static palette (such as the referee) can look correct with colors if you apply the in-game palette. I intend to support some sort of palette tools soon, but just wanted to get this out as soon as possible.

There is also a `.json` file saved per sprite, which contains the x/y offset & position data that are also stored in the SPIT Image file. 

This tool leverages `gfxpak` to export the SPIT data from the PPV file. Assuming gfxpak can add data files back into PPV files correctly, these scripts could probably be modified to import new sprites into the game, but for now my focus is on exporting sprites from the game.

# Usage
1. In `PPV-SPIT-Tools` folder, create a folder called `NHL95PPV` and copy the PPV files from NHL95 that you want to export into that folder.

2. Ensure you have `node` installed on your machine

3. In the `PPV-SPIT-Tools` folder, run `node ppvToSpit`. This will run `gfxpak` on all of the PPV files in `NHL95PPV`. Now you will have the SPIT data files, ready to be converted.

4. Run `node batchUnpackedSpitToBmp`. It will run the script `spitToBmp` on all of the SPIT files extracted from the PPV files. For every SPIT file, you will get a `.raw` (Photoshop RAW), `.json` (additonal image attributes) and a `.bmp` file.

## NHL95 SPIT Header details
entry header - 16 bytes
byte pair 0 (uint8) - record ID / entry type / image type
byte pair 1-3 (uint24) - size of the block
byte pair 4-5 (uint16) - image width
byte pair 6-7 (uint16) - image height
byte pair 8-9 (uint16) - X axis offset
byte pair 10-11 (uint16) - Y axis offset
byte pair 12-13 (uint16) - X axis position
byte pair 14-15 (uint16) - Y axis position

## More Info
The SPIT format seems to be some sort of variant of the ILBM IFF format. It uses a similar Run Length Encoding Scheme.

# Future TODO
- Add palette support for both dynamically paletted sprites and statically paletted sprites
- Potentially automate the creation of sprite sheets
- Import sprites back into NHL 95 (if there is enough demand)