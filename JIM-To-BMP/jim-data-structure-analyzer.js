import fs from 'fs';
import path from 'path';

/**
 * Deep analyze JIM file structure to identify potential issues with data layout
 * 
 * This script addresses potential issues with:
 * 1. Tile data corruption
 * 2. Palette mapping and boundary issues
 * 3. Validating offsets and data sections
 * 4. Analyzing tile pattern reuse to detect offset issues
 */

// Define known JIM file structure
const JIM_HEADER_SIZE = 10; // 10 bytes: 4 palette offset, 4 map offset, 2 numTiles

/**
 * Read a JIM file and analyze its structure
 * @param {string} filePath - Path to JIM file
 * @returns {Object} Analysis results
 */
function analyzeJimFile(filePath) {
    console.log(`Analyzing JIM file: ${filePath}`);
    const buffer = fs.readFileSync(filePath);
    const result = {
        fileSize: buffer.length,
        fileName: path.basename(filePath),
        declaredOffsets: {},
        detectedOffsets: {},
        tileData: {},
        paletteData: {},
        mapData: {},
        tileUsage: {},
        potentialIssues: []
    };

    // Read header declared offsets
    result.declaredOffsets.paletteOffset = buffer.readUInt32BE(0);
    result.declaredOffsets.mapOffset = buffer.readUInt32BE(4);
    result.declaredOffsets.numTiles = buffer.readUInt16BE(8);

    console.log(`File size: ${buffer.length} bytes`);
    console.log(`Declared header info:`);
    console.log(`- Palette offset: 0x${result.declaredOffsets.paletteOffset.toString(16).toUpperCase()} (${result.declaredOffsets.paletteOffset})`);
    console.log(`- Map offset: 0x${result.declaredOffsets.mapOffset.toString(16).toUpperCase()} (${result.declaredOffsets.mapOffset})`);
    console.log(`- Number of tiles: ${result.declaredOffsets.numTiles}`);

    // Validate declared offsets
    if (result.declaredOffsets.paletteOffset >= buffer.length) {
        result.potentialIssues.push({
            type: 'CRITICAL',
            description: 'Palette offset is beyond file size',
            details: `Offset: 0x${result.declaredOffsets.paletteOffset.toString(16).toUpperCase()}, file size: ${buffer.length}`
        });
    }

    if (result.declaredOffsets.mapOffset >= buffer.length) {
        result.potentialIssues.push({
            type: 'CRITICAL',
            description: 'Map offset is beyond file size',
            details: `Offset: 0x${result.declaredOffsets.mapOffset.toString(16).toUpperCase()}, file size: ${buffer.length}`
        });
    }

    // Calculate expected tile data section size
    const expectedTileDataSize = result.declaredOffsets.numTiles * 32;
    const expectedTileDataEnd = JIM_HEADER_SIZE + expectedTileDataSize;
    
    if (expectedTileDataEnd > buffer.length) {
        result.potentialIssues.push({
            type: 'CRITICAL',
            description: 'Tile data would extend beyond file size',
            details: `Expected ${expectedTileDataSize} bytes for ${result.declaredOffsets.numTiles} tiles, 
                      ending at offset 0x${expectedTileDataEnd.toString(16).toUpperCase()}, 
                      but file size is ${buffer.length}`
        });
    }

    // Perform heuristic analysis to find actual data sections
    const detectedOffsets = detectDataSections(buffer);
    result.detectedOffsets = detectedOffsets;

    console.log('\nDetected data sections:');
    console.log(`- Tile data: 0x${detectedOffsets.tileOffset.toString(16).toUpperCase()} - 0x${detectedOffsets.tileEnd.toString(16).toUpperCase()}`);
    console.log(`- Palette data: 0x${detectedOffsets.paletteOffset.toString(16).toUpperCase()} - 0x${detectedOffsets.paletteEnd.toString(16).toUpperCase()}`);
    console.log(`- Map data: 0x${detectedOffsets.mapOffset.toString(16).toUpperCase()} - 0x${detectedOffsets.mapEnd.toString(16).toUpperCase()}`);

    // Check for mismatches between declared and detected offsets
    if (result.declaredOffsets.paletteOffset !== detectedOffsets.paletteOffset) {
        result.potentialIssues.push({
            type: 'WARNING',
            description: 'Palette offset mismatch',
            details: `Declared: 0x${result.declaredOffsets.paletteOffset.toString(16).toUpperCase()}, 
                      Detected: 0x${detectedOffsets.paletteOffset.toString(16).toUpperCase()}`
        });
    }

    if (result.declaredOffsets.mapOffset !== detectedOffsets.mapOffset) {
        result.potentialIssues.push({
            type: 'WARNING',
            description: 'Map offset mismatch',
            details: `Declared: 0x${result.declaredOffsets.mapOffset.toString(16).toUpperCase()}, 
                      Detected: 0x${detectedOffsets.mapOffset.toString(16).toUpperCase()}`
        });
    }

    // Analyze tile data for corruption or patterns
    const tilesInfo = analyzeTiles(buffer, detectedOffsets);
    result.tileData = tilesInfo;

    // Analyze palette data
    const paletteInfo = analyzePalettes(buffer, detectedOffsets);
    result.paletteData = paletteInfo;

    // Analyze map data and tile usage
    const mapInfo = analyzeMapData(buffer, detectedOffsets, result.tileData.numTiles);
    result.mapData = mapInfo;
    result.tileUsage = mapInfo.tileUsage;

    // Check for unused or over-used tiles
    const unusedTiles = tilesInfo.statistics.unusedTiles;
    if (unusedTiles.length > 0) {
        result.potentialIssues.push({
            type: 'INFO',
            description: `${unusedTiles.length} unused tiles detected`,
            details: `Tile indices: ${unusedTiles.length > 10 ? 
                unusedTiles.slice(0, 10).join(', ') + '...' : 
                unusedTiles.join(', ')}`
        });
    }

    // Check for tiles referenced beyond the declared count
    const invalidTiles = mapInfo.invalidTileRefs;
    if (invalidTiles.length > 0) {
        result.potentialIssues.push({
            type: 'ERROR',
            description: 'Map references tiles beyond the available count',
            details: `${invalidTiles.length} references to invalid tiles found. 
                      Total tiles: ${tilesInfo.numTiles}, 
                      Invalid references: ${invalidTiles.slice(0, 5).join(', ')}${invalidTiles.length > 5 ? '...' : ''}`
        });
    }

    // Check if map data is consistent
    if (!mapInfo.consistent) {
        result.potentialIssues.push({
            type: 'ERROR',
            description: 'Map data appears to be inconsistent or corrupted',
            details: mapInfo.issues.join('; ')
        });
    }

    // Check if tile data between declared and actual end is potentially meaningful
    if (detectedOffsets.tileEnd < detectedOffsets.paletteOffset) {
        const gapSize = detectedOffsets.paletteOffset - detectedOffsets.tileEnd;
        if (gapSize > 32) { // At least one tile worth of data
            result.potentialIssues.push({
                type: 'WARNING',
                description: 'Gap between tile data end and palette start',
                details: `${gapSize} bytes of potentially unused data between 
                          0x${detectedOffsets.tileEnd.toString(16).toUpperCase()} and 
                          0x${detectedOffsets.paletteOffset.toString(16).toUpperCase()}`
            });
        }
    }

    // Look for potential pattern errors in tiles or duplicate tile patterns
    analyzePatternErrors(result);

    return result;
}

