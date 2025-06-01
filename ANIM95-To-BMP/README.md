# ANIM95-To-BMP v0.1
Exports In-game sprites from NHL95/96/97 Sega Genesis ROM files to Photoshop RAW and Windows BMP format.

There is also a `.json` file saved per Animation Frame, which contains the metadata associated with each Frame. 

Palette is structured similar to how it is stored by the game in Sega Genesis CRAM. The reason is that sprites can have multiple palettes, and the only way to get multi-palette sprites to dislpay correctly would be to use the same palette structure that the game uses.

Unfortunately, the graphics format for NHL 98 for Sega Genesis is wildly different than the other games, so its unsupported, and likely will never be supported.

# Usage
1. Ensure you have `node` installed on your machine

2. Go to the directory with the `anim95ToBmp.js` script

3. Run `npm i` to install node packages required for this script

4. Run `node anim95ToBmp <romfile>` or `node anim95ToBmp.js <romfile> Palettes\<Palette File>`, where the `<romfile>` is either the retail NHL95, NHL96 or NHL97 rom for Sega Genesis.

It will decompress the ANIM file and you will get a `.raw` (Photoshop RAW), `.json` (additonal image attributes) and a `.bmp` file in the `Extracted` path. If a palette file (included in Palettes path) was specified, it will override the player sprite Palette in extracting frames from ANIM files.

## ANIM data locations (Big Endian)
| Game       | Section                   | Address Range         | Description |
|------------|---------------------------|-----------------------|-------------|
| **NHL95** | Sprite Palettes          | `0x14BEFA`     | 128 bytes of Palette Data. 4 palettes of 16 colors (9bpp Sega Genesis Format).                                                             |
| **NHL95** | Sprite Tiles             | `0xCA574-0x131874`     | Raw 8x8 tile data, 4 bits per pixel, 32 bytes per tile. |
| **NHL95** | Frame Sprite Data Offsets| `0x131874–0x132136`     | Table of offsets to sprite data for each frame                                                                                                                    |
| **NHL95** | Sprite Data Bytes        | `0x132136–0x137B66`     | Sprite attributes for each frame (position, size, tile index, etc.).                                                                                                              |
| **NHL95** | Hotlist Table            | `????`     | Hotspot Data.                                           |
| **NHL96** | Sprite Palettes          | `0x172DF6`     | 128 bytes of Palette Data. 4 palettes of 16 colors (9bpp Sega Genesis Format).                                                            |
| **NHL96** | Sprite Tiles             | `0x9AAA8–0x12F588`     | Raw 8x8 tile data, 4 bits per pixel, 32 bytes per tile. |
| **NHL96** | Frame Sprite Data Offsets| `0x12F608–0x13012E`     | Table of offsets to sprite data for each frame.         |
| **NHL96** | Sprite Data              | `0x13012E–0x137296`     | Sprite attributes for each frame (position, size, tile index, etc.).                                                                                                              |
| **NHL96** | Hotlist Table            | `????`     | Hotspot Data.                                           |
| **NHL97** | Sprite Palettes          | `0x9AF24`     | 128 bytes of Palette Data. 4 palettes of 16 colors (9bpp Sega Genesis Format).                                                            |
| **NHL97** | Sprite Tiles             | `0xAABB8–0x160CD8`     | Raw 8x8 tile data, 4 bits per pixel, 32 bytes per tile. |
| **NHL97** | Frame Sprite Data Offsets| `0x160D58–0x161D2E`     | Table of offsets to sprite data for each frame.         |
| **NHL97** | Sprite Data              | `0x161D2E–0x16C736`     | Sprite attributes for each frame (position, size, tile index, etc.).                                                                                                              |
| **NHL97** | Hotlist Table            | `????`     | Hotspot Data.                                           |

### `SPAList` Section
| Byte Offset | Value     | Description                                                                         |
|-------------|-----------|-------------                                                                        |
| `0x00–0x01` | `<uint16>` | Animation ID or group identifier (e.g., player skating, shooting).                  |
| `0x02–0x03` | `<uint16>` | Frame count for the animation sequence.                                             |
| `0x04–0x05` | `<uint16>` | Starting frame index in the Frame Sprite Data Offsets table.                        |
| `0x06–0x07` | `<int16>` | Timing/delay (frames per animation step, in VBlank counts).                         |
| `0x08–0x09` | `<int16>` | Loop flag or next animation ID (e.g., 0xFFFF for no loop, or ID of next animation). |

