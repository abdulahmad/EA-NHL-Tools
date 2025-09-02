const fs = require('fs');
const path = require('path');

// Import the jersey definition
const jerseyDef = require('./jerseyDef.js');

function parseColor(colorString) {
    const [r, g, b] = colorString.split(' ').map(Number);
    return { r, g, b };
}

function validate3BitColor(color) {
    const validValues = [0, 36, 72, 108, 144, 180, 216, 252];
    return validValues.includes(color.r) && 
           validValues.includes(color.g) && 
           validValues.includes(color.b);
}

function applyShading(baseColor, shade) {
    const validValues = [0, 36, 72, 108, 144, 180, 216, 252];
    
    let r = baseColor.r;
    let g = baseColor.g;
    let b = baseColor.b;
    
    // Store original values for comparison
    const originalR = r;
    const originalG = g;
    const originalB = b;
    
    // Count how many channels have base value of 0
    const zeroChannels = (originalR === 0 ? 1 : 0) + (originalG === 0 ? 1 : 0) + (originalB === 0 ? 1 : 0);
    
    if (shade === 'light') {
        // If all 3 channels are 0 (pure black), adjust all channels normally
        // If 1 or 2 channels are 0, don't adjust those specific channels
        if (zeroChannels === 3 || originalR !== 0) r += 36;
        if (zeroChannels === 3 || originalG !== 0) g += 36;
        if (zeroChannels === 3 || originalB !== 0) b += 36;
    } else if (shade === 'dark') {
        // If all 3 channels are 0 (pure black), adjust all channels normally
        // If 1 or 2 channels are 0, don't adjust those specific channels
        if (zeroChannels === 3 || originalR !== 0) r -= 36;
        if (zeroChannels === 3 || originalG !== 0) g -= 36;
        if (zeroChannels === 3 || originalB !== 0) b -= 36;
    }
    // 'medium' uses the base color unchanged
    
    // Check for out-of-range values before clamping (only for channels that were actually adjusted)
    const outOfRange = [];
    if (shade === 'light') {
        if ((zeroChannels === 3 || originalR !== 0) && r > 252) outOfRange.push(`R: ${originalR}+36=${r} (clamped to 252)`);
        if ((zeroChannels === 3 || originalG !== 0) && g > 252) outOfRange.push(`G: ${originalG}+36=${g} (clamped to 252)`);
        if ((zeroChannels === 3 || originalB !== 0) && b > 252) outOfRange.push(`B: ${originalB}+36=${b} (clamped to 252)`);
    } else if (shade === 'dark') {
        if ((zeroChannels === 3 || originalR !== 0) && r < 0) outOfRange.push(`R: ${originalR}-36=${r} (clamped to 0)`);
        if ((zeroChannels === 3 || originalG !== 0) && g < 0) outOfRange.push(`G: ${originalG}-36=${g} (clamped to 0)`);
        if ((zeroChannels === 3 || originalB !== 0) && b < 0) outOfRange.push(`B: ${originalB}-36=${b} (clamped to 0)`);
    }
    // Clamp values to valid 3-bit range
    r = Math.max(0, Math.min(252, r));
    g = Math.max(0, Math.min(252, g));
    b = Math.max(0, Math.min(252, b));
    
    // Snap to nearest valid 3-bit values and check for adjustments
    const nearestR = validValues.reduce((prev, curr) => 
        Math.abs(curr - r) < Math.abs(prev - r) ? curr : prev);
    const nearestG = validValues.reduce((prev, curr) => 
        Math.abs(curr - g) < Math.abs(prev - g) ? curr : prev);
    const nearestB = validValues.reduce((prev, curr) => 
        Math.abs(curr - b) < Math.abs(prev - b) ? curr : prev);
    
    // Check for 3-bit snapping adjustments
    if (nearestR !== r) outOfRange.push(`R: ${r} snapped to ${nearestR}`);
    if (nearestG !== g) outOfRange.push(`G: ${g} snapped to ${nearestG}`);
    if (nearestB !== b) outOfRange.push(`B: ${b} snapped to ${nearestB}`);
    
    const result = { r: nearestR, g: nearestG, b: nearestB };
    
    // Add warning property if adjustments were made
    if (outOfRange.length > 0) {
        result.warning = `Color adjustments: ${outOfRange.join(', ')}`;
    }
    
    return result;
}

