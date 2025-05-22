// debug-jim-file.js
// Utility to inspect a rebuilt JIM file for potential corruption
import { readFileSync } from 'fs';
import { join } from 'path';

// Decode a tile from raw JIM format
function decodeGenesisTile(buffer, tileIndex) {
    const tileOffset = 0x0A + (tileIndex * 32);
    const pixels = new Array(64).fill(0);
    let pixelIdx = 0;
    
    console.log(`\nDecoding tile ${tileIndex} at offset 0x${tileOffset.toString(16).toUpperCase()}:`);
    
    // Print raw tile data
    console.log("Raw tile data (hex):");
    for (let y = 0; y < 8; y++) {
        let rowData = "";
        for (let x = 0; x < 4; x++) {
            const byte = buffer[tileOffset + y * 4 + x];
            rowData += byte.toString(16).padStart(2, '0').toUpperCase() + " ";
        }
        console.log(`Row ${y}: ${rowData}`);
    }
    
    // Decode the tile
    for (let y = 0; y < 8; y++) {
        const rowStart = tileOffset + y * 4;
        for (let x = 0; x < 4; x++) {
            const byte = buffer[rowStart + x];
            // Split byte into two 4-bit values
            pixels[pixelIdx++] = (byte >> 4) & 0x0F;
            pixels[pixelIdx++] = byte & 0x0F;
        }
    }
    
    // Print decoded pixel values
    console.log("\nDecoded pixel values:");
    for (let y = 0; y < 8; y++) {
        let row = "";
        for (let x = 0; x < 8; x++) {
            row += pixels[y * 8 + x].toString().padStart(2) + " ";
        }
        console.log(row);
    }
    
    return pixels;
}

// Main function to analyze a JIM file
function analyzeJimFile(jimPath) {
    console.log(`Analyzing JIM file: ${jimPath}`);
    
    try {
        const buffer = readFileSync(jimPath);
        
        // Read header
        const paletteOffset = buffer.readUInt32BE(0);
        const mapOffset = buffer.readUInt32BE(4);
        const numTiles = buffer.readUInt16BE(8);
        
        console.log(`Header Information:`);
        console.log(`- Palette Offset: 0x${paletteOffset.toString(16).toUpperCase()}`);
        console.log(`- Map Offset: 0x${mapOffset.toString(16).toUpperCase()}`);
        console.log(`- Number of Tiles: ${numTiles}`);
        
        // Decode first few tiles (0, 1, 2, 3)
        for (let i = 0; i <= 4; i++) {
            if (i < numTiles) {
                decodeGenesisTile(buffer, i);
            }
        }
        
        // Check for potential corruption patterns
        console.log("\nChecking for potential corruption patterns...");
        let suspiciousTiles = [];
        
        for (let i = 0; i < numTiles; i++) {
            const tileOffset = 0x0A + (i * 32);
            const tileBytes = Array.from(buffer.subarray(tileOffset, tileOffset + 32));
            
            // Check for all-zero tiles
            if (tileBytes.every(b => b === 0)) {
                suspiciousTiles.push(`Tile ${i}: All zeros`);
                continue;
            }
            
            // Check for patterns typical of corruption
            const firstByte = tileBytes[0];
            const allSame = tileBytes.every(b => b === firstByte);
            if (allSame) {
                suspiciousTiles.push(`Tile ${i}: All bytes identical (${firstByte})`);
                continue;
            }
            
            // Check for odd patterns in the pixel data
            const pixels = decodeGenesisTile(buffer, i);
            const uniquePixels = new Set(pixels);
            if (uniquePixels.size <= 2) {
                suspiciousTiles.push(`Tile ${i}: Very few unique pixel values (${uniquePixels.size})`);
            }
        }
        
        if (suspiciousTiles.length > 0) {
            console.log("Suspicious tiles found:");
            suspiciousTiles.forEach(s => console.log(`- ${s}`));
        } else {
            console.log("No obvious corruption patterns detected.");
        }
        
    } catch (error) {
        console.error(`Error analyzing JIM file: ${error.message}`);
    }
}

// Check command line arguments
if (process.argv.length < 3) {
    console.log('Usage: node debug-jim-file.js <path-to-jim-file>');
    process.exit(1);
}

// Get file path and run analysis
const jimPath = process.argv[2];
analyzeJimFile(jimPath);
