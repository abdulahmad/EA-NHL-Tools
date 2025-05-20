import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, basename } from 'path';
import crypto from 'crypto';

// Read BMP file and extract pixel data and palette
function readBMP(filepath) {
    const data = readFileSync(filepath);
    
    // Read BMP header
    const width = data.readInt32LE(18);
    const height = Math.abs(data.readInt32LE(22));
    const bpp = data.readUInt16LE(28);
    const compression = data.readUInt32LE(30);
    
    if (bpp !== 8 || compression !== 0) {
        throw new Error('BMP must be 8-bit uncompressed indexed color');
    }
    
    // Read palette (256 BGRA entries)
    const palette = [];
    const paletteStart = 54;
    for (let i = 0; i < 256; i++) {
        const b = data[paletteStart + i * 4];
        const g = data[paletteStart + i * 4 + 1];
        const r = data[paletteStart + i * 4 + 2];
        palette.push([r, g, b]);
    }
    
    // Read pixel data
    const pixelStart = data.readUInt32LE(10);
    const pixels = [];
    const rowSize = Math.floor((width * bpp + 31) / 32) * 4;
    
    // Check if height is negative (top-down BMP)
    const isTopDown = data.readInt32LE(22) < 0;
    
    for (let y = 0; y < height; y++) {
        const row = [];
        const rowY = isTopDown ? y : (height - 1 - y);
        for (let x = 0; x < width; x++) {
            row.push(data[pixelStart + rowY * rowSize + x]);
        }
        pixels.push(row);
    }
    
    return { width, height, palette, pixels };
}

// Convert RGB color to Genesis format
function RGBToGenesisColor(r, g, b) {
    r = Math.round(r / 32) & 0x07;
    g = Math.round(g / 32) & 0x07;  
    b = Math.round(b / 32) & 0x07;
    return (b << 9) | (g << 5) | (r << 1);
}

// Extract 8x8 tile from pixel data
function extractTile(pixels, startX, startY) {
    const tile = [];
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            const pixelY = startY + y;
            const pixelX = startX + x;
            if (pixelY < pixels.length && pixelX < pixels[0].length) {
                tile.push(pixels[pixelY][pixelX]);
            } else {
                tile.push(0); // Pad with transparent pixels
            }
        }
    }
    return tile;
}

// Get all variations of a tile (normal, h-flip, v-flip, both)
function getTileVariations(tile) {
    const variations = [];
    
    // Normal
    variations.push({
        pixels: [...tile],
        hFlip: false,
        vFlip: false
    });
    
    // Horizontal flip
    const hFlip = [];
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            hFlip.push(tile[y * 8 + (7 - x)]);
        }
    }
    variations.push({
        pixels: hFlip,
        hFlip: true,
        vFlip: false
    });
    
    // Vertical flip
    const vFlip = [];
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            vFlip.push(tile[(7 - y) * 8 + x]);
        }
    }
    variations.push({
        pixels: vFlip,
        hFlip: false,
        vFlip: true
    });
    
    // Both flips
    const hvFlip = [];
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            hvFlip.push(tile[(7 - y) * 8 + (7 - x)]);
        }
    }
    variations.push({
        pixels: hvFlip,
        hFlip: true,
        vFlip: true
    });
    
    return variations;
}

// Hash a tile's pixels for comparison
function hashTile(pixels) {
    const hash = crypto.createHash('md5');
    hash.update(Buffer.from(pixels));
    return hash.digest('hex');
}

// Pack pixels into 4bpp Genesis tile format
function packTileData(pixels) {
    const data = Buffer.alloc(32);
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 4; x++) {
            const pixel1 = pixels[y * 8 + x * 2];
            const pixel2 = pixels[y * 8 + x * 2 + 1];
            data[y * 4 + x] = ((pixel1 & 0x0F) << 4) | (pixel2 & 0x0F);
        }
    }
    return data;
}

// Find optimal palette arrangement
function optimizePalettes(tiles, sourcePalette) {
    // Count color usage per tile
    const tileColors = new Map();
    for (const tile of tiles) {
        const colors = new Set(tile.pixels);
        tileColors.set(tile, colors);
    }
    
    // Group tiles by color usage
    const tileGroups = new Map();
    for (const [tile, colors] of tileColors) {
        const key = Array.from(colors).sort().join(',');
        if (!tileGroups.has(key)) {
            tileGroups.set(key, []);
        }
        tileGroups.get(key).push(tile);
    }
    
    // Create 4 palettes of 16 colors each
    const palettes = Array(4).fill().map(() => new Set());
    const tilePaletteAssignment = new Map();
    
    // Assign tiles to palettes greedily
    for (const [_, group] of tileGroups) {
        let bestPalette = 0;
        let lowestNewColors = Infinity;
        
        for (let p = 0; p < 4; p++) {
            const palette = palettes[p];
            const newColors = new Set([...palette]);
            for (const tile of group) {
                for (const color of tileColors.get(tile)) {
                    newColors.add(color);
                }
            }
            
            if (newColors.size <= 16 && newColors.size - palette.size < lowestNewColors) {
                bestPalette = p;
                lowestNewColors = newColors.size - palette.size;
            }
        }
        
        // Assign tiles to best palette
        for (const tile of group) {
            tilePaletteAssignment.set(tile, bestPalette);
            for (const color of tileColors.get(tile)) {
                palettes[bestPalette].add(color);
            }
        }
    }
    
    // Convert palette sets to arrays and map to genesis colors
    const genesisPalettes = palettes.map(palette => {
        const colors = Array.from(palette);
        return colors.map(idx => {
            const [r, g, b] = sourcePalette[idx];
            return RGBToGenesisColor(r, g, b);
        });
    });
    
    return { genesisPalettes, tilePaletteAssignment };
}

