# ANIM94-To-BMP v0.2
Exports In-game sprites from NHLPA93 & NHL94 Sega Genesis ROM files to Photoshop RAW and Windows BMP format.

There is also a `.json` file saved per Animation Frame, which contains the metadata associated with each Frame. 

Palette is structured similar to how it is stored by the game in Sega Genesis CRAM. The reason is that sprites can have multiple palettes, and the only way to get multi-palette sprites to dislpay correctly would be to use the same palette structure that the game uses.

# Usage
1. Ensure you have `node` installed on your machine

2. Go to the directory with the `anim94ToBmp.js` script

3. Run `npm i` to install node packages required for this script

4. Run `node anim94ToBmp <romfile>` or `node anim94ToBmp.js <romfile> Palettes\<Palette File>`, where the `<romfile>` is either the NHLPA93 v1.1 ROM or the NHL94 ROM for Sega Genesis.

It will decompress the ANIM file and you will get a `.raw` (Photoshop RAW), `.json` (additonal image attributes) and a `.bmp` file in the `Extracted` path. If a palette file (included in Palettes path) was specified, it will override the player sprite Palette in extracting frames from ANIM files.

## ANIM data locations (Big Endian)
| Game       | Section                   | Address Range         | Description |
|------------|---------------------------|-----------------------|-------------|
| **NHLPA93** | SPAList                  | `0x4D8E–0x6446`       | Animation Data. Equivalent to Frames.asm from NHL92     |
| **NHLPA93** | Sprite Palettes          | `0x35E50–0x35ED0`     | 128 bytes of Palette Data. 4 palettes of 16 colors (9bpp Sega Genesis Format). Exactly 0x4560 bytes before Sprite Tiles.                                                            |
| **NHLPA93** | Sprite Tiles             | `0x3A3B0–0x6FAF0`     | Raw 8x8 tile data, 4 bits per pixel, 32 bytes per tile. |
| **NHLPA93** | Frame Sprite Data Offsets| `0x6FAF2–0x70006`     | Table of offsets to sprite data for each frame (0x514 bytes).                                                                                                                    |
| **NHLPA93** | Sprite Data Bytes        | `0x70006–0x743FC`     | Sprite attributes for each frame (position, size, tile index, etc.).                                                                                                              |
| **NHLPA93** | Hotlist Table            | `0x743FC–0x74910`     | Hotspot Data.                                           |
| **NHL94**   | SPAList                  | `0x5B1C–0x76B2`       | Animation Data. Equivalent to Frames.asm from NHL92.    |
| **NHL94** | Sprite Palettes            | `0x59924–0x599A4`     | 128 bytes of Palette Data. 4 palettes of 16 colors (9bpp Sega Genesis Format). Exactly 0x4560 bytes before Sprite Tiles.                                                            |
| **NHL94**   | Sprite Tiles             | `0x5DE84–0x9E724`     | Raw 8x8 tile data, 4 bits per pixel, 32 bytes per tile. |
| **NHL94**   | Frame Sprite Data Offsets| `0x9E726–0x9EDC2`     | Table of offsets to sprite data for each frame.         |
| **NHL94**   | Sprite Data              | `0x9EDC2–0xA44C8`     | Sprite attributes for each frame (position, size, tile index, etc.).                                                                                                              |
| **NHL94**   | Hotlist Table            | `0xA44C8–0xA4B54`     | Hotspot Data.                                           |

### `SPAList` Section
| Byte Offset | Value     | Description                                                                         |
|-------------|-----------|-------------                                                                        |
| `0x00–0x01` | `<int16>` | Animation ID or group identifier (e.g., player skating, shooting).                  |
| `0x02–0x03` | `<int16>` | Frame count for the animation sequence.                                             |
| `0x04–0x05` | `<int16>` | Starting frame index in the Frame Sprite Data Offsets table.                        |
| `0x06–0x07` | `<int16>` | Timing/delay (frames per animation step, in VBlank counts).                         |
| `0x08–0x09` | `<int16>` | Loop flag or next animation ID (e.g., 0xFFFF for no loop, or ID of next animation). |

### `Frame Data offsets` Section
| Byte Offset                                     | Value     | Description                                               |
|-------------                                    |-----------|-------------                                              |
| `0x00..0x01`                                    | `<int16>` | Offset to sprite data bytes for this frame, relative to the start of the Sprite Data Bytes section (e.g., `0x70006` for NHLPA93, `0x9EDC2` for NHL94).                                |
| `0x02..0x03`                                    | `<int16>` | Offset to sprite data bytes for this frame, relative to the start of the Sprite Data Bytes section (e.g., `0x70006` for NHLPA93, `0x9EDC2` for NHL94).                                |
| ...                                             | ...       | ...                                                       |
| `0x(NumberOfFrames*2)-2..0x(NumberOfFrames*2)-1`| `<int16>` | Offset to sprite data bytes for this frame, relative to the start of the Sprite Data Bytes section (e.g., `0x70006` for NHLPA93, `0x9EDC2` for NHL94).                                |
*Note*: Number of sprites in each frame can be calculated by `(bytes between each frame offset) / (length of sprite data)`.

### `Sprite Data` Section
| Byte Offset | Value               | Description                                                   |
|-------------|-----------------    |-------------                                                  |
| `0x00–0x01` | `<int16>`           | X Position of sprite within frame                             |
| `0x02–0x03` | `<int16>`           | Y Position of sprite within frame                             |
| `0x04–0x05` | `<int16>`           | Tile Index. Can be multiplied by 32 to find the Tile Offset.  |
| `0x06`      | `<int8>`:`Bit 3`    | Horizontal Flip (`1` = flip horizontally, `0` = normal).      |
| `0x06`      | `<int8>`:`Bit 4`    | Vertical Flip (`1` = flip vertically, `0` = normal).          |
| `0x06`      | `<int8>`:`Bits 5-6` | Palette Index (0–3, selects one of 4 CRAM palettes).          |
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