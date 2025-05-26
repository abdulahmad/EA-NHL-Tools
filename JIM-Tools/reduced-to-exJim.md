# reduced-to-exJim.js

## Overview

This tool converts a color-reduced image (processed by `genesis-color-reduce.js`) into an "exploded" JIM format. It takes the color-reduced BMP and its associated metadata and prepares all the necessary files for creating a JIM format file.

## Purpose

After using `genesis-color-reduce.js` to split an image into sections and reduce its colors, this tool:
1. Processes the image tiles (8x8 pixel blocks)
2. Optimizes by detecting duplicate tiles
3. Creates the map data that describes the position and attributes of each tile
4. Saves individual tiles as BMP files
5. Prepares a metadata file that can be used by `exJim-to-jim.js` to build the final JIM file

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
node reduced-to-exJim.js <path-to-directory-with-metadata-color.json>
```

### Example

```bash
node reduced-to-exJim.js my-image-reduced/
```

## Input

- **metadata-color.json**: Contains information about the source image, section boundaries, palette assignments, and color statistics.
- The tool will locate the reduced BMP file based on information in the metadata file.

## Output

The tool creates a new directory with "_exjim" appended to the input directory name, containing:

- **metadata.json**: Contains all necessary information for rebuilding the JIM file, including:
  - Palette offset
  - Map offset
  - Number of tiles
  - Map dimensions
  - Map data (tile indices with attributes)

- **tiles/**: A directory containing all the individual 8x8 tile images as BMP files:
  - Each tile is saved as a numbered BMP file (0000.bmp, 0001.bmp, etc.)
  - Tiles use indexed color mode with the correct palette

- **0.act, 1.act, 2.act, 3.act**: Adobe Color Table files containing the four palettes

## How It Works

1. Reads the metadata-color.json and reduced BMP file
2. Extracts all unique 8x8 pixel tiles from the image
3. Creates map data with tile references and attributes:
   - Tile index (which tile to use)
   - Horizontal/vertical flip flags
   - Palette index (which of the 4 palettes to use)
   - Priority flag
4. Saves all the individual components needed for the JIM format
5. Creates a new metadata file with all the necessary information for `exJim-to-jim.js`

## Next Steps

After running this tool, you can use `exJim-to-jim.js` to compile the exploded JIM format into a single binary JIM file for use in the game:

```bash
node exJim-to-jim.js my-image-reduced_exjim/metadata.json
```
