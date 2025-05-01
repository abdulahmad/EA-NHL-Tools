# ANIM-To-BMP v0.1
Exports In-game sprites from NHL92 Sega Genesis in ANIM format to Photoshop RAW and Windows BMP format. The sprites are extracted as stored-- which means they are in grayscale. 

The sprites with a dynamic palette (player/goalie sprites) have a multi-step mapping done, which means you can't just apply the in-game palette to them. However, the sprites with static palette (such as the referee) can look correct with colors if you apply the in-game palette. I intend to support some sort of palette tools soon, but just wanted to get this out as soon as possible.

There is also a `.json` file saved per sprite, which contains the x/y offset & position data that are also stored in the SPIT Image file. 

# Usage
1. Ensure you have `node` installed on your machine

2. Run `node spitToBmp <spitfile>` or `node spitToBmp <spitfile> <EAPalfile>`. It will decompress the SPIT file and you will get a `.raw` (Photoshop RAW), `.json` (additonal image attributes) and a `.bmp` file in the same path that the SPIT file lives in. If a palfile (in EA Pal format, !pal, etc) was specified, it will use that palette in extracting SPIT files.

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
- Import sprites back into NHL 95 (if there is enough demand)