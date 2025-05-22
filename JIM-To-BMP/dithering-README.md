# BMP 3-Bit Converter with Dithering

This tool converts standard BMP images to the Sega Genesis/Mega Drive 3-bit color space, optionally using dithering to improve visual quality.

## Overview

The Sega Genesis/Mega Drive console uses a 3-bit per channel (9-bit total) color format, meaning each RGB component can only have 8 possible values (0-7). This creates visual banding and color distortion when converting images from higher bit depths.

This tool provides two key features:
1. Simple conversion to 3-bit color space (default)
2. Dithered conversion with customizable source bit depth

## Usage

### Basic Usage (No Dithering)
```
node bmp3bitConverter.js <path-to-bmp-file>
```

### With Dithering
```
node bmp3bitConverter.js <path-to-bmp-file> -dither=<4bit|5bit|6bit|7bit|8bit>
```

## Choosing the Right Dithering Level

The best dithering level depends on your source image and desired visual effect:

- **4bit** or **5bit**: Creates more uniform and structured dithering patterns. This is good for pixel art, retro aesthetics, or when you want the dithering pattern to be more visible and consistent.

- **6bit**: Offers a balanced approach with moderate dithering that works well for most images.

- **7bit** or **8bit**: Creates more subtle and variable dithering that follows the original image details more closely. This works better for photographic images or when you want the dithering to be less noticeable.

When deciding which level to use:
- If the image has solid areas of color with sharp transitions, lower bit depths like 4bit or 5bit often work better
- If the image has subtle gradients or photographic content, higher bit depths like 7bit or 8bit may preserve more details

## How Dithering Works

1. The original image (8-bit per channel) is first quantized to the specified bit depth (4-8 bits)
2. For each pixel and color channel, the tool:
   - Determines the two nearest 3-bit colors that can represent the quantized value
   - Calculates how far between these two colors the original value lies
   - Uses an 8x8 Bayer matrix for ordered dithering to decide which of the two colors to use
   - The Bayer matrix creates a predictable pattern that distributes error evenly across pixels

This approach creates a pattern of alternating pixels that, when viewed from a distance, appears to have a color between the two available 3-bit colors. The technique is particularly effective for gradients and areas with subtle color variations that would otherwise show visible banding.

## Examples

### Simple 3-bit conversion
```
node bmp3bitConverter.js my-image.bmp
```

### 4-bit dithering
```
node bmp3bitConverter.js my-image.bmp -dither=4bit
```

### 8-bit dithering (most color variation)
```
node bmp3bitConverter.js my-image.bmp -dither=8bit
```

### Testing all dithering options
```
node test-dithering.js my-image.bmp
```

## Output

The processed images are saved in a '3bit-converted' subfolder next to the input image, with filenames indicating the processing applied.

Example: 
- Input: `sample.bmp`
- Output: `3bit-converted/sample-3bit.bmp` (no dithering)
- Output: `3bit-converted/sample-3bit-dither6bit.bmp` (with 6-bit dithering)
