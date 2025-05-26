# exJim-to-jim.js

## Overview

This tool rebuilds a binary JIM format file from an "exploded" JIM format directory. It takes the tile BMP files, palettes, and metadata created by the `reduced-to-exJim.js` tool and compiles them into a single binary JIM file that can be used in EA's NHL Hockey games for the Sega Genesis/Mega Drive.

## Purpose

The tool serves as the final step in the image conversion workflow, taking the exploded JIM format (which is easier to work with for editing) and creating the compact binary format used by the game.

## Installation

Before using this tool, you need to install the required dependencies:

```bash
# Navigate to the JIM-Tools directory
cd JIM-Tools

# Install dependencies
npm install
```

This tool requires Node.js version 14.0.0 or higher as it uses ES modules.

## Usage

```bash
node exJim-to-jim.js <path-to-metadata.json>
```

### Example

```bash
node exJim-to-jim.js my-image-reduced_exjim/metadata.json
```

## Input

The tool expects a directory containing:

- **metadata.json**: Contains all necessary information for rebuilding the JIM file
- **tiles/**: A directory containing BMP files for each 8x8 tile
- **0.act, 1.act, 2.act, 3.act**: Adobe Color Table files containing the palettes

## Output

- **rebuilt.jim**: The compiled binary JIM file that can be imported into NHL Hockey games

## How It Works

1. **Read Metadata**: The tool first reads the metadata.json file to get information about the palette offset, map offset, number of tiles, and map data.

2. **Create Output Buffer**: A buffer is allocated with the correct size to hold the entire JIM file.

3. **Write Header**: The tool writes the JIM header (palette offset, map offset, number of tiles).

4. **Write Tile Data**: Each tile BMP file is read and converted to the Genesis 4bpp tile format (4 bits per pixel).

5. **Write Palette Data**: The four ACT palette files are read and converted to the Genesis color format (0000BBB0GGG0RRR0).

6. **Write Map Data**: The map dimensions and tile entries are written to the buffer, including tile index, flip bits, palette index, and priority bit.

7. **Save Output**: The completed buffer is saved as a binary file named "rebuilt.jim".

## Technical Details

### Genesis Color Format
- Each color is stored as 16-bit in the format `0000BBB0GGG0RRR0`
- BBB = 3-bit blue value (0-7)
- GGG = 3-bit green value (0-7)
- RRR = 3-bit red value (0-7)

### Tile Format
- Each tile is 8x8 pixels
- 4 bits per pixel (16 colors)
- Each tile takes 32 bytes (8 rows × 4 bytes per row)

### Map Entry Format
- Each map entry is 16-bit with the following bit layout:
  - Bits 0-10: Tile index (0-2047)
  - Bit 11: Horizontal flip (0=normal, 1=flipped)
  - Bit 12: Vertical flip (0=normal, 1=flipped)
  - Bits 13-14: Palette index (0-3)
  - Bit 15: Priority (0=normal, 1=high)
