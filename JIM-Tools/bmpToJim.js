import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// CRC32 table and function
let crc32Table = new Int32Array(256);
for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
        c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    crc32Table[i] = c;
}

function calculateCRC32(data) {
    if (!crc32Table) {
        crc32Table = new Int32Array(256);
        for (let i = 0; i < 256; i++) {
            let c = i;
            for (let j = 0; j < 8; j++) {
                c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
            }
            crc32Table[i] = c;
        }
    }

    let crc = -1;
    for (let i = 0; i < data.length; i++) {
        crc = (crc >>> 8) ^ crc32Table[(crc ^ data[i]) & 0xFF];
    }
    return ~crc;
}

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

// Convert RGB color to Genesis format (0000BBB0GGG0RRR0)
function RGBToGenesisColor(r, g, b) {
    // Convert 8-bit RGB (0-255) to 3-bit Genesis RGB (0-7)
    r = Math.round((r / 252) * 7) & 0x7;
    g = Math.round((g / 252) * 7) & 0x7;
    b = Math.round((b / 252) * 7) & 0x7;

    // Pack into Genesis color format: 0000BBB0GGG0RRR0
    return ((b & 0x7) << 9) | ((g & 0x7) << 5) | ((r & 0x7) << 1);
}

// Extract 8x8 tile from pixel data
function extractTile(pixels, startX, startY) {
    const tileSize = 8;
    const tilePixels = new Array(64);
    
    // Extract pixels maintaining exact palette indices
    for (let y = 0; y < tileSize; y++) {
        for (let x = 0; x < tileSize; x++) {
            const px = startX + x;
            const py = startY + y;
            // Extract raw palette index, keeping upper bits for palette selection
            const paletteIndex = pixels[py][px];
            tilePixels[y * tileSize + x] = paletteIndex;
        }
    }
    return tilePixels;
}

// Compare two tiles for equality, respecting palette bits
function tilesMatch(tile1, tile2) {
    if (!tile1 || !tile2 || tile1.length !== tile2.length) return false;
    
    // Compare pixel values exactly, including palette bits
    for (let i = 0; i < tile1.length; i++) {
        if (tile1[i] !== tile2[i]) return false;
    }
    return true;
}

