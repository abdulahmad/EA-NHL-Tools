import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, basename } from 'path';

// Function to create binary buffer from an array of bytes
function arrToBuffer(arr) {
    return Buffer.from(arr);
}

// Convert Genesis color format to RGB
// Genesis format: 0000BBB0GGG0RRR0 (3 bits each)
function genesisColorToRGB(word) {
    const blue = (word >> 9) & 0x07;  // Bits 9-11
    const green = (word >> 5) & 0x07; // Bits 5-7
    const red = (word >> 1) & 0x07;   // Bits 1-3

    // Scale from 3-bit (0-7) to 8-bit (0-255)
    return [
        red * 32,    // Multiply by 32 to scale from 0-7 to 0-224
        green * 32,
        blue * 32
    ];
}

// Decode a Genesis 8x8 tile (4 bits per pixel)
function decodeGenesisTile(tileBuf) {
    const pixels = new Array(64); // 8x8 = 64 pixels
    let pixelIdx = 0;

    // Each row takes 4 bytes (8 pixels, 4 bits each)
    for (let y = 0; y < 8; y++) {
        const rowStart = y * 4;
        // Process 2 pixels at a time (1 byte)
        for (let x = 0; x < 4; x++) {
            const byte = tileBuf[rowStart + x];
            // Split byte into two 4-bit values
            pixels[pixelIdx++] = (byte >> 4) & 0x0F;
            pixels[pixelIdx++] = byte & 0x0F;
        }
    }
    return pixels;
}

// Save BMP file with indexed color palette
function saveBMP(width, height, pixels, palette, filepath) {
    const headerSize = 14 + 40; // BMP header + DIB header
    const paletteSize = 256 * 4; // 256 colors * 4 bytes (BGRA)
    const rowSize = Math.ceil(width / 4) * 4; // Rows padded to multiple of 4 bytes
    const pixelDataSize = rowSize * height;
    const fileSize = headerSize + paletteSize + pixelDataSize;

    const bmp = Buffer.alloc(fileSize);

    // BMP Header
    bmp.write('BM', 0); // Magic number
    bmp.writeUInt32LE(fileSize, 2); // File size
    bmp.writeUInt32LE(0, 6); // Reserved
    bmp.writeUInt32LE(headerSize + paletteSize, 10); // Pixel data offset

    // DIB Header
    bmp.writeUInt32LE(40, 14); // DIB header size
    bmp.writeInt32LE(width, 18); // Width
    bmp.writeInt32LE(-height, 22); // Height (negative for top-down)
    bmp.writeUInt16LE(1, 26); // Color planes
    bmp.writeUInt16LE(8, 28); // Bits per pixel (8 for indexed)
    bmp.writeUInt32LE(0, 30); // No compression
    bmp.writeUInt32LE(pixelDataSize, 34); // Image size
    bmp.writeUInt32LE(0, 38); // H-DPI
    bmp.writeUInt32LE(0, 42); // V-DPI
    bmp.writeUInt32LE(0, 46); // Colors in palette (0 = 2^n)
    bmp.writeUInt32LE(0, 50); // Important colors (0 = all)

    // Write palette
    let paletteOffset = 54;
    for (let i = 0; i < 256; i++) {
        if (i < palette.length) {
            bmp.writeUInt8(palette[i][2], paletteOffset++); // Blue
            bmp.writeUInt8(palette[i][1], paletteOffset++); // Green
            bmp.writeUInt8(palette[i][0], paletteOffset++); // Red
            bmp.writeUInt8(0, paletteOffset++); // Alpha (unused)
        } else {
            // Fill remaining entries with black
            bmp.writeUInt32LE(0, paletteOffset);
            paletteOffset += 4;
        }
    }

    // Write pixel data
    const dataOffset = headerSize + paletteSize;
    let pixelOffset = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            bmp.writeUInt8(pixels[pixelOffset++], dataOffset + y * rowSize + x);
        }
        // Pad row to multiple of 4 bytes
        for (let x = width; x < rowSize; x++) {
            bmp.writeUInt8(0, dataOffset + y * rowSize + x);
        }
    }

    writeFileSync(filepath, bmp);
}

// Save palette to .ACT format
function saveACT(colors, filepath) {
    const act = Buffer.alloc(768); // 256 RGB triplets
    let offset = 0;
    
    // Write each color as RGB triplet
    for (const [r, g, b] of colors) {
        act.writeUInt8(r, offset++);
        act.writeUInt8(g, offset++);
        act.writeUInt8(b, offset++);
    }
    
    // Fill remaining entries with black if less than 256 colors
    while (offset < 768) {
        act.writeUInt8(0, offset++);
    }
    
    writeFileSync(filepath, act);
}

