# Jersey Palette Generator for NHL95

This tool generates NHL95 ACT palette files from the jersey definitions in `jerseyDef.js`.

## Files

- `jerseyDef.js` - Jersey color definitions for teams
- `generateJerseyPalette.js` - Main script to generate ACT files
- `applyJerseyPalette.js` - Simple version for Chicago Blackhawks (legacy)
- `NHL95universaltemplate.act` - Template ACT file

## Usage

### Basic Usage
```bash
node generateJerseyPalette.js
```
This generates all jerseys for all teams in jerseyDef.js with default filenames.

### Validate 3-bit Color Compliance
```bash
node generateJerseyPalette.js --validate
```
This validates all colors in `jerseyDef.js` to ensure they use only valid 3-bit RGB values.

### Generate Specific Team or Jersey
```bash
node generateJerseyPalette.js [teamId] [jerseyName] [outputName]
```

### Examples
```bash
# Validate all colors for 3-bit compliance
node generateJerseyPalette.js --validate

# Generate all jerseys for all teams
node generateJerseyPalette.js

# Generate all jerseys for team 3 (Chicago Blackhawks)
node generateJerseyPalette.js 3

# Generate home jersey for team 3
node generateJerseyPalette.js 3 home

# Generate home jersey with custom filename
node generateJerseyPalette.js 3 home chi-home-custom

# Show help and available teams
node generateJerseyPalette.js --help
```

## NHL95 Palette Structure

The script maps colors according to the NHL95 palette structure:

- **Colors 0-127**: Rink Palette (unchanged from template)
- **Colors 128-143**: Skin Tones (16 colors)
  - 133-136: skin colors (136 is shared between neck & stick)
- **Colors 144-191**: Jersey Components (48 colors)
  - 144-146: forearm (dark, medium, light)
  - 147-149: armStripe3 (light, medium, dark)
  - 150-152: armStripe2 (dark, medium, light)
  - 153-155: armStripe1 (light, medium, dark)
  - 156-158: armUpper (light, medium, dark)
  - 159-163: yolk components (yolkCorner, shoulderPatch, yolk3, yolk1, yolk2)
  - 164-167: jersey (goalieMask, light, medium, dark)
  - 168-170: waist1 (odd, even, hidden)
  - 171-173: waist2 (light, medium, dark)
  - 174-176: waist3 (light, medium, dark)
  - 177-180: pants (dark, pantsStripe2, pantsStripe1, medium)
  - 181-183: socks (light, medium, dark)
  - 184-186: socksStripe1 (light, medium, dark)
  - 187-189: socksStripe2 (light, medium, dark)
  - 190-191: helmet (medium, dark)
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
    "3": {
        "name": "Chicago Blackhawks",
        "abbreviation": "CHI",
        "palette": {
            // Team-specific colors
        },
        "jerseys": {
            "home": {
                "template": "classic",
                // Home uniform color mappings
                "crest": [
                    // 20 colors for 5x4 crest grid
                ]
            },
            "away": {
                "template": "classic", 
                // Away uniform color mappings
                "crest": [
                    // 20 colors for 5x4 crest grid
                ]
            }
        }
    }
}
```

## Output Filenames

Generated ACT files use the format: `<teamId>_<abbreviation>_<jerseyName>.act`

Examples:
- `3_CHI_home.act` - Chicago Blackhawks home jersey
- `3_CHI_away.act` - Chicago Blackhawks away jersey

## Notes

- For v1, all color variants (light/medium/dark) use the same flat color
- Colors are resolved first from team palette, then global palette
- RGB values are specified as "R G B" strings (e.g., "144 0 0")
- **All RGB values must be 3-bit compliant**: Valid values are 0, 36, 72, 108, 144, 180, 216, 252
- **Any unmapped jersey segments (colors 144-191) default to the "jersey" color** - this ensures consistent base color coverage
- Generated ACT files are 768 bytes (256 colors × 3 bytes RGB)
- Use `--validate` to check all colors for 3-bit compliance before generating palettes

## Color index 144-191 (48 colors)
colorZoneMapping: [
    "forearm-dark", "forearm-medium", "forearm-light",
    "armStripe3-light", "armStripe3-medium", "armStripe3-dark",
    "armStripe2-dark", "armStripe2-medium", "armStripe2-light",
    "armStripe1-light", "armStripe1-medium", "armStripe1-dark",
    "armUpper-light", "armUpper-medium", "armUpper-dark",
    "yolkCorner", "shoulderPatch", "yolk3", "yolk1", "yolk2",
    "goalieMask", "jersey-light", "jersey-medium", "jersey-dark",
    "waist1-odd", "waist1-even", "waist1-hidden",
    "waist2-light", "waist2-medium", "waist2-dark",
    "waist3-light", "waist3-medium", "waist3-dark",
    "pants-dark", "pantsStripe2", "pantsStripe1", "pants-medium",
    "socks-light", "socks-medium", "socks-dark",
    "socksStripe1-light", "socksStripe1-medium", "socksStripe1-dark",
    "socksStripe2-light", "socksStripe2-medium", "socksStripe2-dark",
    "helmet-medium", "helmet-dark"];

## template names
    - classic
    - armBand
    - checkWaist
    - vWaist
    - vWaistWide
    - upSlope
    - downSlope
    - sharpYolk
    - star
    - fisherman
    - tampaStorm
    - wildWing
    - burgerKing
    - pedestal
    - bear
    - checkChest (mid chest check)
    - nordiques (fleur de lis)
    - Flyers (arm curves)
    - Canadiens (mid chest stripe)
    - Predators (curved arm stripe)