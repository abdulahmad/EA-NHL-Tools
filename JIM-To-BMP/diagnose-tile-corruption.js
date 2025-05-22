// diagnose-tile-corruption.js
// Script to diagnose the source of tile corruption in the workflow
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';

// Function to read a tile from a BMP file
function readTileBmp(filePath) {
    console.log(`Reading tile BMP: ${filePath}`);
    const data = readFileSync(filePath);
    
    // Get data offset from BMP header
    const dataOffset = data.readUInt32LE(10);
    console.log(`- BMP data offset: 0x${dataOffset.toString(16).toUpperCase()}`);
    
    // Calculate row size (including padding)
    // BMP rows are padded to multiples of 4 bytes
    const width = 8;
    const rowSize = Math.ceil(width / 4) * 4;
    console.log(`- BMP row size: ${rowSize} bytes`);
    
    // Extract 8x8 pixels from indexed color data
    const pixels = [];
    for (let y = 0; y < 8; y++) {
        const rowOffset = dataOffset + (y * rowSize);
        let row = "";
        for (let x = 0; x < 8; x++) {
            const pixel = data[rowOffset + x];
            pixels.push(pixel);
            row += pixel.toString().padStart(2) + " ";
        }
        console.log(`  Row ${y}: ${row}`);
    }
    
    console.log(`- Extracted ${pixels.length} pixels`);
    return pixels;
}

// Function to convert pixels to Genesis 4bpp format
function convertToGenesis4bpp(pixels) {
    console.log(`\nConverting to Genesis 4bpp format:`);
    const packedTile = new Uint8Array(32);
    
    for (let y = 0; y < 8; y++) {
        let rowData = "";
        
        for (let x = 0; x < 4; x++) {
            const pixel1 = pixels[y * 8 + x * 2];
            const pixel2 = pixels[y * 8 + x * 2 + 1];
            const byte = ((pixel1 & 0x0F) << 4) | (pixel2 & 0x0F);
            packedTile[y * 4 + x] = byte;
            
            rowData += `${pixel1.toString().padStart(2)},${pixel2.toString().padStart(2)} → ${byte.toString(16).padStart(2, '0').toUpperCase()} | `;
        }
        
        console.log(`  Row ${y}: ${rowData}`);
    }
    
    console.log(`- Packed into ${packedTile.length} bytes`);
    return packedTile;
}

// Function to decode a Genesis 4bpp tile
function decodeGenesis4bpp(packedTile) {
    console.log(`\nDecoding from Genesis 4bpp format:`);
    const pixels = new Array(64);
    let pixelIdx = 0;
    
    for (let y = 0; y < 8; y++) {
        let rowData = "";
        const rowStart = y * 4;
        
        for (let x = 0; x < 4; x++) {
            const byte = packedTile[rowStart + x];
            const pixel1 = (byte >> 4) & 0x0F;
            const pixel2 = byte & 0x0F;
            
            pixels[pixelIdx++] = pixel1;
            pixels[pixelIdx++] = pixel2;
            
            rowData += `${byte.toString(16).padStart(2, '0').toUpperCase()} → ${pixel1.toString().padStart(2)},${pixel2.toString().padStart(2)} | `;
        }
        
        console.log(`  Row ${y}: ${rowData}`);
    }
    
    console.log(`- Decoded ${pixels.length} pixels`);
    return pixels;
}

// Function to compare two sets of pixels
function comparePixels(original, decoded) {
    console.log(`\nComparing original and decoded pixels:`);
    let diffCount = 0;
    
    for (let y = 0; y < 8; y++) {
        let rowData = "";
        
        for (let x = 0; x < 8; x++) {
            const idx = y * 8 + x;
            const orig = original[idx];
            const dec = decoded[idx];
            const isMatch = orig === dec;
            
            if (!isMatch) diffCount++;
            
            rowData += `${orig.toString().padStart(2)} vs ${dec.toString().padStart(2)} ${isMatch ? '✓' : '✗'} | `;
        }
        
        console.log(`  Row ${y}: ${rowData}`);
    }
    
    console.log(`- Found ${diffCount} differences out of 64 pixels`);
    return diffCount === 0;
}

// Main function to diagnose tile corruption
function diagnoseTileCorruption(tileDir, tileIndices) {
    console.log(`Diagnosing potential tile corruption in ${tileDir}\n`);
    
    for (const tileIndex of tileIndices) {
        const tileFile = join(tileDir, `${tileIndex.toString().padStart(4, '0')}.bmp`);
        console.log(`\n======= ANALYZING TILE ${tileIndex} =======`);
        
        try {
            // Step 1: Read the BMP file and extract pixels
            const originalPixels = readTileBmp(tileFile);
            
            // Step 2: Convert the pixels to Genesis 4bpp format
            const packedTile = convertToGenesis4bpp(originalPixels);
            
            // Step 3: Decode the packed tile back to pixels
            const decodedPixels = decodeGenesis4bpp(packedTile);
            
            // Step 4: Compare the original and decoded pixels
            const isMatch = comparePixels(originalPixels, decodedPixels);
            
            console.log(`\nRoundtrip conversion: ${isMatch ? 'SUCCESSFUL' : 'FAILED'}`);
        } catch (error) {
            console.error(`Error processing tile ${tileIndex}: ${error.message}`);
        }
    }
}

// Check command line arguments
if (process.argv.length < 3) {
    console.log('Usage: node diagnose-tile-corruption.js <path-to-tiles-directory> [tile indices...]');
    console.log('Example: node diagnose-tile-corruption.js ./build/mcdavidtouch3-count-pal0-1-2-3/tiles 0 1 2 3 4');
    process.exit(1);
}

// Get directory path and optional tile indices
const tilesDir = process.argv[2];
const tileIndices = process.argv.length > 3 
    ? process.argv.slice(3).map(Number) 
    : [0, 1, 2, 3, 4, 5]; // Default tiles to check

diagnoseTileCorruption(tilesDir, tileIndices);
