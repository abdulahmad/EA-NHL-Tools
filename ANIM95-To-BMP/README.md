# ANIM95-To-BMP v0.1
Exports In-game sprites from NHL95/96/97 Sega Genesis ROM files to Photoshop RAW and Windows BMP format.

There is also a `.json` file saved per Animation Frame, which contains the metadata associated with each Frame. 

Palette is structured similar to how it is stored by the game in Sega Genesis CRAM. The reason is that sprites can have multiple palettes, and the only way to get multi-palette sprites to dislpay correctly would be to use the same palette structure that the game uses.

Unfortunately, the graphics format for NHL 98 for Sega Genesis is wildly different than the other games, so its unsupported, and likely will never be supported.

Note: Only a limited amount of palettes from NHL 95 & 96 are included. NHL 96 palettes are compatible with NHL97 and vice versa.

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
| `0x00–0x01` | `<int16>`           | Y Position of sprite within frame                             |
| `0x02`      | `<uint8>:bit 0-3`   | Size Index (0–15, references `sizetab` for number of tiles).  |
| `0x02`      | `<uint8>:bit 4-7`   | Tile Index High bytes (11-13)                                 |
| `0x04–0x05` | `<uint16>:bit 0-10` | Tile Index Low bytes (0-10)                                   |
| `0x04–0x05` | `<uint16>:bit 11`   | Horizontal Flip. 0=normal, 1=flipped                          |
| `0x04–0x05` | `<uint16>:bit 12`   | Vertical Flip. 0=normal, 1=flipped                            |
| `0x04–0x05` | `<uint16>:bit 13-14`| Palette. 0-3.                                                 |
| `0x04–0x05` | `<uint16>:bit 15`   | Priority. 0=low, 1=high                                       |
| `0x06–0x07` | `<int16>`           | X Position of sprite within frame                             |

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
- Add all 95/96/97 palettes
- Refactor all 3 sprite extractors to be efficient, share code where it can, and be able to extract sprites in a way that can be easily edited and re-imported