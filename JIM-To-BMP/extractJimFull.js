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

// Find actual data section boundaries in the file
function findDataSections(buffer) {
    // Start with header-declared offsets
    const headerPaletteOffset = buffer.readUInt32BE(0);
    const headerMapOffset = buffer.readUInt32BE(4);
    const numTiles = buffer.readUInt16BE(8);
    
    // Calculate expected end of tile data
    const expectedTileEnd = 0x0A + (numTiles * 32);
    
    // Scan for palette start - should be right after tiles
    let actualPaletteOffset = -1;
    let actualMapOffset = -1;
    
    // Look for palette data patterns (4 16-color palettes)
    for (let offset = expectedTileEnd; offset < buffer.length - 128; offset++) {
        // Check if we have what looks like palette data
        let isPaletteStart = true;
        for (let p = 0; p < 4; p++) {
            for (let c = 0; c < 16; c++) {
                const value = buffer.readUInt16BE(offset + (p * 32) + (c * 2));
                // Check if value looks like a Genesis color (0000BBB0GGG0RRR0)
                if ((value & 0xFFF0) !== 0 || (value & 0x0F0F) !== 0) {
                    isPaletteStart = false;
                    break;
                }
            }
            if (!isPaletteStart) break;
        }
        
        if (isPaletteStart) {
            actualPaletteOffset = offset;
            break;
        }
    }
    
    // If we found palette, look for map data after it
    if (actualPaletteOffset !== -1) {
        // Map data should start with valid dimensions
        for (let offset = actualPaletteOffset + 128; offset < buffer.length - 4; offset++) {
            const width = buffer.readUInt16BE(offset);
            const height = buffer.readUInt16BE(offset + 2);
            
            // Check if dimensions look reasonable
            if (width > 0 && width <= 256 && height > 0 && height <= 256) {
                // Verify we have enough data for the map
                const requiredSize = offset + 4 + (width * height * 2);
                if (requiredSize <= buffer.length) {
                    actualMapOffset = offset;
                    break;
                }
            }
        }
    }
    
    return {
        paletteOffset: actualPaletteOffset !== -1 ? actualPaletteOffset : headerPaletteOffset,
        mapOffset: actualMapOffset !== -1 ? actualMapOffset : headerMapOffset,
        numTiles
    };
}

function extractJim(jimPath) {
    // Read the file
    const buffer = readFileSync(jimPath);

    // Find actual data section boundaries
    const header = findDataSections(buffer);
    
    // Use found offsets
    const paletteOffset = header.paletteOffset;
    const mapOffset = header.mapOffset;
    const numTiles = header.numTiles;
    const firstTileOffset = 0x0A;

    console.log(`Reading header:`)
    console.log(`- Declared palette offset: 0x${buffer.readUInt32BE(0).toString(16).toUpperCase()}`);
    console.log(`- Declared map offset: 0x${buffer.readUInt32BE(4).toString(16).toUpperCase()}`);
    console.log(`- Found palette offset: 0x${paletteOffset.toString(16).toUpperCase()}`);
    console.log(`- Found map offset: 0x${mapOffset.toString(16).toUpperCase()}`);
    console.log(`- Number of tiles: ${numTiles}`);

    // Create output structure
    const fileBaseName = basename(jimPath, '.jim');
    const outDir = join('Extracted', fileBaseName);
    const tilesDir = join(outDir, 'tiles');
    mkdirSync(outDir, { recursive: true });
    mkdirSync(tilesDir, { recursive: true });

    // Extract tiles
    const tiles = [];
    let offset = 0x0A;
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
        
        // Save individual palette
        saveACT(palette, join(outDir, `${p}.act`));
    }

    // Save combined palette
    const combinedPalette = palettes.flat();
    saveACT(combinedPalette, join(outDir, 'combined.act'));

    // Read map dimensions
    const mapWidth = buffer.readUInt16BE(mapOffset);
    const mapHeight = buffer.readUInt16BE(mapOffset + 2);
    console.log(`Map dimensions: ${mapWidth}x${mapHeight}`);

    // Extract map data
    const mapData = [];
    let mapDataOffset = mapOffset + 4;
    
    for (let y = 0; y < mapHeight; y++) {
        const row = [];
        for (let x = 0; x < mapWidth; x++) {
            const tileWord = buffer.readUInt16BE(mapDataOffset);
            mapDataOffset += 2;

            // Extract tile info
            const tileInfo = {
                tileIndex: tileWord & 0x7FF,
                tileOffset: `0x${(firstTileOffset + ((tileWord & 0x7FF) * 32)).toString(16).toUpperCase()}`,
                hFlip: (tileWord >> 11) & 1,
                vFlip: (tileWord >> 12) & 1,
                palIndex: (tileWord >> 13) & 0x03,
                priority: (tileWord >> 15) & 1
            };
            row.push(tileInfo);
        }
        mapData.push(row);
    }

    // Extract tileset
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

    // Save metadata
    const metadata = {
        paletteOffset: `0x${paletteOffset.toString(16).toUpperCase()}`,
        mapOffset: `0x${mapOffset.toString(16).toUpperCase()}`,
        numTiles,
        mapWidth,
        mapHeight,
        mapData
    };
    writeFileSync(join(outDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

    console.log('Extraction complete. Output saved to:', outDir);
    
    // Output file structure info
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
