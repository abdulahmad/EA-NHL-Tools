# Jersey Palette Generator for NHL95

This tool generates NHL95 ACT palette files from the jersey definitions in `jerseyDef.js`.

## Files

- `jerseyDef.js` - Jersey color definitions for teams
- `generateJerseyPalette.js` - Main script to generate ACT files
- `applyJerseyPalette.js` - Simple version for Chicago Blackhawks
- `NHL95universaltemplate.act` - Template ACT file

## Usage

### Basic Usage
```bash
node generateJerseyPalette.js
```
This generates a palette for team "0" (Chicago Blackhawks) with default filename.

### Specify Team and Output
```bash
node generateJerseyPalette.js [teamId] [outputName]
```

### Examples
```bash
# Generate Chicago Blackhawks palette
node generateJerseyPalette.js 0

# Generate with custom filename
node generateJerseyPalette.js 0 blackhawks-home

# Show help and available teams
node generateJerseyPalette.js --help
```

## NHL95 Palette Structure

The script maps colors according to the NHL95 palette structure:

- **Colors 0-127**: Rink Palette (unchanged from template)
- **Colors 128-143**: Skin Tones (16 colors)
- **Colors 144-191**: Jersey Components (48 colors)
  - 144-146: forearm (dark, medium, light)
  - 147-149: armStripe3 (light, medium, dark)
  - 150-152: armStripe2 (dark, medium, light)
  - 153-155: armStripe1 (light, medium, dark)
  - 156-158: armUpper (light, medium, dark)
  - 159-163: yolk components (yolkCorner, shoulderPatch, yolk3, yolk1, yolk2)
  - 164-166: jersey (goalieMask, light, medium, dark)
  - 167-169: waist1 (odd, even, hidden)
  - 170-172: waist2 (light, medium, dark)
  - 173-175: waist3 (light, medium, dark)
  - 176-179: pants (dark, pantsStripe2, pantsStripe1, medium)
  - 180-182: socks (light, medium, dark)
  - 183-185: socksStripe1 (light, medium, dark)
  - 186-188: socksStripe2 (light, medium, dark)
  - 189-191: helmet (medium, dark, unused)
- **Colors 192-255**: Crest and Logo Data (64 colors)
  - 4 rows of 16 colors each
  - Each row: 5 crest colors + 6 ice logo + 5 padding

## Jersey Definition Format

The `jerseyDef.js` file contains:

```javascript
const jerseyDef = {
    "global": {
        "palette": {
            // Global color definitions
        },
        "mapping": {
            // Global mappings for skin tones, equipment, etc.
        }
    },
    "0": {
        "name": "Team Name",
        "palette": {
            // Team-specific colors
        },
        "home": {
            // Home uniform color mappings
        },
        "crest": [
            // 20 colors for 5x4 crest grid
        ]
    }
}
```

## Notes

- For v1, all color variants (light/medium/dark) use the same flat color
- Colors are resolved first from team palette, then global palette
- RGB values are specified as "R G B" strings (e.g., "144 0 0")
- Generated ACT files are 768 bytes (256 colors × 3 bytes RGB)
