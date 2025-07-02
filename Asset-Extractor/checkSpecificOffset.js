const fs = require('fs');

function readUInt32BE(buffer, offset) {
    return buffer.readUInt32BE(offset);
}

function readUInt16BE(buffer, offset) {
    return buffer.readUInt16BE(offset);
}

const buffer = fs.readFileSync('c:/repository/NHLHockey/nhl92retail.bin');
const fileLength = buffer.length;

console.log('Checking specific offset 0x24214 (148500)...\n');

const i = 0x24214;

try {
    // Read potential offsets
    const paletteOffset = readUInt32BE(buffer, i);
    const mapOffset = readUInt32BE(buffer, i + 4);
    
    console.log(`Offset: 0x${i.toString(16)} (${i})`);
    console.log(`  Palette Section Offset: 0x${paletteOffset.toString(16)} (${paletteOffset})`);
    console.log(`  Map Section Offset: 0x${mapOffset.toString(16)} (${mapOffset})`);
    
    // Basic validation checks
    const paletteInBounds = (i + paletteOffset < fileLength);
    const mapInBounds = (i + mapOffset < fileLength);
    const correctOrder = (paletteOffset < mapOffset);
    const reasonable = (paletteOffset > 10);
    
    console.log(`  Palette in bounds: ${paletteInBounds}`);
    console.log(`  Map in bounds: ${mapInBounds}`);
    console.log(`  Correct order: ${correctOrder}`);
    console.log(`  Reasonable offset: ${reasonable}`);
    
    if (!paletteInBounds || !mapInBounds || !correctOrder || !reasonable) {
        console.log('  ❌ Failed basic validation checks');
        return;
    }
    
    console.log('  ✅ Passed basic validation checks');
    
    // Check for .map.jim (uncompressed)
    try {
        const numberOfTiles = readUInt16BE(buffer, i + 8);
        
        console.log(`  JIM Check:`);
        console.log(`    Number of Tiles: ${numberOfTiles}`);
        
        const expectedPaletteOffset = 10 + (numberOfTiles * 32);
        console.log(`    Expected Palette Offset: 0x${expectedPaletteOffset.toString(16)} (${expectedPaletteOffset})`);
        console.log(`    Actual Palette Offset: 0x${paletteOffset.toString(16)} (${paletteOffset})`);
        
        if (expectedPaletteOffset === paletteOffset && numberOfTiles > 0 && numberOfTiles < 1000) {
            // Read map dimensions
            const mapWidth = readUInt16BE(buffer, i + mapOffset);
            const mapHeight = readUInt16BE(buffer, i + mapOffset + 2);
            
            console.log(`    Map Dimensions: ${mapWidth} x ${mapHeight}`);
            
            // Calculate end of map data section
            const mapDataEnd = i + mapOffset + 4 + (mapWidth * mapHeight * 2);
            
            if (mapDataEnd <= fileLength) {
                console.log(`    ✅ LIKELY .map.jim file`);
                console.log(`    File Range: 0x${i.toString(16)} - 0x${mapDataEnd.toString(16)} (${mapDataEnd - i} bytes)`);
            } else {
                console.log(`    ❌ Map data extends beyond file`);
            }
        } else {
            console.log(`    ❌ Palette offset mismatch or invalid tile count`);
        }
    } catch (error) {
        console.log(`    ❌ JIM check failed: ${error.message}`);
    }
    
} catch (error) {
    console.log(`Error at offset 0x${i.toString(16)}: ${error.message}`);
}
