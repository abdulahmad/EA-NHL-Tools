# genesis-color-reduce.js

## Overview

This tool takes a BMP image and reduces its colors to fit the Sega Genesis/Mega Drive palette restrictions. It divides the image into sections and assigns each section one of 4 palettes, with each palette containing up to 16 colors. This is a key step in preparing images for use in NHL Hockey games for the Sega Genesis.

## Purpose

The Sega Genesis hardware has strict color limitations:
- Only 4 palettes of 16 colors each can be used at once
- Each 8x8 pixel tile must use colors from a single palette

This tool intelligently divides your image into sections, assigns the most appropriate palette to each section, and performs color reduction to fit within these hardware limitations.

## Installation

Before using this tool, you need to install the required dependencies:

```bash
# Navigate to the JIM-Tools directory
cd JIM-Tools

# Install dependencies
npm install
```

This tool requires Node.js version 14.0.0 or higher as it uses ES modules.

## Features

- Handles any BMP format (24-bit, 8-bit, 4-bit, 1-bit)
- Multiple section division strategies (4 or 9 sections)
- Multiple color balancing strategies (count, entropy, importance, area)
- Optimized palette generation
- Dithering options to improve visual quality
- Ability to force specific palettes for certain sections
- Comprehensive metadata-color output for further processing

## Usage

```bash
node genesis-color-reduce.js <input.bmp> [options]
```

### Options

- `--output=<directory>` - Custom output directory
- `--balance=<count|entropy|importance|area>` - Balance strategy (default: count)
- `--optimize=<true|false>` - Optimize palettes (default: true)
- `--palettes=<0,1,2,3>` - Palettes to use (default: all 4)
- `--sections=<4|9>` - Number of sections to split image into (default: 4)
- `--dither=<none|pattern|diffusion|noise>` - Dithering method (default: none)
- `--ditherStrength=<value>` - Dithering strength (0.1-2.0)
- `--verbose=<true|false>` - Verbosity level (default: true)

### Examples

```bash
# Basic usage with default settings
node genesis-color-reduce.js my-image.bmp

# Use 9 sections with entropy balancing
node genesis-color-reduce.js my-image.bmp --sections=9 --balance=entropy

# Enable pattern dithering
node genesis-color-reduce.js my-image.bmp --dither=pattern --ditherStrength=1.0

# Use only palettes 0, 1, and 2
node genesis-color-reduce.js my-image.bmp --palettes=0,1,2
```

## Output

The tool creates a directory with the following structure:

- **my-image-reduced.bmp**: The color-reduced image with all sections combined
- **metadata-color.json**: Detailed information about the reduction process
- **0.act, 1.act, 2.act, 3.act**: Adobe Color Table files for each palette
- **combined.act**: A combined palette with all colors from all palettes

## How It Works

1. **Image Analysis**: The tool analyzes the image and divides it into sections (4 or 9)
   
2. **Color Extraction**: For each section, the dominant colors are extracted
   
3. **Palette Assignment**: Sections are assigned to palettes based on the selected balance strategy:
   - **count**: Balances sections based on the number of colors needed
   - **entropy**: Balances sections based on color complexity
   - **importance**: Balances sections based on visual importance
   - **area**: Balances sections based on pixel area
   
4. **Color Reduction**: Each section's colors are reduced to fit within a 16-color palette
   
5. **Optimization**: If enabled, palettes are optimized to improve color fidelity
   
6. **Dithering**: If enabled, dithering is applied to create the illusion of more colors
   
7. **Output Generation**: The reduced image, palettes, and metadata-color.json are saved

## Next Steps

After running this tool, use `reduced-to-exJim.js` to convert the output to exploded JIM format:

```bash
node reduced-to-exJim.js my-image-reduced/
```
