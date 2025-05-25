// Enhanced-rebuild-jim.js
// An enhanced version of rebuildJim.js with better error handling and validation

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
    console.log(`Enhanced rebuildJim starting with metadata: ${metadataPath}`);
    
    // Read metadata
    const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
    const baseDir = join(metadataPath, '..');
    const tilesDir = join(baseDir, 'tiles');
    
    // Calculate sizes and offsets
    const numTiles = metadata.numTiles || 0;
    console.log(`numTiles: ${numTiles}`);
    const firstTileOffset = 0x0A;
    const tileDataSize = numTiles * 32;
    
    // Set default offsets if not provided in metadata
    const paletteOffset = metadata.paletteOffset ? parseInt(metadata.paletteOffset.slice(2), 16) : 0x82; // Default after tiles
    const mapOffset = metadata.mapOffset ? parseInt(metadata.mapOffset.slice(2), 16) : 0x102; // Default after palette
    console.log(`paletteOffset: 0x${paletteOffset.toString(16).toUpperCase()}`);
    console.log(`mapOffset: 0x${mapOffset.toString(16).toUpperCase()}`);
    
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
    buffer.writeUInt16BE(numTiles, 8);

    // Read and write tiles with enhanced validation
    console.log(`\nProcessing ${numTiles} tiles...`);
    for (let t = 0; t < numTiles; t++) {
        const tileFile = join(tilesDir, `${t.toString().padStart(4, '0')}.bmp`);
        
        try {
            // Validate that the tile file exists
            console.log(`Processing tile ${t}: ${tileFile}`);
            const tileData = readFileSync(tileFile);
            
            // Validate BMP format
            if (tileData.toString('ascii', 0, 2) !== 'BM') {
                console.error(`Error: File ${tileFile} is not a valid BMP file`);
                continue;
            }
            
            // Get the data offset from the BMP header
            const dataOffset = tileData.readUInt32LE(10);
            console.log(`- Pixel data offset: 0x${dataOffset.toString(16).toUpperCase()}`);
            
            // Validate BMP dimensions
            const width = tileData.readInt32LE(18);
            const height = Math.abs(tileData.readInt32LE(22));
            if (width !== 8 || height !== 8) {
                console.error(`Error: Tile ${t} has incorrect dimensions (${width}x${height}), expected 8x8`);
                continue;
            }
            
            // Calculate row size (including padding)
            // BMP rows are padded to multiples of 4 bytes
            const rowSize = Math.ceil(width / 4) * 4;
            console.log(`- Row size: ${rowSize} bytes`);
            
            // Extract 8x8 pixels from indexed color data
            const pixels = [];
            for (let y = 0; y < 8; y++) {
                const rowOffset = dataOffset + (y * rowSize);
                
                // Print first row of pixels for debugging
                if (y === 0) {
                    const pixelSample = [];
                    for (let x = 0; x < 8; x++) {
                        pixelSample.push(tileData[rowOffset + x]);
                    }
                    console.log(`  First row pixels: ${pixelSample.join(',')}`);
                }
                
                for (let x = 0; x < 8; x++) {
                    const pixelValue = tileData[rowOffset + x];
                    pixels.push(pixelValue);
                }
            }
            
            // Validate pixel count
            if (pixels.length !== 64) {
                console.error(`Error: Failed to extract 64 pixels from tile ${t}, got ${pixels.length}`);
                continue;
            }
            
            // Count unique pixel values and show distribution
            const pixelCounts = {};
            pixels.forEach(p => {
                pixelCounts[p] = (pixelCounts[p] || 0) + 1;
            });
            console.log(`- Pixel distribution: ${Object.entries(pixelCounts).map(([val, count]) => `${val}:${count}`).join(', ')}`);
            
            // Convert pixels to Genesis 4bpp tile format
            const tileOffset = firstTileOffset + (t * 32);
            for (let y = 0; y < 8; y++) {
                // Debug the first row packing
                if (y === 0) {
                    console.log(`  Packing row 0: `);
                }
                
                for (let x = 0; x < 4; x++) {
                    const idx1 = y * 8 + x * 2;
                    const idx2 = y * 8 + x * 2 + 1;
                    
                    // Validate pixel indices
                    if (idx1 >= pixels.length || idx2 >= pixels.length) {
                        console.error(`Error: Pixel indices out of bounds: ${idx1}, ${idx2} (max: ${pixels.length - 1})`);
                        continue;
                    }
                    
                    // Pack two pixels into one byte
                    const pixel1 = pixels[idx1] & 0x0F;  // Ensure pixel is within 4 bits
                    const pixel2 = pixels[idx2] & 0x0F;  // Ensure pixel is within 4 bits
                    const byte = (pixel1 << 4) | pixel2;
                    
                    if (y === 0) {
                        console.log(`    Position ${x}: ${pixel1},${pixel2} -> 0x${byte.toString(16).toUpperCase().padStart(2, '0')}`);
                    }
                    
                    buffer[tileOffset + y * 4 + x] = byte;
                }
            }
            
            // Validate the first few bytes of packed data
            console.log(`- Packed data sample: ${Array.from(buffer.subarray(tileOffset, tileOffset + 8)).map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(', ')}`);
            
        } catch (error) {
            console.error(`Error processing tile ${t}: ${error.message}`);
        }
    }

    // Read and write palettes
    console.log(`\nProcessing palettes...`);
    for (let p = 0; p < 4; p++) {
        const palFile = join(baseDir, `${p}.act`);
        try {
            console.log(`Reading palette ${p}: ${palFile}`);
            const palette = readACTPalette(palFile);
            
            // Convert first 16 colors to Genesis format
            for (let c = 0; c < 16; c++) {
                if (c < palette.length) {
                    const color = palette[c];
                    const genesisColor = RGBToGenesisColor(color[0], color[1], color[2]);
                    
                    if (c < 4) {  // Just log a few colors for brevity
                        console.log(`  Color ${c}: RGB(${color.join(',')}) -> Genesis: 0x${genesisColor.toString(16).toUpperCase().padStart(4, '0')}`);
                    }
                    
                    buffer.writeUInt16BE(genesisColor, paletteOffset + (p * 32) + (c * 2));
                } else {
                    console.warn(`  Warning: Palette ${p} has less than 16 colors (only ${palette.length})`);
                    // Use black for missing colors
                    buffer.writeUInt16BE(0, paletteOffset + (p * 32) + (c * 2));
                }
            }
        } catch (error) {
            console.error(`Error processing palette ${p}: ${error.message}`);
        }
    }

    // Write map dimensions and data
    console.log(`\nWriting map data: ${metadata.mapWidth}x${metadata.mapHeight}...`);
    buffer.writeUInt16BE(metadata.mapWidth, mapOffset);
    buffer.writeUInt16BE(metadata.mapHeight, mapOffset + 2);

    // Write map data
    let offset = mapOffset + 4;
    for (let y = 0; y < metadata.mapData.length; y++) {
        const row = metadata.mapData[y];
        
        if (y < 2) {  // Just log a few rows for brevity
            console.log(`  Row ${y} sample: ${row.slice(0, 4).map(t => `Tile:${t.tileIndex},Pal:${t.palIndex}`).join(' | ')}`);
        }
        
        for (let x = 0; x < row.length; x++) {
            const tile = row[x];
            
            // Pack tile data into 16-bit value
            const tileData = (
                (tile.tileIndex & 0x7FF) |          // Bits 0-10: Tile index
                ((tile.hFlip ? 1 : 0) << 11) |      // Bit 11: Horizontal flip
                ((tile.vFlip ? 1 : 0) << 12) |      // Bit 12: Vertical flip
                ((tile.palIndex & 0x03) << 13) |    // Bits 13-14: Palette index
                ((tile.priority ? 1 : 0) << 15)      // Bit 15: Priority
            );
            
            if (y === 0 && x < 4) {  // Sample output
                console.log(`    Pos(${y},${x}): 0x${tileData.toString(16).toUpperCase().padStart(4, '0')}`);
            }
            
            buffer.writeUInt16BE(tileData, offset);
            offset += 2;
        }
    }

    // Save the rebuilt .jim file
    const outPath = join(baseDir, 'rebuilt.jim');
    writeFileSync(outPath, buffer);
    console.log('\nJIM file rebuilt successfully:', outPath);
    console.log(`Total size: ${buffer.length} bytes`);
    
    // Perform a basic validation of the output file
    console.log('\nValidating output file...');
    try {
        const rebuiltData = readFileSync(outPath);
        const rebuiltPaletteOffset = rebuiltData.readUInt32BE(0);
        const rebuiltMapOffset = rebuiltData.readUInt32BE(4);
        const rebuiltNumTiles = rebuiltData.readUInt16BE(8);
        
        console.log(`- Header values: paletteOffset=0x${rebuiltPaletteOffset.toString(16).toUpperCase()}, mapOffset=0x${rebuiltMapOffset.toString(16).toUpperCase()}, numTiles=${rebuiltNumTiles}`);
        
        if (rebuiltPaletteOffset !== paletteOffset || rebuiltMapOffset !== mapOffset || rebuiltNumTiles !== numTiles) {
            console.error('  Warning: Rebuilt file header values don\'t match expected values!');
        } else {
            console.log('  Header values match expected values');
        }
        
        // Check a sample of tile data
        if (numTiles > 0) {
            const tileOffset = firstTileOffset;
            console.log(`- First tile data sample: ${Array.from(rebuiltData.subarray(tileOffset, tileOffset + 8)).map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(', ')}`);
        }
        
        // Check a sample of palette data
        console.log(`- First palette sample: ${Array.from(rebuiltData.subarray(paletteOffset, paletteOffset + 16)).map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(', ')}`);
        
        // Check a sample of map data
        console.log(`- First map data sample: ${Array.from(rebuiltData.subarray(mapOffset + 4, mapOffset + 12)).map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(', ')}`);
        
    } catch (error) {
        console.error(`Error validating output file: ${error.message}`);
    }
}

// Check command line arguments
if (process.argv.length < 3) {
    console.log('Usage: node enhanced-rebuild-jim.js <path-to-metadata.json>');
    process.exit(1);
}

// Get metadata path and run rebuilding process
const metadataPath = process.argv[2];
rebuildJim(metadataPath);
