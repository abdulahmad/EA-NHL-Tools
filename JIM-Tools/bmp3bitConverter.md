# bmp3bitConverter.js

## Overview

This tool converts 24-bit color BMP images to the Sega Genesis/Mega Drive color space (3 bits per RGB channel). The Genesis can only display colors with 3 bits each for red, green, and blue (resulting in 512 possible colors). This tool helps prepare images for use with the Genesis hardware by simulating this color limitation.

## Purpose

The Sega Genesis uses a palette system with only 3-bits per color channel (RGB). This means each
channel can only have 8 possible values (0-7) instead of the 256 values (0-255) in typical 8-bit
color channels. This script prepares images for the Genesis color space before further processing.

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

- Converts 24-bit BMP images to Genesis-compatible color depth (3 bits per channel)
- Multiple dithering options to improve visual quality:
  - Pattern dithering (using Bayer matrix)
  - Error diffusion dithering (Floyd-Steinberg algorithm)
  - Noise dithering
- Configurable dithering bit depth for intermediate processing
- Control over dithering strength

## Usage

```bash
node bmp3bitConverter.js <path-to-bmp-file> [options]
```

### Options

- `-dither=<4bit|5bit|6bit|7bit|8bit>` - Apply dithering with specified bit depth
- `-method=<pattern|diffusion|noise>` - Dithering method (default: pattern)
- `-strength=<value>` - Dithering strength/amount:
  - For diffusion: 0.1-2.0, default: 1.0
  - For noise: 0.1-1.0, default: 0.5

### Examples

```bash
# Basic conversion (no dithering)
node bmp3bitConverter.js my_image.bmp

# Apply pattern dithering with 5-bit intermediate depth
node bmp3bitConverter.js my_image.bmp -dither=5bit -method=pattern

# Apply error diffusion dithering with high strength
node bmp3bitConverter.js my_image.bmp -dither=6bit -method=diffusion -strength=1.5

# Apply noise dithering with low strength
node bmp3bitConverter.js my_image.bmp -dither=5bit -method=noise -strength=0.3
```

## Output

The tool creates a new BMP file with "_3bit" appended to the filename. The output image will have colors that accurately represent how they would appear on a Sega Genesis/Mega Drive system.

## How It Works

1. The tool reads the source BMP file
2. Converts all RGB colors to the Genesis color space (3 bits per channel)
3. If dithering is enabled:
   - For pattern dithering: Uses a Bayer matrix to create a pattern that simulates additional colors
   - For error diffusion: Uses the Floyd-Steinberg algorithm to spread the quantization error to neighboring pixels
   - For noise dithering: Adds controlled random noise to break up banding
4. Saves the output BMP with the Genesis-compatible colors

## Technical Details

- Genesis colors use the format `0000BBB0GGG0RRR0` (16-bit)
- Each color channel (R, G, B) is limited to 3 bits (values 0-7)
- The tool uses the scaling factor of 252/7 for proper color conversion (252 is the maximum value that can be represented by 3 bits when scaled to 8 bits)

## Next Steps

After running this tool, the next step in the workflow is to run `genesis-color-reduce.js` on the output file to reduce the image to the 4 palettes of 16 colors required by the Genesis hardware.
