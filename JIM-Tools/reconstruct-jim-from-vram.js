#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

/**
 * Reads a 16-color BMP file and extracts tiles from specified starting position
 * @param {string} bmpPath - Path to the VRAM BMP file (128x1000, 16 colors)
 * @param {number} startTileIndex - Starting tile index in the BMP (0-based)
 * @param {number} numTiles - Number of tiles to extract
 * @returns {Buffer} - Raw tile data in 4bpp Genesis format
 */
function extractTilesFromVRAM(bmpPath, startTileIndex, numTiles) {
    const bmpData = fs.readFileSync(bmpPath);
    
    // BMP header parsing (basic validation)
    const signature = bmpData.toString('ascii', 0, 2);
    if (signature !== 'BM') {
        throw new Error('Invalid BMP file format');
    }
    
    const dataOffset = bmpData.readUInt32LE(10);
    const width = bmpData.readUInt32LE(18);
    const height = bmpData.readUInt32LE(22);
    const bitsPerPixel = bmpData.readUInt16LE(28);
    
    console.log(`BMP Info: ${width}x${height}, ${bitsPerPixel}bpp, data offset: ${dataOffset}`);
    
    if (width !== 128 || height !== 1000) {
        throw new Error(`Expected 128x1000 BMP, got ${width}x${height}`);
    }
    
    if (bitsPerPixel !== 4 && bitsPerPixel !== 8) {
        throw new Error(`Expected 4 or 8 bits per pixel, got ${bitsPerPixel}`);
    }
    
    // Calculate tiles per row and validate tile index
    const tilesPerRow = width / 8; // 16 tiles per row
    const totalTiles = (width / 8) * (height / 8); // 2000 tiles total
    
    if (startTileIndex + numTiles > totalTiles) {
        throw new Error(`Tile range exceeds available tiles: ${startTileIndex + numTiles} > ${totalTiles}`);
    }
    
    console.log(`Extracting ${numTiles} tiles starting from tile ${startTileIndex}`);
    
    // Prepare output buffer for Genesis 4bpp format (32 bytes per tile)
    const outputTiles = Buffer.alloc(numTiles * 32);
    let outputOffset = 0;
    
    // Extract each tile
    for (let tileNum = 0; tileNum < numTiles; tileNum++) {
        const currentTileIndex = startTileIndex + tileNum;
        
        // Calculate tile position in BMP
        const tileRow = Math.floor(currentTileIndex / tilesPerRow);
        const tileCol = currentTileIndex % tilesPerRow;
        
        // Extract 8x8 tile and convert to Genesis format
        extractSingleTile(bmpData, dataOffset, width, height, bitsPerPixel, 
                         tileCol * 8, tileRow * 8, outputTiles, outputOffset);
        
        outputOffset += 32;
    }
    
    return outputTiles;
}

/**
 * Extracts a single 8x8 tile from BMP and converts to Genesis 4bpp format
 */
