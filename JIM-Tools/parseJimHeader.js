import { readFileSync, existsSync } from 'fs';

function parseJimHeader(filePath) {
    // Read the file
    const buffer = readFileSync(filePath);

    // Read values in Big Endian format
    const paletteOffset = buffer.readUInt32BE(0);
    const mapSectionOffset = buffer.readUInt32BE(4);
    const numTiles = buffer.readUInt16BE(8);
    const firstTileOffset = 0x0A; // This is fixed at 0x10 according to the spec

    console.log(`Palette Section Offset: 0x${paletteOffset.toString(16).toUpperCase()}`);
    console.log(`Map Section Offset: 0x${mapSectionOffset.toString(16).toUpperCase()}`);
    console.log(`Number of Tiles/Stamps: ${numTiles}`);
    console.log(`First Tile Offset: 0x${firstTileOffset.toString(16).toUpperCase()}`);
}

// Check if a file path was provided
if (process.argv.length < 3) {
    console.log('Usage: node parseJimHeader.js <path-to-jim-file>');
    process.exit(1);
}

// Get the file path from command line arguments
const filePath = process.argv[2];

// Check if file exists
if (!existsSync(filePath)) {
    console.log(`Error: File '${filePath}' does not exist`);
    process.exit(1);
}

// Parse the file
parseJimHeader(filePath);
