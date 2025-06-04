const fs = require('fs').promises;

async function parseNHL92Map(filePath, startOffset) {
    try {
        // console.log("AA TEST 1");
        // Read the file into a buffer
        const fileBuffer = await fs.readFile(filePath);
        const buffer = fileBuffer.subarray(startOffset);
        // console.log("AA TEST 2", startOffset);
        // Parse header
        const paletteSectionOffset = buffer.readUInt32BE(0);
        const mapSectionOffset = buffer.readUInt32BE(4);
        const numTiles = buffer.readUInt16BE(8);
        // console.log("AA TEST 3", paletteSectionOffset, mapSectionOffset, numTiles);
        // Calculate tile data size (32 bytes per tile)
        const tileDataSize = numTiles * 32;
        const tileDataEnd = 0x0A + tileDataSize;
        // console.log("AA TEST 4");
        // Palette data is fixed at 128 bytes
        const paletteDataEnd = paletteSectionOffset + 128;
        // console.log("AA TEST 5");
        // Parse map section
        const mapWidth = buffer.readUInt16BE(mapSectionOffset);
        const mapHeight = buffer.readUInt16BE(mapSectionOffset + 2);
        const mapDataSize = mapWidth * mapHeight * 2;
        const mapDataEnd = mapSectionOffset + 4 + mapDataSize;
        // console.log("AA TEST 6");
        // Calculate end offset (furthest point among sections)
        const endOffset = Math.max(tileDataEnd, paletteDataEnd, mapDataEnd);
        // console.log("AA TEST 7");
        // Extract palette data
        const paletteData = [];
        for (let i = 0; i < 4; i++) {
            const palette = [];
            for (let j = 0; j < 16; j++) {
                // console.log('AA TEST 7.1', paletteSectionOffset);
                const color = buffer.readUInt16BE(paletteSectionOffset + (i * 32) + (j * 2));
                const blue = (color & 0x0E00) >> 9;
                const green = (color & 0x00E0) >> 5;
                const red = (color & 0x000E) >> 1;
                palette.push({ red, green, blue });
            }
            paletteData.push(palette);
        }
        // console.log("AA TEST 8");
        // Extract map data
        const mapData = [];
        for (let i = 0; i < mapWidth * mapHeight; i++) {
            const mapEntry = buffer.readUInt16BE(mapSectionOffset + 4 + (i * 2));
            const tileIndex = mapEntry & 0x07FF;
            const hFlip = (mapEntry & 0x0800) >> 11;
            const vFlip = (mapEntry & 0x1000) >> 12;
            const paletteIndex = (mapEntry & 0x6000) >> 13;
            const priority = (mapEntry & 0x8000) >> 15;
            mapData.push({ tileIndex, hFlip, vFlip, paletteIndex, priority });
        }
        // console.log("AA TEST 9");
        // Console log metadata
        console.log('.map.jim Metadata:');
        console.log('------------------------');
        console.log(`Start Offset: 0x${startOffset.toString(16).padStart(8, '0')}`);
        console.log(`Palette Section Offset: 0x${paletteSectionOffset.toString(16).padStart(8, '0')}`);
        console.log(`Map Section Offset: 0x${mapSectionOffset.toString(16).padStart(8, '0')}`);
        console.log(`Number of Tiles: ${numTiles} (0x${numTiles.toString(16).padStart(4, '0')})`);
        console.log(`Tile Data Size: ${tileDataSize} bytes`);
        console.log(`Map Width: ${mapWidth}`);
        console.log(`Map Height: ${mapHeight}`);
        console.log(`Map Data Size: ${mapDataSize} bytes`);
        console.log('Palettes:');
        paletteData.forEach((palette, i) => {
            console.log(`  Palette ${i}:`);
            palette.forEach((color, j) => {
                console.log(`    Color ${j}: R=${color.red}, G=${color.green}, B=${color.blue}`);
            });
        });
        console.log('Map Data (first 5 entries):');
        mapData.slice(0, 5).forEach((entry, i) => {
            console.log(`  Tile ${i}: Index=${entry.tileIndex}, HFlip=${entry.hFlip}, VFlip=${entry.vFlip}, Palette=${entry.paletteIndex}, Priority=${entry.priority}`);
        });
        if (mapData.length > 5) {
            console.log(`  ... (${mapData.length - 5} more entries)`);
        }
        console.log(`End Offset: 0x${(startOffset + endOffset).toString(16).padStart(8, '0')}`);

        // Return end offset
        return startOffset + endOffset;
    } catch (error) {
        console.error('Error parsing file:', error.message);
        throw error;
    }
}

// Example usage
if (process.argv.length < 4) {
    console.log('Usage: node findJimEnd.js <filePath> <startOffset>');
    process.exit(1);
}

const filePath = process.argv[2];
const startOffset = parseInt(process.argv[3], 16);
console.log(process.argv[3], startOffset);
parseNHL92Map(filePath, startOffset)
    .then(endOffset => console.log(`Parsing complete. Final end offset: 0x${endOffset.toString(16).padStart(8, '0')}`))
    .catch(error => console.error('Failed to parse:', error.message));