function extractSingleTile(bmpData, dataOffset, bmpWidth, bmpHeight, bitsPerPixel, 
                          startX, startY, outputBuffer, outputOffset) {
    
    const bytesPerRow = bitsPerPixel === 4 ? Math.ceil(bmpWidth / 2) : bmpWidth;
    const rowPadding = (4 - (bytesPerRow % 4)) % 4;
    const actualRowSize = bytesPerRow + rowPadding;
    
    // Genesis tile format: 4 bytes per row, 8 rows = 32 bytes per tile
    // Each byte contains 2 pixels (4 bits each)
    
    for (let row = 0; row < 8; row++) {
        // BMP is stored bottom-to-top, so flip Y coordinate
        const bmpY = bmpHeight - 1 - (startY + row);
        const rowOffset = dataOffset + (bmpY * actualRowSize);
        
        for (let col = 0; col < 8; col += 2) {
            const bmpX = startX + col;
            let pixel1, pixel2;
            
            if (bitsPerPixel === 4) {
                // 4bpp BMP: 2 pixels per byte
                const byteOffset = rowOffset + Math.floor(bmpX / 2);
                const pixelByte = bmpData.readUInt8(byteOffset);
                
                if (bmpX % 2 === 0) {
                    pixel1 = pixelByte & 0x0F;        // Lower nibble
                    pixel2 = (pixelByte & 0xF0) >> 4; // Upper nibble
                } else {
                    pixel1 = (pixelByte & 0xF0) >> 4; // Upper nibble
                    pixel2 = col + 1 < 8 ? bmpData.readUInt8(byteOffset + 1) & 0x0F : 0;
                }
            } else {
                // 8bpp BMP: 1 pixel per byte (take lower 4 bits)
                pixel1 = bmpData.readUInt8(rowOffset + bmpX) & 0x0F;
                pixel2 = col + 1 < 8 ? bmpData.readUInt8(rowOffset + bmpX + 1) & 0x0F : 0;
            }
            
            // Genesis format: upper nibble = first pixel, lower nibble = second pixel
            const genesisByte = (pixel1 << 4) | pixel2;
            outputBuffer.writeUInt8(genesisByte, outputOffset + (row * 4) + Math.floor(col / 2));
        }
    }
}

/**
 * Reads .map.jzip file and extracts header information and non-tile data
 * @param {string} jzipPath - Path to the .map.jzip file
 * @returns {Object} - Parsed file data
 */
function parseJZipFile(jzipPath) {
    const data = fs.readFileSync(jzipPath);
    
    // Read header (Big Endian)
    const paletteOffset = data.readUInt32BE(0);
    const mapOffset = data.readUInt32BE(4);
    const paletteSize = data.readUInt8(8);
    const numTiles = data.readUInt8(9);
    
    console.log(`JZIP Header:`);
    console.log(`  Palette offset: 0x${paletteOffset.toString(16)} (${paletteOffset})`);
    console.log(`  Map offset: 0x${mapOffset.toString(16)} (${mapOffset})`);
    console.log(`  Palette size: ${paletteSize}`);
    console.log(`  Number of tiles: ${numTiles}`);
    
    // Extract palette data
    let paletteData = Buffer.alloc(0);
    if (paletteOffset < data.length) {
        const actualPaletteSize = Math.min(paletteSize, data.length - paletteOffset);
        paletteData = data.slice(paletteOffset, paletteOffset + actualPaletteSize);
        console.log(`  Extracted ${paletteData.length} bytes of palette data`);
    }
    
    // Extract map data
    let mapData = Buffer.alloc(0);
    if (mapOffset < data.length) {
        // Find end of map data (check for end marker)
        let mapEnd = data.length;
        if (data.length >= 4 && data.readUInt32BE(data.length - 4) === 0xFFFFFFFF) {
            mapEnd = data.length - 4;
        }
        
        if (mapOffset < mapEnd) {
            mapData = data.slice(mapOffset, mapEnd);
            console.log(`  Extracted ${mapData.length} bytes of map data`);
        }
    }
    
    return {
        numTiles,
        paletteSize,
        paletteData,
        mapData
    };
}

/**
 * Creates a .map.jim file from extracted components
 * @param {string} outputPath - Output file path
 * @param {number} numTiles - Number of tiles
 * @param {Buffer} tileData - Raw tile data (32 bytes per tile)
 * @param {Buffer} paletteData - Palette data
 * @param {Buffer} mapData - Map data
 */
