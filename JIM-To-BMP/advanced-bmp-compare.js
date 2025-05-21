import fs from 'fs';
import path from 'path';

/**
 * Read and parse a BMP file including detailed header analysis
 * @param {string} filePath - Path to BMP file
 * @returns {Object} Detailed BMP information
 */
function readBMPDataDetailed(filePath) {
    console.log(`Reading BMP file: ${filePath}`);
    const data = fs.readFileSync(filePath);
    
    // Basic BMP header fields
    const fileType = data.toString('ascii', 0, 2);
    if (fileType !== 'BM') {
        console.error(`${filePath} is not a valid BMP file.`);
        return null;
    }
    
    const fileSize = data.readUInt32LE(2);
    const reserved1 = data.readUInt16LE(6);
    const reserved2 = data.readUInt16LE(8);
    const pixelOffset = data.readUInt32LE(10);
    
    // DIB header fields
    const dibHeaderSize = data.readUInt32LE(14);
    const width = data.readInt32LE(18);
    const height = data.readInt32LE(22); 
    const isTopDown = height < 0;
    const absHeight = Math.abs(height);
    const planes = data.readUInt16LE(26);
    const bpp = data.readUInt16LE(28);
    const compression = data.readUInt32LE(30);
    const imageSize = data.readUInt32LE(34);
    const hRes = data.readInt32LE(38);
    const vRes = data.readInt32LE(42);
    const colorsInTable = data.readUInt32LE(46);
    const importantColors = data.readUInt32LE(50);
    
    console.log(`BMP Header Analysis:
- File size: ${fileSize} bytes
- Pixel data offset: 0x${pixelOffset.toString(16).toUpperCase()} (${pixelOffset})
- DIB header size: ${dibHeaderSize}
- Dimensions: ${width}x${absHeight} (${isTopDown ? 'top-down' : 'bottom-up'})
- Bits per pixel: ${bpp}
- Compression: ${compression === 0 ? 'None' : compression}
- Color table entries: ${colorsInTable === 0 ? (bpp < 8 ? 2 ** bpp : 0) : colorsInTable}
`);
    
    // Read palette if it's an indexed color image
    const palette = [];
    const paletteAnalysis = { uniqueColors: 0, colorFrequency: {}, mostUsedColors: [] };
    
    if (bpp <= 8) {
        const numColors = colorsInTable || Math.min(1 << bpp, 256);
        const paletteOffset = 14 + dibHeaderSize;
        
        console.log(`Reading palette with ${numColors} colors from offset 0x${paletteOffset.toString(16).toUpperCase()} (${paletteOffset})`);
        
        const paletteRGB = new Map(); // For uniqueness tracking
        
        for (let i = 0; i < numColors; i++) {
            const blue = data[paletteOffset + i * 4];
            const green = data[paletteOffset + i * 4 + 1];
            const red = data[paletteOffset + i * 4 + 2];
            const reserved = data[paletteOffset + i * 4 + 3];
            
            palette.push([red, green, blue]);
            
            // Track unique colors
            const colorKey = `${red},${green},${blue}`;
            if (!paletteRGB.has(colorKey)) {
                paletteRGB.set(colorKey, { count: 1, indices: [i] });
            } else {
                const entry = paletteRGB.get(colorKey);
                entry.count++;
                entry.indices.push(i);
            }
        }
        
        // Calculate palette statistics
        paletteAnalysis.uniqueColors = paletteRGB.size;
        
        const colorFreq = Array.from(paletteRGB.entries())
            .map(([key, value]) => ({ color: key, ...value }))
            .sort((a, b) => b.count - a.count);
        
        paletteAnalysis.mostUsedColors = colorFreq.slice(0, 10);
        paletteAnalysis.duplicateColors = colorFreq.filter(c => c.count > 1);
        
        console.log(`Palette Analysis:
- Unique colors: ${paletteAnalysis.uniqueColors} of ${numColors}
- Duplicate colors: ${paletteAnalysis.duplicateColors.length}
- Most frequent color: ${
            paletteAnalysis.mostUsedColors[0] ? 
            `RGB(${paletteAnalysis.mostUsedColors[0].color}) used ${paletteAnalysis.mostUsedColors[0].count} times` : 
            'None'
        }
`);
        
        if (paletteAnalysis.duplicateColors.length > 0) {
            console.log('Duplicate colors:');
            paletteAnalysis.duplicateColors.slice(0, 5).forEach(entry => {
                console.log(`  - RGB(${entry.color}) at indices: ${entry.indices.join(', ')}`);
            });
            console.log('');
        }
    }
    
    // Read pixel data for 8bpp indexed images
    let pixels = [];
    let pixelStats = { frequency: {} };
    
    if (bpp === 8) {
        const rowSize = Math.floor((width * bpp + 31) / 32) * 4;
        const topDown = height < 0;
        
        console.log(`Reading pixel data:
- Row size (with padding): ${rowSize} bytes
- Direction: ${topDown ? 'Top-down' : 'Bottom-up'}
- Pixel data offset: 0x${pixelOffset.toString(16).toUpperCase()} (${pixelOffset})
- Expected end of pixel data: 0x${(pixelOffset + absHeight * rowSize).toString(16).toUpperCase()} (${pixelOffset + absHeight * rowSize})
`);
        
        for (let y = 0; y < absHeight; y++) {
            const row = topDown ? y : (absHeight - 1 - y);
            const rowOffset = pixelOffset + row * rowSize;
            
            for (let x = 0; x < width; x++) {
                const pixelValue = data[rowOffset + x];
                pixels.push(pixelValue);
                
                // Track pixel value frequency
                pixelStats.frequency[pixelValue] = (pixelStats.frequency[pixelValue] || 0) + 1;
            }
        }
        
        // Calculate pixel statistics
        const pixelValueFreq = Object.entries(pixelStats.frequency)
            .map(([value, count]) => ({ value: parseInt(value), count }))
            .sort((a, b) => b.count - a.count);
        
        pixelStats.mostFrequentValues = pixelValueFreq.slice(0, 10);
        pixelStats.totalUniqueValues = pixelValueFreq.length;
        
        console.log(`Pixel Data Analysis:
- Unique pixel values: ${pixelStats.totalUniqueValues}
- Most frequent values:`);
        pixelStats.mostFrequentValues.slice(0, 5).forEach(entry => {
            const color = entry.value < palette.length ? 
                `RGB(${palette[entry.value].join(',')})` : 'Out of palette range';
            console.log(`  - Value ${entry.value} (${color}) used ${entry.count} times (${(entry.count / pixels.length * 100).toFixed(2)}%)`);
        });
        console.log('');
    }
    
    return { 
        width, 
        height: absHeight, 
        bpp, 
        compression, 
        pixelOffset,
        isTopDown,
        palette, 
        pixels,
        paletteAnalysis,
        pixelStats,
        dibHeaderSize,
        fileSize,
    };
}