function validateColorPalette(jerseyData) {
    const validValues = [0, 36, 72, 108, 144, 180, 216, 252];
    const errors = [];
    
    // Check global palette
    if (jerseyData.global && jerseyData.global.palette) {
        for (const [colorName, colorValue] of Object.entries(jerseyData.global.palette)) {
            const color = parseColor(colorValue);
            if (!validate3BitColor(color)) {
                errors.push(`Global color '${colorName}': ${colorValue} - Invalid 3-bit RGB values`);
                const suggested = {
                    r: validValues.reduce((prev, curr) => 
                        Math.abs(curr - color.r) < Math.abs(prev - color.r) ? curr : prev),
                    g: validValues.reduce((prev, curr) => 
                        Math.abs(curr - color.g) < Math.abs(prev - color.g) ? curr : prev),
                    b: validValues.reduce((prev, curr) => 
                        Math.abs(curr - color.b) < Math.abs(prev - color.b) ? curr : prev)
                };
                errors.push(`  Suggested: "${suggested.r} ${suggested.g} ${suggested.b}"`);
            }
        }
    }
    
    // Check team-specific palettes
    for (const [teamId, teamData] of Object.entries(jerseyData)) {
        if (teamId === 'global') continue;
        
        if (teamData.palette) {
            for (const [colorName, colorValue] of Object.entries(teamData.palette)) {
                const color = parseColor(colorValue);
                if (!validate3BitColor(color)) {
                    errors.push(`Team ${teamId} (${teamData.name}) color '${colorName}': ${colorValue} - Invalid 3-bit RGB values`);
                    const suggested = {
                        r: validValues.reduce((prev, curr) => 
                            Math.abs(curr - color.r) < Math.abs(prev - color.r) ? curr : prev),
                        g: validValues.reduce((prev, curr) => 
                            Math.abs(curr - color.g) < Math.abs(prev - color.g) ? curr : prev),
                        b: validValues.reduce((prev, curr) => 
                            Math.abs(curr - color.b) < Math.abs(prev - color.b) ? curr : prev)
                    };
                    errors.push(`  Suggested: "${suggested.r} ${suggested.g} ${suggested.b}"`);
                }
            }
        }
    }
    
    return errors;
}

function resolveColor(colorName, teamData, globalData) {
    // First check team-specific palette
    if (teamData.palette && teamData.palette[colorName]) {
        return parseColor(teamData.palette[colorName]);
    }
    
    // Then check global palette
    if (globalData.palette[colorName]) {
        return parseColor(globalData.palette[colorName]);
    }
    
    // If it's already a color string (RGB values)
    if (typeof colorName === 'string' && colorName.includes(' ')) {
        return parseColor(colorName);
    }
    
    throw new Error(`Color '${colorName}' not found in palette`);
}

