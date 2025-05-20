# Color Reduction System for Genesis/Mega Drive Graphics

This system is designed to convert full-color BMP images to the Sega Genesis/Mega Drive format with hardware-appropriate color limitations.

## Hardware Constraints

The Sega Genesis/Mega Drive has the following color limitations:
- 64 colors on screen at once
- 4 palettes with 16 colors each
- Each 8x8 tile must use only colors from a single palette

## Components

This system includes several components:

### Core Color Reduction Files
- `colorReduction.js` - Unified interface for all color reduction methods
- `quadrantColorReduce.js` - Quadrant-based approach with several balance strategies
- `colorReduce.js` - Cluster-based approach

### Utility Scripts
- `compareReductionMethods.js` - Compare different algorithms on the same image
- `batchColorReduce.js` - Process multiple files at once
- `bmpToJimWithColorOptimization.js` - Integrate with JIM conversion
- `testColorReduction.js` - Test script for evaluating different parameters

## Reduction Methods

### Quadrant-based Reduction
Divides the image into quadrants and allocates palettes based on different strategies:

- **Count**: Allocates palettes based on the number of unique colors in each quadrant
- **Entropy**: Allocates palettes based on color complexity/diversity
- **Importance**: Allocates palettes based on visual prominence of colors
- **Area**: Allocates palettes based on the area covered by each quadrant

### Cluster-based Reduction
Groups similar colors together using clustering algorithms.

## Command-line Usage

### Basic Color Reduction
```bash
node colorReduction.js input.bmp output.json [options]
```

Options:
- `--method=<cluster|quadrant>` - Method to use (default: quadrant)
- `--balance=<count|entropy|importance|area>` - Balance strategy (default: count)
- `--optimize=<true|false>` - Optimize palettes (default: true)
- `--verbose=<true|false|full>` - Verbosity level (default: true)

### Comparing Methods
```bash
node compareReductionMethods.js input.bmp outputDir
```

This creates multiple outputs with different configurations for comparison.

### Batch Processing
```bash
node batchColorReduce.js inputDir outputDir [options]
```

Options are the same as for basic color reduction.

### Direct BMP to JIM Conversion
```bash
node bmpToJimWithColorOptimization.js input.bmp output.jim [options]
```

Options:
- `--use-reduction=<true|false>` - Use color reduction (default: true)
- `--method=<cluster|quadrant>` - Color reduction method (default: quadrant)
- `--balance=<count|entropy|importance|area>` - Balance strategy (default: count)
- `--optimize=<true|false>` - Optimize palettes (default: true)

## Output Format

The color reduction process produces two output files:
1. A JSON metadata file with palette information and color mappings
2. A reduced-color BMP file with the same base name as the JSON file

The JSON file contains:
- Information about palettes
- Tile assignments
- Color reduction statistics
- Original and reduced color counts

## Recommendations

- **Best overall quality**: quadrant method with entropy balance strategy
- **Fastest processing**: cluster method
- **Best color accuracy**: quadrant method with importance balance strategy
- **Best for pixel art**: quadrant method with count balance strategy

## Integration with Existing Workflows

The color reduction system is designed to integrate seamlessly with existing workflows:

1. **Standalone usage**: Process images individually with `colorReduction.js`
2. **Batch processing**: Process multiple images with `batchColorReduce.js`
3. **Direct conversion**: Use `bmpToJimWithColorOptimization.js` to convert directly to JIM format

## Example Workflow

1. Create or obtain a full-color BMP image
2. Run color reduction: `node colorReduction.js input.bmp output.json --method=quadrant --balance=entropy`
3. Check the resulting reduced BMP file (`input_reduced.bmp`)
4. If needed, adjust parameters and re-run
5. Once satisfied, convert to JIM format: `node bmpToJimWithColorOptimization.js input.bmp output.jim`

## Testing

To run comprehensive tests with all available methods and strategies:

```bash
node testColorReduction.js
```

This will generate test outputs in the `test_output` directory along with a detailed report.
