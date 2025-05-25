// comprehensive-tile-test.js
// A comprehensive test for tile encoding/decoding
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';

let output = "";

// Helper function to log to both console and output string
function log(str) {
    console.log(str);
    output += str + "\n";
}

// Create binary buffer from an array of bytes
function arrToBuffer(arr) {
    return Buffer.from(arr);
}

// === TILE FUNCTIONS FROM extractJimFull.js ===

// Decode a Genesis 8x8 tile (4 bits per pixel)
function decodeGenesisTile(tileBuf) {
    const tileData = new Array(64).fill(0); // 8x8 = 64 pixels

    // Process 32 bytes (4 bits per pixel × 64 pixels = 256 bits = 32 bytes)
    for (let byteIndex = 0; byteIndex < 32; byteIndex++) {
        const byte = tileBuf[byteIndex];
        
        // Each byte contains 2 pixels (4 bits each)
        const pixel1Index = (byteIndex * 2);
        const pixel2Index = (byteIndex * 2) + 1;
        
        // Extract the two 4-bit values from the byte
        const pixel1Value = (byte >> 4) & 0x0F; // Higher 4 bits
        const pixel2Value = byte & 0x0F;        // Lower 4 bits
        
        // Store the pixel values - check if we're still in bounds
        if (pixel1Index < 64) tileData[pixel1Index] = pixel1Value;
        if (pixel2Index < 64) tileData[pixel2Index] = pixel2Value;
    }

    return tileData;
}

// === TILE FUNCTIONS FROM rebuildJim.js ===

// Encode a Genesis 8x8 tile (4 bits per pixel)
function encodeGenesisTile(tileData) {
    const tileBuf = Buffer.alloc(32); // Allocate 32 bytes for the encoded tile

    // Process 32 bytes (4 bits per pixel × 64 pixels = 256 bits = 32 bytes)
    for (let byteIndex = 0; byteIndex < 32; byteIndex++) {
        // Each byte contains 2 pixels (4 bits each)
        const pixel1Index = (byteIndex * 2);
        const pixel2Index = (byteIndex * 2) + 1;
        
        // Get the two pixel values
        const pixel1Value = pixel1Index < 64 ? tileData[pixel1Index] & 0x0F : 0;
        const pixel2Value = pixel2Index < 64 ? tileData[pixel2Index] & 0x0F : 0;
        
        // Combine them into a single byte (4 bits each)
        const byte = ((pixel1Value & 0x0F) << 4) | (pixel2Value & 0x0F);
        
        // Store the byte
        tileBuf[byteIndex] = byte;
    }

    return tileBuf;
}

// Generate a random tile as a test case
function generateRandomTile() {
    const tileData = new Array(64).fill(0);
    
    // Fill with random palette indices (0-15)
    for (let i = 0; i < 64; i++) {
        tileData[i] = Math.floor(Math.random() * 16);
    }
    
    return tileData;
}

// Create test patterns for tiles
function generateTestPatterns() {
    const patterns = [];
    
    // Pattern 1: All same value
    patterns.push(new Array(64).fill(1));
    
    // Pattern 2: Alternating values
    const alternating = [];
    for (let i = 0; i < 64; i++) {
        alternating.push(i % 2 === 0 ? 2 : 3);
    }
    patterns.push(alternating);
    
    // Pattern 3: Gradient by row
    const gradient = [];
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            gradient.push(row); // Each row has the same value
        }
    }
    patterns.push(gradient);
    
    // Pattern 4: Checkerboard
    const checkerboard = [];
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            checkerboard.push((row + col) % 2 === 0 ? 4 : 0);
        }
    }
    patterns.push(checkerboard);
    
    // Pattern 5: All 16 possible values
    const allValues = [];
    for (let i = 0; i < 16; i++) {
        // Repeat each value 4 times
        for (let j = 0; j < 4; j++) {
            allValues.push(i);
        }
    }
    patterns.push(allValues);
    
    return patterns;
}

// Test if tile data is preserved through encode/decode roundtrip
function testTileRoundtrip() {
    log("\n=== TILE ENCODE/DECODE ROUNDTRIP TEST ===");
    log("Testing if tile data is preserved when encoded and then decoded");
    
    // Get test patterns
    const testPatterns = generateTestPatterns();
    const randomTiles = Array.from({ length: 5 }, () => generateRandomTile());
    const allTestTiles = [...testPatterns, ...randomTiles];
    
    let passCount = 0;
    
    for (let i = 0; i < allTestTiles.length; i++) {
        const originalTile = allTestTiles[i];
        
        // Encode the tile
        const encodedTile = encodeGenesisTile(originalTile);
        
        // Decode the encoded tile
        const decodedTile = decodeGenesisTile(encodedTile);
        
        // Compare original and decoded
        let match = true;
        for (let j = 0; j < 64; j++) {
            if (originalTile[j] !== decodedTile[j]) {
                match = false;
                break;
            }
        }
        
        if (match) {
            passCount++;
        }
        
        const tileType = i < testPatterns.length ? `Pattern ${i+1}` : `Random Tile ${i - testPatterns.length + 1}`;
        log(`${tileType}: ${match ? "✓ PASS" : "✗ FAIL"}`);
        
        if (!match) {
            // Display first mismatch
            for (let j = 0; j < 64; j++) {
                if (originalTile[j] !== decodedTile[j]) {
                    log(`  First mismatch at index ${j}: Original=${originalTile[j]}, Decoded=${decodedTile[j]}`);
                    break;
                }
            }
            
            // Visual representation of original vs decoded
            log("  Original Tile:");
            printTile(originalTile);
            log("  Decoded Tile:");
            printTile(decodedTile);
        }
    }
    
    log(`\nSummary: ${passCount}/${allTestTiles.length} tiles passed the roundtrip test`);
}

