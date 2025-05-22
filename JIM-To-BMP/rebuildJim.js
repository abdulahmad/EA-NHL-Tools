import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Convert RGB color to Genesis format (0000BBB0GGG0RRR0)
function RGBToGenesisColor(r, g, b) {
    // Convert from 8-bit (0-255) to 3-bit (0-7)
    // Use Math.min to avoid overflow and ensure proper rounding
    const r3 = Math.min(7, Math.round(r / 36.428));
    const g3 = Math.min(7, Math.round(g / 36.428));
    const b3 = Math.min(7, Math.round(b / 36.428));

    // Pack into 16-bit genesis format (0000BBB0GGG0RRR0)
    return ((b3 & 0x07) << 9) | ((g3 & 0x07) << 5) | ((r3 & 0x07) << 1);
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
    const tilesDir = join(baseDir, 'tiles');    // Calculate sizes and offsets
    const numTiles = metadata.numTiles || 0;
    console.log(`numTiles: ${numTiles}`);
    const firstTileOffset = 0x0A;
    const tileDataSize = numTiles * 32;
      // Calculate dynamic offsets based on the number of tiles
    let calculatedPaletteOffset = firstTileOffset + (numTiles * 32);
    // Align to 4-byte boundary for safety
    calculatedPaletteOffset = Math.ceil(calculatedPaletteOffset / 4) * 4;
    
    let calculatedMapOffset = calculatedPaletteOffset + 128; // 4 palettes * 32 bytes
    // Align to 4-byte boundary for safety
    calculatedMapOffset = Math.ceil(calculatedMapOffset / 4) * 4;
    
    // Use metadata offsets if provided, otherwise use calculated values
    const paletteOffset = metadata.paletteOffset ? parseInt(metadata.paletteOffset.slice(2), 16) : calculatedPaletteOffset;
    const mapOffset = metadata.mapOffset ? parseInt(metadata.mapOffset.slice(2), 16) : calculatedMapOffset;
    
    // Verify offsets don't cause overlap
    if (paletteOffset < firstTileOffset + (numTiles * 32)) {
        console.warn(`Warning: Palette offset 0x${paletteOffset.toString(16).toUpperCase()} is too small and may overwrite tile data!`);
        console.warn(`Minimum safe palette offset would be 0x${calculatedPaletteOffset.toString(16).toUpperCase()}`);
    }
    
    if (mapOffset < paletteOffset + 128) {
        console.warn(`Warning: Map offset 0x${mapOffset.toString(16).toUpperCase()} is too small and may overwrite palette data!`);
        console.warn(`Minimum safe map offset would be 0x${calculatedMapOffset.toString(16).toUpperCase()}`);
    }
    
    console.log(`paletteOffset: 0x${paletteOffset.toString(16).toUpperCase()} (calculated minimum: 0x${calculatedPaletteOffset.toString(16).toUpperCase()})`);
    console.log(`mapOffset: 0x${mapOffset.toString(16).toUpperCase()} (calculated minimum: 0x${calculatedMapOffset.toString(16).toUpperCase()})`);
    
    // Check mapWidth and mapHeight
    if (!metadata.mapWidth || !metadata.mapHeight) {
        console.error("Error: mapWidth or mapHeight is undefined in metadata.json");
        console.log("Metadata:", JSON.stringify(metadata, null, 2));
        process.exit(1);
    }
    
    console.log(`mapWidth: ${metadata.mapWidth}, mapHeight: ${metadata.mapHeight}`);

    // Create output buffer
    const headerSize = 0x0A;  // 10 bytes for header
    const totalSize = Math.max(
        firstTileOffset + tileDataSize,
        paletteOffset + 128,  // 4 palettes * 32 bytes each
        mapOffset + 4 + (metadata.mapWidth * metadata.mapHeight * 2)
    );
    console.log(`totalSize: ${totalSize}`);
    const buffer = Buffer.alloc(totalSize);

    // Write header
    buffer.writeUInt32BE(paletteOffset, 0);
    buffer.writeUInt32BE(mapOffset, 4);
    buffer.writeUInt16BE(numTiles, 8);    // Read and write tiles
    for (let t = 0; t < numTiles; t++) {
        const tileFile = join(tilesDir, `${t.toString().padStart(4, '0')}.bmp`);
        const tileData = readFileSync(tileFile);
        
        // BMP data starts after header, DIB header, and palette
        // Get the data offset from the BMP header
        const dataOffset = tileData.readUInt32LE(10);
        
        // Calculate row size (including padding)
        // BMP rows are padded to multiples of 4 bytes
        const width = 8;
        const rowSize = Math.ceil(width / 4) * 4;
        
        // Extract 8x8 pixels from indexed color data
        const pixels = [];
        for (let y = 0; y < 8; y++) {
            const rowOffset = dataOffset + (y * rowSize);
            for (let x = 0; x < 8; x++) {
                pixels.push(tileData[rowOffset + x]);
            }
        }        // Convert pixels to Genesis 4bpp tile format
        const tileOffset = firstTileOffset + (t * 32);
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 4; x++) {
                // Pack two pixels into one byte
                const pixel1 = pixels[y * 8 + x * 2] & 0x0F;  // Ensure pixel is within 4 bits
                const pixel2 = pixels[y * 8 + x * 2 + 1] & 0x0F;  // Ensure pixel is within 4 bits
                const byte = (pixel1 << 4) | pixel2;
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
            console.log(p, c, color, genesisColor);
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
