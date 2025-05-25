// test-tile-read.js
// Test script to compare tile reading/writing in rebuildJim.js and extractJimFull.js
import { readFileSync, writeFileSync } from 'fs';
import { join, basename } from 'path';

// Print info about a BMP file
function analyzeBMP(filePath) {
    console.log(`\nAnalyzing BMP file: ${filePath}`);
    
    try {
        const data = readFileSync(filePath);
        
        // Check BMP signature
        if (data.toString('ascii', 0, 2) !== 'BM') {
            console.log(`Error: Not a valid BMP file (No BM signature)`);
            return;
        }
        
        // Basic BMP header info
        const fileSize = data.readUInt32LE(2);
        const dataOffset = data.readUInt32LE(10);
        const dibSize = data.readUInt32LE(14);
        const width = data.readInt32LE(18);
        const height = data.readInt32LE(22);
        const planes = data.readUInt16LE(26);
        const bitsPerPixel = data.readUInt16LE(28);
        const compression = data.readUInt32LE(30);
        
        console.log(`File size: ${fileSize} bytes`);
        console.log(`Data offset: 0x${dataOffset.toString(16).toUpperCase()} (${dataOffset})`);
        console.log(`DIB header size: ${dibSize}`);
        console.log(`Dimensions: ${width}x${Math.abs(height)}`);
        console.log(`Bits per pixel: ${bitsPerPixel}`);
        console.log(`Compression: ${compression}`);
        
        // If indexed color, read palette
        if (bitsPerPixel <= 8) {
            const numColors = Math.min(1 << bitsPerPixel, 256);
            console.log(`Palette: ${numColors} colors`);
            
            // Read first 16 colors from palette
            console.log("First 16 palette entries (BGR format):");
            for (let i = 0; i < Math.min(numColors, 16); i++) {
                const pOffset = 14 + dibSize + (i * 4);
                const b = data[pOffset];
                const g = data[pOffset + 1];
                const r = data[pOffset + 2];
                console.log(`  ${i}: [${r}, ${g}, ${b}]`);
            }
        }
        
        // For 8x8 tiles, try to extract the pixel data
        if (width === 8 && Math.abs(height) === 8 && bitsPerPixel === 8) {
            console.log("\nPixel data (8x8 indexed):");
            
            // Extract using regular array approach (rebuildJim.js old style)
            console.log("\nMethod 1 (original, fixed offset):");
            const pixelOffset = 54 + (256 * 4); // Fixed offset
            const pixels1 = [];
            for (let i = 0; i < 64; i++) {
                pixels1.push(data[pixelOffset + i]);
            }
            printTileData(pixels1);
            
            // Extract using the improved row-by-row approach
            console.log("\nMethod 2 (improved, row-based):");
            const rowSize = Math.ceil(width / 4) * 4; // BMP row padding
            const pixels2 = [];
            for (let y = 0; y < 8; y++) {
                const rowOffset = dataOffset + (y * rowSize);
                for (let x = 0; x < 8; x++) {
                    pixels2.push(data[rowOffset + x]);
                }
            }
            printTileData(pixels2);
            
            // Check if there are any differences between the methods
            const diffCount = pixels1.reduce((count, val, i) => count + (val !== pixels2[i] ? 1 : 0), 0);
            if (diffCount > 0) {
                console.log(`\nDifferences detected: ${diffCount} out of 64 pixels differ`);
                console.log("Differing pixels (index, method1, method2):");
                for (let i = 0; i < 64; i++) {
                    if (pixels1[i] !== pixels2[i]) {
                        console.log(`  ${i}: ${pixels1[i]} vs ${pixels2[i]}`);
                    }
                }
            } else {
                console.log("\nNo differences detected between methods");
            }
            
            // Repack the tile as 4bpp Genesis format
            console.log("\nRepacked as 4bpp Genesis format:");
            const packedTile = new Uint8Array(32);
            for (let y = 0; y < 8; y++) {
                for (let x = 0; x < 4; x++) {
                    const pixel1 = pixels2[y * 8 + x * 2];
                    const pixel2 = pixels2[y * 8 + x * 2 + 1];
                    const byte = ((pixel1 & 0x0F) << 4) | (pixel2 & 0x0F);
                    packedTile[y * 4 + x] = byte;
                }
            }
            
            console.log(packedTile);
            return {
                width,
                height: Math.abs(height),
                bitsPerPixel,
                dataOffset,
                rowSize,
                pixels: pixels2,
                packedTile
            };
        }
    } catch (error) {
        console.error(`Error analyzing BMP: ${error.message}`);
    }
    
    return null;
}

// Function to print tile data as a grid
function printTileData(pixels) {
    let output = "";
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            const idx = y * 8 + x;
            output += pixels[idx].toString().padStart(3) + " ";
        }
        output += "\n";
    }
    console.log(output);
}

// Analyze a tile BMP file
function analyzeTile(number) {
    const tileFile = join('c:', 'repository', 'EA-NHL-Tools', 'JIM-To-BMP', 'build', 'mcdavidtouch3-count-pal0-1-2-3', 'tiles', `${number.toString().padStart(4, '0')}.bmp`);
    return analyzeBMP(tileFile);
}

// Main function to analyze tiles
function main() {
    // Since the issue starts at tile 0003, let's analyze tiles 0002, 0003, and 0004
    const tiles = [
        analyzeTile(2),
        analyzeTile(3),
        analyzeTile(4)
    ];
    
    // Output a summary
    console.log("\n\nSUMMARY:");
    console.log("-------------------------------------");
    for (let i = 0; i < tiles.length; i++) {
        if (tiles[i]) {
            console.log(`Tile 000${i+2} has:
- Data Offset: 0x${tiles[i].dataOffset.toString(16).toUpperCase()}
- Row Size: ${tiles[i].rowSize} bytes (includes ${tiles[i].rowSize - 8} bytes padding)`);
        }
    }
}

main();