function extractJim(jimPath) {
    // Read the file
    const buffer = readFileSync(jimPath);

    // Read header values
    const paletteOffset = buffer.readUInt32BE(0);
    const mapOffset = buffer.readUInt32BE(4);
    const numTiles = buffer.readUInt16BE(8);
    const firstTileOffset = 0x0A;

    // Create output structure
    const fileBaseName = basename(jimPath, '.jim');
    const outDir = join('Extracted', fileBaseName);
    const tilesDir = join(outDir, 'tiles');
    mkdirSync(outDir, { recursive: true });
    mkdirSync(tilesDir, { recursive: true });

    // Extract tiles (starting at 0x0A)
    const tiles = [];
    let offset = firstTileOffset;
    for (let i = 0; i < numTiles; i++) {
        const tileData = buffer.subarray(offset, offset + 32);
        tiles.push(tileData);
        offset += 32;
    }

    // Extract palettes (4 palettes of 16 colors each)
    const palettes = [];
    for (let p = 0; p < 4; p++) {
        const palette = [];
        for (let c = 0; c < 16; c++) {
            const colorWord = buffer.readUInt16BE(paletteOffset + (p * 32) + (c * 2));
            palette.push(genesisColorToRGB(colorWord));
        }
        palettes.push(palette);
        
        // Save individual palette as .ACT
        saveACT(palette, join(outDir, `${p}.act`));
    }

    // Save combined palette
    const combinedPalette = palettes.flat();
    saveACT(combinedPalette, join(outDir, 'combined.act'));

    // Read map dimensions
    const mapWidth = buffer.readUInt16BE(paletteOffset + 128);
    const mapHeight = buffer.readUInt16BE(paletteOffset + 130);    // Read map data
    const mapData = [];
    const paletteData = [];
    offset = mapOffset+4; // 4 bytes account for map width and height
    
    for (let y = 0; y < mapHeight; y++) {
        const mapRow = [];
        const palRow = [];
        for (let x = 0; x < mapWidth; x++) {
            const data = buffer.readUInt16BE(offset);
            const tileIndex = data & 0x7FF; // Bits 0-10
            const hFlip = (data >> 11) & 1; // Bit 11
            const vFlip = (data >> 12) & 1; // Bit 12
            const palIndex = (data >> 13) & 3; // Bits 13-14
            const priority = (data >> 15) & 1; // Bit 15
            
            // Calculate the offset of this tile in the file
            const tileOffset = firstTileOffset + (tileIndex * 32); // Each tile is 32 bytes
            
            mapRow.push({
                tileIndex,
                tileOffset: '0x' + tileOffset.toString(16).toUpperCase(),
                hFlip,
                vFlip,
                palIndex,
                priority
            });
            
            palRow.push(palIndex);
            offset += 2;
        }
        mapData.push(mapRow);
        paletteData.push(palRow);
    }

    // Save metadata
    const metadata = {
        paletteOffset: '0x' + paletteOffset.toString(16).toUpperCase(),
        mapOffset: '0x' + mapOffset.toString(16).toUpperCase(),
        numTiles,
        mapWidth,
        mapHeight,
        mapData
    };
    writeFileSync(join(outDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

    // Extract individual tiles as BMPs
    for (let t = 0; t < tiles.length; t++) {
        const pixels = decodeGenesisTile(tiles[t]);
        const filename = t.toString().padStart(4, '0') + '.bmp';
        saveBMP(8, 8, pixels, palettes[0], join(tilesDir, filename));
    }

    // Create final composed image
    const finalWidth = mapWidth * 8;
    const finalHeight = mapHeight * 8;
    const finalPixels = new Array(finalWidth * finalHeight).fill(0);

    // Compose the final image
    for (let my = 0; my < mapHeight; my++) {
        for (let mx = 0; mx < mapWidth; mx++) {
            const mapTile = mapData[my][mx];
            const tilePixels = decodeGenesisTile(tiles[mapTile.tileIndex]);
            const palIndex = mapTile.palIndex;

            // Copy pixels with flipping if needed
            for (let ty = 0; ty < 8; ty++) {
                for (let tx = 0; tx < 8; tx++) {
                    const srcX = mapTile.hFlip ? 7 - tx : tx;
                    const srcY = mapTile.vFlip ? 7 - ty : ty;
                    const srcPixel = tilePixels[srcY * 8 + srcX];
                    
                    // Adjust color index based on palette
                    const adjustedPixel = srcPixel + (palIndex * 16);
                    
                    const dstX = mx * 8 + tx;
                    const dstY = my * 8 + ty;
                    finalPixels[dstY * finalWidth + dstX] = adjustedPixel;
                }
            }
        }
    }

    // Save the final composed image
    saveBMP(finalWidth, finalHeight, finalPixels, combinedPalette, join(outDir, 'full_map.bmp'));

    console.log('Extraction complete. Output saved to:', outDir);
    
    // Output the requested information
    console.log(`Palette Section Offset: 0x${paletteOffset.toString(16).toUpperCase()}`);
    console.log(`Map Section Offset: 0x${mapOffset.toString(16).toUpperCase()}`);
    console.log(`Number of Tiles/Stamps: ${numTiles}`);
    console.log(`First Tile Offset: 0x${firstTileOffset.toString(16).toUpperCase()}`);
    console.log(`Map Width: ${mapWidth}`);
    console.log(`Map Height: ${mapHeight}`);
}

// Check command line arguments
if (process.argv.length < 3) {
    console.log('Usage: node extractJimFull.js <path-to-jim-file>');
    process.exit(1);
}

// Get file path and run extraction
const jimPath = process.argv[2];
extractJim(jimPath);