function createJerseyPalette(templatePath, outputPath, teamId, jerseyName) {
    // Validate 3-bit color compliance first
    console.log('Validating 3-bit color compliance...');
    const validationErrors = validateColorPalette(jerseyDef);
    
    if (validationErrors.length > 0) {
        console.error('\n❌ 3-bit Color Validation Errors:');
        console.error('Valid RGB values are: 0, 36, 72, 108, 144, 180, 216, 252');
        console.error('');
        validationErrors.forEach(error => console.error(error));
        throw new Error('Color validation failed. Please fix the invalid colors in jerseyDef.js');
    }
    console.log('✅ All colors are 3-bit compliant');
    
    // Track warnings for summary
    let hasWarnings = false;
    const warningComponents = [];
    
    // Read the template ACT file
    const templateBuffer = fs.readFileSync(templatePath);
    
    // ACT files are 768 bytes (256 colors * 3 bytes RGB)
    if (templateBuffer.length !== 768) {
        throw new Error(`Invalid ACT file size: ${templateBuffer.length} bytes, expected 768`);
    }
    
    // Create a copy of the template
    const paletteBuffer = Buffer.from(templateBuffer);
    
    const teamData = jerseyDef[teamId];
    const globalData = jerseyDef.global;
    
    if (!teamData) {
        throw new Error(`Team ID '${teamId}' not found in jersey definition`);
    }
    
    if (!teamData.jerseys || !teamData.jerseys[jerseyName]) {
        throw new Error(`Jersey '${jerseyName}' not found for team '${teamId}' (${teamData.name})`);
    }
    
    const jersey = teamData.jerseys[jerseyName];
    
    // Jersey component mapping (colors 144-191)
    const jerseyMapping = [
        // 144-146: forearm (dark, medium, light)
        { name: 'forearm', indices: [144, 145, 146], shades: ['dark', 'medium', 'light'] },
        // 147-149: armStripe3 (light, medium, dark)  
        { name: 'armStripe3', indices: [147, 148, 149], shades: ['light', 'medium', 'dark'] },
        // 150-152: armStripe2 (dark, medium, light)
        { name: 'armStripe2', indices: [150, 151, 152], shades: ['dark', 'medium', 'light'] },
        // 153-155: armStripe1 (light, medium, dark)
        { name: 'armStripe1', indices: [153, 154, 155], shades: ['light', 'medium', 'dark'] },
        // 156-158: armUpper (light, medium, dark)
        { name: 'armUpper', indices: [156, 157, 158], shades: ['light', 'medium', 'dark'] },
        // 159: yolkCorner
        { name: 'yolkCorner', indices: [159], shades: ['medium'] },
        // 160: shoulderPatch
        { name: 'shoulderPatch', indices: [160], shades: ['medium'] },
        // 161: yolk3
        { name: 'yolk3', indices: [161], shades: ['medium'] },
        // 162: yolk1
        { name: 'yolk1', indices: [162], shades: ['medium'] },
        // 163: yolk2
        { name: 'yolk2', indices: [163], shades: ['medium'] },
        // 164-167: jersey (goalieMask, light, medium, dark)
        { name: 'goalieMask', indices: [164], shades: ['medium'] },
        { name: 'jersey', indices: [165, 166, 167], shades: ['light', 'medium', 'dark'] },
        // 168-170: waist1 (odd, even, hidden)
        { name: 'waist1', indices: [168, 169, 170], shades: ['light', 'medium', 'dark'] },
        // 171-173: waist2 (light, medium, dark)
        { name: 'waist2', indices: [171, 172, 173], shades: ['light', 'medium', 'dark'] },
        // 174-176: waist3 (light, medium, dark)
        { name: 'waist3', indices: [174, 175, 176], shades: ['light', 'medium', 'dark'] },
        // 177-180: pants (dark, pantsStripe2, pantsStripe1, medium)
        { name: 'pants', indices: [177, 180], shades: ['dark', 'medium'] }, // 177 and 180 for dark and medium
        { name: 'pantsStripe2', indices: [178], shades: ['medium'] },
        { name: 'pantsStripe1', indices: [179], shades: ['medium'] },
        // 181-183: socks (light, medium, dark)
        { name: 'socks', indices: [181, 182, 183], shades: ['light', 'medium', 'dark'] },
        // 184-186: socksStripe1 (light, medium, dark)
        { name: 'socksStripe1', indices: [184, 185, 186], shades: ['light', 'medium', 'dark'] },
        // 187-189: socksStripe2 (light, medium, dark)
        { name: 'socksStripe2', indices: [187, 188, 189], shades: ['light', 'medium', 'dark'] },
        // 190-191: helmet (medium, dark)
        { name: 'helmet', indices: [190, 191], shades: ['medium', 'dark'] }
    ];
    
    // Apply jersey colors
    console.log(`Applying colors for ${teamData.name} - ${jerseyName} jersey...`);
    
    // Get the base jersey color for defaults
    let defaultJerseyColor = null;
    if (jersey.jersey) {
        try {
            defaultJerseyColor = resolveColor(jersey.jersey, teamData, globalData);
            console.log(`  Base jersey color: ${jersey.jersey} -> RGB(${defaultJerseyColor.r}, ${defaultJerseyColor.g}, ${defaultJerseyColor.b})`);
        } catch (error) {
            console.warn(`Warning: Could not resolve base jersey color: ${error.message}`);
        }
    }
    
    // Create a set to track which indices have been mapped
    const mappedIndices = new Set();
    
    for (const mapping of jerseyMapping) {
        const colorName = jersey[mapping.name];
        let resolvedColor = null;
        
        // Handle yolk defaults if not explicitly defined
        if (!colorName && (mapping.name === 'yolk1' || mapping.name === 'yolk2' || mapping.name === 'yolk3')) {
            if (defaultJerseyColor) {
                console.log(`  ${mapping.name}: not defined, using jersey color shading`);
                
                // Apply the appropriate shading to the jersey color
                let shade = 'medium';
                if (mapping.name === 'yolk1') shade = 'light';
                else if (mapping.name === 'yolk2') shade = 'light';
                else if (mapping.name === 'yolk3') shade = 'medium';
                
                resolvedColor = applyShading(defaultJerseyColor, shade);
                console.log(`    ${mapping.name} (${shade}): RGB(${resolvedColor.r}, ${resolvedColor.g}, ${resolvedColor.b})`);
                
                // Apply to the mapping index
                const index = mapping.indices[0]; // yolk colors have single indices
                const offset = index * 3;
                paletteBuffer[offset] = resolvedColor.r;
                paletteBuffer[offset + 1] = resolvedColor.g;
                paletteBuffer[offset + 2] = resolvedColor.b;
                mappedIndices.add(index);
                
                if (resolvedColor.warning) {
                    console.warn(`      ⚠️  ${resolvedColor.warning}`);
                    hasWarnings = true;
                    if (!warningComponents.includes(mapping.name)) {
                        warningComponents.push(mapping.name);
                    }
                }
            }
        } else if (colorName) {
            try {
                const baseColor = resolveColor(colorName, teamData, globalData);
                console.log(`  ${mapping.name}: ${colorName} -> RGB(${baseColor.r}, ${baseColor.g}, ${baseColor.b})`);
                
                // Apply shading variants to each index
                for (let i = 0; i < mapping.indices.length; i++) {
                    const index = mapping.indices[i];
                    const shade = mapping.shades[i];
                    const shadedColor = applyShading(baseColor, shade);
                    
                    const offset = index * 3;
                    paletteBuffer[offset] = shadedColor.r;
                    paletteBuffer[offset + 1] = shadedColor.g;
                    paletteBuffer[offset + 2] = shadedColor.b;
                    mappedIndices.add(index);
                    
                    if (shade !== 'medium') {
                        console.log(`    Index ${index} (${shade}): RGB(${shadedColor.r}, ${shadedColor.g}, ${shadedColor.b})`);
                        if (shadedColor.warning) {
                            console.warn(`      ⚠️  ${shadedColor.warning}`);
                            hasWarnings = true;
                            if (!warningComponents.includes(mapping.name)) {
                                warningComponents.push(mapping.name);
                            }
                        }
                    }
                }
            } catch (error) {
                console.warn(`Warning: Could not resolve color for ${mapping.name}: ${error.message}`);
            }
        }
    }
    
    // Fill any unmapped indices in the jersey range (144-191) with the base jersey color
    if (defaultJerseyColor) {
        // Define shade mapping for unmapped indices based on their position
        const indexShadeMap = {
            144: 'dark',   // forearm-dark
            145: 'medium', // forearm-medium  
            146: 'light',  // forearm-light
            156: 'light',  // armUpper-light
            157: 'medium', // armUpper-medium
            158: 'dark',   // armUpper-dark
            159: 'medium', // yolkCorner
            161: 'medium', // yolk3
            162: 'medium', // yolk1
            163: 'medium', // yolk2
            180: 'medium', // pants-medium
            181: 'light',  // socks-light
            182: 'medium', // socks-medium
            183: 'dark'    // socks-dark
        };
        
        for (let index = 144; index <= 191; index++) {
            if (!mappedIndices.has(index)) {
                const shade = indexShadeMap[index] || 'medium';
                const shadedColor = applyShading(defaultJerseyColor, shade);
                const offset = index * 3;
                paletteBuffer[offset] = shadedColor.r;
                paletteBuffer[offset + 1] = shadedColor.g;
                paletteBuffer[offset + 2] = shadedColor.b;
                console.log(`  Unmapped index ${index} (${shade}) defaulted to jersey color: RGB(${shadedColor.r}, ${shadedColor.g}, ${shadedColor.b})`);
                if (shadedColor.warning) {
                    console.warn(`    ⚠️  ${shadedColor.warning}`);
                    hasWarnings = true;
                    if (!warningComponents.includes('unmapped indices')) {
                        warningComponents.push('unmapped indices');
                    }
                }
            }
        }
    }
    
    // Apply skin tones (colors 128-143) from global mapping
    console.log('Applying skin tones...');
    const skinMapping = [
        { global: 'skin1', indices: [133, 134] },
        { global: 'skin2', indices: [135, 136] }
        // { global: 'skin3', indices: [136, 137, 138, 139] }
    ];
    
    for (const skin of skinMapping) {
        const colorName = globalData.mapping[skin.global];
        if (colorName) {
            try {
                const color = resolveColor(colorName, teamData, globalData);
                console.log(`  ${skin.global}: ${colorName} -> RGB(${color.r}, ${color.g}, ${color.b})`);
                
                for (const index of skin.indices) {
                    const offset = index * 3;
                    paletteBuffer[offset] = color.r;
                    paletteBuffer[offset + 1] = color.g;
                    paletteBuffer[offset + 2] = color.b;
                }
            } catch (error) {
                console.warn(`Warning: Could not resolve skin color for ${skin.global}: ${error.message}`);
            }
        }
    }
    
    // Apply crest colors (colors 192-255)
    if (jersey.crest && Array.isArray(jersey.crest)) {
        console.log('Applying crest colors...');
        const crestColors = jersey.crest;
        
        // Each row has 5 crest colors + 6 ice logo colors + 5 padding
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 5; col++) {
                const crestIndex = row * 5 + col;
                if (crestIndex < crestColors.length) {
                    const colorName = crestColors[crestIndex];
                    try {
                        const color = resolveColor(colorName, teamData, globalData);
                        const paletteIndex = 192 + (row * 16) + col;
                        const offset = paletteIndex * 3;
                        paletteBuffer[offset] = color.r;
                        paletteBuffer[offset + 1] = color.g;
                        paletteBuffer[offset + 2] = color.b;
                        console.log(`  Crest[${row},${col}]: ${colorName} -> palette index ${paletteIndex}`);
                    } catch (error) {
                        console.warn(`Warning: Could not resolve crest color '${colorName}': ${error.message}`);
                    }
                }
            }
        }
    }
    
    // Write the new ACT file
    fs.writeFileSync(outputPath, paletteBuffer);
    console.log(`\nJersey palette applied successfully! Saved as: ${outputPath}`);
    
    // Display warning summary
    if (hasWarnings) {
        console.log(`\n⚠️  Warning Summary: Color clamping/snapping occurred in: ${warningComponents.join(', ')}`);
        console.log(`   Consider using colors with more headroom for better shading results.`);
    } else {
        console.log(`\n✅ No color warnings - all shading stayed within valid ranges.`);
    }
}

