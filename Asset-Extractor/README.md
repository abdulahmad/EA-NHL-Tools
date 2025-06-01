# NHL Asset Extractor

This directory contains scripts to extract assets from various NHL game ROMs from the Genesis/Mega Drive era.

## Overview

The Asset Extractor tools allow you to extract various game assets from NHL game ROMs including:
- Graphics (sprites, animations, maps)
- Palettes 
- Sound files
- Other binary assets

## Available Extractors

- `extractAssets92.js` - Extracts assets from NHL Hockey (1991/1992)
- `extractAssets95.js` - Extracts assets from NHL 95
- `extractAssets96.js` - Extracts assets from NHL 96
- Additional ROM files are available for other years but extractors are still in development

## Asset Extraction Status

| Game | Status |
|------|--------|
| NHL Hockey (92) | Complete asset list |
| NHL 95 | Partial asset list - only some palettes currently extracted |
| NHL 96 | Partial asset list - only some palettes currently extracted |

## Requirements

- Node.js installed
- Required npm packages:
  - `crc-32` for ROM verification

## Installation

```
npm install
```

## Usage

### Basic Usage

```
node extractAssetsXX.js <path_to_rom_file>
```

Replace `XX` with the game year (92, 95, 96, etc.)

### Examples

```
# Extract NHL 92 assets
node extractAssets92.js nhl92retail.bin

# Extract NHL 95 assets
node extractAssets95.js nhl95retail.bin

# Extract NHL 96 assets
node extractAssets96.js nhl96retail.bin
```

## Output

Extracted assets will be placed in an `Extracted` directory with appropriate subdirectories based on asset type:

```
Extracted/
  NHL92/
    Graphics/
      Pals/
    Sound/
  NHL95/
    Graphics/
      Pals/
    Sound/
  NHL96/
    Graphics/
      Pals/
    Sound/
```

## Notes

- The scripts verify ROM checksums before extraction to ensure the correct ROM is being used
- Future updates will expand the asset lists for NHL 95 and 96
- Additional tools in the EA-NHL-Tools repository can be used to convert the extracted assets to more common formats

## Contributing

If you identify additional assets or have corrections to asset offsets, please consider contributing by:
1. Adding the asset information to the appropriate script
2. Testing the extraction
3. Submitting a pull request

