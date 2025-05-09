# ANIM94-To-BMP v0.1
Exports In-game sprites from NHLPA93 & NHL94 Sega Genesis ROM files to Photoshop RAW and Windows BMP format.

There is also a `.json` file saved per Animation Frame, which contains the metadata associated with each Frame. 

Palette is structured similar to how it is stored by the game in Sega Genesis CRAM. The reason is that sprites can have multiple palettes, and the only way to get multi-palette sprites to dislpay correctly would be to use the same palette structure that the game uses.

# Usage
1. Ensure you have `node` installed on your machine

2. Run `node animToBmp <animfile>` or `node animToBmp <animfile> Palettes\<Palette File>`. It will decompress the ANIM file and you will get a `.raw` (Photoshop RAW), `.json` (additonal image attributes) and a `.bmp` file in the `Extracted` path. If a palette file (included in Palettes path) was specified, it will override the player sprite Palette in extracting frames from ANIM files.

NHL94 addresses:

$5B1C-$76B2: SPAList
$5DE84-$9E724: Sprite tiles
$9E724-$9EDC2: Frame sprite data offsets ($69E long)
$9EDC2-$A44C8: Sprite data bytes
$A44C8-$A4B54: Hotlist table ($68C long)

NHL93 addresses (v1.1 ROM):
$4D8E-$6446: SPAList
$3A3B0-$6FAF0: Sprite tiles
$6FAF0-$70006: Frame sprite data offsets ($514 long)
$70006-$743FC: Sprite data bytes
$743FC-$74910: Hotlist table ($514 long, last 10 bytes are 0) 

## NHL93 ANIM file locations (Big Endian)
| Address (All values in hexadecimal)              | Value           | Description |
| --------          | -------         | -------     |
| `0x4D8E-6446`         | `<SPAList>`          | zr |
| `0x02-03`         | `<int16>`      | Number of Frames in ANIM file - 1 |
| `0x04-05`         | `<int16>`      | Number of ??? - 1 |
| `0x06-FrameDataEnd`          | `<Frame Data>`  | List of Frames in .ANIM file |
| `0x(FrameDataEnd+1)-(FrameDataEnd+2)`   | `"CC"`          | Character Content (Tile Data) Header |
| `0x(FrameDataEnd+3)-(FrameDataEnd+4)`   | `<int16>`      | Number of Tiles in ANIM file  |
| `0x(FrameDataEnd+5)-(TileDataEnd)`     | `<Sprite Tile Data>`   | 8x8 Tiles, 4 bits per pixel, Column-Major order. In the retail ROM, sprites are grouped together in order of descending height. See `Size Table` Definition Section for Sprite Sizes. Sprites seem to be in opposite order of tileIndex in each size group. |
| `0x(TileDataEnd+1)-(TileDataEnd+2)`   | `"PP"`          | Palette Section Header |
| `0x(TileDataEnd+3)-(TileDataEnd+82)` | `<Palette Data>` | 128 bytes of Palette Data. Unknown as to how this is laid out. Potentially 4 palettes of 16 colors (2 bytes per color, RGB444)-- need to verify |
| `0x(TileDataEnd+83)-(TileDataEnd+84)`| `"DD"`          | Unknown Data Section Header |
| `0x(TileDataEnd+85)-(TileDataEnd+94)`| `<DD Data>` | 16 bytes of Unknown Data |
| `0x(TileDataEnd+95)-(TileDataEnd+96)`| `"ZZ"`          | End of File Footer |

### `Frame Data` Section
| Byte (All values in hexadecimal)              | Value           | Description |
| --------          | -------         | -------     |
| `0x00-01`         | `"SS"`          | Sprite Struct Header |
| `0x02-03`         | `<int16>`      | Unknown Data |
| `0x04-05`         | `<int16>`      | Unknown Data |
| `0x06-07`         | `<int16>`      | Seems to correlate with `Canvas Width * 2` |
| `0x08-09`         | `<int16>`      | Sprite Struct Attributes. Seems to correlate with `Canvas Height * 2` |
| `0x0A-0B`         | `<int16>`      | Sprite Struct Hotspot |
| `0x0C-0D`         | `<int16>`      | Sprite Struct X Hotspot |
| `0x0E-0F`         | `<int16>`      | Sprite Struct Y Hotspot |
| `0x10-17`         | `0x00 0xFF 0x00 0x00 0x00 0x00 0x00 0xFF`      | Padding |
| `0x18-19`         | `<int16>`      | Unknown Data. Potential X Offset |
| `0x1A-1B`         | `<int16>`      | Unknown Data. Potential Y Offset |
| `0x1C-1D`         | `<int16>`      | Unknown Data |
| `0x1E-23`         | `0x00 0x00 0x00 0x00 0x00 0xFF`      | Padding |
| `0x24-25`         | `<int16>`      | Number of Sprites in Frame - 1 |
| `0x26-26+(8*numSpritesinFrame)`          | `<Sprite Data>`  | Each Sprite in frame takes up 8 bytes of Data |

### `Sprite Data` Section
| Byte (All values in hexadecimal)              | Value           | Description |
| --------          | -------         | -------     |
| `0x00-01`         | `<int16>`       | Y Position of Sprite within Frame |
| `0x02-03`         | `<int16>`:`Bits 0-3`      | Size Index (0-15), references `sizetab` for number of tiles, e.g.1,2,4, etc|
| `0x02-03`         | `<int16>`:`Bits 12-15`      | These are `Bits 11-14` of the `tileIndex`  |
| `0x04-05`         | `<int16>`:`Bits 0-10`      | These are `Bits 0-10` of the `tileIndex`|
| `0x04-05`         | `<int16>`:`Bit 11`      | Horizontal Flip (`1` = flip horizontally, `0` = normal). |
| `0x04-05`         | `<int16>`:`Bit 12`      | Vertical Flip (`1` = flip vertically, `0` = normal). |
| `0x04-05`         | `<int16>`:`Bits 13-14`      | Palette Index (0–3, selects one of 4 CRAM palettes). |
| `0x04-05`         | `<int16>`:`Bit 15`      | Priority (`1` = high, appears in front; `0` = low, appears behind). |
| `0x06-07`         | `<int16>`      | X Position of Sprite within Frame |

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
- Update Script to support 92 team specific palettes
- Update Script to extract Sprites from '93
- Update Script to extract Sprites from '94