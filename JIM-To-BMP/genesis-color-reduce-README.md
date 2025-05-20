# Genesis Color Reducer

A standalone tool for converting full-color BMP images to the Sega Genesis/Mega Drive format with hardware-appropriate color limitations.

## Features

- Supports any BMP format (24-bit, 8-bit, 4-bit, 1-bit)
- Uses a quadrant-based approach to split the image into four regions, each with its own 16-color palette
- Multiple balance strategies:
  - `count` - Balances the number of unique colors in each quadrant
  - `entropy` - Balances color complexity/diversity between quadrants
  - `importance` - Balances visual prominence of colors between quadrants
  - `area` - Balances pixel area of each quadrant
- Exports to a structured output folder with:
  - Color-reduced BMP file
  - Comprehensive JSON metadata
  - Individual 8x8 tile BMP files for examination

## Hardware Constraints

The Sega Genesis/Mega Drive has the following color limitations:
- 64 colors on screen at once
- 4 palettes with 16 colors each
- Each 8x8 tile must use only colors from a single palette
- Colors are 9-bit (3 bits each for R, G, B)

## Usage

### Basic Usage

```bash
node genesis-color-reduce.js input.bmp
```

This will process the image with default settings and create an output directory at `build/<filename>-count`.

### Advanced Usage

```bash
node genesis-color-reduce.js input.bmp --balance=entropy --optimize=true --output=./my-output-dir
```

### Options

- `--balance=<count|entropy|importance|area>` - Balance strategy (default: count)
- `--optimize=<true|false>` - Optimize palettes (default: true)
- `--verbose=<true|false>` - Verbosity level (default: true)
- `--output=<directory>` - Custom output directory

## Output Structure

```
build/<filename>-<strategy>/
├── <filename>-reduced.bmp     # Color-reduced BMP image
├── metadata.json              # Full metadata with palettes and statistics
└── tiles/                     # Individual 8x8 tile BMP files
    ├── tile_0_0.bmp
    ├── tile_0_1.bmp
    └── ...
```

## Recommendations

Each balance strategy has different strengths:

- `count` - Best for pixel art with defined regions
- `entropy` - Best overall quality for photos and complex images
- `importance` - Best color accuracy, preserves visually important colors
- `area` - Best when image has uneven distribution of content

## Programmatic Use

You can also use the tool as a module in your own scripts:

```javascript
import { processBmp } from './genesis-color-reduce.js';

const result = processBmp('input.bmp', { 
    balanceStrategy: 'entropy',
    optimizePalettes: true
});

console.log(`Processed file saved to: ${result.bmpOutputPath}`);
```

## Testing

To test the color reducer with different strategies on sample images:

```bash
node test-color-reduce.js
```

## License

This tool is part of the EA-NHL-Tools project and is subject to its licensing terms.
