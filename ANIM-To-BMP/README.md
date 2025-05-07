# ANIM-To-BMP v0.1
Exports In-game sprites from NHL92 Sega Genesis in ANIM format to Photoshop RAW and Windows BMP format. The sprites are extracted as stored-- which means they are in grayscale. 

There is also a `.json` file saved per Animation Frame, which contains the metadata associated with each Frame. 

# Usage
1. Ensure you have `node` installed on your machine

2. Run `node animToBmp <animfile>` or `node animToBmp <animfile> <EAPalfile>`. It will decompress the ANIM file and you will get a `.raw` (Photoshop RAW), `.json` (additonal image attributes) and a `.bmp` file in the `Extracted` path. If a palfile (in EA Pal format, !pal, etc) was specified, it will use that palette in extracting ANIM files.

## NHL92 ANIM file details
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
Big thank you to chaos & McMarkis on the NHL94.com discord for helping me figure everything out

# Future TODO
- Update Readme.md with 92 file format
- Update .json file with correct metadata
- Update Script to support 92 palettes
- Update Script to extract Sprites from '93
- Update Script to extract Sprites from '94