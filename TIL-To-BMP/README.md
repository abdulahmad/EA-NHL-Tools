# TIL-To-BMP 0.1

Extract Centre Ice logos

# File Format

`NYR.TIL` - seems to be stored in 8x8 tiles. 4 tiles wide, 8 tiles high. 32 tiles in total. You can use the palette extracted from HOMEPALS for this.

`NYR.MAP`

First byte pair - 4 - meaning 4 tiles wide
Second byte pair - 8 - meaning 8 tiles high
Third byte pair - 16 - ?? maybe tile configuration?
Then a series of byte pairs that counts from 0-31, representing the amount of tiles that the centre ice logo has? or tile layout?

`FLO.TIL` - stored in 8x8 tiles. 6 tiles wide, 6 tiles high
`FLO.MAP` - 6 meaning 6 wide, 6 meaning 6 high, 10? then a series of byte pairs that counts from 0 to 23 ???

# .TIL/.MAP file format
.map:
- RAW Image, each byte greyscale value 0-255. 
- Palette matches palette extracted by `PAL-To-ACT` from `HOMEPALS.bin`.
- stored in 8x8 tiles

.til:
Bytes 0-1: Height (in tiles)
Bytes 2-3: Width (in tiles)
Bytes 4-5: ???? - usually 10h
Then you get a set of byte pairs which tells the order of which tiles to display from the top, left to right

Centre Ice Layout is stored in the list in HOCKEY.exe at offset `0x10E4EC`. After every team abbreviation in this list there are 9 bytes. This controls the centre ice logo arrangement. So for example, LA shows the logo near the blue line and mirrored. If you want to change this to a more traditional layout you can by overwriting the 9 bytes after the 3 byte abbreviation with one from another team. Heres what the bytes mean:
Byte 1 - Seems to be always 0
Byte 2-3 - X offset - think this is based on tiles so you will move the logo by 8 pixels as you change this value by 1
Byte 4-5 - Y offset - think this is based on tiles so you will move the logo by 8 pixels as you change this value by 1
Byte 6-9 - Not sure how this is broken down but controls how centre ice logo displays. LA has the logos mirrored, believe this controls that