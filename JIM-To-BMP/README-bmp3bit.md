# BMP 3-Bit Color Converter

This script converts a BMP image to simulate Sega Genesis/Mega Drive 3-bit color limitations.

## What Does This Script Do?

The Sega Genesis uses a palette system with only 3-bits per color channel (RGB). This means each
channel can only have 8 possible values (0-7) instead of the 256 values (0-255) in typical 8-bit
color channels. This script:

1. Takes a BMP image as input
2. Converts each RGB channel from 8-bit to 3-bit color space
3. Converts back to 8-bit for viewing (with the color limitations visible)
4. Saves the result as a new BMP file

This helps you visualize what your image would look like with Genesis color limitations.

## Usage

```
node bmp3bitConverter.js path/to/your/image.bmp
```

The converted image will be saved to a `3bit-converted` folder in the same directory as your
original image, with "-3bit" added to the filename.

## Color Conversion Details

- **8-bit to 3-bit**: Colors are scaled down using the factor `255/7` (approximately 36.43)
- **3-bit to 8-bit**: Colors are scaled back up using the same factor

This ensures consistent color conversion matching the Sega Genesis hardware limitations.

## Supported BMP Formats

- 24-bit BMP (RGB)
- 8-bit indexed color BMP

## Example

Original image colors might look like:
`RGB(128, 192, 233)` → Scaled to 3-bit → `RGB(4, 5, 6)` → Scaled back to 8-bit → `RGB(146, 182, 219)`

The resulting image demonstrates what your graphics would look like with the Genesis color palette
constraints.