### `Frame Data offsets` Section
| Byte Offset                                     | Value     | Description                                               |
|-------------                                    |-----------|-------------                                              |
| `0x00..0x01`                                    | `<uint16>` | Offset to sprite data bytes for this frame, relative to the start of the Sprite Data Bytes section (e.g., `0x70006` for NHLPA93, `0x9EDC2` for NHL94).                                |
| `0x02..0x03`                                    | `<uint16>` | Offset to sprite data bytes for this frame, relative to the start of the Sprite Data Bytes section (e.g., `0x70006` for NHLPA93, `0x9EDC2` for NHL94).                                |
| ...                                             | ...       | ...                                                       |
| `0x(NumberOfFrames*2)-2..0x(NumberOfFrames*2)-1`| `<uint16>` | Offset to sprite data bytes for this frame, relative to the start of the Sprite Data Bytes section (e.g., `0x70006` for NHLPA93, `0x9EDC2` for NHL94).                                |
*Note*: Number of sprites in each frame can be calculated by `(bytes between each frame offset) / (length of sprite data)`.

### `Sprite Data` Section
| Byte Offset | Value               | Description                                                   |
|-------------|-----------------    |-------------                                                  |
| `0x00–0x01` | `<int16>`           | X Position of sprite within frame                             |
| `0x02–0x03` | `<int16>`           | Y Position of sprite within frame                             |
| `0x04–0x05` | `<uint16>`           | Tile Index. Can be multiplied by 32 to find the Tile Offset.  |
| `0x06`      | `<uint8>`:`Bit 3`    | Horizontal Flip (`1` = flip horizontally, `0` = normal).      |
| `0x06`      | `<uint8>`:`Bit 4`    | Vertical Flip (`1` = flip vertically, `0` = normal).          |
| `0x06`      | `<uint8>`:`Bits 5-6` | Palette Index (0–3, selects one of 4 CRAM palettes).          |
| `0x07`      | `<uint8>`           | Size Index (0–15, references `sizetab` for number of tiles).  |

### `Hotlist` Section
| Byte Offset | Value           | Description                                             |
|-------------|-----------------|-------------                                            |
| `0x00–0x01` | `<int16>`       | X Hotspot offset (signed, relative to frame’s origin).  |
| `0x02–0x03` | `<int16>`       | Y Hotspot offset (signed, relative to frame’s origin).  |

### `Size Table` Definition
```// value at index indicates number of 8x8 tiles. Index references sizetab lookup table
sizeTab = [1, 2, 3, 4, 2, 4, 6, 8, 3, 6, 9, 12, 4, 8, 12, 16]

// Dimensions table: maps size index to { width, height } in tiles
const dimensionsTable = [
  { width: 1, height: 1 }, // 1 tile
  { width: 1, height: 2 }, // 2 tiles
  { width: 1, height: 3 }, // 3 tiles
  { width: 1, height: 4 }, // 4 tiles
  { width: 2, height: 1 }, // 2 tiles
  { width: 2, height: 2 }, // 4 tiles
  { width: 2, height: 3 }, // 6 tiles
  { width: 2, height: 4 }, // 8 tiles
  { width: 3, height: 1 }, // 3 tiles
  { width: 3, height: 2 }, // 6 tiles
  { width: 3, height: 3 }, // 9 tiles
  { width: 3, height: 4 }, // 12 tiles
  { width: 4, height: 1 }, // 4 tiles
  { width: 4, height: 2 }, // 8 tiles
  { width: 4, height: 3 }, // 12 tiles
  { width: 4, height: 4 }  // 16 tiles
];
```
## More Info
Big thank you to chaos & McMarkis on the NHL94.com discord for helping me figure everything out

# Future TODO
- Add 93 & 94 palettes

NHL95:
132140 - first instance of 2816

132158 - tile id 2816 = skate without puck main sprite

2816 - might be sprite starting at E7EF4 = 1D97A from start of tiles = tile 3787-- correction 1D980

3787 1110 1100 1011
2816 1011 0000 0000 - normal
2815 1010 1111 1111 - corrupted
2814 1010 1111 1110 - same as 2815
2812 1010 1111 1100 - same as 2815
2808 1010 1111 1000 - same as 2815
2800 1010 1111 0000 - same as 2815
2784 1010 1110 0000 - same
2688 1010 1000 0000 - same
XXXX 1110 0000 0000 - weird stuff on left flap
4043 1111 1100 1011 - FCB -- weird stuff on left flap
3275 1100 1100 1011 - CCB -- think whats happening is overlap between two 8x8 sprites
2763 1010 1100 1011 - ACB - same as 2815
1739 0110 1100 1011 - 6CB - messed up tiles
// sizetab table
const sizetabTable = [1, 2, 3, 4, 2, 4, 6, 8, 3, 6, 9, 12, 4, 8, 12, 16];

01  23  4                   5          6U                       6L                                  7
^-x ^-y ^-affects tileindex ^-sizetab? ^-affects flip/palette    ^-affects tileIndex and sizetab?   ^-affects tileIndex
00 = 0 => 1 => 1x1
11 = 3 => 4 => 1x4
10 = 2 =? 3 =? 1x3