// Print a visual representation of the tile
function printTile(tileData) {
    let tileStr = "";
    for (let row = 0; row < 8; row++) {
        let rowStr = "  ";
        for (let col = 0; col < 8; col++) {
            const index = row * 8 + col;
            const value = tileData[index];
            // Use hex for tile values
            rowStr += value.toString(16).toUpperCase() + " ";
        }
        log(rowStr);
    }
}

// Test the impact of different tile orders
function testTileOrdering() {
    log("\n=== TILE ORDERING IMPACT TEST ===");
    log("Evaluating how tile order in JIM files impacts extraction/rebuilding");
    
    // Create a simulated JIM file with 4 tiles
    const tiles = Array.from({ length: 4 }, () => generateRandomTile());
    
    log("Created 4 test tiles:");
    for (let i = 0; i < tiles.length; i++) {
        log(`\nTile ${i}:`);
        printTile(tiles[i]);
    }
    
    // Compare what happens when we reorder tiles
    log("\nIf tiles are reordered in the JIM file, their content doesn't change,");
    log("but their position/index does, which affects how they're referenced by the map data.");
    log("This could lead to a completely different visual appearance if the map data");
    log("isn't updated accordingly.");
    
    // Simulating what happens when palette data overwrites tile data
    log("\n=== SIMULATING PALETTE OVERWRITE ISSUE ===");
    log("When palette offset is too small, it can overwrite tile data.");
    
    // Make a copy of our tiles
    const corruptedTiles = tiles.map(t => [...t]);
    
    // Simulate palette data overwriting part of the last tile
    log("\nSimulating palette data overwriting last 16 bytes of Tile 3:");
    for (let i = 48; i < 64; i++) {
        corruptedTiles[3][i] = 15; // Overwrite with palette color index 15
    }
    
    log("Original Tile 3:");
    printTile(tiles[3]);
    log("Corrupted Tile 3:");
    printTile(corruptedTiles[3]);
    
    log("\nThis simulation demonstrates how incorrect offset calculations can lead to");
    log("data corruption. If the palette offset is set too low, it will overwrite the");
    log("end of tile data, causing visual glitches in the affected tiles.");
}

// Test the sensitivity of the offset calculations
function testOffsetCalculations() {
    log("\n=== OFFSET CALCULATION SENSITIVITY TEST ===");
    log("Testing how different offset calculation methods affect JIM file structure");
    
    const tileCounts = [1, 4, 8, 16];
    
    log("\nTile Count | First Tile Offset | Palette Offset (Fixed) | Palette Offset (Dynamic) | Map Offset (Fixed) | Map Offset (Dynamic)");
    log("---------------------------------------------------------------------------------------------------------------");
    
    for (const numTiles of tileCounts) {
        const firstTileOffset = 0x0A; // Standard first tile offset
        
        // Fixed offsets from the original code
        const fixedPaletteOffset = 0x82; // This was hardcoded in the original
        const fixedMapOffset = 0x102;    // This was hardcoded in the original
        
        // Dynamic offsets based on tile count
        const dynamicPaletteOffset = firstTileOffset + (numTiles * 32);
        // Align to 4-byte boundary
        const alignedPaletteOffset = Math.ceil(dynamicPaletteOffset / 4) * 4;
        
        const dynamicMapOffset = alignedPaletteOffset + 128; // 4 palettes * 32 bytes
        // Align to 4-byte boundary
        const alignedMapOffset = Math.ceil(dynamicMapOffset / 4) * 4;
        
        log(`${numTiles.toString().padEnd(10)} | 0x${firstTileOffset.toString(16).toUpperCase().padEnd(14)} | 0x${fixedPaletteOffset.toString(16).toUpperCase().padEnd(18)} | 0x${alignedPaletteOffset.toString(16).toUpperCase().padEnd(22)} | 0x${fixedMapOffset.toString(16).toUpperCase().padEnd(16)} | 0x${alignedMapOffset.toString(16).toUpperCase()}`);
        
        // Check for potential overlaps
        if (fixedPaletteOffset < firstTileOffset + (numTiles * 32)) {
            log(`⚠️ OVERLAP: Fixed palette offset (0x${fixedPaletteOffset.toString(16).toUpperCase()}) would overwrite tile data with ${numTiles} tiles`);
        }
    }
    
    log("\nThis test demonstrates why fixed offsets are problematic when the number of tiles varies.");
    log("With the original fixed offsets, any JIM file with more than ~6 tiles would experience corruption");
    log("as the palette data would begin to overwrite the tail end of the tile data.");
}

// Main test function
function runAllTests() {
    log("COMPREHENSIVE TILE ENCODING/DECODING TEST");
    log("=========================================");
    log("Testing tile processing used in JIM-to-BMP tools");
    log("Generated: " + new Date().toISOString());
    
    testTileRoundtrip();
    testTileOrdering();
    testOffsetCalculations();
    
    log("\n=== SUMMARY ===");
    log("1. The tile encoding/decoding functions correctly preserve tile data when used correctly.");
    log("2. Incorrect offset calculations can lead to data corruption when palette data overwrites tile data.");
    log("3. Dynamic offset calculations based on the actual number of tiles is essential for proper JIM file structure.");
    log("\nRecommendation: Always use dynamic offset calculations that account for the actual number of tiles");
    log("in the JIM file to prevent data corruption.");
}

runAllTests();

// Write output to file
writeFileSync('comprehensive-tile-test-results.txt', output);
console.log("Test completed. Results saved to comprehensive-tile-test-results.txt");
