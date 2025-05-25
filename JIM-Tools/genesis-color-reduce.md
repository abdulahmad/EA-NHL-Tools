# Color Reduction and Jim Format Conversion Tools

This directory contains tools for reducing BMP images to a format suitable for the Sega Genesis/Mega Drive and converting them to the Jim format used in NHL Hockey.

## Tools

### 1. Genesis Color Reducer (`genesis-color-reduce.js`)

This tool takes a BMP image of any format (24-bit, 8-bit, 4-bit, 1-bit) and reduces its colors to fit the Sega Genesis/Mega Drive palette restrictions. It divides the image into sections and assigns each section one of 4 palettes, with each palette containing up to 16 colors.

**Features:**
- Handles any BMP format
- Multiple color reduction algorithms
- Optimized palette generation
- Exports reduced-color BMP
- Saves individual palette files (0.act, 1.act, 2.act, 3.act) and combined palette (combined.act)
- Generates metadata with section and palette information

**Usage:**
```
node genesis-color-reduce.js <input.bmp> [options]
```

**Options:**
- `--output=<directory>` - Custom output directory
- `--balance=<count|entropy|importance|area>` - Balance strategy (default: count)
- `--optimize=<true|false>` - Optimize palettes (default: true)
- `--palettes=<0,1,2,3>` - Palettes to use (default: all 4)
- `--sections=<4|9>` - Number of sections to split image into (default: 4)
- `--verbose=<true|false>` - Verbosity level (default: true)

### 2. Reduced BMP to Jim Converter (`reduced-bmp-to-jim.js`)

This tool takes a BMP image that has been processed by the Genesis Color Reducer and converts it to the component parts needed for the Jim format.

**Features:**
- Processes tiles from the reduced BMP
- Optimizes by detecting duplicate tiles
- Generates map data
- Saves tiles and map data in Jim-compatible format
- Creates metadata for rebuildJim.js compatibility

**Usage:**
```
node reduced-bmp-to-jim.js <input-reduced.bmp> <metadata.json> [options]
```

**Options:**
- `--output=<directory>` - Custom output directory
- `--verbose=<true|false>` - Verbosity level (default: true)

## Workflow

1. **Reduce Colors:**
   ```
   node genesis-color-reduce.js my-image.bmp
   ```
   This will create a directory with the reduced BMP, palette files, and metadata.

2. **Convert to Jim Format:**
   ```
   node reduced-bmp-to-jim.js build/my-image-count-pal0-1-2-3/my-image-reduced.bmp build/my-image-count-pal0-1-2-3/metadata.json
   ```
   This will create a `jimparts` directory with the tile and map data needed for the Jim format.

3. **Rebuild Jim File:**
   Use the existing `rebuildJim.js` script to create a final Jim file from the components.
   ```
   node rebuildJim.js jimparts/my-image
   ```

## File Formats

### Palette Files (.act)
Adobe Color Table format. Each palette contains 16 colors stored as RGB triplets.

### Metadata JSON
Contains information about the source image, section boundaries, palette assignments, and color statistics.

### Tile Data (tiles.bin)
Binary file containing the tile data in planar format compatible with the Sega Genesis.

### Map Data (map.bin)
Binary file containing the map data (tile indices with palette information).

## Jim Format
The Jim format is used in NHL Hockey for storing graphics. It consists of palettes, tile data, and map data describing how tiles are arranged.