function generateAllJerseys(templatePath) {
    console.log('Generating all jerseys for all teams...\n');
    let generatedCount = 0;
    let totalWarnings = 0;
    const jerseysWithWarnings = [];
    
    for (const [teamId, teamData] of Object.entries(jerseyDef)) {
        if (teamId === 'global' || !teamData.jerseys) continue;
        
        for (const [jerseyName, jerseyData] of Object.entries(teamData.jerseys)) {
            const abbreviation = teamData.abbreviation || teamData.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase();
            const outputName = `${teamId}_${abbreviation}_${jerseyName}`;
            const outputPath = path.join(path.dirname(templatePath), `${outputName}.act`);
            
            try {
                console.log(`\n=== Generating ${teamData.name} - ${jerseyName} jersey ===`);
                const result = createJerseyPalette(templatePath, outputPath, teamId, jerseyName);
                generatedCount++;
                
                // Check if this jersey had warnings (look for warning messages in recent console output)
                // Since we can't easily return the warning status, we'll track it by checking console messages
            } catch (error) {
                console.error(`Error generating ${teamData.name} ${jerseyName}: ${error.message}`);
            }
        }
    }
    
    console.log(`\n🎉 Generated ${generatedCount} jersey palette(s) successfully!`);
}

function generateTeamJerseys(templatePath, teamId) {
    const teamData = jerseyDef[teamId];
    if (!teamData || teamId === 'global') {
        throw new Error(`Team ID '${teamId}' not found.`);
    }
    
    if (!teamData.jerseys) {
        throw new Error(`No jerseys found for team '${teamId}' (${teamData.name}).`);
    }
    
    console.log(`Generating all jerseys for ${teamData.name}...\n`);
    let generatedCount = 0;
    
    for (const [jerseyName, jerseyData] of Object.entries(teamData.jerseys)) {
        const abbreviation = teamData.abbreviation || teamData.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase();
        const outputName = `${teamId}_${abbreviation}_${jerseyName}`;
        const outputPath = path.join(path.dirname(templatePath), `${outputName}.act`);
        
        try {
            console.log(`\n=== Generating ${teamData.name} - ${jerseyName} jersey ===`);
            createJerseyPalette(templatePath, outputPath, teamId, jerseyName);
            generatedCount++;
        } catch (error) {
            console.error(`Error generating ${teamData.name} ${jerseyName}: ${error.message}`);
        }
    }
    
    console.log(`\n🎉 Generated ${generatedCount} jersey palette(s) for ${teamData.name}!`);
}