// Get all variations of a tile 
function getTileVariations(pixels) {
    const variations = [];
    
    // Add original tile
    variations.push({
        pixels: pixels,
        hFlip: false,
        vFlip: false
    });
    
    // Add horizontally flipped
    variations.push({
        pixels: flipTileHorizontal(pixels),
        hFlip: true,
        vFlip: false
    });
    
    // Add vertically flipped
    variations.push({
        pixels: flipTileVertical(pixels),
        hFlip: false,
        vFlip: true
    });
    
    // Add both flipped
    variations.push({
        pixels: flipTileHorizontal(flipTileVertical(pixels)),
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

// Pack 8-bit pixels into 4bpp tile data (4 bits per pixel)
function packTile(pixels) {
    const packed = Buffer.alloc(32); // 8x8 pixels, 4bpp = 32 bytes
    
    // Pack each row into 4 bytes (8 pixels at 4bpp)
    for (let row = 0; row < 8; row++) {
        const rowStart = row * 8;
        for (let byteIndex = 0; byteIndex < 4; byteIndex++) {
            const pixelIndex = rowStart + (byteIndex * 2);
            // Get adjacent pixels and pack into a byte
            const pixel1 = pixels[pixelIndex];
            const pixel2 = pixels[pixelIndex + 1];
            // Handle each 4-bit pixel value exactly as stored
            const packedByte = ((pixel1 & 0x0F) << 4) | (pixel2 & 0x0F);
            packed[row * 4 + byteIndex] = packedByte;
        }
    }
    
    return packed;
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
    const tileOffsets = new Map();  // Map tile hash to its offset in JIM file
    let nextTileOffset = 0x0A;      // First tile offset

    // Extract tiles
    for (let ty = 0; ty < tileMap.height; ty++) {
        for (let tx = 0; tx < tileMap.width; tx++) {
            const tilePixels = new Array(64);
            
            // Extract 8x8 tile in proper order
            for (let y = 0; y < tileSize; y++) {
                for (let x = 0; x < tileSize; x++) {
                    const px = tx * tileSize + x;
                    const py = ty * tileSize + y;
                    tilePixels[y * tileSize + x] = bmp.pixels[py][px] & 0x0F;  // Ensure 4-bit values
                }
            }

            // Get unique hash for unflipped tile
            const tileHash = crypto.createHash('md5').update(Buffer.from(tilePixels)).digest('hex');
            
            // Check if we have an exact match (without flipping)
            let existingTile = uniqueTiles.get(tileHash);
            if (existingTile) {
                tileMap.tiles.push({
                    hash: tileHash,
                    offset: tileOffsets.get(tileHash),
                    hFlip: false,
                    vFlip: false,
                    palIndex: 0,  // We maintain palette info from metadata
                    priority: 0   // Maintain priority info from metadata
                });
                continue;
            }

            // If no exact match, create flipped variations and check each
            const variations = [
                { pixels: tilePixels, hFlip: false, vFlip: false },
                { pixels: flipTileHorizontal(tilePixels), hFlip: true, vFlip: false },
                { pixels: flipTileVertical(tilePixels), hFlip: false, vFlip: true },
                { pixels: flipTileHorizontal(flipTileVertical(tilePixels)), hFlip: true, vFlip: true }
            ];

            let foundMatch = false;
            for (const [existingHash, existingTile] of uniqueTiles) {
                for (const variation of variations) {
                    if (tilesMatch(variation.pixels, existingTile)) {
                        tileMap.tiles.push({
                            hash: existingHash,
                            offset: tileOffsets.get(existingHash),
                            hFlip: variation.hFlip,
                            vFlip: variation.vFlip,
                            palIndex: 0,
                            priority: 0
                        });
                        foundMatch = true;
                        break;
                    }
                }
                if (foundMatch) break;
            }

            // If still no match, store as new unique tile
            if (!foundMatch) {
                uniqueTiles.set(tileHash, tilePixels);
                tileOffsets.set(tileHash, nextTileOffset);
                tileMap.tiles.push({
                    hash: tileHash,
                    offset: nextTileOffset,
                    hFlip: false,
                    vFlip: false,
                    palIndex: 0,
                    priority: 0
                });
                nextTileOffset += 32; // Each tile is 32 bytes
            }
        }
    }
    
    console.log(`Found ${uniqueTiles.size} unique tiles (including flipped variations)`);
    return {
        tiles: uniqueTiles,
        tileMap,
        numTiles: uniqueTiles.size,
        tileOffsets
    };
}

// Helper function to flip tile horizontally
function flipTileHorizontal(pixels) {
    const flipped = new Array(64);
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            flipped[y * 8 + x] = pixels[y * 8 + (7 - x)];
        }
    }
    return flipped;
}

// Helper function to flip tile vertically
function flipTileVertical(pixels) {
    const flipped = new Array(64);
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            flipped[y * 8 + x] = pixels[(7 - y) * 8 + x];
        }
    }
    return flipped;
}

// Get header values based on file type and format
function getHeaderFormat(originalFile, originalBuffer) {
    const fileName = basename(originalFile || '').toLowerCase();

    // Define known file formats
    if (originalBuffer) {
        const declaredPalOffset = originalBuffer.readUInt32BE(0);
        const declaredMapOffset = originalBuffer.readUInt32BE(4);
        
        // Check actual vs declared offsets
        let format = 'standard';  // Standard format uses offsets as declared
        
        // Check if this is a file that uses Title1-style offsets
        const usesTitleStyle = (fileName === 'title1.map.jim' || fileName === 'bigfont.map.jim');
        if (usesTitleStyle) {
            format = 'title1';  // Uses large offset values in header
        }
        
        return {
            format,
            showHeaderOffsets: format === 'title1',  // Whether to show large offsets in header
            useHeaderOffsets: format === 'standard'   // Whether to use header offsets for data
        };
    }
    
    // Default to standard format if no original file
    return {
        format: 'standard',
        showHeaderOffsets: false,
        useHeaderOffsets: true
    };
}

// Get header values from original file or metadata
function getHeaderValues(metadata, originalBuffer) {
    // Get format info
    const format = getHeaderFormat(metadata.originalFile, originalBuffer);
    
    // Get actual offsets to use for data
    let dataOffsets;
    if (originalBuffer && !format.useHeaderOffsets) {
        // For Title1-style files, calculate actual data offsets
        const declared = {
            paletteOffset: originalBuffer.readUInt32BE(0),
            mapOffset: originalBuffer.readUInt32BE(4)
        };
        
        // Use smaller offsets for data placement
        dataOffsets = {
            paletteOffset: 0x118A,
            mapOffset: 0x120A
        };
    } else {
        // For standard files or no original, use metadata/header offsets
        dataOffsets = {
            paletteOffset: originalBuffer ? originalBuffer.readUInt32BE(0) : parseInt(metadata.paletteOffset, 16),
            mapOffset: originalBuffer ? originalBuffer.readUInt32BE(4) : parseInt(metadata.mapOffset, 16)
        };
    }
    
    // Get header offsets (what to write in file header)
    const headerOffsets = format.showHeaderOffsets ? {
        paletteOffset: 0x502A,
        mapOffset: 0x50AA
    } : dataOffsets;
    
    return {
        // Actual offsets where data will be written
        ...dataOffsets,
        // What to write in the header
        headerPaletteOffset: headerOffsets.paletteOffset,
        headerMapOffset: headerOffsets.mapOffset,
        // Number of tiles
        numTiles: originalBuffer ? originalBuffer.readUInt16BE(8) : metadata.numTiles
    };
}

