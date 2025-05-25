// validate-jim-file.js
// A comprehensive validator for JIM files to detect structural issues
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname, basename } from 'path';

// Check if a file path is provided via command line or use first argument passed to function
function validateJimFile(jimPath) {
    let jimFilePath = jimPath;
    let output = "";

    // Helper function to log to both console and output string
    function log(str) {
        console.log(str);
        output += str + "\n";
    }
    
    log(`Validating JIM file: ${jimFilePath}`);
    
    // Read the JIM file    try {
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
        
        // Validate sections
        console.log(`\nSection validation:`);
        
        // Validate tile data section
        console.log(`Tile data section: 0x${firstTileOffset.toString(16).toUpperCase()} - 0x${tileDataEnd.toString(16).toUpperCase()} (${tileDataEnd - firstTileOffset} bytes)`);
        if (tileDataEnd > fileSize) {
            console.error(`Error: Tile data would extend beyond the file end!`);
        }
        
        // Check if palette data overwrites tile data
        if (paletteOffset < tileDataEnd) {
            console.error(`Error: Palette data starts at 0x${paletteOffset.toString(16).toUpperCase()}, which overlaps with tile data ending at 0x${tileDataEnd.toString(16).toUpperCase()}!`);
            console.error(`       Palette data overwrites the last ${tileDataEnd - paletteOffset} bytes of tile data. This may corrupt ${Math.ceil((tileDataEnd - paletteOffset) / 32)} tiles.`);
            
            // Calculate which tiles are potentially corrupted
            const lastSafeOffset = paletteOffset - firstTileOffset;
            const lastSafeTile = Math.floor(lastSafeOffset / 32);
            console.error(`       Tiles after index ${lastSafeTile} may be corrupted.`);
        } else {
            console.log(`Palette data section: 0x${paletteOffset.toString(16).toUpperCase()} - 0x${paletteDataEnd.toString(16).toUpperCase()} (${paletteDataEnd - paletteOffset} bytes) - No overlap with tiles ✓`);
        }
        
        // Check if map data overwrites palette data
        if (mapOffset < paletteDataEnd) {
            console.error(`Error: Map data starts at 0x${mapOffset.toString(16).toUpperCase()}, which overlaps with palette data ending at 0x${paletteDataEnd.toString(16).toUpperCase()}!`);
            console.error(`       Map data overwrites the last ${paletteDataEnd - mapOffset} bytes of palette data.`);
            
            // Calculate which palettes are potentially corrupted
            const bytesPerPalette = 32;
            const affectedBytes = paletteDataEnd - mapOffset;
            const affectedPalettes = Math.ceil(affectedBytes / bytesPerPalette);
            console.error(`       Approximately ${affectedPalettes} palette(s) may be corrupted.`);
        } else {
            console.log(`Map data section: 0x${mapOffset.toString(16).toUpperCase()} - 0x${mapDataEnd.toString(16).toUpperCase()} (${mapDataEnd - mapOffset} bytes) - No overlap with palettes ✓`);
        }
        
        // Check if map data extends beyond the file
        if (mapDataEnd > fileSize) {
            console.error(`Error: Map data would extend beyond the file end by ${mapDataEnd - fileSize} bytes!`);
        }
        
        // Summary
        console.log(`\nSummary:`);
        const isValid = (
            paletteOffset >= tileDataEnd &&
            mapOffset >= paletteDataEnd &&
            mapDataEnd <= fileSize
        );
        
        if (isValid) {
            console.log(`✅ JIM file structure is valid with no section overlaps.`);
        } else {
            console.log(`❌ JIM file has potential structural issues that may cause corruption.`);
        }
        
        // Additional info
        if (paletteOffset > tileDataEnd) {
            const gap = paletteOffset - tileDataEnd;
            console.log(`Note: There is a ${gap} byte gap between tile data and palette data.`);
        }
        
        if (mapOffset > paletteDataEnd) {
            const gap = mapOffset - paletteDataEnd;
            console.log(`Note: There is a ${gap} byte gap between palette data and map data.`);
        }
        
        return {
            isValid,
            fileSize,
            numTiles,
            firstTileOffset,
            paletteOffset,
            mapOffset,
            tileDataEnd,
            paletteDataEnd,
            mapDataEnd,
            overlaps: {
                tileAndPalette: paletteOffset < tileDataEnd,
                paletteAndMap: mapOffset < paletteDataEnd,
                mapAndFileEnd: mapDataEnd > fileSize
            }
        };
        
    } catch (error) {
        console.error(`Error validating JIM file: ${error.message}`);
    }
}

// Check command line arguments
if (process.argv.length < 3) {
    console.log('Usage: node validate-jim-file.js <path-to-jim-file>');
    process.exit(1);
}

// Get file path and run validation
const jimPath = process.argv[2];
validateJimFile(jimPath);
