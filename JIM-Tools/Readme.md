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

## Testing

This project includes comprehensive tests for the decompression algorithms. The tests use Vitest for fast and reliable testing.

### Running Tests

```bash
# Run tests once
npm run test:run

# Run tests in watch mode (re-runs on file changes)
npm test

# Run tests with UI (opens a web interface)
npm run test:ui
```

### Test Coverage

The test suite covers:
- All decompression command types (0x0, 0x3, 0x5, 0x8, 0x9, 0xC)
- Edge cases and boundary conditions  
- Error handling for malformed data
- Command parsing and parameter extraction
- Back reference algorithms including overlapping copies

Tests are located in `uncompress-jim.test.js` and can be run individually:

```bash
npx vitest uncompress-jim.test.js
```

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
| `0x0A..0xPaletteSectionOffset-1`                    | `Compressed Tile Data` | Compressed tile data. Uses combination of Run Length Encoding, Pattern Repeat, and back reference schemes for compression. When uncompressed, this is raw 8x8 tile data, 4 bits per pixel, 32 bytes per tile.  |
| `0xPaletteSectionOffset..0xPaletteSectionOffset+PaletteSize` | `Palette Data`| Typically 128 bytes of Palette Data. 4 palettes of 16 colors. Each color is 2 bytes in Genesis format (0000BBB0GGG0RRR0, where BBB=Blue bits, GGG=Green bits, RRR=Red bits).                   |
| `0xMapSectionOffset..0xMapSectionOffset+1`          | `<uint16>`      | Map Width                                              |
| `0xMapSectionOffset+2..0xMapSectionOffset+3`        | `<uint16>`      | Map Height                                             |
| `0xMapSectionOffset+4..0x(MapSectionOffset+4)+(mapWidth*mapHeight*2)` | `Map Data Section`| Map Data                           |
| `0xMapSectionEnd+1..0xMapSectionEnd+5`              | `FF FF FF FF`   | End of compressed file marker                          |

### Compressed Tile Section

The JZIP compression algorithm uses a variety of commands to efficiently compress tile data. Each command is encoded as a single byte where the upper 4 bits specify the command type and the lower 4 bits contain parameters.

#### Command Structure
```
Command Byte: CCCCPPPP
- CCCC: 4-bit command type (0x0-0xF)  
- PPPP: 4-bit parameter value (0x0-0xF)
```

#### Decompression Algorithm

The decompressor maintains an output buffer and current position. Commands are processed sequentially, with some commands requiring additional bytes following the command byte.

#### Command Types

| Command | Format | Description | Algorithm | Confidence in Implmentation |
| ------- | ------ | ----------- | --------- | --------------------------- |
| **0x0 - Literal Copy** | `0x0P <P+1 bytes>` | Copy next P+1 literal bytes to output | Directly copies bytes to output buffer | 100% |
| **0x1 - Extended Literal Copy** | `0x1P <P+17 bytes>` | Copy next P+17 literal bytes to output | Extended version of literal copy for larger blocks | 100% |
| **0x3 - Run Length Encoding (RLE)** | `0x3P <byte>` | Repeat byte P+3 times | Creates array of repeated byte and writes to output | 100% |
| **0x4 - Short Back Reference** | `0x4P` | Copy from recent output using bit manipulation | `offset = (P>>2) == 0 ? 1 : (P>>2)`, `count = (P == 4 ? 4 : (P&0x3)) + 2`, uses pattern repeat | 95% |
| **0x5 - Pattern Repeat** | `0x5P` | Repeat recent pattern with computed parameters | `offset = 3 + ((P>>3) & 1)`, `count = 2 + (P & 7)`, uses pattern repeat | 100% |
| **0x6 - Back Reference with Offset** | `0x6P` | Copy from output with calculated offset | `offset = (P == 0 ? 1 : (P>>2)) + 2`, `count = (P&0x3) + 2`, uses forward back reference | 50% - will break in some cases |
| **0x7 - Pattern Back Reference (2-bit params) ** | `0x7P` | Pattern repeat with bit-split parameters | `offset = ((P>>3) & 0x1) + 7`, `count = (P & 0x7) + 2`, uses pattern repeat | 90% |
| **0x8 - Pattern Back Reference (4-bit params) ** | `0x8P <offset>` | Repeat pattern from back reference | Takes offset byte, repeats last `offset` bytes `P+3` times using pattern repeat | 100% |
| **0x9 - Signed Offset Back Reference** | `0x9P <signed_offset>` | Back reference with signed offset | Converts unsigned byte to signed, count varies by parameter (20-34 range), uses pattern repeat | 5% - extremely hardcoded currently |
| **0xA - Variable Pattern Reference** | `0xAP <params>` | Pattern reference with variable parameters | `offset = P + 1`, `count = ((params>>4) & 0xF) * offset`, uses pattern repeat | 50% - needs more uses to confirm |
| **0xC - Fixed Offset Backwards Back Reference** | `0xCP` | Back reference with fixed calculation | `offset = ((P>>2) & 0x3) + 1`, `count = (P&0x3) + 2`, uses backward back reference | 100% |
| **0xD - Extended Fixed Backwards Back Reference** | `0xDP` | Extended version of fixed back reference | `offset = (P & 0x3) + 4`, `count = ((P>>2) & 0x3) + 3`, uses backward back reference | 70% - needs more uses to confirm |
| **0xE - Extended Backwards Back Reference** | `0xEP <offset>` | Extended back reference with byte offset | Takes offset byte, `count = P + 3`, uses backward back reference | 80% - needs more uses to confirm |

