// validate-jim-file.js
// A comprehensive validator for JIM files to detect structural issues
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname, basename } from 'path';

// Check if a file path is provided
function validateJimFile(jimPath) {
    let jimFilePath = jimPath;
    let output = "";

    // Helper function to log to both console and output string
    function log(str) {
        console.log(str);
        output += str + "\n";
    }
    
    log(`Validating JIM file: ${jimFilePath}`);
    
    // Read the JIM file
    try {
        var jimBuffer = readFileSync(jimFilePath);
        log(`Successfully read JIM file: ${jimFilePath}`);
        log(`File size: ${jimBuffer.length} bytes\n`);
    } catch (error) {
        log(`Error reading file: ${error.message}`);
        return { valid: false, errors: [`Error reading file: ${error.message}`] };
    }

    // === JIM FILE STRUCTURE ANALYSIS ===

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
    const expectedPaletteOffset = firstTileOffset + expectedTileDataSize;
    // Round up to nearest 4-byte boundary
    const alignedPaletteOffset = Math.ceil(expectedPaletteOffset / 4) * 4;

    const expectedPaletteSize = 128; // 4 palettes * 16 colors * 2 bytes
    const expectedMapOffset = alignedPaletteOffset + expectedPaletteSize;
    // Round up to nearest 4-byte boundary
    const alignedMapOffset = Math.ceil(expectedMapOffset / 4) * 4;

    const expectedMapSize = mapWidth * mapHeight * 2; // Each map entry is 2 bytes
    const expectedFileEnd = alignedMapOffset + expectedMapSize;

    log("\n=== CALCULATED OFFSETS ===");
    log(`Tile Data Range: 0x${firstTileOffset.toString(16).toUpperCase()} - 0x${(firstTileOffset + expectedTileDataSize - 1).toString(16).toUpperCase()}`);
    log(`Expected Palette Offset: 0x${expectedPaletteOffset.toString(16).toUpperCase()}`);
    log(`Aligned Palette Offset: 0x${alignedPaletteOffset.toString(16).toUpperCase()}`);
    log(`Palette Data Range: 0x${alignedPaletteOffset.toString(16).toUpperCase()} - 0x${(alignedPaletteOffset + expectedPaletteSize - 1).toString(16).toUpperCase()}`);
    log(`Expected Map Offset: 0x${expectedMapOffset.toString(16).toUpperCase()}`);
    log(`Aligned Map Offset: 0x${alignedMapOffset.toString(16).toUpperCase()}`);
    log(`Map Data Range: 0x${alignedMapOffset.toString(16).toUpperCase()} - 0x${(alignedMapOffset + expectedMapSize - 1).toString(16).toUpperCase()}`);
    log(`Expected File End: 0x${expectedFileEnd.toString(16).toUpperCase()}`);

    // Check file size against expected
    if (jimBuffer.length < expectedFileEnd) {
        log(`\n⚠️ WARNING: File size (${jimBuffer.length} bytes) is smaller than expected (${expectedFileEnd} bytes)`);
        log("This could indicate truncated data or incorrect header values.");
    } else if (jimBuffer.length > expectedFileEnd) {
        log(`\n⚠️ WARNING: File size (${jimBuffer.length} bytes) is larger than expected (${expectedFileEnd} bytes)`);
        log("This could indicate padding or additional data at the end of the file.");
    }

    // Look for hardcoded offsets in the file
    log("\n=== SEARCHING FOR HARDCODED OFFSETS ===");

    // Palette offset is sometimes stored at 0x0A + numTiles*32
    let possiblePaletteOffsetLoc = firstTileOffset + expectedTileDataSize;
    if (possiblePaletteOffsetLoc + 4 <= jimBuffer.length) {
        const possiblePaletteOffset = jimBuffer.readUInt32LE(possiblePaletteOffsetLoc);
        if (possiblePaletteOffset > 0 && possiblePaletteOffset < jimBuffer.length) {
            log(`Possible palette offset found at 0x${possiblePaletteOffsetLoc.toString(16).toUpperCase()}: 0x${possiblePaletteOffset.toString(16).toUpperCase()}`);
        } else {
            log("No explicit palette offset found at expected location.");
        }
    } else {
        log("File too small to check for explicit palette offset.");
    }

    // === STRUCTURAL VALIDATION ===
    log("\n=== STRUCTURAL VALIDATION ===");

    // Validation 1: Check if any offsets go beyond file bounds
    let validationPassed = true;
    if (firstTileOffset + expectedTileDataSize > jimBuffer.length) {
        log("❌ ERROR: Tile data would extend beyond file bounds");
        validationPassed = false;
    }

    if (alignedPaletteOffset + expectedPaletteSize > jimBuffer.length) {
        log("❌ ERROR: Palette data would extend beyond file bounds");
        validationPassed = false;
    }

    if (alignedMapOffset + expectedMapSize > jimBuffer.length) {
        log("❌ ERROR: Map data would extend beyond file bounds");
        validationPassed = false;
    }

    // Validation 2: Check for overlapping sections
    if (alignedPaletteOffset < firstTileOffset + expectedTileDataSize) {
        log("❌ ERROR: Palette data would overlap with tile data");
        log(`  Tile data ends at: 0x${(firstTileOffset + expectedTileDataSize - 1).toString(16).toUpperCase()}`);
        log(`  Palette data starts at: 0x${alignedPaletteOffset.toString(16).toUpperCase()}`);
        validationPassed = false;
    }

    if (alignedMapOffset < alignedPaletteOffset + expectedPaletteSize) {
        log("❌ ERROR: Map data would overlap with palette data");
        log(`  Palette data ends at: 0x${(alignedPaletteOffset + expectedPaletteSize - 1).toString(16).toUpperCase()}`);
        log(`  Map data starts at: 0x${alignedMapOffset.toString(16).toUpperCase()}`);
        validationPassed = false;
    }

    // Validation 3: Check reasonable bounds for values
    if (numTiles <= 0 || numTiles > 1000) {
        log(`⚠️ WARNING: Number of tiles (${numTiles}) seems unusual`);
    }

    if (width <= 0 || height <= 0 || width > 1000 || height > 1000) {
        log(`⚠️ WARNING: Dimensions (${width}x${height}) seem unusual`);
    }

    if (mapWidth <= 0 || mapHeight <= 0 || mapWidth > 1000 || mapHeight > 1000) {
        log(`⚠️ WARNING: Map dimensions (${mapWidth}x${mapHeight}) seem unusual`);
    }

    // === PALETTE ANALYSIS ===
    log("\n=== PALETTE ANALYSIS ===");

    if (alignedPaletteOffset + expectedPaletteSize <= jimBuffer.length) {
        // Read palette data
        for (let paletteIndex = 0; paletteIndex < 4; paletteIndex++) {
            log(`\nPalette ${paletteIndex}:`);
            let paletteStr = "";
            
            for (let colorIndex = 0; colorIndex < 16; colorIndex++) {
                const offset = alignedPaletteOffset + (paletteIndex * 32) + (colorIndex * 2);
                const colorValue = jimBuffer.readUInt16LE(offset);
                
                // Extract RGB values from Genesis format (0000BBB0GGG0RRR0)
                const red = (colorValue >> 1) & 0x07;
                const green = (colorValue >> 5) & 0x07;
                const blue = (colorValue >> 9) & 0x07;
                
                // Calculate the equivalent 8-bit RGB values
                const r8 = Math.round(red * 255 / 7);
                const g8 = Math.round(green * 255 / 7);
                const b8 = Math.round(blue * 255 / 7);
                
                paletteStr += `${colorIndex.toString().padStart(2)}: 0x${colorValue.toString(16).padStart(4, '0').toUpperCase()} (R:${red} G:${green} B:${blue}) -> RGB(${r8},${g8},${b8})`;
                
                // Add a newline every 2 entries for readability
                if (colorIndex % 2 === 1 || colorIndex === 15) {
                    log(paletteStr);
                    paletteStr = "";
                } else {
                    paletteStr += " | ";
                }
            }
        }
    } else {
        log("Cannot analyze palette: data would be outside file bounds");
    }

    // === MAP DATA ANALYSIS ===
    log("\n=== MAP DATA ANALYSIS ===");

    if (alignedMapOffset + expectedMapSize <= jimBuffer.length) {
        // Read a sample of map data (first 5 rows or less)
        const sampleRows = Math.min(5, mapHeight);
        log(`Map data sample (first ${sampleRows} rows):`);
        
        for (let y = 0; y < sampleRows; y++) {
            let rowStr = `Row ${y}: `;
            for (let x = 0; x < Math.min(16, mapWidth); x++) {
                const offset = alignedMapOffset + ((y * mapWidth + x) * 2);
                const mapEntry = jimBuffer.readUInt16LE(offset);
                
                // Extract tile index and palette
                const tileIndex = mapEntry & 0x0FFF;
                const palette = (mapEntry >> 13) & 0x03;
                const hFlip = ((mapEntry >> 12) & 0x01) === 1;
                const vFlip = ((mapEntry >> 15) & 0x01) === 1;
                
                rowStr += `[T:${tileIndex.toString().padStart(4)} P:${palette}${hFlip?'H':' '}${vFlip?'V':' '}] `;
                
                // Check if tile index is valid
                if (tileIndex >= numTiles) {
                    log(`⚠️ WARNING: Map entry at (${x},${y}) references non-existent tile ${tileIndex}. Max tile index is ${numTiles-1}.`);
                }
            }
            if (mapWidth > 16) {
                rowStr += "...";
            }
            log(rowStr);
        }
        if (mapHeight > 5) {
            log("...");
        }
        
        // Analyze tile usage
        const tileUsage = new Array(numTiles).fill(0);
        for (let i = 0; i < mapWidth * mapHeight; i++) {
            const offset = alignedMapOffset + (i * 2);
            const mapEntry = jimBuffer.readUInt16LE(offset);
            const tileIndex = mapEntry & 0x0FFF;
            
            if (tileIndex < numTiles) {
                tileUsage[tileIndex]++;
            }
        }
        
        log("\nTile usage statistics:");
        let unusedTiles = 0;
        for (let i = 0; i < numTiles; i++) {
            if (tileUsage[i] === 0) {
                unusedTiles++;
            }
        }
        log(`Used tiles: ${numTiles - unusedTiles}/${numTiles}`);
        if (unusedTiles > 0) {
            log(`Unused tiles: ${unusedTiles} (${Math.round(unusedTiles/numTiles*100)}%)`);
        }
    } else {
        log("Cannot analyze map data: data would be outside file bounds");
    }

    // === VALIDATION SUMMARY ===
    log("\n=== VALIDATION SUMMARY ===");
    if (validationPassed) {
        log("✅ JIM file structure appears valid.");
        log("No critical structural issues detected.");
    } else {
        log("❌ JIM file has structural issues that need to be addressed.");
        log("See the errors above for details.");
    }

    // Write output to file
    const outputFilename = basename(jimFilePath, '.jim') + '-validation.txt';
    writeFileSync(outputFilename, output);
    log(`\nValidation results saved to: ${outputFilename}`);
    
    return {
        valid: validationPassed,
        numTiles,
        width,
        height,
        mapWidth,
        mapHeight,
        offsets: {
            firstTile: firstTileOffset,
            palette: alignedPaletteOffset,
            map: alignedMapOffset
        },
        issues: !validationPassed
    };
}

// Check command line arguments
if (process.argv.length < 3) {
    console.log('Usage: node validate-jim-file.js <path-to-jim-file>');
    process.exit(1);
}

// Get file path and run validation
const jimPath = process.argv[2];
validateJimFile(jimPath);

export { validateJimFile };
