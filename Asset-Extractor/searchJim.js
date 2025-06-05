const fs = require('fs').promises;
const path = require('path');

async function searchNHL92MapJim(filePath) {
    try {
        // Read the entire binary file
        const buffer = await fs.readFile(filePath);
        const fileSize = buffer.length;
        const results = [];

        // Perform overlapping search by checking each byte offset
        for (let offset = 0; offset < fileSize - 12; offset++) {
            try {
                // Read Palette Section Offset (uint32, big-endian)
                const paletteOffset = buffer.readUInt32BE(offset);
                // Read Map Section Offset (uint32, big-endian)
                const mapOffset = buffer.readUInt32BE(offset + 4);
                // Read Number of Tiles (uint16, big-endian)
                const numTiles = buffer.readUInt16BE(offset + 8);

                // Check if Map Section Offset is exactly 0x80 (128) bytes after Palette Section Offset
                if (mapOffset != paletteOffset + 0x80 && mapOffset != paletteOffset + 0x60 && mapOffset != paletteOffset + 0x40 && mapOffset != paletteOffset + 0x20) {
                    continue;
                }
                else {
                    console.log('found possible hit at offset', offset.toString(16));
                }

                // Calculate expected tile data size
                const tileDataSize = numTiles * 32;
                // Calculate expected palette data size (fixed at 128 bytes)
                const paletteDataSize = 128;

                // Validate offsets and sizes
                if (
                    paletteOffset < offset + 10 + tileDataSize || // Ensure palette doesn't overlap tile data
                    mapOffset < paletteOffset + paletteDataSize || // Ensure map doesn't overlap palette
                    paletteOffset + paletteDataSize > fileSize || // Ensure palette fits in file
                    mapOffset + 4 > fileSize // Ensure map width/height can be read
                ) {
                    console.log('if true', paletteOffset < offset + 10 + tileDataSize , 
                    mapOffset < paletteOffset + paletteDataSize , 
                    paletteOffset + paletteDataSize > fileSize , 
                    mapOffset + 4 > fileSize); // Ensure map width/height can be read
                    // console.log(mapOffset, paletteOffset, paletteDataSize);
                    // console.log(paletteOffset, paletteDataSize, fileSize);
                    // continue;
                } else {
                    console.log('if false');
                }

                // Read Map Width and Height
                const mapWidth = buffer.readUInt16BE(mapOffset);
                const mapHeight = buffer.readUInt16BE(mapOffset + 2);

                // Calculate map data size
                const mapDataSize = mapWidth * mapHeight * 2;

                // Validate map data fits within file
                if (mapOffset + 4 + mapDataSize > fileSize) {
                    continue;
                }

                // Validate tile indices in map data
                let validMapData = true;
                for (let i = 0; i < mapDataSize; i += 2) {
                    const tileEntry = buffer.readUInt16BE(mapOffset + 4 + i);
                    const tileIndex = tileEntry & 0x7FF; // Bits 0-10
                    if (tileIndex >= numTiles) {
                        validMapData = false;
                        break;
                    }
                    const paletteIndex = (tileEntry >> 13) & 0x3; // Bits 13-14
                    if (paletteIndex > 3) {
                        validMapData = false;
                        break;
                    }
                }

                if (!validMapData) {
                    continue;
                }

                // If all checks pass, record this as a potential match
                results.push({
                    offset,
                    paletteOffset,
                    mapOffset,
                    numTiles,
                    mapWidth,
                    mapHeight,
                    tileDataSize,
                    mapDataSize
                });
            } catch (err) {
                // Skip invalid reads (e.g., out-of-bounds)
                continue;
            }
        }

        // Output results
        if (results.length === 0) {
            console.log(`No valid NHL92 .map.jim files found in ${filePath}`);
        } else {
            console.log(`Found ${results.length} potential NHL92 .map.jim files in ${filePath}:`);
            results.forEach((result, index) => {
                console.log(`Match ${index + 1}:`);
                console.log(`  Offset: 0x${result.offset.toString(16).padStart(8, '0')}`);
                console.log(`  Palette Section Offset: 0x${result.paletteOffset.toString(16).padStart(8, '0')}`);
                console.log(`  Map Section Offset: 0x${result.mapOffset.toString(16).padStart(8, '0')}`);
                console.log(`  Number of Tiles: ${result.numTiles}`);
                console.log(`  Map Width: ${result.mapWidth}`);
                console.log(`  Map Height: ${result.mapHeight}`);
                console.log(`  Tile Data Size: ${result.tileDataSize} bytes`);
                console.log(`  Map Data Size: ${result.mapDataSize} bytes`);
                console.log('');
            });
        }

        return results;
    } catch (err) {
        console.error(`Error reading file ${filePath}:`, err.message);
        return [];
    }
}

// Command-line usage
if (process.argv.length < 3) {
    console.log('Usage: node search_nhl92_mapjim.js <file_path>');
    process.exit(1);
}

const filePath = process.argv[2];
searchNHL92MapJim(filePath);