#### Back Reference Types

The algorithm uses three different back reference mechanisms:

1. **Forward Back Reference** (`copyBackReference`): 
   - Copies bytes from `position - offset + i` for each byte
   - Used for non-overlapping copies where source is before current position
   - Used by commands 0x6

2. **Backward Back Reference** (`copyBackReferenceBackwards`):
   - Copies bytes from `position - offset - i` for each byte  
   - Used for copying in reverse order
   - Used by commands 0xC, 0xD, 0xE

3. **Pattern Repeat** (`repeatPattern`):
   - Extracts a pattern of `offset` bytes from recent output
   - Repeats this pattern to generate `count` total bytes
   - Handles cases where count > pattern length by cycling through pattern
   - Used by commands 0x4, 0x5, 0x7, 0x8, 0x9, 0xA

#### Signed Byte Conversion (Command 0x9)

Command 0x9 uses a modified signed offset calculation:
```javascript
// Special handling - not standard signed conversion
const signedAdditionalBytes = additionalBytes[0] > 127 ? (additionalBytes[0] - 128) : additionalBytes[0];
const backRefOffsetAlt = signedAdditionalBytes + 1;
```

#### Command Implementation Notes

- **Commands 0x4, 0x5, 0x7**: Use no additional bytes, all parameters encoded in command byte
- **Commands 0x3, 0x8, 0x9, 0xA, 0xE**: Require 1 additional byte
- **Commands 0x0, 0x1**: Require P+1 and P+17 additional bytes respectively
- **Commands 0x6, 0xC, 0xD**: Use no additional bytes, parameters encoded in command byte

#### Error Handling

The decompressor includes bounds checking to prevent:
- Reading beyond input data
- Back references to invalid positions
- Buffer overflows during decompression

Common errors:
- "Back reference out of bounds" - attempting to copy from invalid source position
- "Not enough bytes" - insufficient input data for command requirements

#### Decompression Process

1. **Header Parsing**: Extract palette offset, map offset, and tile count
2. **Command Processing**: Read command bytes sequentially and decode
3. **Buffer Management**: Maintain output buffer with position tracking
4. **Validation**: Check bounds and data integrity during decompression
5. **Output Generation**: Combine decompressed tiles with palette and map data

The algorithm achieves compression by:
- **RLE**: Eliminating repeated byte sequences
- **Back References**: Reusing previously output data patterns
- **Pattern Repetition**: Efficiently encoding recurring tile patterns
- **Literal Copying**: Handling unique data that doesn't compress well

This multi-faceted approach allows the JZIP format to achieve significant compression ratios on tile-based graphics data while maintaining fast decompression speeds suitable for real-time game use.
