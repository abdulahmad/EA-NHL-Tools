// reduced-to-jim.js
// Takes the output of genesis-color-reduce.js and converts it to the format required by rebuildJim.js
// Extracts 8x8 tiles from the reduced BMP and creates the necessary metadata structure

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { dirname, basename, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Convert the output of genesis-color-reduce to the format needed by rebuildJim.js
 * @param {string} inputDir - Directory containing metadata-color.json and reduced BMP
 * @param {Object} options - Additional options
 */
function convertReducedToJim(inputDir, options = {}) {
    console.log(`Processing directory: ${inputDir}`);
    
    // Read the metadata-color.json file
    const metadataPath = join(inputDir, 'metadata-color.json');
    if (!existsSync(metadataPath)) {
        console.error(`Error: metadata-color.json not found in ${inputDir}`);
        return;
    }

    const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
    console.log(`Loaded metadata from ${metadataPath}`);
    
    // Find the reduced BMP file (it should end with "-reduced.bmp")
    let bmpFile = null;
    const files = readdirSync(inputDir);
    for (const file of files) {
        if (file.endsWith('-reduced.bmp')) {
            bmpFile = join(inputDir, file);
            break;
        }
    }
    
    if (!bmpFile) {
        console.error(`Error: Could not find reduced BMP file in ${inputDir}`);
        return;
    }
    
    console.log(`Found reduced BMP file: ${bmpFile}`);
    
    // Read the BMP file
    const bmpData = readFileSync(bmpFile);
    
    // Extract BMP information
    const bmpWidth = bmpData.readInt32LE(18);
    const bmpHeight = Math.abs(bmpData.readInt32LE(22));
    const bpp = bmpData.readUInt16LE(28);
    const dataOffset = bmpData.readUInt32LE(10);
    
    // Calculate tile dimensions
    const tileSize = 8;
    const tilesX = Math.ceil(bmpWidth / tileSize);
    const tilesY = Math.ceil(bmpHeight / tileSize);
    const totalTiles = tilesX * tilesY;
    
    console.log(`BMP dimensions: ${bmpWidth}x${bmpHeight}, ${bpp} bits per pixel`);
    console.log(`Tile dimensions: ${tilesX}x${tilesY} (${totalTiles} total tiles)`);
    
    // Create tiles directory if it doesn't exist
    const tilesDir = join(inputDir, 'tiles');
    if (!existsSync(tilesDir)) {
        mkdirSync(tilesDir);
    }
    
    // BMP uses padding to make each row a multiple of 4 bytes
    const rowPadding = (4 - ((bmpWidth * (bpp / 8)) % 4)) % 4;
    const rowSize = bmpWidth * (bpp / 8) + rowPadding;
    
    // Read palette from BMP
    const paletteColors = [];
    const paletteOffset = 54; // BMP header + DIB header
    const numColors = dataOffset - paletteOffset;
    for (let i = 0; i < numColors; i += 4) {
        const b = bmpData[paletteOffset + i];
        const g = bmpData[paletteOffset + i + 1];
        const r = bmpData[paletteOffset + i + 2];
        // BMP palette is in BGRA format
        paletteColors.push([r, g, b]);
    }
    
    // Create unique tile map that will be used for tile deduplication
    const tileMap = new Map();
    const mapData = [];
    
    // Extract tiles and generate map data
    for (let ty = 0; ty < tilesY; ty++) {
        const mapRow = [];
        
        for (let tx = 0; tx < tilesX; tx++) {
            // Extract an 8x8 tile from the BMP
            const tilePixels = new Array(64).fill(0);
            
            for (let y = 0; y < tileSize; y++) {
                for (let x = 0; x < tileSize; x++) {
                    const pixelX = tx * tileSize + x;
                    const pixelY = ty * tileSize + y;
                    
                    // Skip pixels outside the image bounds
                    if (pixelX >= bmpWidth || pixelY >= bmpHeight) {
                        continue;
                    }
                    
                    let pixelOffset;
                    
                    if (bmpData.readInt32LE(22) < 0) {
                        // Top-down BMP
                        pixelOffset = dataOffset + pixelY * rowSize + pixelX;
                    } else {
                        // Bottom-up BMP (standard)
                        pixelOffset = dataOffset + (bmpHeight - 1 - pixelY) * rowSize + pixelX;
                    }
                    
                    if (pixelOffset < bmpData.length) {
                        const colorIndex = bmpData[pixelOffset];
                        tilePixels[y * tileSize + x] = colorIndex & 0xFF;
                    }
                }
            }
            
            // Determine which section this tile belongs to
            let sectionIndex = -1;
            const tileX = tx * tileSize;
            const tileY = ty * tileSize;
            
            for (let i = 0; i < metadata.sections.length; i++) {
                const section = metadata.sections[i];
                const bounds = section.bounds;
                
                if (tileX >= bounds.startX && tileX < bounds.endX &&
                    tileY >= bounds.startY && tileY < bounds.endY) {
                    sectionIndex = i;
                    break;
                }
            }
            
            if (sectionIndex === -1) {
                console.error(`Error: Could not find section for tile at (${tx}, ${ty})`);
                continue;
            }
            
            const section = metadata.sections[sectionIndex];
            const paletteIndex = section.paletteIndex;
            
            // Create a key for tile deduplication
            const tileKey = tilePixels.join(',') + `|${paletteIndex}`;
            
            let tileIndex;
            if (tileMap.has(tileKey)) {
                // Reuse existing tile
                tileIndex = tileMap.get(tileKey);
            } else {
                // Create a new tile
                tileIndex = tileMap.size;
                tileMap.set(tileKey, tileIndex);
                
                // Save tile as a BMP file
                const tileBmpPath = join(tilesDir, `${tileIndex.toString().padStart(4, '0')}.bmp`);
                saveTileBmp(tilePixels, tileSize, tileSize, paletteColors, tileBmpPath);
            }
            
            // Add tile to map data
            mapRow.push({
                tileIndex: tileIndex,
                hFlip: false,
                vFlip: false,
                palIndex: paletteIndex,
                priority: false
            });
        }
        
        mapData.push(mapRow);
    }
    
    console.log(`Extracted ${tileMap.size} unique tiles from ${totalTiles} total tiles`);
      // Create the metadata.json file for rebuildJim.js
    const tileDataSize = tileMap.size * 32;
    const calculatedPaletteOffset = 0x0A + tileDataSize; // First tile offset + tile data size
    const calculatedMapOffset = calculatedPaletteOffset + 128; // Palette offset + (4 palettes * 32 bytes)
    
    const jimMetadata = {
        numTiles: tileMap.size,
        mapWidth: tilesX,
        mapHeight: tilesY,
        paletteOffset: `0x${calculatedPaletteOffset.toString(16).toUpperCase()}`,
        mapOffset: `0x${calculatedMapOffset.toString(16).toUpperCase()}`,
        mapData: mapData
    };
    
    const jimMetadataPath = join(inputDir, 'metadata.json');
    writeFileSync(jimMetadataPath, JSON.stringify(jimMetadata, null, 2), 'utf8');
    
    console.log(`Created metadata.json at ${jimMetadataPath}`);
    console.log(`Processing complete. Run rebuildJim.js with ${jimMetadataPath} to create the JIM file.`);
    
    return {
        tilesDir,
        jimMetadataPath,
        numTiles: tileMap.size,
        mapWidth: tilesX,
        mapHeight: tilesY
    };
}

/**
 * Save an 8x8 tile as a BMP file
 * @param {Array} pixels - Array of pixel indices
 * @param {number} width - Tile width
 * @param {number} height - Tile height
 * @param {Array} palette - Color palette
 * @param {string} filePath - Output file path
 */
function saveTileBmp(pixels, width, height, palette, filePath) {
    // Standard 8-bit BMP with 256 color palette
    const headerSize = 14; // BMP header
    const dibSize = 40;    // DIB header
    const paletteSize = 256 * 4; // 256 colors * 4 bytes (BGRA)
    
    // BMP rows must be padded to a multiple of 4 bytes
    const rowSize = Math.ceil(width / 4) * 4;
    const pixelDataSize = rowSize * height;
    const fileSize = headerSize + dibSize + paletteSize + pixelDataSize;
    
    const buffer = Buffer.alloc(fileSize);
    
    // BMP Header
    buffer.write('BM', 0); // Magic number
    buffer.writeUInt32LE(fileSize, 2); // File size
    buffer.writeUInt32LE(0, 6); // Reserved
    buffer.writeUInt32LE(headerSize + dibSize + paletteSize, 10); // Pixel data offset
    
    // DIB Header
    buffer.writeUInt32LE(dibSize, 14); // DIB header size
    buffer.writeInt32LE(width, 18); // Width
    buffer.writeInt32LE(-height, 22); // Height (negative for top-down)
    buffer.writeUInt16LE(1, 26); // Color planes
    buffer.writeUInt16LE(8, 28); // Bits per pixel (8 for indexed)
    buffer.writeUInt32LE(0, 30); // No compression
    buffer.writeUInt32LE(pixelDataSize, 34); // Image size
    buffer.writeUInt32LE(0, 38); // H-DPI
    buffer.writeUInt32LE(0, 42); // V-DPI
    buffer.writeUInt32LE(256, 46); // Colors in palette
    buffer.writeUInt32LE(0, 50); // Important colors (0 = all)
    
    // Write palette (256 colors)
    let paletteOffset = 54;
    for (let i = 0; i < 256; i++) {
        if (i < palette.length) {
            // BMP stores colors as BGR
            buffer.writeUInt8(palette[i][2], paletteOffset++); // Blue
            buffer.writeUInt8(palette[i][1], paletteOffset++); // Green
            buffer.writeUInt8(palette[i][0], paletteOffset++); // Red
            buffer.writeUInt8(0, paletteOffset++); // Alpha (unused)
        } else {
            // Fill remaining entries with black
            buffer.writeUInt32LE(0, paletteOffset);
            paletteOffset += 4;
        }
    }
    
    // Write pixel data
    const dataOffset = headerSize + dibSize + paletteSize;
    let pixelOffset = 0;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = y * width + x;
            if (index < pixels.length) {
                buffer.writeUInt8(pixels[index], dataOffset + pixelOffset++);
            } else {
                buffer.writeUInt8(0, dataOffset + pixelOffset++);
            }
        }
        
        // Pad row to multiple of 4 bytes
        while (pixelOffset % 4 !== 0) {
            buffer.writeUInt8(0, dataOffset + pixelOffset++);
        }
    }
    
    writeFileSync(filePath, buffer);
}

// Check if running directly from command line
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    if (process.argv.length < 3) {
        console.log('Usage: node reduced-to-jim.js <path-to-directory-with-metadata-color.json>');
        process.exit(1);
    }
    
    const inputDir = process.argv[2];
    convertReducedToJim(inputDir);
}

export { convertReducedToJim };
