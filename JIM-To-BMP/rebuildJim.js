import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Convert RGB color to Genesis format (0000BBB0GGG0RRR0)
function RGBToGenesisColor(r, g, b) {
    // Convert from 8-bit (0-255) to 3-bit (0-7)
    r = Math.round(r / 32) & 0x07;
    g = Math.round(g / 32) & 0x07;
    b = Math.round(b / 32) & 0x07;

    // Pack into 16-bit genesis format
    return ((b << 9) | (g << 5) | (r << 1));
}

// Read a palette from .ACT format
function readACTPalette(filepath) {
    const data = readFileSync(filepath);
    const colors = [];
    for (let i = 0; i < data.length; i += 3) {
        colors.push([
            data[i],     // R
            data[i + 1], // G
            data[i + 2]  // B
        ]);
    }
    return colors;
}

function rebuildJim(metadataPath) {
    // Read metadata
    const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
    const baseDir = join(metadataPath, '..');
    const tilesDir = join(baseDir, 'tiles');

    // Calculate sizes and offsets
    const numTiles = metadata.numTiles;
    const firstTileOffset = 0x0A;
    const tileDataSize = numTiles * 32;
    const paletteOffset = parseInt(metadata.paletteOffset.slice(2), 16);
    const mapOffset = parseInt(metadata.mapOffset.slice(2), 16);

    // Create output buffer
    const headerSize = 0x0A;  // 10 bytes for header
    const totalSize = Math.max(
        firstTileOffset + tileDataSize,
        paletteOffset + 128,  // 4 palettes * 32 bytes each
        mapOffset + 4 + (metadata.mapWidth * metadata.mapHeight * 2)
    );
    const buffer = Buffer.alloc(totalSize);

    // Write header
    buffer.writeUInt32BE(paletteOffset, 0);
    buffer.writeUInt32BE(mapOffset, 4);
    buffer.writeUInt16BE(numTiles, 8);

    // Read and write tiles
    for (let t = 0; t < numTiles; t++) {
        const tileFile = join(tilesDir, `${t.toString().padStart(4, '0')}.bmp`);
        const tileData = readFileSync(tileFile);
        
        // BMP data starts after header, DIB header, and palette
        // Extract 8x8 pixels from indexed color data
        const pixelOffset = 54 + (256 * 4); // Skip BMP header + color table
        const pixels = [];
        for (let i = 0; i < 64; i++) {
            pixels.push(tileData[pixelOffset + i]);
        }

        // Convert pixels to Genesis 4bpp tile format
        const tileOffset = firstTileOffset + (t * 32);
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 4; x++) {
                // Pack two pixels into one byte
                const pixel1 = pixels[y * 8 + x * 2];
                const pixel2 = pixels[y * 8 + x * 2 + 1];
                const byte = ((pixel1 & 0x0F) << 4) | (pixel2 & 0x0F);
                buffer[tileOffset + y * 4 + x] = byte;
            }
        }
    }

    // Read and write palettes
    for (let p = 0; p < 4; p++) {
        const palFile = join(baseDir, `${p}.act`);
        const palette = readACTPalette(palFile);
        
        // Convert first 16 colors to Genesis format
        for (let c = 0; c < 16; c++) {
            const color = palette[c];
            const genesisColor = RGBToGenesisColor(color[0], color[1], color[2]);
            buffer.writeUInt16BE(genesisColor, paletteOffset + (p * 32) + (c * 2));
        }
    }

    // Write map dimensions and data
    buffer.writeUInt16BE(metadata.mapWidth, mapOffset);
    buffer.writeUInt16BE(metadata.mapHeight, mapOffset + 2);

    // Write map data
    let offset = mapOffset + 4;
    for (const row of metadata.mapData) {
        for (const tile of row) {
            // Pack tile data into 16-bit value
            const tileData = (
                (tile.tileIndex & 0x7FF) |          // Bits 0-10: Tile index
                ((tile.hFlip ? 1 : 0) << 11) |      // Bit 11: Horizontal flip
                ((tile.vFlip ? 1 : 0) << 12) |      // Bit 12: Vertical flip
                ((tile.palIndex & 0x03) << 13) |    // Bits 13-14: Palette index
                ((tile.priority ? 1 : 0) << 15)      // Bit 15: Priority
            );
            buffer.writeUInt16BE(tileData, offset);
            offset += 2;
        }
    }

    // Save the rebuilt .jim file
    const outPath = join(baseDir, 'rebuilt.jim');
    writeFileSync(outPath, buffer);
    console.log('JIM file rebuilt successfully:', outPath);
}

// Check command line arguments
if (process.argv.length < 3) {
    console.log('Usage: node rebuildJim.js <path-to-metadata.json>');
    process.exit(1);
}

// Get metadata path and run rebuilding process
const metadataPath = process.argv[2];
rebuildJim(metadataPath);