/**
 * Analyze patterns across tiles to detect potential data corruption or duplication
 */
function analyzePatternErrors(result) {
    const duplicateTiles = result.tileData.statistics.duplicateTiles;
    
    if (duplicateTiles.length > 0) {
        // Analyze if there's a pattern to the duplication
        const sequences = findSequentialDuplicates(duplicateTiles);
        
        if (sequences.length > 0) {
            result.potentialIssues.push({
                type: 'WARNING',
                description: 'Sequential duplicate tiles detected',
                details: `Found ${sequences.length} sequences of sequential duplicate tiles.
                          This may indicate a tile data offset issue or corruption.
                          Example: Tiles ${sequences[0].start}-${sequences[0].end} are duplicated.`
            });
        } else {
            result.potentialIssues.push({
                type: 'INFO',
                description: 'Duplicate tiles detected',
                details: `${duplicateTiles.length} duplicate tile patterns found. 
                          This may be normal for repeated graphics.`
            });
        }
    }
    
    // Check for potential corrupted tiles
    const corruptedTiles = result.tileData.statistics.potentiallyCorruptedTiles;
    if (corruptedTiles.length > 0) {
        result.potentialIssues.push({
            type: 'ERROR',
            description: 'Potentially corrupted tiles detected',
            details: `${corruptedTiles.length} tiles appear to have unusual patterns.
                      Tile indices: ${corruptedTiles.slice(0, 5).join(', ')}${corruptedTiles.length > 5 ? '...' : ''}`
        });
    }
}

