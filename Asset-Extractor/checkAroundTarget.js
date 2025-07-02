const fs = require('fs');

function readUInt32BE(buffer, offset) {
    return buffer.readUInt32BE(offset);
}

function readUInt16BE(buffer, offset) {
    return buffer.readUInt16BE(offset);
}

const buffer = fs.readFileSync('c:/repository/NHLHockey/nhl92retail.bin');
const fileLength = buffer.length;

console.log('Checking specific range around 0x24214...\n');

// Check from 0x24200 to 0x24230
for (let i = 0x24200; i <= 0x24230; i++) {
    try {
        // Read potential offsets
        const paletteOffset = readUInt32BE(buffer, i);
        const mapOffset = readUInt32BE(buffer, i + 4);
        
        // Basic validation checks (same as main script)
        if (i + paletteOffset >= fileLength) continue;
        if (i + mapOffset >= fileLength) continue;
        if (paletteOffset >= mapOffset) continue;
        if (paletteOffset < 10) continue;
        if (paletteOffset > 0x10000) continue;
        if (mapOffset > 0x20000) continue;
        if (mapOffset - paletteOffset < 4) continue;
        
        console.log(`✅ PASSED all basic checks at offset 0x${i.toString(16)} (${i})`);
        console.log(`  Palette Section Offset: 0x${paletteOffset.toString(16)} (${paletteOffset})`);
        console.log(`  Map Section Offset: 0x${mapOffset.toString(16)} (${mapOffset})`);
        
        // Check for .map.jim
        const numberOfTiles = readUInt16BE(buffer, i + 8);
        const expectedPaletteOffset = 10 + (numberOfTiles * 32);
        
        console.log(`  Number of Tiles: ${numberOfTiles}`);
        console.log(`  Expected Palette Offset: 0x${expectedPaletteOffset.toString(16)} (${expectedPaletteOffset})`);
        console.log(`  Match: ${expectedPaletteOffset === paletteOffset ? 'YES' : 'NO'}`);
        
        if (expectedPaletteOffset === paletteOffset && numberOfTiles > 0 && numberOfTiles < 1000) {
            const mapWidth = readUInt16BE(buffer, i + mapOffset);
            const mapHeight = readUInt16BE(buffer, i + mapOffset + 2);
            
            console.log(`  Map Dimensions: ${mapWidth} x ${mapHeight}`);
            
            if (mapWidth > 0 && mapHeight > 0 && mapWidth < 1000 && mapHeight < 1000) {
                const mapDataEnd = i + mapOffset + 4 + (mapWidth * mapHeight * 2);
                console.log(`  ✅ VALID .map.jim file at 0x${i.toString(16)}`);
                console.log(`  File Range: 0x${i.toString(16)} - 0x${mapDataEnd.toString(16)} (${mapDataEnd - i} bytes)`);
            }
        }
        
        console.log('');
    } catch (error) {
        // Skip
    }
}
