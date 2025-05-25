// reduced-bmp-to-jim.js - Convert a color-reduced BMP to Jim format components
// This script takes a BMP that has been processed by genesis-color-reduce.js
// and converts it to the component parts needed for the Jim format

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, basename, join } from 'path';
import { performance } from 'perf_hooks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Convert color-reduced BMP to Jim format components
 * @param {string} inputBmpPath - Path to the input reduced BMP file
 * @param {string} metadataPath - Path to the metadata JSON file from genesis-color-reduce
 * @param {Object} options - Conversion options
 * @returns {Object} Processing results
 */
function reducedBmpToJim(inputBmpPath, metadataPath, options = {}) {
    const startTime = performance.now();
    
    // Default options
    const opts = {
        outputDir: options.outputDir || null,
        verbose: options.verbose !== false,
        ...options
    };

    console.log(`Processing ${inputBmpPath} with metadata from ${metadataPath}`);
    
    // Read the metadata file
    const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
    
    // Create output directory structure
    const inputFileName = basename(inputBmpPath, '.bmp');
    
    // Default output directory is jimparts/<filename>
    const outputDir = opts.outputDir || 
        join(dirname(inputBmpPath), 'jimparts', inputFileName);
    
    // Create directory structure
    if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
    }
    
    // Read the reduced BMP file
    const bmp = readBMP(inputBmpPath);
    console.log(`BMP dimensions: ${bmp.width}x${bmp.height}, ${bmp.bpp} bits per pixel`);
    
    // Process tiles
    const tileSize = 8;
    const tileData = processTiles(bmp, metadata.sections, tileSize);
    
    // Generate map data
    const mapWidth = Math.ceil(bmp.width / tileSize);
    const mapHeight = Math.ceil(bmp.height / tileSize);
    const mapData = generateMapData(mapWidth, mapHeight, tileData);
    
    // Save tile data
    console.log('Saving tile data...');
    saveTileData(tileData, join(outputDir, 'tiles.bin'));
    
    // Save map data
    console.log('Saving map data...');
    saveMapData(mapWidth, mapHeight, mapData, join(outputDir, 'map.bin'));
    
    // Create a metadata file for Jim format
    const jimMetadata = {
        sourceFile: inputBmpPath,
        width: bmp.width,
        height: bmp.height,
        tileWidth: mapWidth,
        tileHeight: mapHeight,
        tileCount: tileData.tiles.length,
        mapWidth,
        mapHeight,
        mapData,
        sections: metadata.sections,
        generatedFiles: {
            tiles: 'tiles.bin',
            map: 'map.bin'
        },
        palettes: metadata.palettes,
        processingTime: {
            startTime: new Date().toISOString(),
            elapsedMs: performance.now() - startTime
        }
    };
    
    // Save Jim metadata
    console.log('Writing Jim metadata...');
    writeFileSync(
        join(outputDir, 'jim-metadata.json'), 
        JSON.stringify(jimMetadata, null, 2), 
        { encoding: 'utf8' }
    );
    
    console.log('Processing complete!');
    console.log(`Output files written to ${outputDir}`);
    
    return {
        metadata: jimMetadata,
        outputDir
    };
}

/**
 * Read a BMP file and extract its contents
 * @param {string} filepath - Path to the BMP file
 * @returns {Object} BMP information
 */