// Command line interface
function printUsage() {
    console.log('Usage: node generateJerseyPalette.js [options] [teamId] [jerseyName] [outputName]');
    console.log('');
    console.log('Options:');
    console.log('  --validate     Validate all colors in jerseyDef.js for 3-bit compliance');
    console.log('  --help, -h     Show this help message');
    console.log('');
    console.log('Arguments:');
    console.log('  teamId     - Team ID from jerseyDef.js (generates all teams if omitted)');
    console.log('  jerseyName - Jersey type (e.g., "home", "away") (generates all jerseys if omitted)');
    console.log('  outputName - Output filename without extension (default: <teamId>_<abbreviation>_<jerseyName>.act)');
    console.log('');
    console.log('Examples:');
    console.log('  node generateJerseyPalette.js --validate');
    console.log('  node generateJerseyPalette.js                    # Generate all jerseys for all teams');
    console.log('  node generateJerseyPalette.js 3                  # Generate all jerseys for team 3');
    console.log('  node generateJerseyPalette.js 3 home             # Generate home jersey for team 3');
    console.log('  node generateJerseyPalette.js 3 home chi-home    # Custom filename');
    console.log('');
    console.log('Available teams and jerseys:');
    
    // List available teams and their jerseys
    for (const [id, team] of Object.entries(jerseyDef)) {
        if (id !== 'global' && team.name) {
            console.log(`  ${id}: ${team.name} (${team.abbreviation || 'N/A'})`);
            if (team.jerseys) {
                for (const jerseyName of Object.keys(team.jerseys)) {
                    console.log(`    - ${jerseyName}`);
                }
            }
        }
    }
}