/**
 * Find sequences of consecutive numbers in a list
 */
function findSequentialDuplicates(duplicateTileIndices) {
    // Sort the indices
    const sortedIndices = [...duplicateTileIndices].sort((a, b) => a - b);
    
    const sequences = [];
    let currentSeq = { start: sortedIndices[0], end: sortedIndices[0] };
    
    for (let i = 1; i < sortedIndices.length; i++) {
        if (sortedIndices[i] === sortedIndices[i-1] + 1) {
            // Continue the sequence
            currentSeq.end = sortedIndices[i];
        } else {
            // End of sequence
            if (currentSeq.end > currentSeq.start) {
                sequences.push({...currentSeq});
            }
            currentSeq = { start: sortedIndices[i], end: sortedIndices[i] };
        }
    }
    
    // Add the last sequence if it's valid
    if (currentSeq.end > currentSeq.start) {
        sequences.push(currentSeq);
    }
    
    return sequences;
}

/**
 * Use heuristics to detect the actual data sections in the file
 */
function detectDataSections(buffer) {
    // Start with known locations
    const tileOffset = JIM_HEADER_SIZE; // Tiles start after the header
    const numTiles = buffer.readUInt16BE(8);
    
    // Expected tile data end
    const expectedTileEnd = tileOffset + (numTiles * 32);
    
    // Try to validate the declared offsets first
    const declaredPaletteOffset = buffer.readUInt32BE(0);
    const declaredMapOffset = buffer.readUInt32BE(4);
    
    // Find palette data with pattern matching
    let paletteOffset = -1;
    let paletteEnd = -1;
    
    // Look for 4 consecutive palettes (64 words, 128 bytes)
    for (let offset = expectedTileEnd; offset < buffer.length - 128; offset++) {
        let validPaletteFound = true;
        
        // Check 4 palettes
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 16; j++) {
                const colorOffset = offset + (i * 32) + (j * 2);
                const colorValue = buffer.readUInt16BE(colorOffset);
                
                // Check Genesis color format pattern: 0000BBB0GGG0RRR0
                if ((colorValue & 0xF000) !== 0 || (colorValue & 0x0008) !== 0 || 
                    (colorValue & 0x0080) !== 0 || (colorValue & 0x0001) !== 0) {
                    validPaletteFound = false;
                    break;
                }
            }
            if (!validPaletteFound) break;
        }
        
        if (validPaletteFound) {
            paletteOffset = offset;
            paletteEnd = offset + 128; // 4 palettes x 16 colors x 2 bytes
            break;
        }
    }
    
    // If palette offset not found, use declared one if it's valid
    if (paletteOffset === -1 && declaredPaletteOffset > 0 && declaredPaletteOffset < buffer.length - 128) {
        paletteOffset = declaredPaletteOffset;
        paletteEnd = paletteOffset + 128;
    }
    
    // Find map data by looking for plausible width/height values
    let mapOffset = -1;
    let mapEnd = -1;
    let mapWidth = 0;
    let mapHeight = 0;
    
    // Start searching after the palette data or after tiles if palette not found
    const searchStart = paletteOffset !== -1 ? paletteEnd : expectedTileEnd;
    
    for (let offset = searchStart; offset < buffer.length - 4; offset++) {
        const width = buffer.readUInt16BE(offset);
        const height = buffer.readUInt16BE(offset + 2);
        
        // Reasonable map dimensions for Sega Genesis
        if (width > 0 && width <= 256 && height > 0 && height <= 256) {
            // Calculate if we have enough data for this map
            const mapDataSize = width * height * 2; // 2 bytes per tile reference
            
            if (offset + 4 + mapDataSize <= buffer.length) {
                mapOffset = offset;
                mapWidth = width;
                mapHeight = height;
                mapEnd = offset + 4 + mapDataSize;
                break;
            }
        }
    }
    
    // If map offset not found, use declared one if it's valid
    if (mapOffset === -1 && declaredMapOffset > 0 && declaredMapOffset < buffer.length - 4) {
        mapOffset = declaredMapOffset;
        
        // Try to read width and height
        if (mapOffset + 4 <= buffer.length) {
            mapWidth = buffer.readUInt16BE(mapOffset);
            mapHeight = buffer.readUInt16BE(mapOffset + 2);
            
            // Validate dimensions
            if (mapWidth > 0 && mapWidth <= 256 && mapHeight > 0 && mapHeight <= 256) {
                const mapDataSize = mapWidth * mapHeight * 2;
                
                if (mapOffset + 4 + mapDataSize <= buffer.length) {
                    mapEnd = mapOffset + 4 + mapDataSize;
                }
            }
        }
    }
    
    return {
        tileOffset,
        tileEnd: paletteOffset !== -1 ? Math.min(expectedTileEnd, paletteOffset) : expectedTileEnd,
        numTiles,
        paletteOffset,
        paletteEnd,
        mapOffset,
        mapEnd,
        mapWidth,
        mapHeight
    };
}