function readBMP(filepath) {
    try {
        const data = readFileSync(filepath);
        
        // Check BMP signature
        if (data[0] !== 0x42 || data[1] !== 0x4D) {
            throw new Error('Invalid BMP file format');
        }
        
        // Read BMP header
        const headerSize = data.readUInt32LE(14);
        const width = data.readInt32LE(18);
        const height = Math.abs(data.readInt32LE(22));
        const bpp = data.readUInt16LE(28);
        const compression = data.readUInt32LE(30);
        
        // Check for 8-bit indexed color format
        if (bpp !== 8 || compression !== 0) {
            throw new Error(`Unsupported BMP format: ${bpp} bpp, compression: ${compression}. Expected 8-bit indexed color.`);
        }
        
        // Data offset where pixel data begins
        const dataOffset = data.readUInt32LE(10);
        
        // Read palette
        const palette = [];
        for (let i = 0; i < 256; i++) {
            const paletteOffset = 54 + i * 4; // 14 + 40 (header) + palette index * 4
            if (paletteOffset + 3 < dataOffset) {
                const b = data[paletteOffset];
                const g = data[paletteOffset + 1];
                const r = data[paletteOffset + 2];
                palette.push([r, g, b]);
            }
        }
        
        // Read pixel data
        const pixels = new Array(height);
        const rowSize = Math.floor((bpp * width + 31) / 32) * 4;
        
        // Check if height is negative (top-down BMP)
        const isTopDown = data.readInt32LE(22) < 0;
        
        for (let y = 0; y < height; y++) {
            pixels[y] = new Array(width);
            const rowOffset = isTopDown ? y : (height - 1 - y);
            
            for (let x = 0; x < width; x++) {
                const pixelOffset = dataOffset + rowOffset * rowSize + x;
                pixels[y][x] = data[pixelOffset];
            }
        }
        
        return { width, height, bpp, palette, pixels };
    } catch (error) {
        console.error(`Error reading BMP file: ${error.message}`);
        throw error;
    }
}

/**
 * Process tiles from the BMP data
 * @param {Object} bmp - BMP data
 * @param {Array} sections - Section definitions from metadata
 * @param {number} tileSize - Size of each tile (typically 8)
 * @returns {Object} Processed tile data
 */
function processTiles(bmp, sections, tileSize = 8) {
    console.log('Processing tiles...');
    
    const tiles = [];
    const tileMap = [];
    const tileHashes = new Map();
    
    const mapWidth = Math.ceil(bmp.width / tileSize);
    const mapHeight = Math.ceil(bmp.height / tileSize);
    
    // Process the image tile by tile
    for (let ty = 0; ty < mapHeight; ty++) {
        const row = [];
        for (let tx = 0; tx < mapWidth; tx++) {
            // Determine which section this tile belongs to
            let sectionIndex = -1;
            const tileX = tx * tileSize;
            const tileY = ty * tileSize;
            
            // Find which section this tile belongs to
            for (let i = 0; i < sections.length; i++) {
                const section = sections[i];
                const bounds = section.bounds;
                if (tileX >= bounds.startX && tileX < bounds.endX && 
                    tileY >= bounds.startY && tileY < bounds.endY) {
                    sectionIndex = i;
                    break;
                }
            }
            
            if (sectionIndex === -1) {
                throw new Error(`Could not determine section for tile at (${tx}, ${ty})`);
            }
            
            // Get the palette index for this section
            const paletteIndex = sections[sectionIndex].paletteIndex;
            
            // Extract the tile's pixel data
            const tilePixels = new Array(tileSize * tileSize);
            let pixelIndex = 0;
            
            for (let y = 0; y < tileSize; y++) {
                for (let x = 0; x < tileSize; x++) {
                    const px = tx * tileSize + x;
                    const py = ty * tileSize + y;
                    
                    if (px < bmp.width && py < bmp.height) {
                        // Get the global palette index
                        const globalIndex = bmp.pixels[py][px];
                        
                        // Convert to local palette index (0-15)
                        const localIndex = globalIndex % 16;
                        tilePixels[pixelIndex++] = localIndex;
                    } else {
                        // For pixels outside the image, use index 0
                        tilePixels[pixelIndex++] = 0;
                    }
                }
            }
            
            // Create a hash for this tile to detect duplicates
            const tileHash = tilePixels.join(',') + '|' + paletteIndex;
            
            let tileIndex;
            if (tileHashes.has(tileHash)) {
                // Reuse existing tile
                tileIndex = tileHashes.get(tileHash);
            } else {
                // Add as a new tile
                tileIndex = tiles.length;
                tileHashes.set(tileHash, tileIndex);
                
                tiles.push({
                    index: tileIndex,
                    paletteIndex,
                    pixelData: tilePixels
                });
            }
            
            // Add to the tile map
            row.push({
                tileIndex,
                paletteIndex
            });
        }
        
        tileMap.push(row);
    }
    
    console.log(`Processed ${tiles.length} unique tiles with ${tileHashes.size} patterns`);
    
    return {
        tiles,
        tileMap,
        mapWidth,
        mapHeight
    };
}