// Main execution
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        printUsage();
        process.exit(0);
    }
    
    if (args.includes('--validate')) {
        console.log('Validating 3-bit color compliance...');
        const validationErrors = validateColorPalette(jerseyDef);
        
        if (validationErrors.length > 0) {
            console.error('\n❌ 3-bit Color Validation Errors:');
            console.error('Valid RGB values are: 0, 36, 72, 108, 144, 180, 216, 252');
            console.error('');
            validationErrors.forEach(error => console.error(error));
            process.exit(1);
        } else {
            console.log('✅ All colors are 3-bit compliant');
            process.exit(0);
        }
    }
    
    const templatePath = path.join(__dirname, 'NHL95universaltemplate.act');
    
    if (!fs.existsSync(templatePath)) {
        console.error(`Error: Template file not found: ${templatePath}`);
        process.exit(1);
    }
    
    const teamId = args[0];
    const jerseyName = args[1];
    const customOutputName = args[2];
    
    try {
        if (!teamId) {
            // Generate all jerseys for all teams
            generateAllJerseys(templatePath);
        } else if (!jerseyName) {
            // Generate all jerseys for specified team
            generateTeamJerseys(templatePath, teamId);
        } else {
            // Generate specific jersey for specific team
            const teamData = jerseyDef[teamId];
            if (!teamData || teamId === 'global') {
                console.error(`Error: Team ID '${teamId}' not found.`);
                printUsage();
                process.exit(1);
            }
            
            if (!teamData.jerseys || !teamData.jerseys[jerseyName]) {
                console.error(`Error: Jersey '${jerseyName}' not found for team '${teamId}' (${teamData.name}).`);
                printUsage();
                process.exit(1);
            }
            
            // Create output filename
            const abbreviation = teamData.abbreviation || teamData.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase();
            const outputName = customOutputName || `${teamId}_${abbreviation}_${jerseyName}`;
            const outputPath = path.join(__dirname, `${outputName}.act`);
            
            console.log(`\n=== Generating ${teamData.name} - ${jerseyName} jersey ===`);
            createJerseyPalette(templatePath, outputPath, teamId, jerseyName);
        }
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

module.exports = { createJerseyPalette, generateAllJerseys, generateTeamJerseys, resolveColor, parseColor };
