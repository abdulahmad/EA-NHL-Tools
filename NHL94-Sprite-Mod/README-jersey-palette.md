# Jersey Palette Generator for NHL95

This tool generates NHL95 ACT palette files from the jersey definitions in `jerseyDef.js`.

## Files

- `jerseyDef.js` - Jersey color definitions for teams
- `generateJerseyPalette.js` - Main script to generate ACT files
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

# Generate ONLY the home jersey for team 3 (useful for testing/fixing warnings)
node generateJerseyPalette.js 3 home

# Generate ONLY the away jersey for team 3
node generateJerseyPalette.js 3 away

# Generate home jersey with custom filename
node generateJerseyPalette.js 3 home chi-home-custom

# Show help and available teams
node generateJerseyPalette.js --help
```

### Testing and Fixing Color Warnings

When you see color clamping warnings, use specific jersey generation to test fixes:

1. **Identify the problem jersey**: Look for ⚠️ warnings in the output
2. **Generate only that jersey**: `node generateJerseyPalette.js [teamId] [jerseyName]`
3. **Adjust colors in jerseyDef.js**: Choose colors with more "headroom" for shading
4. **Re-test**: Generate the same jersey again to verify warnings are gone

**Example workflow:**
```bash
# See warnings on Chicago away jersey
node generateJerseyPalette.js 3 away

# Edit jerseyDef.js to fix problematic colors
# Re-test just that jersey
node generateJerseyPalette.js 3 away

# When satisfied, generate all jerseys
node generateJerseyPalette.js
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

## Color Shading System

The generator automatically creates light/medium/dark variants for each jersey component with **automatic warning system**.

### Shading Rules
- **Light**: Base color + 36 per RGB channel
- **Medium**: Base color (unchanged) 
- **Dark**: Base color - 36 per RGB channel

### Warning System
The generator warns when color adjustments occur:
- **Range clamping**: When values go below 0 or above 252
- **3-bit snapping**: When values are adjusted to nearest valid 3-bit value

Example warnings:
```
⚠️  Color adjustments: R: 252+36=288 (clamped to 252), G: 252+36=288 (clamped to 252)
⚠️  Color adjustments: R: 0-36=-36 (clamped to 0), B: 108 snapped to 108
```

### Example
If a jersey component uses `red: "144 0 0"`:
- **Light variant**: RGB(180, 36, 36) 
- **Medium variant**: RGB(144, 0, 0)
- **Dark variant**: RGB(108, 0, 0) ⚠️ G and B channels clamped to 0

All values are automatically:
- Clamped to 0-252 range
- Snapped to nearest valid 3-bit values (0, 36, 72, 108, 144, 180, 216, 252)

## Output Filenames

Generated ACT files use the format: `<teamId>_<abbreviation>_<jerseyName>.act`

Examples:
- `3_CHI_home.act` - Chicago Blackhawks home jersey
- `3_CHI_away.act` - Chicago Blackhawks away jersey

## Testing Specific Jerseys

When developing and testing color combinations, you can generate individual jerseys instead of all teams:

```bash
# Generate specific team's home jersey (by team ID)
node generateJerseyPalette.js 3 home

# Generate specific team's away jersey  
node generateJerseyPalette.js 15 away

# Examples for common teams:
node generateJerseyPalette.js 1 home    # Anaheim Mighty Ducks home
node generateJerseyPalette.js 10 away   # Edmonton Oilers away
node generateJerseyPalette.js 21 home   # New York Rangers home
```

The script will output detailed color processing information and any warnings about color adjustments. At the end, you'll see a **Warning Summary** that lists which jersey components had color clamping/snapping issues:

```
⚠️  Warning Summary: Color clamping/snapping occurred in: armStripe3, jersey, waist1, pants
Consider using colors with more headroom for better shading results.
```

This helps you identify which colors might need refinement - typically pure black (0,0,0) and pure white (252,252,252) will always trigger warnings when shaded because they're at the RGB limits.

## Notes

- **Automatic Color Shading**: Each jersey component has light/medium/dark variants
  - **Light variants**: +36 to each RGB channel  
  - **Dark variants**: -36 to each RGB channel
  - **Medium variants**: Base color unchanged
  - All values are clamped to valid 3-bit ranges and snapped to nearest valid values
- **Yolk Color Defaults**: If yolk1, yolk2, or yolk3 are not explicitly defined:
  - **yolk1**: Automatically uses light shade of jersey color
  - **yolk2**: Automatically uses medium shade of jersey color (same as base)
  - **yolk3**: Automatically uses dark shade of jersey color
- **Zero Channel Protection**: When shading colors, channels with base value 0 are preserved (except pure black)
  - Pure colors like red (144,0,0) keep their zero channels when shaded
  - Pure black (0,0,0) gets normal shading since all channels are zero
- Colors are resolved first from team palette, then global palette
- RGB values are specified as "R G B" strings (e.g., "144 0 0")
- **All RGB values must be 3-bit compliant**: Valid values are 0, 36, 72, 108, 144, 180, 216, 252
- **Any unmapped jersey segments (colors 144-191) default to the "jersey" color** with appropriate shading applied
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


    ## TODO
    - separate templateDef into its own files
    - create script which reads template style + homepals/awaypals and -> converts to 3 bit flat shaded
    - create script to parse act palettes in jerseyDefs -- convert to 3bit
    - create script to generate new full valid 3bit act
    - crests
    - generate new sprite data