/**
 * Generate map data in Jim format
 * @param {number} mapWidth - Width of the map in tiles
 * @param {number} mapHeight - Height of the map in tiles
 * @param {Object} tileData - Tile data from processTiles
 * @returns {Array} Map data
 */
function generateMapData(mapWidth, mapHeight, tileData) {
    const mapData = [];
    
    for (let y = 0; y < mapHeight; y++) {
        const row = [];
        for (let x = 0; x < mapWidth; x++) {
            const tile = tileData.tileMap[y][x];
            
            // In Jim format, each map entry is a 16-bit value:
            // Bits 0-10: Tile index (0-2047)
            // Bits 11-12: Palette (0-3)
            // Bit 13: Horizontal flip (not used here)
            // Bit 14: Vertical flip (not used here)
            // Bit 15: Priority (not used here)
            const mapEntry = tile.tileIndex | (tile.paletteIndex << 11);
            row.push(mapEntry);
        }
        mapData.push(row);
    }
    
    return mapData;
}

/**
 * Save tile data in a format compatible with Jim
 * @param {Object} tileData - Tile data from processTiles
 * @param {string} filepath - Path to save the tile data
 */
function saveTileData(tileData, filepath) {
    // Each tile is 8x8 pixels, each pixel is 4 bits (16 colors), so 32 bytes per tile
    const buffer = Buffer.alloc(tileData.tiles.length * 32);
    
    for (let t = 0; t < tileData.tiles.length; t++) {
        const tile = tileData.tiles[t];
        const pixelData = tile.pixelData;
        const tileOffset = t * 32;
        
        // Convert 8x8 array of 4-bit values to planar format (4 bytes per row)
        for (let y = 0; y < 8; y++) {
            // For each row, pack 8 pixels (4 bits each) into 4 bytes
            for (let x = 0; x < 8; x += 2) {
                const idx = y * 8 + x;
                const pixel1 = pixelData[idx];
                const pixel2 = pixelData[idx + 1];
                
                // Pack two 4-bit values into one byte
                const byteValue = ((pixel1 & 0x0F) << 4) | (pixel2 & 0x0F);
                buffer[tileOffset + y * 4 + Math.floor(x / 2)] = byteValue;
            }
        }
    }
    
    writeFileSync(filepath, buffer);
}

/**
 * Save map data in a format compatible with Jim
 * @param {number} mapWidth - Width of the map in tiles
 * @param {number} mapHeight - Height of the map in tiles
 * @param {Array} mapData - Map data from generateMapData
 * @param {string} filepath - Path to save the map data
 */
function saveMapData(mapWidth, mapHeight, mapData, filepath) {
    // Map data format: 2 bytes for width, 2 bytes for height, then mapWidth * mapHeight * 2 bytes for tile data
    const buffer = Buffer.alloc(4 + mapWidth * mapHeight * 2);
    
    // Write map dimensions
    buffer.writeUInt16BE(mapWidth, 0);
    buffer.writeUInt16BE(mapHeight, 2);
    
    // Write map data
    let offset = 4;
    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            buffer.writeUInt16BE(mapData[y][x], offset);
            offset += 2;
        }
    }
    
    writeFileSync(filepath, buffer);
}

// If running directly from command line
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    if (process.argv.length < 4) {
        console.log('Usage: node reduced-bmp-to-jim.js <input-reduced.bmp> <metadata.json> [options]');
        console.log('Options:');
        console.log('  --output=<directory>    Custom output directory');
        console.log('  --verbose=<true|false>  Verbosity level (default: true)');
        process.exit(1);
    }
    
    const inputBmpPath = process.argv[2];
    const metadataPath = process.argv[3];
    
    // Parse additional options
    const options = {};
    for (let i = 4; i < process.argv.length; i++) {
        const arg = process.argv[i];
        if (arg.startsWith('--output=')) {
            options.outputDir = arg.substring(9);
        } else if (arg.startsWith('--verbose=')) {
            options.verbose = arg.substring(10).toLowerCase() === 'true';
        }
    }
    
    // Process the BMP file
    reducedBmpToJim(inputBmpPath, metadataPath, options);
}

// Export functions for use in other scripts
export { reducedBmpToJim, readBMP, processTiles };
