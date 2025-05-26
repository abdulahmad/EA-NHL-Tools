# extract-jim.js

## Overview

This tool extracts a binary JIM format file from EA's NHL Hockey games for the Sega Genesis/Mega Drive into an "exploded" format. The exploded format makes it easier to view, edit, and understand the image components.

## Purpose

JIM files contain tile-based graphics used in NHL Hockey games. This tool allows you to:
1. Extract the individual tiles as BMP files
2. Extract the palettes as ACT (Adobe Color Table) files
3. Create a full composite image of the entire graphic
4. Generate a detailed metadata file with all information about the JIM file

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
node extract-jim.js <path-to-jim-file>
```

### Example

```bash
node extract-jim.js path/to/mygraphic.jim
```

## Output

The tool creates a directory structure under `Extracted/<filename>/` containing:

- **tiles/**: A directory containing all the individual 8x8 tile images as BMP files
  - Each tile is saved as a numbered BMP file (0000.bmp, 0001.bmp, etc.)

- **0.act, 1.act, 2.act, 3.act**: Adobe Color Table files containing the four palettes
- **combined.act**: A combined palette file containing all colors from all four palettes

- **full_map.bmp**: A composite image showing the entire graphic as it would appear in the game

- **metadata.json**: A JSON file containing detailed information about the JIM file:
  - Palette offset
  - Map offset
  - Number of tiles
  - Map width and height
  - Complete map data (tile references with attributes)

## How It Works

1. **Analyze JIM Header**: Reads the JIM file header to find the palette offset, map offset, and number of tiles.

2. **Extract Tiles**: Decodes each 8x8 tile from the binary format and saves it as a BMP file.

3. **Extract Palettes**: Extracts the four 16-color palettes and converts them from the Genesis color format to RGB.

4. **Read Map Data**: Parses the map data to understand how tiles are arranged and which attributes are applied.

5. **Compose Full Image**: Creates a complete image by arranging the tiles according to the map data.

6. **Save Metadata**: Generates a comprehensive metadata file that can be used to rebuild the JIM file after editing.

## Technical Details

### Detecting Data Sections
The tool uses intelligent analysis to detect the actual data section boundaries in the file, even if the header information is not completely accurate.

### Genesis Color Conversion
Genesis colors are stored as 16-bit values in the format `0000BBB0GGG0RRR0`. The tool converts these to standard RGB values for viewing and editing.

### Map Data Interpretation
Each map entry is decoded to extract:
- Tile index
- Horizontal and vertical flip flags
- Palette index
- Priority bit

## Next Steps

After extracting a JIM file, you can:
1. Edit the individual tile BMP files
2. Modify the palette ACT files
3. Update the metadata JSON if needed
4. Use `exJim-to-jim.js` to rebuild the JIM file with your changes
