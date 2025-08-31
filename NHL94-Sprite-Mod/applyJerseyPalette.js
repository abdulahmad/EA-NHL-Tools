const fs = require('fs');
const path = require('path');

// Import the jersey definition
const jerseyDef = require('./jerseyDef.js');

function parseColor(colorString) {
    const [r, g, b] = colorString.split(' ').map(Number);
    return { r, g, b };
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

function createJerseyPalette(templatePath, outputPath, teamId = "0") {
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
    
    const homeUniform = teamData.home;
    if (!homeUniform) {
        throw new Error(`Home uniform not found for team '${teamId}'`);
    }
    
    // Jersey component mapping (colors 144-191)
    const jerseyMapping = [
        // 144-146: forearm (dark, medium, light)
        { name: 'forearm', indices: [144, 145, 146] },
        // 147-149: armStripe3 (light, medium, dark)  
        { name: 'armStripe3', indices: [147, 148, 149] },
        // 150-152: armStripe2 (dark, medium, light)
        { name: 'armStripe2', indices: [150, 151, 152] },
        // 153-155: armStripe1 (light, medium, dark)
        { name: 'armStripe1', indices: [153, 154, 155] },
        // 156-158: armUpper (light, medium, dark)
        { name: 'armUpper', indices: [156, 157, 158] },
        // 159: yolkCorner
        { name: 'yolkCorner', indices: [159] },
        // 160: shoulderPatch
        { name: 'shoulderPatch', indices: [160] },
        // 161: yolk3
        { name: 'yolk3', indices: [161] },
        // 162: yolk1
        { name: 'yolk1', indices: [162] },
        // 163: yolk2
        { name: 'yolk2', indices: [163] },
        // 164-167: jersey (goalieMask, light, medium, dark)
        { name: 'goalieMask', indices: [164] },
        { name: 'jersey', indices: [165, 166, 167] },
        // 168-170: waist1 (odd, even, hidden)
        { name: 'waist1', indices: [168, 169, 170] },
        // 171-173: waist2 (light, medium, dark)
        { name: 'waist2', indices: [171, 172, 173] },
        // 174-176: waist3 (light, medium, dark)
        { name: 'waist3', indices: [174, 175, 176] },
        // 177-180: pants (dark, pantsStripe2, pantsStripe1, medium)
        { name: 'pants', indices: [177, 180] }, // 177 and 180 for dark and medium
        { name: 'pantsStripe2', indices: [178] },
        { name: 'pantsStripe1', indices: [179] },
        // 181-183: socks (light, medium, dark)
        { name: 'socks', indices: [181, 182, 183] },
        // 184-186: socksStripe1 (light, medium, dark)
        { name: 'socksStripe1', indices: [184, 185, 186] },
        // 187-189: socksStripe2 (light, medium, dark)
        { name: 'socksStripe2', indices: [187, 188, 189] },
        // 190-191: helmet (medium, dark)
        { name: 'helmet', indices: [190, 191] }
    ];
    
    // Apply jersey colors
    for (const mapping of jerseyMapping) {
        const colorName = homeUniform[mapping.name];
        if (colorName) {
            try {
                const color = resolveColor(colorName, teamData, globalData);
                
                // For v1, all variants (light/medium/dark) use the same color
                for (const index of mapping.indices) {
                    const offset = index * 3;
                    paletteBuffer[offset] = color.r;
                    paletteBuffer[offset + 1] = color.g;
                    paletteBuffer[offset + 2] = color.b;
                }
            } catch (error) {
                console.warn(`Warning: Could not resolve color for ${mapping.name}: ${error.message}`);
            }
        }
    }
    
    // Fill any unmapped indices in the jersey range (144-191) with the base jersey color
    if (homeUniform.jersey) {
        try {
            const defaultJerseyColor = resolveColor(homeUniform.jersey, teamData, globalData);
            
            // Create a set to track which indices have been mapped
            const mappedIndices = new Set();
            for (const mapping of jerseyMapping) {
                if (homeUniform[mapping.name]) {
                    mapping.indices.forEach(index => mappedIndices.add(index));
                }
            }
            
            // Fill unmapped indices with jersey color
            for (let index = 144; index <= 191; index++) {
                if (!mappedIndices.has(index)) {
                    const offset = index * 3;
                    paletteBuffer[offset] = defaultJerseyColor.r;
                    paletteBuffer[offset + 1] = defaultJerseyColor.g;
                    paletteBuffer[offset + 2] = defaultJerseyColor.b;
                }
            }
        } catch (error) {
            console.warn(`Warning: Could not resolve base jersey color: ${error.message}`);
        }
    }
    
    // Apply skin tones (colors 128-143) from global mapping
    const skinMapping = [
        { global: 'skin1', index: 128 },
        { global: 'skin2', index: 129 },
        { global: 'skin3', index: 130 }
    ];
    
    for (const skin of skinMapping) {
        const colorName = globalData.mapping[skin.global];
        if (colorName) {
            try {
                const color = resolveColor(colorName, teamData, globalData);
                const offset = skin.index * 3;
                paletteBuffer[offset] = color.r;
                paletteBuffer[offset + 1] = color.g;
                paletteBuffer[offset + 2] = color.b;
            } catch (error) {
                console.warn(`Warning: Could not resolve skin color for ${skin.global}: ${error.message}`);
            }
        }
    }
    
    // Apply crest colors (colors 192-255)
    if (teamData.crest && Array.isArray(teamData.crest)) {
        const crestColors = teamData.crest;
        
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
                    } catch (error) {
                        console.warn(`Warning: Could not resolve crest color '${colorName}': ${error.message}`);
                    }
                }
            }
        }
    }
    
    // Write the new ACT file
    fs.writeFileSync(outputPath, paletteBuffer);
    console.log(`Jersey palette applied successfully! Saved as: ${outputPath}`);
}

// Main execution
if (require.main === module) {
    const templatePath = path.join(__dirname, 'NHL95universaltemplate.act');
    const outputPath = path.join(__dirname, 'NHL95blackhawks.act');
    
    try {
        createJerseyPalette(templatePath, outputPath, "0");
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

module.exports = { createJerseyPalette, resolveColor, parseColor };
