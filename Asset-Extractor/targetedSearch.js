const fs = require('fs');

function readUInt32BE(buffer, offset) {
    return buffer.readUInt32BE(offset);
}

function readUInt16BE(buffer, offset) {
    return buffer.readUInt16BE(offset);
}

function readUInt8(buffer, offset) {
    return buffer.readUInt8(offset);
}

function searchMapFiles(filePath) {
    console.log(`Searching for .map.jim and .map.jzip files in: ${filePath}`);
    console.log('=' .repeat(80));
    
    try {
        const buffer = fs.readFileSync(filePath);
        const fileLength = buffer.length;
        
        console.log(`File size: ${fileLength} bytes (0x${fileLength.toString(16)})`);
        console.log('');
        
        let foundCount = 0;
        
        // Search in chunks to avoid too much output
        const targetOffset = 0x24214;
        const searchStart = Math.max(0, targetOffset - 1000);
        const searchEnd = Math.min(fileLength - 12, targetOffset + 1000);
        
        console.log(`Searching around target offset 0x${targetOffset.toString(16)}...`);
        console.log(`Search range: 0x${searchStart.toString(16)} to 0x${searchEnd.toString(16)}`);
        console.log('');
        
        for (let i = searchStart; i <= searchEnd; i++) {
            try {
                // Read potential offsets
                const paletteOffset = readUInt32BE(buffer, i);
                const mapOffset = readUInt32BE(buffer, i + 4);
                
                // Basic validation checks
                if (i + paletteOffset >= fileLength) continue;
                if (i + mapOffset >= fileLength) continue;
                if (paletteOffset >= mapOffset) continue;
                if (paletteOffset < 10) continue; // Must have at least header + some data
                
                console.log(`Potential file at offset 0x${i.toString(16)} (${i})`);
                console.log(`  Palette Section Offset: 0x${paletteOffset.toString(16)} (${paletteOffset})`);
                console.log(`  Map Section Offset: 0x${mapOffset.toString(16)} (${mapOffset})`);
                
                // Check for .map.jim (uncompressed)
                let isJim = false;
                
                try {
                    const numberOfTiles = readUInt16BE(buffer, i + 8);
                    
                    console.log(`  JIM Check:`);
                    console.log(`    Number of Tiles: ${numberOfTiles}`);
                    
                    const expectedPaletteOffset = 10 + (numberOfTiles * 32);
                    console.log(`    Expected Palette Offset: 0x${expectedPaletteOffset.toString(16)} (${expectedPaletteOffset})`);
                    console.log(`    Actual Palette Offset: 0x${paletteOffset.toString(16)} (${paletteOffset})`);
                    
                    if (expectedPaletteOffset === paletteOffset && numberOfTiles > 0 && numberOfTiles < 1000) {
                        const mapWidth = readUInt16BE(buffer, i + mapOffset);
                        const mapHeight = readUInt16BE(buffer, i + mapOffset + 2);
                        
                        console.log(`    Map Dimensions: ${mapWidth} x ${mapHeight}`);
                        
                        // Calculate end of map data section
                        const mapDataEnd = i + mapOffset + 4 + (mapWidth * mapHeight * 2);
                        
                        if (mapDataEnd <= fileLength) {
                            console.log(`    ✅ LIKELY .map.jim file`);
                            console.log(`    File Range: 0x${i.toString(16)} - 0x${mapDataEnd.toString(16)} (${mapDataEnd - i} bytes)`);
                            isJim = true;
                            foundCount++;
                        } else {
                            console.log(`    ❌ Map data extends beyond file`);
                        }
                    } else {
                        console.log(`    ❌ Palette offset mismatch or invalid tile count`);
                    }
                } catch (error) {
                    console.log(`    ❌ JIM check failed: ${error.message}`);
                }
                
                console.log('');
                
            } catch (error) {
                // Skip this offset
            }
        }
        
        console.log('=' .repeat(80));
        console.log(`Search completed. Found ${foundCount} potential map files in range.`);
        
    } catch (error) {
        console.error(`Error reading file: ${error.message}`);
    }
}

// Run the search
searchMapFiles('c:/repository/NHLHockey/nhl92retail.bin');