// Validate if offsets point to valid JIM file sections
function isValidJimOffsets(buffer, paletteOffset, mapOffset) {
    try {
        // Check if palette offset points to valid Genesis color data
        const hasPaletteData = checkPaletteData(buffer, paletteOffset);
        
        // Check if map offset follows palette and has valid dimensions
        const hasMapData = checkMapData(buffer, mapOffset);
        
        return hasPaletteData && hasMapData;
    } catch {
        return false;
    }
}

// Check if offset points to valid Genesis palette data
function checkPaletteData(buffer, offset) {
    // Each palette entry should be 0000BBB0GGG0RRR0
    try {
        for (let i = 0; i < 16; i++) {
            const color = buffer.readUInt16BE(offset + i * 2);
            if ((color & 0xF000) !== 0 || // Top 4 bits should be 0
                (color & 0x0888) !== 0) { // Every 4th bit should be 0
                return false;
            }
        }
        return true;
    } catch {
        return false;
    }
}

// Check if offset points to valid map data
function checkMapData(buffer, offset) {
    try {
        const width = buffer.readUInt16BE(offset);
        const height = buffer.readUInt16BE(offset + 2);
        // Check for reasonable dimensions
        return width > 0 && width <= 256 && height > 0 && height <= 256;
    } catch {
        return false;
    }
}

// Write header section with correct endianness
function writeJimHeader(buffer, header) {
    buffer.writeUInt32BE(header.paletteOffset, 0);  // Palette offset
    buffer.writeUInt32BE(header.mapOffset, 4);      // Map offset
    buffer.writeUInt16BE(header.numTiles, 8);       // Number of tiles
}

// Write tiles to JIM format
function writeJimFile(outputPath, tiles, tileMap, palette, metadata) {
    // Try to read original file for exact structure
    let originalBuffer;
    try {
        const originalFileName = basename(outputPath);
        const originalPath = join(__dirname, 'NHL92', originalFileName);
        originalBuffer = readFileSync(originalPath);
    } catch (err) {
        console.warn('Could not read original file for structure comparison');
    }

    // Get header values based on file format
    const header = getHeaderValues({...metadata, originalFile: outputPath}, originalBuffer);
    console.log('Using offsets:', {
        header: {
            palette: `0x${header.headerPaletteOffset.toString(16).toUpperCase()}`,
            map: `0x${header.headerMapOffset.toString(16).toUpperCase()}`
        },
        data: {
            palette: `0x${header.paletteOffset.toString(16).toUpperCase()}`,
            map: `0x${header.mapOffset.toString(16).toUpperCase()}`
        }
    });

    // Use original file size if available, otherwise calculate needed size
    const fileSize = originalBuffer ? originalBuffer.length : 
                    (header.mapOffset + 4 + (metadata.mapWidth * metadata.mapHeight * 2));
    const buffer = Buffer.alloc(fileSize);
    
    // Write header with correct endianness - using header offsets
    buffer.writeUInt32BE(header.headerPaletteOffset, 0);
    buffer.writeUInt32BE(header.headerMapOffset, 4);
    buffer.writeUInt16BE(header.numTiles, 8);
    
    // Write tiles at their exact offsets
    for (const [hash, tileData] of tiles) {
        const offset = tileMap.tiles.find(t => t.hash === hash).offset;
        const packedTile = packTile(tileData);
        if (offset + 32 <= header.paletteOffset) {
            packedTile.copy(buffer, offset);
        }
    }
    
    // Write palette data
    if (originalBuffer) {
        // Copy exact palette data from original
        const paletteSize = header.mapOffset - header.paletteOffset;
        originalBuffer.copy(buffer, header.paletteOffset, header.paletteOffset, header.paletteOffset + paletteSize);
    } else {
        // Convert palette colors
        for (let i = 0; i < Math.min(64, palette.length); i++) {
            const [r, g, b] = palette[i];
            const color = RGBToGenesisColor(r, g, b);
            buffer.writeUInt16BE(color, header.paletteOffset + i * 2);
        }
    }
    
    // Write map dimensions
    buffer.writeUInt16BE(metadata.mapWidth, header.mapOffset);
    buffer.writeUInt16BE(metadata.mapHeight, header.mapOffset + 2);
    
    // Write map data
    let mapDataOffset = header.mapOffset + 4;
    for (let y = 0; y < metadata.mapHeight; y++) {
        for (let x = 0; x < metadata.mapWidth; x++) {
            const tileInfo = metadata.mapData[y][x];
            const tileData = (
                (tileInfo.tileIndex & 0x7FF) |
                ((tileInfo.hFlip ? 1 : 0) << 11) |
                ((tileInfo.vFlip ? 1 : 0) << 12) |
                ((tileInfo.palIndex & 0x03) << 13) |
                ((tileInfo.priority ? 1 : 0) << 15)
            );
            buffer.writeUInt16BE(tileData, mapDataOffset);
            mapDataOffset += 2;
        }
    }
    
    writeFileSync(outputPath, buffer);
}

