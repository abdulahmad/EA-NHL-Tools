// diagnose-jim-file.js
// A tool to diagnose JIM file structure and identify potential issues
import { readFileSync, writeFileSync } from 'fs';
import { join, basename } from 'path';

// Ensure we have a file path
if (process.argv.length < 3) {
    console.error('Please provide a JIM file path to diagnose.');
    process.exit(1);
}

const jimFilePath = process.argv[2];
let output = "";

// Helper function to log to both console and output string
function log(str) {
    console.log(str);
    output += str + "\n";
}

// Read the JIM file
try {
    var jimBuffer = readFileSync(jimFilePath);
    log(`Successfully read JIM file: ${jimFilePath}`);
    log(`File size: ${jimBuffer.length} bytes\n`);
} catch (error) {
    console.error(`Error reading file: ${error.message}`);
    process.exit(1);
}

// === JIM FILE STRUCTURE ANALYSIS ===

// Function to print a hex dump of a portion of the buffer
function hexDump(buffer, start, length, bytesPerRow = 16) {
    const end = Math.min(start + length, buffer.length);
    let result = "";
    
    for (let i = start; i < end; i += bytesPerRow) {
        const chunk = buffer.slice(i, Math.min(i + bytesPerRow, end));
        let hexLine = "";
        let asciiLine = "  ";
        
        for (let j = 0; j < chunk.length; j++) {
            const byte = chunk[j];
            hexLine += byte.toString(16).padStart(2, '0').toUpperCase() + " ";
            asciiLine += (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : ".";
        }
        
        // Pad hex line if it's shorter than a full row
        hexLine = hexLine.padEnd(bytesPerRow * 3, " ");
        
        result += `0x${i.toString(16).padStart(8, '0')}: ${hexLine}${asciiLine}\n`;
    }
    
    return result;
}

// Parse JIM header
const numTiles = jimBuffer.readUInt16LE(0x00);
const width = jimBuffer.readUInt16LE(0x02);
const height = jimBuffer.readUInt16LE(0x04);
const mapWidth = jimBuffer.readUInt16LE(0x06);
const mapHeight = jimBuffer.readUInt16LE(0x08);

// First tile is typically at offset 0x0A
const firstTileOffset = 0x0A;

log("=== JIM FILE HEADER INFORMATION ===");
log(`Number of Tiles: ${numTiles}`);
log(`Width: ${width}`);
log(`Height: ${height}`);
log(`Map Width: ${mapWidth}`);
log(`Map Height: ${mapHeight}`);
log(`First Tile Offset: 0x${firstTileOffset.toString(16).toUpperCase()}`);

// Calculate expected offsets
const expectedTileDataSize = numTiles * 32; // Each tile is 32 bytes
const expectedTileDataEnd = firstTileOffset + expectedTileDataSize;
const expectedPaletteOffset = Math.ceil(expectedTileDataEnd / 4) * 4; // Align to 4-byte boundary
const expectedPaletteSize = 128; // 4 palettes * 16 colors * 2 bytes
const expectedMapOffset = Math.ceil((expectedPaletteOffset + expectedPaletteSize) / 4) * 4; // Align to 4-byte boundary
const expectedMapSize = 4 + (mapWidth * mapHeight * 2); // Map dimensions (4 bytes) + map data
const expectedFileEnd = expectedMapOffset + expectedMapSize;

// Look for potential palette and map offsets in the file
log("\n=== SEARCHING FOR OFFSET PATTERNS ===");

// Search for palette patterns (16 color entries in sequence)
function findPalettePatterns() {
    const potentialPaletteOffsets = [];
    
    // Look for sequences of 16 color entries (32 bytes)
    // Each color is a 16-bit value in genesis format (0000BBB0GGG0RRR0)
    for (let offset = 0; offset < jimBuffer.length - 32; offset += 2) {
        let isPalette = true;
        for (let i = 0; i < 16; i++) {
            const colorValue = jimBuffer.readUInt16LE(offset + i * 2);
            // Check if the format matches Genesis color format with bit 0 always 0
            if ((colorValue & 0x1) !== 0) {
                isPalette = false;
                break;
            }
        }
        
        if (isPalette) {
            potentialPaletteOffsets.push(offset);
            // Skip ahead to avoid overlapping matches
            offset += 30;
        }
    }
    
    return potentialPaletteOffsets;
}

// Search for map patterns (16-bit entries that reference tiles)
function findMapPatterns() {
    const potentialMapOffsets = [];
    
    // For each offset that could contain map width and height
    for (let offset = 0; offset < jimBuffer.length - 4; offset += 2) {
        const width = jimBuffer.readUInt16LE(offset);
        const height = jimBuffer.readUInt16LE(offset + 2);
        
        // If dimensions are reasonable
        if (width > 0 && width < 100 && height > 0 && height < 100) {
            // Check if there's enough space for the map data
            const mapDataSize = width * height * 2;
            if (offset + 4 + mapDataSize <= jimBuffer.length) {
                // Check a sample of map entries to see if they refer to valid tiles
                let validEntries = 0;
                const entriesToCheck = Math.min(10, width * height);
                
                for (let i = 0; i < entriesToCheck; i++) {
                    const mapEntry = jimBuffer.readUInt16LE(offset + 4 + i * 2);
                    const tileIndex = mapEntry & 0x0FFF;
                    
                    if (tileIndex < numTiles) {
                        validEntries++;
                    }
                }
                
                // If most entries are valid, consider this a potential map offset
                if (validEntries >= entriesToCheck * 0.7) {
                    potentialMapOffsets.push(offset);
                }
            }
        }
    }
    
    return potentialMapOffsets;
}

const potentialPaletteOffsets = findPalettePatterns();
const potentialMapOffsets = findMapPatterns();

log(`Found ${potentialPaletteOffsets.length} potential palette offsets.`);
for (let i = 0; i < Math.min(5, potentialPaletteOffsets.length); i++) {
    const offset = potentialPaletteOffsets[i];
    log(`- 0x${offset.toString(16).toUpperCase()} (${offset})`);
}
if (potentialPaletteOffsets.length > 5) {
    log(`... and ${potentialPaletteOffsets.length - 5} more.`);
}

log(`\nFound ${potentialMapOffsets.length} potential map offsets.`);
for (let i = 0; i < Math.min(5, potentialMapOffsets.length); i++) {
    const offset = potentialMapOffsets[i];
    log(`- 0x${offset.toString(16).toUpperCase()} (${offset})`);
}
if (potentialMapOffsets.length > 5) {
    log(`... and ${potentialMapOffsets.length - 5} more.`);
}

// Find best matched offsets
let bestPaletteOffset = null;
let bestMapOffset = null;

// Prefer offsets that are properly aligned and don't overlap with tile data
for (const offset of potentialPaletteOffsets) {
    if (offset >= expectedTileDataEnd && offset % 4 === 0) {
        bestPaletteOffset = offset;
        break;
    }
}

if (bestPaletteOffset === null && potentialPaletteOffsets.length > 0) {
    bestPaletteOffset = potentialPaletteOffsets[0];
}

// Find a map offset that comes after the palette data
const minMapOffset = bestPaletteOffset ? bestPaletteOffset + 128 : expectedTileDataEnd;
for (const offset of potentialMapOffsets) {
    if (offset >= minMapOffset && offset % 4 === 0) {
        bestMapOffset = offset;
        break;
    }
}

if (bestMapOffset === null && potentialMapOffsets.length > 0) {
    bestMapOffset = potentialMapOffsets[0];
}

// Analyze a sample tile
log("\n=== TILE ANALYSIS ===");
if (numTiles > 0 && firstTileOffset + 32 <= jimBuffer.length) {
    log("Analyzing first tile:");
    const tileData = hexDump(jimBuffer, firstTileOffset, 32);
    log(tileData);
    
    // Attempt to decode the tile to check format
    log("Decoded tile visualization (using 0-F to represent palette indices):");
    let decodedTile = "";
    for (let y = 0; y < 8; y++) {
        let row = "";
        for (let x = 0; x < 8; x++) {
            const byteOffset = Math.floor(y * 4 + x / 2);
            const byte = jimBuffer[firstTileOffset + byteOffset];
            const pixelValue = (x % 2 === 0) ? (byte >> 4) & 0x0F : byte & 0x0F;
            row += pixelValue.toString(16).toUpperCase();
        }
        decodedTile += row + "\n";
    }
    log(decodedTile);
}

// Analyze palette data
log("\n=== PALETTE ANALYSIS ===");
if (bestPaletteOffset) {
    log(`Using detected palette offset: 0x${bestPaletteOffset.toString(16).toUpperCase()}`);
    
    for (let paletteIndex = 0; paletteIndex < 4; paletteIndex++) {
        const paletteOffset = bestPaletteOffset + (paletteIndex * 32);
        if (paletteOffset + 32 <= jimBuffer.length) {
            log(`\nPalette ${paletteIndex}:`);
            log(hexDump(jimBuffer, paletteOffset, 32));
            
            // Decode colors
            log("Decoded colors (Genesis format -> RGB):");
            for (let colorIndex = 0; colorIndex < 16; colorIndex++) {
                const offset = paletteOffset + (colorIndex * 2);
                const colorValue = jimBuffer.readUInt16LE(offset);
                
                // Extract RGB values from Genesis format (0000BBB0GGG0RRR0)
                const red = (colorValue >> 1) & 0x07;
                const green = (colorValue >> 5) & 0x07;
                const blue = (colorValue >> 9) & 0x07;
                
                // Calculate the equivalent 8-bit RGB values
                const r8 = Math.round(red * 255 / 7);
                const g8 = Math.round(green * 255 / 7);
                const b8 = Math.round(blue * 255 / 7);
                
                log(`  Color ${colorIndex}: 0x${colorValue.toString(16).padStart(4, '0').toUpperCase()} -> (${red},${green},${blue}) -> RGB(${r8},${g8},${b8})`);
            }
        }
    }
} else {
    log("No valid palette offset detected.");
}

// Analyze map data
log("\n=== MAP DATA ANALYSIS ===");
if (bestMapOffset) {
    log(`Using detected map offset: 0x${bestMapOffset.toString(16).toUpperCase()}`);
    
    // Read the map dimensions
    if (bestMapOffset + 4 <= jimBuffer.length) {
        const mapWidth = jimBuffer.readUInt16LE(bestMapOffset);
        const mapHeight = jimBuffer.readUInt16LE(bestMapOffset + 2);
        
        log(`Map dimensions from offset: ${mapWidth}x${mapHeight}`);
        if (mapWidth !== width || mapHeight !== height) {
            log(`⚠️ Warning: Map dimensions at offset (${mapWidth}x${mapHeight}) don't match header dimensions (${width}x${height})`);
        }
        
        // Check if there's enough data for the map
        const mapDataSize = mapWidth * mapHeight * 2;
        if (bestMapOffset + 4 + mapDataSize <= jimBuffer.length) {
            log(`Map data size: ${mapDataSize} bytes`);
            
            // Display a sample of the map data
            const sampleRows = Math.min(3, mapHeight);
            const sampleCols = Math.min(8, mapWidth);
            
            log(`\nMap data sample (${sampleRows}x${sampleCols}):`);
            for (let y = 0; y < sampleRows; y++) {
                let rowStr = `Row ${y}: `;
                for (let x = 0; x < sampleCols; x++) {
                    const offset = bestMapOffset + 4 + ((y * mapWidth + x) * 2);
                    const mapEntry = jimBuffer.readUInt16LE(offset);
                    
                    // Extract tile index and palette
                    const tileIndex = mapEntry & 0x0FFF;
                    const palette = (mapEntry >> 13) & 0x03;
                    const hFlip = ((mapEntry >> 12) & 0x01) === 1;
                    const vFlip = ((mapEntry >> 15) & 0x01) === 1;
                    
                    rowStr += `[T:${tileIndex} P:${palette}${hFlip?'H':' '}${vFlip?'V':' '}] `;
                }
                log(rowStr);
            }
            
            // Analyze tile usage
            const tileUsage = new Array(numTiles).fill(0);
            let invalidTileRefs = 0;
            
            for (let i = 0; i < mapWidth * mapHeight; i++) {
                const offset = bestMapOffset + 4 + (i * 2);
                if (offset + 2 <= jimBuffer.length) {
                    const mapEntry = jimBuffer.readUInt16LE(offset);
                    const tileIndex = mapEntry & 0x0FFF;
                    
                    if (tileIndex < numTiles) {
                        tileUsage[tileIndex]++;
                    } else {
                        invalidTileRefs++;
                    }
                }
            }
            
            log(`\nTile usage analysis:`);
            let unusedTiles = 0;
            for (let i = 0; i < numTiles; i++) {
                if (tileUsage[i] === 0) {
                    unusedTiles++;
                }
            }
            log(`Used tiles: ${numTiles - unusedTiles}/${numTiles} (${Math.round((numTiles - unusedTiles)/numTiles*100)}%)`);
            if (unusedTiles > 0) {
                log(`Unused tiles: ${unusedTiles} (${Math.round(unusedTiles/numTiles*100)}%)`);
            }
            
            if (invalidTileRefs > 0) {
                log(`⚠️ Warning: ${invalidTileRefs} map entries reference invalid tile indices (>= ${numTiles})`);
            }
        } else {
            log(`⚠️ Warning: Map data would extend beyond file bounds`);
        }
    } else {
        log(`⚠️ Warning: Not enough data to read map dimensions`);
    }
} else {
    log("No valid map offset detected.");
}

// === DIAGNOSTIC SUMMARY ===
log("\n=== DIAGNOSTIC SUMMARY ===");

// Compare detected offsets with expected ones
if (bestPaletteOffset !== null) {
    if (bestPaletteOffset === expectedPaletteOffset) {
        log(`✅ Detected palette offset (0x${bestPaletteOffset.toString(16).toUpperCase()}) matches expected value.`);
    } else {
        log(`⚠️ Detected palette offset (0x${bestPaletteOffset.toString(16).toUpperCase()}) doesn't match expected value (0x${expectedPaletteOffset.toString(16).toUpperCase()}).`);
    }
} else {
    log(`❓ Could not detect a valid palette offset. Expected: 0x${expectedPaletteOffset.toString(16).toUpperCase()}`);
}

if (bestMapOffset !== null) {
    if (bestMapOffset === expectedMapOffset) {
        log(`✅ Detected map offset (0x${bestMapOffset.toString(16).toUpperCase()}) matches expected value.`);
    } else {
        log(`⚠️ Detected map offset (0x${bestMapOffset.toString(16).toUpperCase()}) doesn't match expected value (0x${expectedMapOffset.toString(16).toUpperCase()}).`);
    }
} else {
    log(`❓ Could not detect a valid map offset. Expected: 0x${expectedMapOffset.toString(16).toUpperCase()}`);
}

// Check for potential issues
let issues = [];

if (expectedFileEnd > jimBuffer.length) {
    issues.push(`File is smaller than expected (${jimBuffer.length} bytes vs expected ${expectedFileEnd} bytes).`);
}

if (bestPaletteOffset !== null && bestPaletteOffset < expectedTileDataEnd) {
    issues.push(`Detected palette offset (0x${bestPaletteOffset.toString(16).toUpperCase()}) overlaps with tile data (ending at 0x${expectedTileDataEnd.toString(16).toUpperCase()}).`);
}

if (bestMapOffset !== null && bestPaletteOffset !== null && bestMapOffset < bestPaletteOffset + 128) {
    issues.push(`Detected map offset (0x${bestMapOffset.toString(16).toUpperCase()}) overlaps with palette data (ending at 0x${(bestPaletteOffset + 128).toString(16).toUpperCase()}).`);
}

// Print issues
if (issues.length > 0) {
    log("\nPotential issues detected:");
    issues.forEach((issue, index) => {
        log(`${index + 1}. ${issue}`);
    });
} else {
    log("\n✅ No major structural issues detected.");
}

// Recommended fixes
log("\n=== RECOMMENDED FIXES ===");
if (issues.length > 0) {
    log("Based on the diagnostics, here are some recommended fixes:");
    
    if (bestPaletteOffset !== null && bestPaletteOffset < expectedTileDataEnd) {
        log(`1. Increase the palette offset to at least 0x${expectedTileDataEnd.toString(16).toUpperCase()} (after all tile data).`);
        log(`   In rebuildJim.js, use the calculated offsets instead of hardcoded ones:`);
        log(`   const calculatedPaletteOffset = firstTileOffset + (numTiles * 32);`);
        log(`   calculatedPaletteOffset = Math.ceil(calculatedPaletteOffset / 4) * 4; // align to 4-byte boundary`);
    }
    
    if (bestMapOffset !== null && bestPaletteOffset !== null && bestMapOffset < bestPaletteOffset + 128) {
        log(`2. Ensure the map offset comes after the palette data (palette offset + 128 bytes).`);
        log(`   In rebuildJim.js, calculate map offset dynamically:`);
        log(`   const calculatedMapOffset = calculatedPaletteOffset + 128; // 4 palettes * 32 bytes`);
        log(`   calculatedMapOffset = Math.ceil(calculatedMapOffset / 4) * 4; // align to 4-byte boundary`);
    }
    
    if (expectedFileEnd > jimBuffer.length) {
        log(`3. Ensure the JIM file has enough space for all data (at least ${expectedFileEnd} bytes).`);
        log(`   This may require regenerating the JIM file with the correct offsets and sizes.`);
    }
} else {
    log("The JIM file appears to be structurally sound. No fixes needed.");
}

// Write output to file
const outputFilename = basename(jimFilePath, '.jim') + '-diagnostic.txt';
writeFileSync(outputFilename, output);
log(`\nDiagnostic results saved to: ${outputFilename}`);
