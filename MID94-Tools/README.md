# NHL 94 Music Extractor

This tool extracts music from NHL 94 ROM files and converts it to standard MIDI format for playback or editing.

## Overview

NHL 94 for the Sega Genesis/Mega Drive uses a custom MIDI-like format for its music data. This tool allows you to:

1. Extract music data from NHL 94 ROM files
2. Convert it to standard MIDI format
3. Customize instruments to experiment with different sounds
4. Adjust timing to fix speed issues between different channels
5. Create your own music for NHL 94 (with the help of a MIDI editor)

## Installation

```bash
npm install
```

## Usage

```bash
node mid94-to-midi.js [options] <romFile> [outputFile]
```

### Arguments

- `romFile`: Path to the NHL '94 ROM file (required)
- `outputFile`: Path to the output MIDI file (default: `<romFile-basename>_theme.mid`)

### Options

- `--help, -h`: Show help message
- `--offset, -o`: Specify custom ROM offset for music data (default: 0x4507A)
- `--footer, -f`: Specify custom footer offset (default: 0x46D82)
- `--instrument, -i`: Change instrument for a channel (format: channel:instrument, e.g., 0:0x0B)
- `--timing-factor, -t`: Adjust timing factor for a channel (format: channel:factor, e.g., 1:0.5)
- `--list-instruments, -l`: List known instruments
- `--verbose, -v`: Enable verbose output

### Examples

```bash
# Basic extraction of NHL 94 theme music
node mid94-to-midi.js nhl94.bin

# Save output to a custom filename
node mid94-to-midi.js nhl94.bin custom_output.mid

# Extract music from a custom offset
node mid94-to-midi.js --offset 0x45000 nhl94.bin

# Specify both custom offset and footer
node mid94-to-midi.js -o 0x45000 -f 0x46D00 nhl94.bin output.mid

# Use custom instruments for different channels
node mid94-to-midi.js -i 0:0x0C -i 1:0x09 nhl94.bin custom_instruments.mid

# Fix timing issues (make channel 1 play at half speed)
node mid94-to-midi.js -t 1:0.5 nhl94.bin fixed_timing.mid

# List available instruments
node mid94-to-midi.js --list-instruments
```

## Music Format in NHL 94

Based on forum research, NHL 94 music uses a format similar to MIDI with a few key differences:

1. Data is organized in 4-byte chunks:
   - Byte 1: Timing value
   - Byte 2: Status byte (0x90 = note on, 0x80 = note off + channel number)
   - Byte 3: Pitch value
   - Byte 4: Velocity/duration

2. Channel numbers are encoded in the status byte:
   - 0x90 = Channel 0 note on
   - 0x91 = Channel 1 note on
   - 0x80 = Channel 0 note off
   - 0x81 = Channel 1 note off

3. The music begins with a short initialization section that sets up instruments:
   - C0 0B = Set channel 0 to instrument 0x0B (Music Box/Chorus Synth)
   - C1 08 = Set channel 1 to instrument 0x08 (Clavinet/Brassy Sound)

4. Music data ends with a 10-byte footer that handles looping

### Known Instruments

NHL 94 uses a custom sound bank. Some identified instruments include:

- 0x0B: Music Box/Chorus Synth
- 0x08: Clavinet/Brassy Sound
- 0x04: Honky-tonk Piano
- 0x03, 0x04: Organ sounds
- 0x14: "Finger plucking a rubber band" sound
- 0x18: Sitar-like sound

### Channel Configuration

The default channel configuration in NHL 94 assigns specific instruments and timing factors to each channel:

| Channel | Instrument | Name | Timing Factor |
|---------|------------|------|--------------|
| 0 | 0x0B | Music Box | 1.0 |
| 1 | 0x08 | Clavinet | 0.5 |
| 2 | 0x04 | Honky-tonk Piano | 1.0 |
| 3 | 0x0B | Music Box | 1.0 |
| 6 | 0x08 | Clavinet | 1.0 |
| 7 | 0x0B | Music Box | 1.0 |

## Troubleshooting

### Different Channels Playing at Different Speeds

