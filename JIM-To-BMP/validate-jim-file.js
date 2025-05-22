// validate-jim-file.js
// Script to validate JIM file structure and check for potential data overlaps
import { readFileSync } from 'fs';
import { join, basename } from 'path';

function validateJimFile(jimPath) {
    console.log(`Validating JIM file: ${jimPath}`);
    
    try {
        const buffer = readFileSync(jimPath);
        const fileSize = buffer.length;
        console.log(`File size: ${fileSize} bytes`);
        
        // Read header
        const paletteOffset = buffer.readUInt32BE(0);
        const mapOffset = buffer.readUInt32BE(4);
        const numTiles = buffer.readUInt16BE(8);
        const firstTileOffset = 0x0A;
        
        console.log(`Header information:`);
        console.log(`- Number of tiles: ${numTiles}`);
        console.log(`- First tile offset: 0x${firstTileOffset.toString(16).toUpperCase()} (${firstTileOffset})`);
        console.log(`- Palette offset: 0x${paletteOffset.toString(16).toUpperCase()} (${paletteOffset})`);
        console.log(`- Map offset: 0x${mapOffset.toString(16).toUpperCase()} (${mapOffset})`);
        
        // Calculate section sizes
        const tileDataEnd = firstTileOffset + (numTiles * 32);
        const paletteDataEnd = paletteOffset + 128; // 4 palettes * 16 colors * 2 bytes
        
        // Read map dimensions
        let mapWidth = 0;
        let mapHeight = 0;
        let mapDataEnd = 0;
        
        if (mapOffset + 4 <= fileSize) {
            mapWidth = buffer.readUInt16BE(mapOffset);
            mapHeight = buffer.readUInt16BE(mapOffset + 2);
            mapDataEnd = mapOffset + 4 + (mapWidth * mapHeight * 2);
            console.log(`- Map dimensions: ${mapWidth}x${mapHeight}`);
        } else {
            console.error("Error: Map offset points beyond the end of the file!");
        }
        
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