/**
 * Analyze the tile data for patterns, repetition, and potential corruption
 */
function analyzeTiles(buffer, offsets) {
    const result = {
        numTiles: 0,
        tiles: [],
        statistics: {
            emptyTiles: [],
            duplicateTiles: [],
            uniqueTilePatterns: 0,
            potentiallyCorruptedTiles: [],
            unusedTiles: []
        }
    };
    
    // Determine actual number of tiles that fit in the section
    const tileDataSize = offsets.paletteOffset - offsets.tileOffset;
    const numTiles = Math.floor(tileDataSize / 32);
    
    result.numTiles = numTiles;
    
    // Check if different from declared number of tiles
    const declaredNumTiles = buffer.readUInt16BE(8);
    if (numTiles !== declaredNumTiles) {
        console.log(`Warning: Declared number of tiles (${declaredNumTiles}) differs from calculated (${numTiles})`);
    }
    
    // Extract tiles and analyze patterns
    const tileHashes = new Map(); // For detecting duplicates
    const tileBuffer = buffer.subarray(offsets.tileOffset, offsets.tileOffset + (numTiles * 32));
    
    for (let i = 0; i < numTiles; i++) {
        const tileData = tileBuffer.subarray(i * 32, (i + 1) * 32);
        const tileHash = hashTileData(tileData);
        
        // Track unique patterns
        if (!tileHashes.has(tileHash)) {
            tileHashes.set(tileHash, [i]);
        } else {
            tileHashes.get(tileHash).push(i);
        }
        
        // Check for empty tiles (all zeros or all the same value)
        if (isEmptyTile(tileData)) {
            result.statistics.emptyTiles.push(i);
        }
        
        // Check for potentially corrupted tiles (unusual pattern distribution)
        if (isPotentiallyCorrupted(tileData)) {
            result.statistics.potentiallyCorruptedTiles.push(i);
        }
        
        // Add tile metadata
        result.tiles.push({
            index: i,
            offset: offsets.tileOffset + (i * 32),
            hash: tileHash
        });
    }
    
    // Find duplicate tiles
    for (const [hash, indices] of tileHashes.entries()) {
        if (indices.length > 1) {
            // First tile is the "original", rest are duplicates
            result.statistics.duplicateTiles.push(...indices.slice(1));
        }
    }
    
    result.statistics.uniqueTilePatterns = tileHashes.size;
    
    return result;
}

/**
 * Calculate a simple hash of tile data for comparison
 */