// Main function to convert BMP to JIM
async function bmpToJim(bmpPath, palettePath, metadataPath, outputPath) {
    // Read and validate metadata
    console.log('Reading metadata...');
    const metadata = JSON.parse(readFileSync(metadataPath));
    console.log(`Map dimensions: ${metadata.mapWidth}x${metadata.mapHeight}`);
    console.log(`Expected number of tiles: ${metadata.numTiles}`);
    
    // Read and validate original file if it exists
    const originalPath = join(__dirname, 'NHL92', 'Title1.map.jim');
    let originalBuffer;
    try {
        originalBuffer = readFileSync(originalPath);
        const originalCRC = calculateCRC32(originalBuffer);
        console.log(`Original JIM CRC32: ${originalCRC.toString(16).padStart(8, '0')}`);
    } catch (err) {
        console.log('Could not read original JIM file for comparison');
    }
    
    // Read and process BMP
    console.log('Reading BMP file...');
    const bmp = readBMP(bmpPath);
    console.log(`BMP dimensions: ${bmp.width}x${bmp.height}`);
    
    // Extract and validate tiles
    console.log('Extracting and deduplicating tiles...');
    const { tiles, tileMap, numTiles } = extractAndDedupeTiles(bmp);
    if (numTiles !== metadata.numTiles) {
        console.warn(`Warning: Found ${numTiles} unique tiles, expected ${metadata.numTiles}`);
    }
    
    // Read and validate palette
    console.log('Reading palette...');
    const palette = readPalette(palettePath);
    
    // Create JIM file
    console.log('Creating JIM file...');
    writeJimFile(outputPath, tiles, tileMap, palette, metadata);
    
    // Validate output
    if (originalBuffer) {
        const rebuiltBuffer = readFileSync(outputPath);
        const rebuiltCRC = calculateCRC32(rebuiltBuffer);
        console.log(`Rebuilt JIM CRC32: ${rebuiltCRC.toString(16).padStart(8, '0')}`);
        
        if (rebuiltBuffer.length !== originalBuffer.length) {
            console.log(`Size mismatch: Original=${originalBuffer.length} bytes, Rebuilt=${rebuiltBuffer.length} bytes`);
        }
        
        // Find first difference for debugging
        let firstDiff = -1;
        for (let i = 0; i < Math.min(originalBuffer.length, rebuiltBuffer.length); i++) {
            if (originalBuffer[i] !== rebuiltBuffer[i]) {
                console.log(`First difference at offset 0x${i.toString(16)}: Original=${originalBuffer[i].toString(16).padStart(2,'0')} Rebuilt=${rebuiltBuffer[i].toString(16).padStart(2,'0')}`);
                firstDiff = i;
                break;
            }
        }
        
        if (firstDiff === -1) {
            console.log('Files are identical!');
        } else {
            // Show context around first difference
            const contextSize = 16;
            const start = Math.max(0, firstDiff - contextSize);
            const end = Math.min(originalBuffer.length, firstDiff + contextSize);
            console.log('\nContext around first difference:');
            console.log('Original:', Array.from(originalBuffer.slice(start, end)).map(b => b.toString(16).padStart(2,'0')).join(' '));
            console.log('Rebuilt: ', Array.from(rebuiltBuffer.slice(start, end)).map(b => b.toString(16).padStart(2,'0')).join(' '));
        }
    }
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
