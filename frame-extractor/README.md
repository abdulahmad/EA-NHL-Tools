# NHL95 Frame Data Extractor

This tool extracts sprite frame data from NHL95 Sega Genesis ROM files. It follows the logic of the `addframe2` function found in the game's assembly code.

## Background

In NHL95, sprite frames are stored in a structured format:
- Each frame has a pointer in a frame table at address `0xCA56A`
- Frames contain multiple sprites with attributes like position, size, and tile index
- Sprites are rendered using the Sega Genesis VDP (Video Display Processor)

This script parses that data structure and provides a human-readable output of the frame contents.

## Installation

No special installation is required beyond having Node.js installed on your system.

1. Make sure you have [Node.js](https://nodejs.org/) installed (version 12 or later recommended)
2. Clone or download this repository
3. Navigate to the directory containing the script

## Usage

```
node extractFrame.js <rom_file> <frame_number>
```

Where:
- `<rom_file>` is the path to your NHL95 ROM file
- `<frame_number>` is the frame number you want to extract (positive integer)

## Example

```
node extractFrame.js "NHL 95 (UE) [!].bin" 42
```

## Output Example

The script will output information about the frame and each sprite contained within it:

```
Reading ROM file: NHL 95 (UE) [!].bin
Extracting data for frame 42 (0x002A)
Frame pointer found at 0x0CA622: 0x0CABC4
Number of sprites in frame: 3

Sprite 1/3:
  Y Offset: 0 (0x0000)
  X Offset: 0 (0x0000)
  Size/Format: 0x0F
    Width: 32 pixels (4 tiles)
    Height: 32 pixels (4 tiles)
  Tile Index: 128 (0x0080)
  Tile Count: 16
  Attributes: 0x0000

Sprite 2/3:
  ...
```

## Notes

- This script assumes a standard NHL95 ROM with no modifications to the frame data structure
- Frame numbers start at 1 (as used in the game's code)
- The tool interprets data directly from the ROM based on known memory addresses

## Credits

This tool was created based on the disassembly of NHL95's video rendering code.
