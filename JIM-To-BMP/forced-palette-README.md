# Forced Palette Feature in genesis-color-reduce.js

This document explains how to use the new forced palette feature in the Genesis Color Reducer tool.

## Overview

The Genesis Color Reducer normally analyzes an image and automatically generates optimized 16-color palettes for the four palette slots available in the Sega Genesis/Mega Drive hardware. With the new forced palette feature, you can now specify external palette files (.ACT format) to be used instead of auto-generated palettes.

This is particularly useful for screens that must use predefined palettes that can't be modified by the game, such as team logos, menu screens with specific color requirements, or any graphics that need to match colors with other game elements.

## Usage

The tool accepts four new command-line arguments, one for each palette slot:

```
node genesis-color-reduce.js <input.bmp> --forcepal0=<file.act> --forcepal1=<file.act> --forcepal2=<file.act> --forcepal3=<file.act>
```

You can specify any combination of these arguments. For example, you might force palettes 0 and 2 while allowing palettes 1 and 3 to be auto-generated based on the image colors.

## .ACT File Format

ACT (Adobe Color Table) is a simple format for storing color palettes:
- Each color is stored as an RGB triplet (3 bytes)
- The tool will read the first 16 colors from the file
- If the file has fewer than 16 colors, the remaining colors will be filled with black

You can create .ACT files using Adobe Photoshop, GIMP, or other image editing tools that support exporting color palettes. You can also use the palettes exported from other images processed with this tool.

## Examples

### Force a single palette:
```
node genesis-color-reduce.js logo.bmp --forcepal0=team-colors.act
```

### Force multiple palettes:
```
node genesis-color-reduce.js screen.bmp --forcepal0=menu.act --forcepal2=icons.act
```

### Combine with other options:
```
node genesis-color-reduce.js screen.bmp --forcepal0=menu.act --optimize=false --palettes=0,1,2
```

## Notes

- When a palette is forced, it will not be modified by the color optimization process, even if `--optimize=true` is specified.
- The metadata JSON will include information about which palettes were forced, which can be useful for documentation and debugging.
- The forced palettes will still be written to the output `.act` files, so you can use them with other tools in the workflow.