function createJimFile(outputPath, numTiles, tileData, paletteData, mapData) {
    // Calculate offsets for .map.jim format
    const headerSize = 10; // 4 + 4 + 2 bytes
    const tileDataSize = tileData.length;
    const paletteDataSize = paletteData.length;
    const mapDataSize = mapData.length;
    
    const newPaletteOffset = headerSize + tileDataSize;
    const newMapOffset = newPaletteOffset + paletteDataSize;
    const totalSize = newMapOffset + mapDataSize;
    
    console.log(`Creating JIM file:`);
    console.log(`  Header: ${headerSize} bytes`);
    console.log(`  Tiles: ${tileDataSize} bytes (${numTiles} tiles)`);
    console.log(`  Palette offset: 0x${newPaletteOffset.toString(16)} (${paletteDataSize} bytes)`);
    console.log(`  Map offset: 0x${newMapOffset.toString(16)} (${mapDataSize} bytes)`);
    console.log(`  Total size: ${totalSize} bytes`);
    
    // Create output buffer
    const output = Buffer.alloc(totalSize);
    let pos = 0;
    
    // Write header (Big Endian)
    output.writeUInt32BE(newPaletteOffset, 0);
    output.writeUInt32BE(newMapOffset, 4);
    output.writeUInt16BE(numTiles, 8);
    pos += 10;
    
    // Write tile data
    tileData.copy(output, pos);
    pos += tileDataSize;
    
    // Write palette data
    paletteData.copy(output, pos);
    pos += paletteDataSize;
    
    // Write map data
    mapData.copy(output, pos);
    pos += mapDataSize;
    
    // Write to file
    fs.writeFileSync(outputPath, output);
    console.log(`Successfully created ${outputPath}`);
}

/**
 * Main function to reconstruct .map.jim from .map.jzip and VRAM BMP
 */
function reconstructJimFromVram(jzipPath, vramBmpPath, startTileIndex, outputPath) {
    try {
        console.log('=== Reconstructing JIM from VRAM ===');
        console.log(`Input JZIP: ${jzipPath}`);
        console.log(`VRAM BMP: ${vramBmpPath}`);
        console.log(`Start tile index: ${startTileIndex}`);
        console.log(`Output: ${outputPath}`);
        console.log('');
        
        // Parse the .jzip file
        console.log('1. Parsing JZIP file...');
        const jzipData = parseJZipFile(jzipPath);
        console.log('');
        
        // Extract tiles from VRAM BMP
        console.log('2. Extracting tiles from VRAM BMP...');
        const tileData = extractTilesFromVRAM(vramBmpPath, startTileIndex, jzipData.numTiles);
        console.log('');
        
        // Create the output JIM file
        console.log('3. Creating JIM file...');
        createJimFile(outputPath, jzipData.numTiles, tileData, jzipData.paletteData, jzipData.mapData);
        console.log('');
        
        console.log('=== Reconstruction complete! ===');
        
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Command line interface
if (process.argv[1] === __filename || 
    path.resolve(process.argv[1]) === path.resolve(__filename)) {
    
    if (process.argv.length < 6) {
        console.log('Usage: node reconstruct-jim-from-vram.js <input.jzip> <vram.bmp> <startTileIndex> <output.jim>');
        console.log('');
        console.log('Arguments:');
        console.log('  input.jzip     - Input compressed JIM file');
        console.log('  vram.bmp       - VRAM dump BMP file (128x1000, 16 colors)');
        console.log('  startTileIndex - Starting tile index in VRAM (0-based)');
        console.log('  output.jim     - Output uncompressed JIM file');
        console.log('');
        console.log('Example:');
        console.log('  node reconstruct-jim-from-vram.js game.map.jzip vram_dump.bmp 100 reconstructed.map.jim');
        process.exit(1);
    }
    
    const jzipPath = process.argv[2];
    const vramBmpPath = process.argv[3];
    const startTileIndex = parseInt(process.argv[4], 10);
    const outputPath = process.argv[5];
    
    if (isNaN(startTileIndex) || startTileIndex < 0) {
        console.error('Error: startTileIndex must be a non-negative integer');
        process.exit(1);
    }
    
    // Validate input files exist
    if (!fs.existsSync(jzipPath)) {
        console.error(`Error: Input JZIP file not found: ${jzipPath}`);
        process.exit(1);
    }
    
    if (!fs.existsSync(vramBmpPath)) {
        console.error(`Error: VRAM BMP file not found: ${vramBmpPath}`);
        process.exit(1);
    }
    
    reconstructJimFromVram(jzipPath, vramBmpPath, startTileIndex, outputPath);
}

export { reconstructJimFromVram, extractTilesFromVRAM, parseJZipFile, createJimFile };
