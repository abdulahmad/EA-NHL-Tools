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

## ANIM data locations (Big Endian)
| Game       | Section                     | Address Range         | Description |
|------------|-----------------------------|-----------------------|-------------|
| **NHLPA93** | SPAList                    | `0x4D8E–0x6446`       | Unknown list, possibly sprite animation metadata (not covered here). |
| **NHLPA93** | Sprite Tiles               | `0x3A3B0–0x6FAF0`     | Raw 8x8 tile data, 4 bits per pixel, 32 bytes per tile. |
| **NHLPA93** | Frame Sprite Data Offsets  | `0x6FAF0–0x70006`     | Table of offsets to sprite data for each frame (0x514 bytes). |
| **NHLPA93** | Sprite Data Bytes          | `0x70006–0x743FC`     | Sprite attributes for each frame (position, size, tile index, etc.). |
| **NHLPA93** | Hotlist Table              | `0x743FC–0x74910`     | Unknown table, possibly hotspot data (0x514 bytes, last 10 bytes zero). |
| **NHL94**   | SPAList                    | `0x5B1C–0x76B2`       | Unknown list, possibly sprite animation metadata (not covered here). |
| **NHL94**   | Sprite Tiles               | `0x5DE84–0x9E724`     | Raw 8x8 tile data, 4 bits per pixel, 32 bytes per tile. |
| **NHL94**   | Frame Sprite Data Offsets  | `0x9E724–0x9EDC2`     | Table of offsets to sprite data for each frame (0x69E bytes). |
| **NHL94**   | Sprite Data Bytes          | `0x9EDC2–0xA44C8`     | Sprite attributes for each frame (position, size, tile index, etc.). |
| **NHL94**   | Hotlist Table              | `0xA44C8–0xA4B54`     | Unknown table, possibly hotspot data (0x68C bytes). |

### `SPAList` Section
| Byte Offset | Value           | Description |
|-------------|-----------------|-------------|
| `0x00–0x01` | `<int16>`       | Animation ID or group identifier (e.g., player skating, shooting). |
| `0x02–0x03` | `<int16>`       | Frame count for the animation sequence. |
| `0x04–0x05` | `<int16>`       | Starting frame index in the Frame Sprite Data Offsets table. |
| `0x06–0x07` | `<int16>`       | Timing/delay (frames per animation step, in VBlank counts). |
| `0x08–0x09` | `<int16>`       | Loop flag or next animation ID (e.g., 0xFFFF for no loop, or ID of next animation). |

### `Frame Data offsets` Section
| Byte Offset | Value           | Description |
|-------------|-----------------|-------------|
| `0x00–0x01` | `<int16>`       | Number of sprites in frame - 1 (equivalent to `SprStrNum` in `.anim`). |
| `0x02–0x03` | `<int16>`       | Offset to sprite data bytes for this frame, relative to the start of the Sprite Data Bytes section (e.g., `0x70006` for NHLPA93, `0x9EDC2` for NHL94). |

Note this is the correct definition of Sprite data from chaos:
Sprite tile data bytes (same for 93/94):
Byte 0-1: X Global
Byte 2-3: Y Global
Byte 4-5: Tile offset
Byte   6: Used when setting palette 
Byte   7: Sizetab byte  

### `Sprite Data` Section (incorrect)
| Byte Offset | Value           | Description |
|-------------|-----------------|-------------|
| `0x00–0x01` | `<int16>`       | Y Position of sprite within frame (global Y coordinate). |
| `0x02–0x03` | `<int16>`       | X Position of sprite within frame (global X coordinate). |
| `0x04–0x05` | `<int16>`       | Tile Index (bits 0–10) and flags (bits 11–15). |
| `0x04–0x05` | `Bit 11`        | Horizontal Flip (`1` = flip horizontally, `0` = normal). |
| `0x04–0x05` | `Bit 12`        | Vertical Flip (`1` = flip vertically, `0` = normal). |
| `0x04–0x05` | `Bits 13–14`    | Palette Index (0–3, selects one of 4 CRAM palettes). |
| `0x04–0x05` | `Bit 15`        | Priority (`1` = high, appears in front; `0` = low, appears behind). |
| `0x06`      | `<uint8>`       | Palette-related byte (used when setting palette, possibly for team colors). |
| `0x07`      | `<uint8>`       | Size Index (0–15, references `sizetab` for number of tiles). |

### `Hotlist` Section
| Byte Offset | Value           | Description |
|-------------|-----------------|-------------|
| `0x00–0x01` | `<int16>`       | X Hotspot offset (signed, relative to frame’s origin). |
| `0x02–0x03` | `<int16>`       | Y Hotspot offset (signed, relative to frame’s origin). |

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