/**
 * Advanced palette comparison to identify patterns and map between palette entries
 * @param {Array} palette1 - First palette 
 * @param {Array} palette2 - Second palette
 * @returns {Object} Detailed palette comparison analysis
 */
function comparePalettesDetailed(palette1, palette2) {
    const result = {
        exactMatches: [],
        similarMatches: [],
        unmappedIndices1: [],
        unmappedIndices2: [],
        colorShifts: [],
        paletteMappings: new Array(palette1.length).fill(-1),
        comparisonByQuadrant: []
    };
    
    // Check which colors have exact matches
    for (let i = 0; i < palette1.length; i++) {
        const color1 = palette1[i];
        let foundMatch = false;
        
        // First check if same index matches
        if (i < palette2.length) {
            const color2 = palette2[i];
            if (colorsEqual(color1, color2)) {
                result.exactMatches.push({ index1: i, index2: i, color: [...color1] });
                result.paletteMappings[i] = i;
                foundMatch = true;
                continue;
            }
        }
        
        // Search for exact match at different index
        for (let j = 0; j < palette2.length; j++) {
            const color2 = palette2[j];
            if (colorsEqual(color1, color2)) {
                result.exactMatches.push({ index1: i, index2: j, color: [...color1] });
                result.paletteMappings[i] = j;
                foundMatch = true;
                break;
            }
        }
        
        if (!foundMatch) {
            result.unmappedIndices1.push(i);
        }
    }
    
    // Check for any palette2 entries that don't match palette1
    for (let j = 0; j < palette2.length; j++) {
        let foundMatch = false;
        for (let i = 0; i < palette1.length; i++) {
            if (colorsEqual(palette1[i], palette2[j])) {
                foundMatch = true;
                break;
            }
        }
        
        if (!foundMatch) {
            result.unmappedIndices2.push(j);
        }
    }
    
    // For unmapped colors in palette1, find closest match in palette2
    for (const idx1 of result.unmappedIndices1) {
        const color1 = palette1[idx1];
        let bestMatch = { index: -1, distance: Infinity };
        
        for (let j = 0; j < palette2.length; j++) {
            const color2 = palette2[j];
            const distance = colorDistance(color1, color2);
            
            if (distance < bestMatch.distance) {
                bestMatch = { index: j, distance, color: [...color2] };
            }
        }
        
        if (bestMatch.index !== -1) {
            result.similarMatches.push({
                index1: idx1,
                index2: bestMatch.index,
                color1: [...color1],
                color2: [...bestMatch.color],
                distance: bestMatch.distance
            });
            
            if (result.paletteMappings[idx1] === -1) {
                result.paletteMappings[idx1] = bestMatch.index;
            }
            
            // Check for consistent color shifts
            const rDiff = color1[0] - bestMatch.color[0];
            const gDiff = color1[1] - bestMatch.color[1];
            const bDiff = color1[2] - bestMatch.color[2];
            
            result.colorShifts.push({
                index1: idx1,
                index2: bestMatch.index,
                rDiff, gDiff, bDiff
            });
        }
    }
    
    // Analyze patterns within Genesis quadrants/palettes
    // Each quadrant has 16 colors in the Genesis system
    for (let quadrant = 0; quadrant < 4; quadrant++) {
        const startIdx = quadrant * 16;
        const endIdx = startIdx + 15;
        
        // Skip if outside palette bounds
        if (startIdx >= palette1.length) continue;
        
        const quadrantAnalysis = {
            quadrant,
            exactMatches: 0,
            mappingToSameQuadrant: 0,
            mappingToOtherQuadrant: 0,
            unmapped: 0,
            exactMatchIndices: [],
            crossQuadrantMappings: []
        };
        
        for (let i = startIdx; i <= Math.min(endIdx, palette1.length - 1); i++) {
            if (result.paletteMappings[i] === -1) {
                quadrantAnalysis.unmapped++;
            } else if (result.paletteMappings[i] >= startIdx && result.paletteMappings[i] <= endIdx) {
                // Maps to same quadrant
                if (i === result.paletteMappings[i]) {
                    quadrantAnalysis.exactMatches++;
                    quadrantAnalysis.exactMatchIndices.push(i);
                }
                quadrantAnalysis.mappingToSameQuadrant++;
            } else {
                // Maps to different quadrant
                quadrantAnalysis.mappingToOtherQuadrant++;
                quadrantAnalysis.crossQuadrantMappings.push({
                    fromIndex: i,
                    toIndex: result.paletteMappings[i],
                    toQuadrant: Math.floor(result.paletteMappings[i] / 16)
                });
            }
        }
        
        result.comparisonByQuadrant.push(quadrantAnalysis);
    }
    
    // Find consistent color shift patterns
    const shifts = result.colorShifts;
    if (shifts.length > 0) {
        // Group by similar shifts
        const shiftGroups = {};
        for (const shift of shifts) {
            const key = `${Math.round(shift.rDiff/5)},${Math.round(shift.gDiff/5)},${Math.round(shift.bDiff/5)}`;
            if (!shiftGroups[key]) {
                shiftGroups[key] = [];
            }
            shiftGroups[key].push(shift);
        }
        
        // Find most common shift patterns
        result.commonShiftPatterns = Object.entries(shiftGroups)
            .map(([key, group]) => ({ 
                pattern: key, 
                count: group.length, 
                examples: group.slice(0, 3),
                averageShift: calculateAverageShift(group)
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    }
    
    return result;
}

// Helper functions
function colorsEqual(color1, color2) {
    return color1[0] === color2[0] && color1[1] === color2[1] && color1[2] === color2[2];
}

function colorDistance(color1, color2) {
    return Math.sqrt(
        Math.pow(color1[0] - color2[0], 2) +
        Math.pow(color1[1] - color2[1], 2) +
        Math.pow(color1[2] - color2[2], 2)
    );
}

function calculateAverageShift(shifts) {
    const total = shifts.reduce((acc, shift) => {
        acc.r += shift.rDiff;
        acc.g += shift.gDiff;
        acc.b += shift.bDiff;
        return acc;
    }, { r: 0, g: 0, b: 0 });
    
    return {
        r: Math.round(total.r / shifts.length),
        g: Math.round(total.g / shifts.length),
        b: Math.round(total.b / shifts.length)
    };
}

/**
 * Perform tile-by-tile analysis to detect pattern misalignments
 * @param {Object} img1 - First image data
 * @param {Object} img2 - Second image data
 * @param {Object} paletteMappings - Palette mappings between the two images
 * @returns {Object} Tile analysis results
 */
function analyzeTilePatterns(img1, img2, paletteMappings) {
    const tileSize = 8;
    const width = img1.width;
    const height = img1.height;
    
    const tileRows = Math.floor(height / tileSize);
    const tileCols = Math.floor(width / tileSize);
    
    const tileAnalysis = {
        totalTiles: tileRows * tileCols,
        problematicTiles: [],
        tilesByIssueType: {
            paletteIssues: [],
            indexShifts: [],
            dataCorruption: []
        },
        rowAnalysis: new Array(tileRows).fill(0).map(() => ({ 
            tiles: 0, 
            problemTiles: 0,
            issueTypes: { paletteIssues: 0, indexShifts: 0, dataCorruption: 0 }
        })),
        issueSummary: {}
    };
    
    // Analyze each 8x8 tile
    for (let tileY = 0; tileY < tileRows; tileY++) {
        for (let tileX = 0; tileX < tileCols; tileX++) {
            tileAnalysis.rowAnalysis[tileY].tiles++;
            
            // Extract tile pixel data
            const tile1Data = [];
            const tile2Data = [];
            const tileDifferences = [];
            let differentPixels = 0;
            
            for (let y = 0; y < tileSize; y++) {
                for (let x = 0; x < tileSize; x++) {
                    const pixelPos = ((tileY * tileSize) + y) * width + ((tileX * tileSize) + x);
                    
                    if (pixelPos < img1.pixels.length && pixelPos < img2.pixels.length) {
                        const pixel1 = img1.pixels[pixelPos];
                        const pixel2 = img2.pixels[pixelPos];
                        
                        tile1Data.push(pixel1);
                        tile2Data.push(pixel2);
                        
                        if (pixel1 !== pixel2) {
                            differentPixels++;
                            tileDifferences.push({ x, y, pixel1, pixel2 });
                        }
                    }
                }
            }
            
            // Skip if no differences
            if (differentPixels === 0) continue;
            
            // Analyze the differences in this tile
            const analysis = analyzeTileDifferences(
                tile1Data, 
                tile2Data, 
                tileDifferences, 
                paletteMappings,
                tileSize
            );
            
            analysis.tileX = tileX;
            analysis.tileY = tileY;
            analysis.x = tileX * tileSize;
            analysis.y = tileY * tileSize;
            
            // Count the type of issue in row statistics
            if (analysis.issueType) {
                tileAnalysis.rowAnalysis[tileY].problemTiles++;
                tileAnalysis.rowAnalysis[tileY].issueTypes[analysis.issueType]++;
                
                // Add to tile issue types
                tileAnalysis.tilesByIssueType[analysis.issueType].push(analysis);
                
                // Track issue frequency
                tileAnalysis.issueSummary[analysis.issueType] = 
                    (tileAnalysis.issueSummary[analysis.issueType] || 0) + 1;
            }
            
            tileAnalysis.problematicTiles.push(analysis);
        }
    }
    
    // Sort problematic tiles by tile Y position for easier analysis
    tileAnalysis.problematicTiles.sort((a, b) => a.tileY - b.tileY || a.tileX - b.tileX);
    
    // Calculate problem tile percentage by row
    for (let i = 0; i < tileAnalysis.rowAnalysis.length; i++) {
        const row = tileAnalysis.rowAnalysis[i];
        row.problemPercentage = (row.problemTiles / row.tiles) * 100;
    }
    
    // Find rows with the highest percentage of problematic tiles
    tileAnalysis.worstRows = tileAnalysis.rowAnalysis
        .map((row, index) => ({ index, ...row }))
        .sort((a, b) => b.problemPercentage - a.problemPercentage)
        .slice(0, 10)
        .filter(row => row.problemPercentage > 0);
        
    return tileAnalysis;
}

/**
 * Analyze the differences in a single tile to determine the issue type
 */
function analyzeTileDifferences(tile1Data, tile2Data, differences, paletteMappings, tileSize) {
    const analysis = {
        differentPixels: differences.length,
        percentageDifferent: (differences.length / (tileSize * tileSize)) * 100,
        uniquePixelValues1: new Set(tile1Data).size,
        uniquePixelValues2: new Set(tile2Data).size,
        differences
    };
    
    // Check the nature of the differences
    
    // 1. Are all the differences mappable using palette mappings?
    let paletteMappingMatches = 0;
    for (const diff of differences) {
        if (paletteMappings[diff.pixel1] === diff.pixel2) {
            paletteMappingMatches++;
        }
    }
    analysis.paletteMappingMatches = paletteMappingMatches;
    
    // 2. Are pixels consistently offset (index shift)?
    const pixelDiffs = differences.map(d => d.pixel2 - d.pixel1);
    const uniqueDiffs = new Set(pixelDiffs);
    analysis.uniqueValueDiffs = uniqueDiffs.size;
    
    if (uniqueDiffs.size === 1) {
        analysis.consistentOffset = Array.from(uniqueDiffs)[0];
    }
    
    // 3. Look for patterns in the differences
    if (paletteMappingMatches / differences.length > 0.8) {
        // Most differences can be explained by palette mapping
        analysis.issueType = 'paletteIssues';
        analysis.description = 'Palette mapping issue';
    } else if (analysis.consistentOffset !== undefined) {
        // Consistent value offset suggests index shift
        analysis.issueType = 'indexShifts';
        analysis.description = `Index shift of ${analysis.consistentOffset}`;
    } else if (analysis.percentageDifferent > 70) {
        // Too many differences - likely data corruption
        analysis.issueType = 'dataCorruption';
        analysis.description = 'Possible data corruption';
    } else {
        // Mixed issues
        analysis.issueType = 'paletteIssues'; // Default to palette issues
        analysis.description = 'Mixed issues';
    }
    
    return analysis;
}

/**
 * Visually highlight the problematic tiles in an image
 */
function generateProblemTileImage(originalImg, extractedImg, tileAnalysis, outputPath) {
    const tileSize = 8;
    const width = originalImg.width;
    const height = originalImg.height;
    
    // Create output image same size as input
    const headerSize = 54; // 14 byte BMP header + 40 byte DIB header
    const paletteSize = 256 * 4; // 256 colors * 4 bytes (BGRA)
    const rowSize = Math.ceil(width / 4) * 4; // 4-byte aligned rows
    const pixelDataSize = rowSize * height;
    const fileSize = headerSize + paletteSize + pixelDataSize;
    
    const buffer = Buffer.alloc(fileSize);
    
    // BMP Header (14 bytes)
    buffer.write('BM', 0); // Magic number
    buffer.writeUInt32LE(fileSize, 2); // File size
    buffer.writeUInt32LE(0, 6); // Reserved
    buffer.writeUInt32LE(headerSize + paletteSize, 10); // Pixel data offset
    
    // DIB Header (40 bytes)
    buffer.writeUInt32LE(40, 14); // DIB header size
    buffer.writeInt32LE(width, 18); // Width
    buffer.writeInt32LE(-height, 22); // Height (negative for top-down)
    buffer.writeUInt16LE(1, 26); // Color planes
    buffer.writeUInt16LE(8, 28); // Bits per pixel (8bpp)
    buffer.writeUInt32LE(0, 30); // No compression
    buffer.writeUInt32LE(pixelDataSize, 34); // Image size
    buffer.writeUInt32LE(0, 38); // Horizontal resolution
    buffer.writeUInt32LE(0, 42); // Vertical resolution
    buffer.writeUInt32LE(0, 46); // Colors in palette (0 = 2^n)
    buffer.writeUInt32LE(0, 50); // Important colors (0 = all)
    
    // Copy original palette but create special colors for different issue types
    const paletteOffset = 54;
    
    // Create highlight colors for different issue types
    // Normal palette entries
    for (let i = 0; i < originalImg.palette.length; i++) {
        const color = originalImg.palette[i];
        buffer.writeUInt8(color[2], paletteOffset + i * 4); // Blue
        buffer.writeUInt8(color[1], paletteOffset + i * 4 + 1); // Green
        buffer.writeUInt8(color[0], paletteOffset + i * 4 + 2); // Red
        buffer.writeUInt8(0, paletteOffset + i * 4 + 3); // Alpha
    }
    
    // Special color for palette issues (RED)
    const paletteIssueColor = 250;
    buffer.writeUInt8(0, paletteOffset + paletteIssueColor * 4); // Blue
    buffer.writeUInt8(0, paletteOffset + paletteIssueColor * 4 + 1); // Green
    buffer.writeUInt8(255, paletteOffset + paletteIssueColor * 4 + 2); // Red
    buffer.writeUInt8(0, paletteOffset + paletteIssueColor * 4 + 3); // Alpha
    
    // Special color for index shifts (GREEN)
    const indexShiftColor = 251;
    buffer.writeUInt8(0, paletteOffset + indexShiftColor * 4); // Blue
    buffer.writeUInt8(255, paletteOffset + indexShiftColor * 4 + 1); // Green
    buffer.writeUInt8(0, paletteOffset + indexShiftColor * 4 + 2); // Red
    buffer.writeUInt8(0, paletteOffset + indexShiftColor * 4 + 3); // Alpha
    
    // Special color for data corruption (BLUE)
    const dataCorruptionColor = 252;
    buffer.writeUInt8(255, paletteOffset + dataCorruptionColor * 4); // Blue
    buffer.writeUInt8(0, paletteOffset + dataCorruptionColor * 4 + 1); // Green
    buffer.writeUInt8(0, paletteOffset + dataCorruptionColor * 4 + 2); // Red
    buffer.writeUInt8(0, paletteOffset + dataCorruptionColor * 4 + 3); // Alpha
    
    // Remaining palette entries
    for (let i = 253; i < 256; i++) {
        buffer.writeUInt8(128, paletteOffset + i * 4); // Blue
        buffer.writeUInt8(128, paletteOffset + i * 4 + 1); // Green
        buffer.writeUInt8(128, paletteOffset + i * 4 + 2); // Red
        buffer.writeUInt8(0, paletteOffset + i * 4 + 3); // Alpha
    }
    
    // Create a mapping of problematic tiles
    const problemTileMap = new Map();
    for (const tile of tileAnalysis.problematicTiles) {
        const key = `${tile.tileX},${tile.tileY}`;
        problemTileMap.set(key, tile);
    }
    
    // Write pixel data
    const pixelOffset = headerSize + paletteSize;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x;
            const tileX = Math.floor(x / tileSize);
            const tileY = Math.floor(y / tileSize);
            const key = `${tileX},${tileY}`;
            
            // Write original pixel data but highlight problematic tiles
            let pixelValue = originalImg.pixels[i];
            
            if (problemTileMap.has(key)) {
                const tile = problemTileMap.get(key);
                
                // Check if we're at the edge of the tile for border
                const isTileEdge = 
                    x % tileSize === 0 || 
                    x % tileSize === tileSize - 1 || 
                    y % tileSize === 0 || 
                    y % tileSize === tileSize - 1;
                
                if (isTileEdge) {
                    // Draw a border with appropriate color
                    switch (tile.issueType) {
                        case 'paletteIssues':
                            pixelValue = paletteIssueColor;
                            break;
                        case 'indexShifts':
                            pixelValue = indexShiftColor;
                            break;
                        case 'dataCorruption':
                            pixelValue = dataCorruptionColor;
                            break;
                    }
                }
            }
            
            buffer.writeUInt8(pixelValue, pixelOffset + y * rowSize + x);
        }
        
        // Pad row to multiple of 4 bytes
        for (let x = width; x < rowSize; x++) {
            buffer.writeUInt8(0, pixelOffset + y * rowSize + x);
        }
    }
    
    fs.writeFileSync(outputPath, buffer);
    console.log(`Problem tile visualization saved to ${outputPath}`);
}

function printTileAnalysisSummary(tileAnalysis) {
    console.log('\n=== TILE ANALYSIS SUMMARY ===');
    console.log(`Total tiles: ${tileAnalysis.totalTiles}`);
    console.log(`Problematic tiles: ${tileAnalysis.problematicTiles.length} (${(tileAnalysis.problematicTiles.length / tileAnalysis.totalTiles * 100).toFixed(2)}%)`);
    
    console.log('\nIssue types:');
    for (const [issueType, count] of Object.entries(tileAnalysis.issueSummary)) {
        console.log(`- ${issueType}: ${count} tiles (${(count / tileAnalysis.problematicTiles.length * 100).toFixed(2)}%)`);
    }
    
    console.log('\nMost problematic rows (by % of tiles with issues):');
    tileAnalysis.worstRows.slice(0, 5).forEach(row => {
        console.log(`- Row ${row.index} (tile row): ${row.problemTiles}/${row.tiles} tiles (${row.problemPercentage.toFixed(2)}%)`);
        console.log(`  Issue breakdown: Palette issues: ${row.issueTypes.paletteIssues}, Index shifts: ${row.issueTypes.indexShifts}, Data corruption: ${row.issueTypes.dataCorruption}`);
    });
}

function printPaletteAnalysisSummary(paletteComparison) {
    console.log('\n=== PALETTE COMPARISON SUMMARY ===');
    console.log(`Exact matches: ${paletteComparison.exactMatches.length}`);
    console.log(`Similar matches: ${paletteComparison.similarMatches.length}`);
    console.log(`Unmapped colors in original: ${paletteComparison.unmappedIndices1.length}`);
    console.log(`Unmapped colors in extracted: ${paletteComparison.unmappedIndices2.length}`);
    
    if (paletteComparison.commonShiftPatterns && paletteComparison.commonShiftPatterns.length > 0) {
        console.log('\nCommon color shift patterns:');
        paletteComparison.commonShiftPatterns.forEach(pattern => {
            console.log(`- Pattern affecting ${pattern.count} colors: Average RGB shift (${pattern.averageShift.r}, ${pattern.averageShift.g}, ${pattern.averageShift.b})`);
        });
    }
    
    console.log('\nQuadrant analysis (16-color blocks):');
    paletteComparison.comparisonByQuadrant.forEach(q => {
        console.log(`- Quadrant ${q.quadrant} (indices ${q.quadrant*16}-${q.quadrant*16+15}):`);
        console.log(`  Exact matches: ${q.exactMatches}, Same quadrant mappings: ${q.mappingToSameQuadrant}, Cross-quadrant mappings: ${q.mappingToOtherQuadrant}, Unmapped: ${q.unmapped}`);
        
        if (q.crossQuadrantMappings.length > 0) {
            console.log('  Cross-quadrant mappings:');
            q.crossQuadrantMappings.slice(0, 5).forEach(mapping => {
                console.log(`    Index ${mapping.fromIndex} -> ${mapping.toIndex} (quadrant ${mapping.toQuadrant})`);
            });
        }
    });
}

// Main function
function analyzeAndCompareImages(originalPath, extractedPath) {
    const outputDir = path.join(path.dirname(extractedPath), 'detailed-analysis');
    try {
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
    } catch (err) {
        console.error(`Error creating directory ${outputDir}:`, err);
    }
    
    console.log('=== ADVANCED IMAGE COMPARISON ANALYSIS ===\n');
    
    // Read and analyze the images
    const originalImg = readBMPDataDetailed(originalPath);
    const extractedImg = readBMPDataDetailed(extractedPath);
    
    if (!originalImg || !extractedImg) {
        console.error('Failed to read one or both of the images.');
        return;
    }
    
    // Compare image dimensions
    if (originalImg.width !== extractedImg.width || originalImg.height !== extractedImg.height) {
        console.error(`Image dimensions don't match: ${originalImg.width}x${originalImg.height} vs ${extractedImg.width}x${extractedImg.height}`);
        return;
    }
    
    // Advanced palette comparison
    console.log('\n=== ADVANCED PALETTE COMPARISON ===');
    const paletteComparison = comparePalettesDetailed(originalImg.palette, extractedImg.palette);
    printPaletteAnalysisSummary(paletteComparison);
    
    // Count pixel differences
    let pixelDiffs = 0;
    const height = originalImg.height;
    const width = originalImg.width;
    const regionSize = Math.floor(height / 3);
    const regionDiffs = [0, 0, 0]; // top, middle, bottom
    
    for (let i = 0; i < originalImg.pixels.length; i++) {
        if (originalImg.pixels[i] !== extractedImg.pixels[i]) {
            pixelDiffs++;
            
            // Calculate which region this pixel is in
            const y = Math.floor(i / originalImg.width);
            const region = Math.floor(y / regionSize);
            if (region < 3) {
                regionDiffs[region]++;
            }
        }
    }
    
    console.log(`\nPixel differences: ${pixelDiffs} out of ${originalImg.pixels.length} (${(pixelDiffs / originalImg.pixels.length * 100).toFixed(2)}%)`);
    console.log(`Differences by region: Top: ${regionDiffs[0]} (${(regionDiffs[0] / (width * regionSize) * 100).toFixed(2)}%), Middle: ${regionDiffs[1]} (${(regionDiffs[1] / (width * regionSize) * 100).toFixed(2)}%), Bottom: ${regionDiffs[2]} (${(regionDiffs[2] / (width * regionSize) * 100).toFixed(2)}%)`);
    
    // Analyze tile patterns
    console.log('\n=== TILE PATTERN ANALYSIS ===');
    const tileAnalysis = analyzeTilePatterns(originalImg, extractedImg, paletteComparison.paletteMappings);
    printTileAnalysisSummary(tileAnalysis);
    
    // Generate visualization images
    const tileVisPath = path.join(outputDir, 'tile-issues.bmp');
    generateProblemTileImage(originalImg, extractedImg, tileAnalysis, tileVisPath);
    
    // Generate standard difference image (black/red)
    const diffImagePath = path.join(outputDir, 'pixel-differences.bmp');
    generateDifferenceImage(originalImg, extractedImg, diffImagePath);
    
    // Save detailed analysis results
    const resultPath = path.join(outputDir, 'detailed-analysis-results.json');
    fs.writeFileSync(resultPath, JSON.stringify({
        palette: {
            exactMatches: paletteComparison.exactMatches.length,
            similarMatches: paletteComparison.similarMatches.length,
            unmapped1: paletteComparison.unmappedIndices1.length,
            unmapped2: paletteComparison.unmappedIndices2.length,
            commonShiftPatterns: paletteComparison.commonShiftPatterns,
            quadrantAnalysis: paletteComparison.comparisonByQuadrant
        },
        pixels: {
            totalDifferences: pixelDiffs,
            percentageDifferent: (pixelDiffs / originalImg.pixels.length * 100),
            regionDifferences: regionDiffs
        },
        tiles: {
            totalTiles: tileAnalysis.totalTiles,
            problematicTiles: tileAnalysis.problematicTiles.length,
            issueSummary: tileAnalysis.issueSummary,
            worstRows: tileAnalysis.worstRows.slice(0, 10)
        }
    }, null, 2));
    
    console.log(`\nDetailed analysis results saved to ${resultPath}`);
    
    return {
        paletteComparison,
        pixelDifferences: pixelDiffs,
        regionDifferences: regionDiffs,
        tileAnalysis
    };
}

function generateDifferenceImage(originalImg, extractedImg, outputPath) {
    if (originalImg.width !== extractedImg.width || originalImg.height !== extractedImg.height) {
        console.log("Cannot generate difference image for images with different dimensions");
        return;
    }
    
    // Create a new 8bpp BMP file with red pixels where there are differences
    const width = originalImg.width;
    const height = originalImg.height;
    const headerSize = 54; // 14 byte BMP header + 40 byte DIB header
    const paletteSize = 256 * 4; // 256 colors * 4 bytes (BGRA)
    const rowSize = Math.ceil(width / 4) * 4; // 4-byte aligned rows
    const pixelDataSize = rowSize * height;
    const fileSize = headerSize + paletteSize + pixelDataSize;
    
    const buffer = Buffer.alloc(fileSize);
    
    // BMP Header (14 bytes)
    buffer.write('BM', 0); // Magic number
    buffer.writeUInt32LE(fileSize, 2); // File size
    buffer.writeUInt32LE(0, 6); // Reserved
    buffer.writeUInt32LE(headerSize + paletteSize, 10); // Pixel data offset
    
    // DIB Header (40 bytes)
    buffer.writeUInt32LE(40, 14); // DIB header size
    buffer.writeInt32LE(width, 18); // Width
    buffer.writeInt32LE(-height, 22); // Height (negative for top-down)
    buffer.writeUInt16LE(1, 26); // Color planes
    buffer.writeUInt16LE(8, 28); // Bits per pixel (8bpp)
    buffer.writeUInt32LE(0, 30); // No compression
    buffer.writeUInt32LE(pixelDataSize, 34); // Image size
    buffer.writeUInt32LE(0, 38); // Horizontal resolution
    buffer.writeUInt32LE(0, 42); // Vertical resolution
    buffer.writeUInt32LE(0, 46); // Colors in palette (0 = 2^n)
    buffer.writeUInt32LE(0, 50); // Important colors (0 = all)
    
    // Palette (256 * 4 bytes)
    // Index 0: Black
    buffer.writeUInt8(0, 54); // Blue
    buffer.writeUInt8(0, 55); // Green
    buffer.writeUInt8(0, 56); // Red
    buffer.writeUInt8(0, 57); // Alpha
    
    // Index 1: Red
    buffer.writeUInt8(0, 58); // Blue
    buffer.writeUInt8(0, 59); // Green
    buffer.writeUInt8(255, 60); // Red
    buffer.writeUInt8(0, 61); // Alpha
    
    // Fill remaining palette with grayscale values
    for (let i = 2; i < 256; i++) {
        const gray = Math.min(255, i);
        buffer.writeUInt8(gray, 54 + i * 4); // Blue
        buffer.writeUInt8(gray, 55 + i * 4); // Green
        buffer.writeUInt8(gray, 56 + i * 4); // Red
        buffer.writeUInt8(0, 57 + i * 4); // Alpha
    }
    
    // Pixel data
    const pixelOffset = headerSize + paletteSize;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x;
            const isDifferent = originalImg.pixels[i] !== extractedImg.pixels[i] ? 1 : 0;
            buffer.writeUInt8(isDifferent, pixelOffset + y * rowSize + x);
        }
        
        // Pad row to 4 bytes
        for (let x = width; x < rowSize; x++) {
            buffer.writeUInt8(0, pixelOffset + y * rowSize + x);
        }
    }
    
    fs.writeFileSync(outputPath, buffer);
    console.log(`Simple difference image saved to ${outputPath}`);
}

// Check for command-line arguments
if (process.argv.length < 4) {
    console.log('Usage: node advanced-bmp-compare.js <original-bmp> <extracted-bmp>');
    process.exit(1);
}

// Get file paths from command-line arguments
const originalPath = process.argv[2];
const extractedPath = process.argv[3];

// Run the analysis
analyzeAndCompareImages(originalPath, extractedPath);