[0]       [1]       [2]       [3]       [4]       [5]       [6]       [7]
XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX 
^^^^ ^^^^ ^^^^ ^^^^ ^^^^ ^^^^ ^^^^ ^^^^ ^^^^ ^^^^ ^^^^ ^^^^ ^^^^ ^^^^ ^^^^ ^^^^
|||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||﹂- TBD
|||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| ||﹂- TBD
|||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |﹂- TBD
|||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| ﹂- TBD
|||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||﹂- TBD
|||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| ||﹂- TBD
|||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |﹂- TBD
|||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| ﹂- TBD
|||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||﹂- TBD
|||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| ||﹂- TBD
|||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |﹂- TBD
|||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| ﹂- TBD
|||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||﹂- Flip Y
|||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| ||﹂- Flip X
|||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| ||||  ﹂- Palette 0-3
|||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||﹂- does nothing to tiles
|||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| ||﹂- TBD
|||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |﹂- TBD
|||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||| ﹂- TBD
|||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |||﹂- does nothing to tiles
|||| |||| |||| |||| |||| |||| |||| |||| |||| |||| ||﹂- TBD
|||| |||| |||| |||| |||| |||| |||| |||| |||| |||| |﹂- TBD
|||| |||| |||| |||| |||| |||| |||| |||| |||| |||| ﹂- TBD
|||| |||| |||| |||| |||| |||| |||| |||| |||| |||﹂- Tile on secondary sprite changes?
|||| |||| |||| |||| |||| |||| |||| |||| |||| ||﹂- TBD
|||| |||| |||| |||| |||| |||| |||| |||| |||| |﹂- TBD
|||| |||| |||| |||| |||| |||| |||| |||| |||| ﹂- TBD
|||| |||| |||| |||| |||| |||| |||| |||| |||﹂- No effect on tiles?
|||| |||| |||| |||| |||| |||| |||| |||| ||﹂- TBD
|||| |||| |||| |||| |||| |||| |||| |||| |﹂- TBD
|||| |||| |||| |||| |||| |||| |||| |||| ﹂- TBD 
|||| |||| |||| ||||          ﹂- 2-3: Y Position
         ﹂- 0-1: X Position

|||| |||| |||| |||| |||| |||| || ﹂- Flip X/Y
|||| |||| |||| |||| |||| ||||  ﹂- Palette

### `Sprite Data` Section
| Byte Offset | Value               | Description                                                   |
|-------------|-----------------    |-------------                                                  |
| `0x00–0x01` | `<int16>`           | Y Position of sprite within frame                             |
| `0x02`      | `<uint8>:bit 0-3`   | Size Index (0–15, references `sizetab` for number of tiles).  |
| `0x02`      | `<uint8>:bit 4-7`   | Tile Index High bytes (11-13)                                 |
| `0x04–0x05` | `<uint16>:bit 0-10` | Tile Index Low bytes (0-10)                                   |
| `0x04–0x05` | `<uint16>:bit 11`   | Horizontal Flip. 0=normal, 1=flipped                          |
| `0x04–0x05` | `<uint16>:bit 12`   | Vertical Flip. 0=normal, 1=flipped                            |
| `0x04–0x05` | `<uint16>:bit 13-14`| Palette. 0-3.                                                 |
| `0x04–0x05` | `<uint16>:bit 15`   | Priority. 0=low, 1=high                                       |
| `0x06–0x07` | `<int16>`           | X Position of sprite within frame                             |

NHL96 Frame 4
FF E3 0B 00 40 E8 FF F5
Y pos = FF E3
SizeFormat = 0B

00 03 84 00 44 9D FF F7
Y pos = 3
SizeFormat = 84
Tile Index low: 449D -> bits 0-10: 100 1001 1101
Tile Index high: 84 -> bit 4-6

3 = 0011
4 = 0100

EA XX 41 BC

3787 = 0ECB

// Dimensions table
const dimensionsTable = [
  { width: 1, height: 1 }, { width: 1, height: 2 }, { width: 1, height: 3 }, { width: 1, height: 4 },
  { width: 2, height: 1 }, { width: 2, height: 2 }, { width: 2, height: 3 }, { width: 2, height: 4 },
  { width: 3, height: 1 }, { width: 3, height: 2 }, { width: 3, height: 3 }, { width: 3, height: 4 },
  { width: 4, height: 1 }, { width: 4, height: 2 }, { width: 4, height: 3 }, { width: 4, height: 4 },
];

--- 

CA574 = first tile
131874 = last tile end

diff of 67300.

13208 tiles

frame 2
FF E7 0B 00 41 B0 FF F4 
y = -27, sizeIndex = 8; 3wx4h
thigh=0, tlow=432,; tileoffset = 0xCA574 + 432*32 = 0x3600 = CDB74 = 842612
priority = 0
palette = 2
hflip=0
vflip=0
x=-12
FF F7 60 00 41 24 00 0C 
tileIndex 01 1001 0010 0100 = 0x1924 --> FC9F4
tileIndex 11 0001 0010 0100 = 0x3124 --> 12C9F4
FF EF 60 00 41 25 00 0C