If one instrument (typically bass) plays at normal speed while others play at twice the speed, try adjusting the timing factors for each channel. The default configuration sets channel 1 (often used for bass) to a timing factor of 0.5 (half speed), as this was observed in the original NHL 94 music.

Example:
```bash
# Make channel 1 play at half speed
node mid94-to-midi.js -t 1:0.5 nhl94.bin fixed_timing.mid
```

You can experiment with different timing factors to get the right sound:
- 1.0 = Normal speed
- 0.5 = Half speed (slower)
- 2.0 = Double speed (faster)

## Creating Custom Music

To create custom music for NHL 94:

1. Extract an existing song to MIDI
2. Edit the MIDI file with a MIDI editor (like [LMMS](https://lmms.io/), [MuseScore](https://musescore.org/), etc.)
3. Convert back to NHL 94 format using the midi-to-nhl94.js tool

```bash
# Basic conversion
node midi-to-nhl94.js song.mid nhl94.bin

# Apply timing factors (to maintain correct speeds from your MIDI file)
node midi-to-nhl94.js --timing-factor 1:0.5 song.mid nhl94.bin

# Use a custom target offset in the ROM
node midi-to-nhl94.js --offset 0x45000 song.mid nhl94.bin

# Extract footer from original ROM for proper looping
node midi-to-nhl94.js --footer nhl94retail.bin song.mid nhl94.bin
```

> **Note**: The `midi-to-nhl94.js` tool now supports timing factors just like the extraction tool. If you used timing factors during extraction (e.g., `-t 1:0.5`), use the same values when converting back for consistent results.

## Advanced Tools

### Timing Analysis

NHL 94 music can have different channels playing at different speeds. This package includes tools to help diagnose and fix timing issues:

#### 1. Analyze MIDI Files

The `analyze-midi.js` script analyzes a MIDI file to identify potential bass channels and suggest appropriate timing factors:

```bash
# Analyze a MIDI file
npm run analyze -- output.mid

# Or directly:
node analyze-midi.js output.mid
```

The analyzer will suggest commands with timing factors to try based on the analysis of the note patterns.

#### 2. Generate Test Files with Different Timing Factors

The `test-timing-factors.js` script generates multiple MIDI files with different timing factors to help identify the correct settings:

```bash
# Generate test files using the default ROM
npm run test-timing

# Or with a specific ROM:
node test-timing-factors.js path/to/nhl94.bin
```

This will create a `timing_tests` directory with multiple MIDI files using different timing factors for each channel. Listen to them to find the most natural-sounding combination.

### Instrument Mapping

NHL 94 uses a custom sound bank with unique instruments. These tools help discover and document the available sounds:

#### 1. Map Instruments

The `map_instruments.js` script generates reference files for all available NHL 94 instruments:

```bash
# Generate reference files for instruments 0x00-0x1F
npm run map-instruments

# Test a wider range of instruments
node map_instruments.js --start 0x00 --end 0xFF

# Generate individual files instead of a batch file
node map_instruments.js --mode individual
```

This creates a set of MIDI files and a markdown reference document in the `instrument_samples` directory.

#### 2. List Known Instruments

```bash
# List known instruments and their channel assignments
npm run list-instruments
```

### Footer Analysis

The footer in NHL 94 music data controls how the music loops. The `extract_footer.js` tool helps analyze and extract this data:

```bash
# Extract footer from default ROM
npm run extract-footer

# Extract from a custom ROM at a specific offset
node extract_footer.js --rom custom_rom.bin --offset 0x46D00

# Scan a ROM to find potential footer locations
node extract_footer.js --scan
```

## NPM Scripts

This package includes several npm scripts for convenience:

```bash
# Extract music from an NHL 94 ROM
npm run extract -- nhl94.bin output.mid

# Convert a MIDI file to NHL 94 format
npm run convert -- input.mid nhl94.bin

# List available instruments
npm run list-instruments

# Analyze a MIDI file for timing issues
npm run analyze -- output.mid

# Generate test files with different timing factors
npm run test-timing -- nhl94.bin

# Map and document NHL 94 instruments
npm run map-instruments

# Extract and analyze music footer data
npm run extract-footer
```

## Credits

This tool is based on research by Asher413, smozoma, Drezz, and others from the NHL 94 community.

## License

MIT
