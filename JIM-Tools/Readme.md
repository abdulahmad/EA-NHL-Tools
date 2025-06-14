# JIM-Tools - Sega Genesis Image Format Utilities

This folder contains utilities for working with JIM image format files used in EA's NHL Hockey series for the Sega Genesis/Mega Drive. These tools allow you to extract, modify, and rebuild JIM files for game modifications or analysis.

## What is JIM Format?

JIM is a proprietary EA image format used in early Sega Genesis sports titles. The format consists of:

- Tiles (8x8 pixel blocks in 4bpp Genesis format)
- Palettes (Up to 4 palettes with 16 colors each)
- Map data (References to tiles with positioning and attribute information)

## Workflow Overview

### Importing Images into the Game

1. **Color Conversion** (`bmp3bitConverter.js`):  
   Convert a 24-bit color BMP to one with Sega Genesis color limitations (3 bits per RGB channel)

2. **Color Reduction** (`genesis-color-reduce.js`):  
   Split image into sections and reduce to 4 palettes of 16 colors each

3. **Create Exploded JIM** (`reduced-to-exJim.js`):  
   Convert the color-reduced image to exploded JIM format (metadata and individual tiles)

4. **Rebuild JIM** (`exJim-to-jim.js`):  
   Compile the exploded JIM format into a single binary JIM file for use in the game

### Extracting Images from the Game

1. **Extract JIM** (`extract-jim.js`):  
   Extract a JIM file into exploded JIM format (metadata and individual files)

2. You can then modify the tiles, palettes, or map data and rebuild the JIM file

## Tools Reference

- [bmp3bitConverter.js](./bmp3bitConverter.md) - Convert 24-bit BMP to Genesis color space
- [genesis-color-reduce.js](./genesis-color-reduce.md) - Reduce BMP to 4 palettes of 16 colors
- [reduced-to-exJim.js](./reduced-to-exJim.md) - Convert reduced image to exploded JIM format
- [exJim-to-jim.js](./exJim-to-jim.md) - Rebuild JIM file from exploded format
- [extract-jim.js](./extract-jim.md) - Extract JIM file to exploded format

## Installation

Before using these tools, you need to install the required dependencies:

```bash
# Navigate to the JIM-Tools directory
cd JIM-Tools

# Install dependencies
npm install
```

The tools require Node.js and use ES modules. Make sure you have Node.js version 14.0.0 or higher installed.

## Example Workflow

```bash
# Install dependencies first
npm install

# Convert full-color BMP to Genesis color space
node bmp3bitConverter.js input.bmp

# Reduce colors and split into 4 palettes
node genesis-color-reduce.js input_3bit.bmp

# Convert to exploded JIM format
node reduced-to-exJim.js input_3bit_reduced/metadata.json

# Rebuild JIM file
node exJim-to-jim.js input_3bit_reduced_exjim/metadata.json
```

The final output will be a `rebuilt.jim` file that can be imported into the game.

## NHL92-94 .map.jim file details (Big Endian)
| Byte (All values in hexadecimal)                    | Value         | Description                                              |
| --------                                            | -------       | -------                                                  |
| `0x00..0x03`                                        | `<uint32>`    | Palette Section Offset                                   |
| `0x04..0x07`                                        | `<uint32>`    | Map Section Offset                                       |
| `0x08..0x09`                                        | `<uint16>`    | Number of Tiles/Stamps                                   |
| `0x0A..0x0A+numTiles*32`                            | `Tile Data`   | Raw 8x8 tile data, 4 bits per pixel, 32 bytes per tile.  |
| `0xPaletteSectionOffset..0xPaletteSectionOffset+80` | `Palette Data`| 128 bytes of Palette Data. 4 palettes of 16 colors. Each color is 2 bytes in Genesis format (0000BBB0GGG0RRR0, where BBB=Blue bits, GGG=Green bits, RRR=Red bits).                                         |
| `0xMapSectionOffset..0xMapSectionOffset+1`          | `<uint16>`    | Map Width                                                |
| `0xMapSectionOffset+2..0xMapSectionOffset+3`        | `<uint16>`    | Map Height                                               |
| `0xMapSectionOffset+4..0x(MapSectionOffset+4)+(mapWidth*mapHeight*2)` | `Map Data Section`| Map Data                           |