// Read palette from ACT file
function readPalette(filepath) {
    const data = readFileSync(filepath);
    const palette = [];
    for (let i = 0; i < 256; i++) {
        const r = data[i * 3];
        const g = data[i * 3 + 1];
        const b = data[i * 3 + 2];
        palette.push([r, g, b]);
    }
    return palette;
}

// Extract and deduplicate tiles from BMP
function extractAndDedupeTiles(bmp) {
    const tileSize = 8;
    const tileMap = {
        width: Math.floor(bmp.width / tileSize),
        height: Math.floor(bmp.height / tileSize),
        tiles: []
    };
    const uniqueTiles = new Map();
    
    // Extract tiles
    for (let ty = 0; ty < tileMap.height; ty++) {
        for (let tx = 0; tx < tileMap.width; tx++) {
            const tilePixels = new Uint8Array(64);
            
            // Extract 8x8 tile
            for (let y = 0; y < tileSize; y++) {
                for (let x = 0; x < tileSize; x++) {
                    const px = tx * tileSize + x;
                    const py = ty * tileSize + y;
                    tilePixels[y * tileSize + x] = bmp.pixels[py][px];
                }
            }
            
            // Create tile hash
            const hash = crypto.createHash('md5').update(tilePixels).digest('hex');
            
            // Store unique tile
            if (!uniqueTiles.has(hash)) {
                uniqueTiles.set(hash, tilePixels);
            }
            
            // Add to tile map
            tileMap.tiles.push(hash);
        }
    }
    
    return {
        tiles: uniqueTiles,
        tileMap,
        numTiles: uniqueTiles.size
    };
}

// Write tiles to JIM format
function writeJimFile(outputPath, tiles, tileMap, palette) {
    // Calculate buffer size
    const headerSize = 8;  // Two 4-byte offsets
    const tileDataSize = tiles.size * 32;  // Each tile is 32 bytes
    const paletteSize = 128;  // 64 colors * 2 bytes per color
    const mapDataSize = 4 + (tileMap.width * tileMap.height * 2);  // Dimensions + tile indices
    const totalSize = headerSize + tileDataSize + paletteSize + mapDataSize;
    
    // Create buffer
    const buffer = Buffer.alloc(totalSize);
    
    // Write header offsets
    const paletteOffset = headerSize + tileDataSize;
    const mapOffset = paletteOffset + paletteSize;
    buffer.writeUInt32BE(paletteOffset, 0);
    buffer.writeUInt32BE(mapOffset, 4);
    
    // Write tiles
    let tileOffset = headerSize;
    for (const [_, tileData] of tiles) {
        // Pack 8-bit pixels into 4-bit format
        for (let i = 0; i < 32; i++) {
            const highNibble = tileData[i * 2] & 0x0F;
            const lowNibble = tileData[i * 2 + 1] & 0x0F;
            buffer[tileOffset + i] = (highNibble << 4) | lowNibble;
        }
        tileOffset += 32;
    }
    
    // Write palette
    for (let i = 0; i < Math.min(64, palette.length); i++) {
        const [r, g, b] = palette[i];
        const color = RGBToGenesisColor(r, g, b);
        buffer.writeUInt16BE(color, paletteOffset + i * 2);
    }
    
    // Write map dimensions
    buffer.writeUInt16BE(tileMap.width, mapOffset);
    buffer.writeUInt16BE(tileMap.height, mapOffset + 2);
    
    // Write map data
    let mapDataOffset = mapOffset + 4;
    for (const tileIndex of tileMap.tiles) {
        const tileId = Array.from(tiles.keys()).indexOf(tileIndex);
        buffer.writeUInt16BE(tileId, mapDataOffset);
        mapDataOffset += 2;
    }
    
    // Save file
    writeFileSync(outputPath, buffer);
}

// Main function to convert BMP to JIM
async function bmpToJim(bmpPath, palettePath, metadataPath, outputPath) {
    console.log('Reading BMP file...');
    const bmp = readBMP(bmpPath);
    
    console.log('Extracting and deduplicating tiles...');
    const { tiles, tileMap, numTiles } = extractAndDedupeTiles(bmp);
    
    console.log('Optimizing palettes...');
    const palette = readPalette(palettePath);
    
    console.log('Creating JIM file...');
    writeJimFile(outputPath, tiles, tileMap, palette);
    
    // Output statistics
    console.log('\nStatistics:');
    console.log(`Original tiles: ${tileMap.width * tileMap.height}`);
    console.log(`Unique tiles: ${numTiles}`);
    console.log(`Compression ratio: ${((tileMap.width * tileMap.height) / numTiles).toFixed(2)}:1`);
}

// Check command line arguments
if (process.argv.length < 5) {
    console.log('Usage: node bmpToJim.js <input.bmp> <input.act> <metadata.json> <output.jim>');
    process.exit(1);
}

// Convert BMP to JIM
const bmpPath = process.argv[2];
const palettePath = process.argv[3];
const metadataPath = process.argv[4];
const outputPath = process.argv[5];
bmpToJim(bmpPath, palettePath, metadataPath, outputPath);