function hashTileData(tileData) {
    // Create a simple hash by combining byte values
    let hash = 0;
    for (let i = 0; i < tileData.length; i++) {
        hash = ((hash << 5) - hash) + tileData[i];
        hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
}

/**
 * Check if a tile is empty (all zeros or all the same value)
 */
function isEmptyTile(tileData) {
    // Check if all bytes are zero
    let allZero = true;
    for (let i = 0; i < tileData.length; i++) {
        if (tileData[i] !== 0) {
            allZero = false;
            break;
        }
    }
    if (allZero) return true;
    
    // Check if all bytes are the same value
    const firstByte = tileData[0];
    let allSame = true;
    for (let i = 1; i < tileData.length; i++) {
        if (tileData[i] !== firstByte) {
            allSame = false;
            break;
        }
    }
    return allSame;
}

/**
 * Check if a tile is potentially corrupted based on patterns
 */
function isPotentiallyCorrupted(tileData) {
    // For Genesis 8x8 4bpp tiles, each row is 4 bytes
    // Check for unusual patterns that might indicate corruption
    
    // Count the number of unique bytes
    const uniqueBytes = new Set();
    for (let i = 0; i < tileData.length; i++) {
        uniqueBytes.add(tileData[i]);
    }
    
    // Abnormally high entropy might indicate random/corrupt data
    // Normal tiles usually have some repetition of patterns
    const entropy = uniqueBytes.size / tileData.length;
    
    // Check for sudden changes in byte patterns
    let abruptChanges = 0;
    for (let row = 0; row < 7; row++) {
        const currentRowStart = row * 4;
        const nextRowStart = (row + 1) * 4;
        
        // Count significant differences between adjacent rows
        let rowDifference = 0;
        for (let i = 0; i < 4; i++) {
            const diff = Math.abs(tileData[currentRowStart + i] - tileData[nextRowStart + i]);
            if (diff > 128) rowDifference++;
        }
        
        if (rowDifference >= 3) abruptChanges++;
    }
    
    // Criteria for potentially corrupted tile
    return entropy > 0.9 || abruptChanges >= 4;
}

/**
 * Analyze palette data for potential issues
 */
function analyzePalettes(buffer, offsets) {
    if (offsets.paletteOffset === -1 || offsets.paletteEnd === -1) {
        return { error: "Palette data not found" };
    }
    
    const result = {
        palettes: [],
        statistics: {
            colors: []
        }
    };
    
    // Genesis has 4 palettes of 16 colors each
    for (let p = 0; p < 4; p++) {
        const palette = [];
        for (let c = 0; c < 16; c++) {
            const colorOffset = offsets.paletteOffset + (p * 32) + (c * 2);
            
            if (colorOffset + 2 <= buffer.length) {
                const colorValue = buffer.readUInt16BE(colorOffset);
                
                // Extract color components
                const blue = (colorValue >> 9) & 0x07;
                const green = (colorValue >> 5) & 0x07;
                const red = (colorValue >> 1) & 0x07;
                
                palette.push({
                    value: colorValue,
                    rgb: [red, green, blue],
                    offset: colorOffset
                });
            }
        }
        
        result.palettes.push(palette);
    }
    
    // Analyze palette for common patterns
    result.statistics.duplicateColors = findDuplicateColors(result.palettes);
    result.statistics.colorDistribution = analyzeColorDistribution(result.palettes);
    
    return result;
}

/**
 * Find duplicate colors across palettes
 */
function findDuplicateColors(palettes) {
    const colorMap = new Map();
    const duplicates = [];
    
    for (let p = 0; p < palettes.length; p++) {
        const palette = palettes[p];
        
        for (let c = 0; c < palette.length; c++) {
            const color = palette[c];
            const colorKey = `${color.rgb[0]},${color.rgb[1]},${color.rgb[2]}`;
            
            if (!colorMap.has(colorKey)) {
                colorMap.set(colorKey, [{ palette: p, index: c, color }]);
            } else {
                colorMap.get(colorKey).push({ palette: p, index: c, color });
            }
        }
    }
    
    // Collect duplicates
    for (const [colorKey, instances] of colorMap.entries()) {
        if (instances.length > 1) {
            duplicates.push({
                color: colorKey,
                instances
            });
        }
    }
    
    return duplicates;
}

/**
 * Analyze color distribution across palettes
 */
function analyzeColorDistribution(palettes) {
    // Count occurrences of each color intensity
    const redFreq = new Array(8).fill(0);
    const greenFreq = new Array(8).fill(0);
    const blueFreq = new Array(8).fill(0);
    
    for (const palette of palettes) {
        for (const color of palette) {
            redFreq[color.rgb[0]]++;
            greenFreq[color.rgb[1]]++;
            blueFreq[color.rgb[2]]++;
        }
    }
    
    return { redFreq, greenFreq, blueFreq };
}

/**
 * Analyze map data and collect tile usage statistics
 */
function analyzeMapData(buffer, offsets, numTiles) {
    if (offsets.mapOffset === -1 || offsets.mapEnd === -1) {
        return { error: "Map data not found" };
    }
    
    const result = {
        width: offsets.mapWidth,
        height: offsets.mapHeight,
        tileMap: [],
        tileUsage: {},
        palettesUsed: new Set(),
        invalidTileRefs: [],
        consistent: true,
        issues: []
    };
    
    // Early validation
    if (result.width <= 0 || result.width > 256 || result.height <= 0 || result.height > 256) {
        result.consistent = false;
        result.issues.push(`Invalid map dimensions: ${result.width}x${result.height}`);
        return result;
    }
    
    // Read tile map
    let offset = offsets.mapOffset + 4; // Skip width and height
    
    for (let y = 0; y < result.height; y++) {
        const row = [];
        
        for (let x = 0; x < result.width; x++) {
            if (offset + 2 > buffer.length) {
                result.consistent = false;
                result.issues.push(`Map data truncated at ${x},${y}`);
                break;
            }
            
            const tileWord = buffer.readUInt16BE(offset);
            offset += 2;
            
            // Extract tile properties
            const tileIndex = tileWord & 0x7FF;
            const hFlip = (tileWord >> 11) & 1;
            const vFlip = (tileWord >> 12) & 1;
            const palIndex = (tileWord >> 13) & 0x03;
            const priority = (tileWord >> 15) & 1;
            
            // Track unique palettes used
            result.palettesUsed.add(palIndex);
            
            // Check if tile index is valid
            if (tileIndex >= numTiles) {
                result.invalidTileRefs.push(tileIndex);
            }
            
            // Track tile usage
            if (!result.tileUsage[tileIndex]) {
                result.tileUsage[tileIndex] = {
                    count: 0,
                    positions: [],
                    palettes: new Set()
                };
            }
            
            result.tileUsage[tileIndex].count++;
            result.tileUsage[tileIndex].positions.push({ x, y });
            result.tileUsage[tileIndex].palettes.add(palIndex);
            
            // Add to tile map
            row.push({
                tileIndex,
                hFlip,
                vFlip,
                palIndex,
                priority,
                offset: offset - 2
            });
        }
        
        result.tileMap.push(row);
        
        // Stop if we had an issue
        if (!result.consistent) break;
    }
    
    // Mark unused tiles
    const usedTiles = Object.keys(result.tileUsage).map(Number);
    result.unusedTiles = [];
    
    for (let i = 0; i < numTiles; i++) {
        if (!usedTiles.includes(i)) {
            result.unusedTiles.push(i);
        }
    }
    
    return result;
}

/**
 * Generate a visualization of the tile usage
 */
function generateTileUsageMap(result, outputPath) {
    const width = result.mapData.width;
    const height = result.mapData.height;
    
    // Create a text-based visualization
    let output = `Tile Usage Map (${width}x${height}):\n`;
    output += '═'.repeat(width * 3 + 1) + '\n';
    
    // Generate color codes for different properties
    for (let y = 0; y < height; y++) {
        output += '║';
        for (let x = 0; x < width; x++) {
            if (y < result.mapData.tileMap.length && x < result.mapData.tileMap[y].length) {
                const tile = result.mapData.tileMap[y][x];
                
                // Check for issues
                let symbol = ' ';
                
                if (result.tileData.statistics.emptyTiles.includes(tile.tileIndex)) {
                    symbol = '·'; // Empty tile
                } else if (result.tileData.statistics.potentiallyCorruptedTiles.includes(tile.tileIndex)) {
                    symbol = '!'; // Potentially corrupted
                } else if (result.tileData.statistics.duplicateTiles.includes(tile.tileIndex)) {
                    symbol = '='; // Duplicate
                } else if (result.mapData.invalidTileRefs.includes(tile.tileIndex)) {
                    symbol = '?'; // Invalid reference
                } else {
                    // Encode palette in symbol
                    symbol = tile.palIndex.toString();
                }
                
                output += ` ${symbol} `;
            } else {
                output += ' ? '; // Out of bounds
            }
        }
        output += '║\n';
    }
    
    output += '═'.repeat(width * 3 + 1) + '\n\n';
    output += 'Legend: 0-3=Palette, ·=Empty, !=Corrupted, ?=Invalid, ==Duplicate\n';
    
    // Output tile statistics
    output += '\nTile Statistics:\n';
    output += `- Total tiles: ${result.tileData.numTiles}\n`;
    output += `- Unique patterns: ${result.tileData.statistics.uniqueTilePatterns}\n`;
    output += `- Empty tiles: ${result.tileData.statistics.emptyTiles.length}\n`;
    output += `- Duplicate tiles: ${result.tileData.statistics.duplicateTiles.length}\n`;
    output += `- Potentially corrupted: ${result.tileData.statistics.potentiallyCorruptedTiles.length}\n`;
    output += `- Invalid references: ${result.mapData.invalidTileRefs.length}\n`;
    output += `- Unused tiles: ${result.mapData.unusedTiles.length}\n`;

    if (outputPath) {
        fs.writeFileSync(outputPath, output);
        console.log(`Tile usage map written to ${outputPath}`);
    }
    
    return output;
}

/**
 * Save detailed analysis to file
 */
function saveAnalysisResults(result, outputPath) {
    // Format the results as JSON
    const jsonOutput = JSON.stringify(result, (key, value) => {
        // Convert Sets to Arrays for JSON serialization
        if (value instanceof Set) {
            return Array.from(value);
        }
        return value;
    }, 2);
    
    fs.writeFileSync(outputPath, jsonOutput);
    console.log(`Analysis results written to ${outputPath}`);
}

/**
 * Main function to analyze a JIM file
 */
function main() {
    if (process.argv.length < 3) {
        console.log('Usage: node jim-data-structure-analyzer.js <jim-file>');
        process.exit(1);
    }
    
    const jimPath = process.argv[2];
    const outputDir = path.join(path.dirname(jimPath), 'analysis');
    
    try {
        // Create output directory if it doesn't exist
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Analyze the file
        const result = analyzeJimFile(jimPath);
        
        // Generate visualization
        const baseFileName = path.basename(jimPath, '.jim');
        const mapOutputPath = path.join(outputDir, `${baseFileName}-tile-map.txt`);
        generateTileUsageMap(result, mapOutputPath);
        
        // Save full analysis results
        const analysisOutputPath = path.join(outputDir, `${baseFileName}-analysis.json`);
        saveAnalysisResults(result, analysisOutputPath);
        
        // Print summary of issues
        console.log('\nAnalysis Summary:');
        if (result.potentialIssues.length === 0) {
            console.log('No issues detected.');
        } else {
            const criticalIssues = result.potentialIssues.filter(i => i.type === 'CRITICAL').length;
            const errorIssues = result.potentialIssues.filter(i => i.type === 'ERROR').length;
            const warningIssues = result.potentialIssues.filter(i => i.type === 'WARNING').length;
            const infoIssues = result.potentialIssues.filter(i => i.type === 'INFO').length;
            
            console.log(`Found ${criticalIssues} critical, ${errorIssues} error, ${warningIssues} warning, and ${infoIssues} informational issues.`);
            console.log('\nDetailed issues:');
            
            result.potentialIssues.forEach((issue, index) => {
                console.log(`${index + 1}. [${issue.type}] ${issue.description}`);
                console.log(`   ${issue.details}`);
            });
        }
        
        console.log(`\nSee ${mapOutputPath} for tile usage visualization`);
        console.log(`See ${analysisOutputPath} for full analysis details`);
        
    } catch (error) {
        console.error('Error analyzing JIM file:', error);
        process.exit(1);
    }
}

// Run the main function
main();