### Map Data Section
| Byte (All values in hex) | Value                | Description                                          |
| --------                 | -------              | -------                                              |
| `0x00..0x01`             | `<uint16>:Bits 0-10` | Tile Index                                           |
| `0x00..0x01`             | `<uint16>:Bit 11`    | Horizontal flip                                      |
| `0x00..0x01`             | `<uint16>:Bit 12`    | Vertical flip                                        |
| `0x00..0x01`             | `<uint16>:Bit 13-14` | Palette Index (0–3, selects one of 4 CRAM palettes). |
| `0x00..0x01`             | `<uint16>:Bit 15`    | Priority (0=low, 1=high)                             |

NHLPA93 introduced a variant of the JIM image format which has compressed tiles.

## NHL93-94 .map.jzip file details (Big Endian)
| Byte (All values in hexadecimal)                    | Value         | Description                                              |
| --------                                            | -------       | -------                                                  |
| `0x00..0x03`                                        | `<uint32>`    | Palette Section Offset                                   |
| `0x04..0x07`                                        | `<uint32>`    | Map Section Offset                                       |
| `0x08`                                              | `<uint8>`     | Palette Size                                             |
| `0x09`                                              | `<uint8>`     | Number of Tiles/Stamps                                   |
| `0x0A..0xPaletteSectionOffset-1`                      | `Compressed Tile Data` | Compressed tile data. Uses combination of Run Length Encoding, Pattern Repeat, and back reference schemes for compression. When uncompressed, this is raw 8x8 tile data, 4 bits per pixel, 32 bytes per tile.  |
| `0xPaletteSectionOffset..0xPaletteSectionOffset+PaletteSize` | `Palette Data`| Typically 128 bytes of Palette Data. 4 palettes of 16 colors. Each color is 2 bytes in Genesis format (0000BBB0GGG0RRR0, where BBB=Blue bits, GGG=Green bits, RRR=Red bits). |
| `0xMapSectionOffset..0xMapSectionOffset+1`          | `<uint16>`      | Map Width                                              |
| `0xMapSectionOffset+2..0xMapSectionOffset+3`        | `<uint16>`      | Map Height                                             |
| `0xMapSectionOffset+4..0x(MapSectionOffset+4)+(mapWidth*mapHeight*2)` | `Map Data Section`| Map Data                           |

### Compressed Tile Section
| Command | Format                                                        | Description                             | 
| ------- | ------                                                        | -----------                             |
| `0x0`     | `0x0 <4bit: numBytes> <byte 0> <byte 1> .. <byte numBytes>` | Write next `n` bytes to Output          |
| `0x3`     | `0x3 <4bit: numBytes> <repeated byte>`                      | Write next byte `n+3` times to output   | 
| `0x8`     | `0x8 <4bit: numBytes> <count>`                              | Undefined                               | 
| `0x9`     | `0x9 <4bit: numBytes> <count>`                              | Undefined                               | 
| `0x5`     | `0x5 <2bit: numBytes> <2bit: count>`                        | Undefined                               | 
| `0xC`     | `0xC <4bit: numBytes>                                       | Undefined                               | 

### Map Data Section
| Byte (All values in hex) | Value                | Description                                          |
| --------                 | -------              | -------                                              |
| `0x00..0x01`             | `<uint16>:Bits 0-10` | Tile Index                                           |
| `0x00..0x01`             | `<uint16>:Bit 11`    | Horizontal flip                                      |
| `0x00..0x01`             | `<uint16>:Bit 12`    | Vertical flip                                        |
| `0x00..0x01`             | `<uint16>:Bit 13-14` | Palette Index (0–3, selects one of 4 CRAM palettes). |
| `0x00..0x01`             | `<uint16>:Bit 15`    | Priority (0=low, 1=high)                             |