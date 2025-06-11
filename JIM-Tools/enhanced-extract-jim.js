import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// Create require function for CommonJS modules
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load the NHL94 decompressor
let NHL94Decompressor;
try {
    const decompressorModule = require('../nhl94-decompressor.js');
    NHL94Decompressor = decompressorModule.NHL94Decompressor;
} catch (error) {
    console.error('Could not load NHL94 decompressor:', error.message);
    console.log('Enhanced extraction will continue without decompression support.');
}// Enhanced JIM extraction with decompression support
class EnhancedJimExtractor {
    constructor() {
        this.decompressor = NHL94Decompressor ? new NHL94Decompressor() : null;
    }
        
        /**
         * Detect if a file is compressed by looking for compression patterns
         */
        isCompressed(buffer) {
            // Look for common compression command patterns
            const possibleOffsets = [10, 12, 16, 20, 24, 32];
            
            for (const offset of possibleOffsets) {
                if (offset >= buffer.length) continue;
                
                // Check for compression command patterns
                const byte = buffer[offset];
                if ((byte >= 0x00 && byte <= 0x3F) || // Basic commands
                    (byte >= 0x80 && byte <= 0x9F) || // Extended commands
                    byte === 0xFF) {                   // End marker
                    
                    // Look for end marker within reasonable distance
                    for (let i = offset + 1; i < Math.min(offset + 200, buffer.length); i++) {
                        if (buffer[i] === 0xFF) {
                            return { compressed: true, offset: offset };
                        }
                    }
                }
            }
            
            return { compressed: false, offset: 0 };
        }
        
        /**
         * Extract JIM file with automatic decompression if needed
         */
        extract(inputPath, outputDir) {
            console.log(`\n=== Enhanced JIM Extractor ===`);
            console.log(`Input: ${inputPath}`);
            console.log(`Output: ${outputDir}`);
            
            // Read input file
            const buffer = readFileSync(inputPath);
            console.log(`File size: ${buffer.length} bytes`);
            
            // Check if compressed
            const compressionInfo = this.isCompressed(buffer);
            let jimData;
              if (compressionInfo.compressed) {
                console.log(`✓ Compressed file detected (offset: ${compressionInfo.offset})`);
                
                if (!this.decompressor) {
                    console.error(`✗ Decompressor not available - cannot process compressed file`);
                    throw new Error('Decompression support not loaded');
                }
                
                console.log(`Decompressing...`);
                
                try {
                    const decompressed = this.decompressor.decompress(
                        Array.from(buffer), 
                        compressionInfo.offset
                    );
                    jimData = Buffer.from(decompressed);
                    console.log(`✓ Decompressed to ${jimData.length} bytes`);
                    
                    // Save decompressed data for analysis
                    const decompressedPath = join(outputDir, 'decompressed.jim');
                    if (!existsSync(outputDir)) {
                        mkdirSync(outputDir, { recursive: true });
                    }
                    writeFileSync(decompressedPath, jimData);
                    console.log(`✓ Saved decompressed data: ${decompressedPath}`);
                    
                } catch (error) {
                    console.error(`✗ Decompression failed: ${error.message}`);
                    console.log(`Trying to extract as uncompressed...`);
                    jimData = buffer;
                }
            } else {
                console.log(`✓ Uncompressed file detected`);
                jimData = buffer;
            }
            
            // Now extract the JIM data using existing logic
            this.extractJimData(jimData, outputDir, basename(inputPath));
        }
        
        /**
         * Extract JIM data (adapted from existing extract-jim.js)
         */
        extractJimData(buffer, outputDir, baseName) {
            console.log(`\nExtracting JIM structure...`);
            
            try {
                // Read header (Big Endian)
                const paletteOffset = buffer.readUInt32BE(0);
                const mapOffset = buffer.readUInt32BE(4);
                const numTiles = buffer.readUInt16BE(8);
                
                console.log(`Palette offset: 0x${paletteOffset.toString(16)}`);
                console.log(`Map offset: 0x${mapOffset.toString(16)}`);
                console.log(`Number of tiles: ${numTiles}`);
                
                // Validate offsets
                if (paletteOffset >= buffer.length || mapOffset >= buffer.length) {
                    throw new Error(`Invalid offsets - file may be corrupted or not a valid JIM file`);
                }
                
                // Create output directory
                if (!existsSync(outputDir)) {
                    mkdirSync(outputDir, { recursive: true });
                }
                
                // Extract tiles
                this.extractTiles(buffer, 10, numTiles, outputDir);
                
                // Extract palettes
                this.extractPalettes(buffer, paletteOffset, outputDir);
                
                // Extract map data
                this.extractMapData(buffer, mapOffset, outputDir);
                
                // Create metadata file
                this.createMetadata(baseName, numTiles, paletteOffset, mapOffset, outputDir);
                
                console.log(`✓ Extraction complete!`);
                
            } catch (error) {
                console.error(`✗ Extraction failed: ${error.message}`);
                
                // Provide analysis for debugging
                console.log(`\nFile analysis for debugging:`);
                console.log(`First 32 bytes: ${Array.from(buffer.slice(0, 32)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
                
                if (buffer.length >= 10) {
                    const alt1 = buffer.readUInt32LE(0); // Try little endian
                    const alt2 = buffer.readUInt32LE(4);
                    console.log(`Alternative (LE) - Palette: 0x${alt1.toString(16)}, Map: 0x${alt2.toString(16)}`);
                }
            }
        }
        
        extractTiles(buffer, offset, numTiles, outputDir) {
            console.log(`Extracting ${numTiles} tiles...`);
            
            const tilesDir = join(outputDir, 'tiles');
            if (!existsSync(tilesDir)) {
                mkdirSync(tilesDir, { recursive: true });
            }
            
            for (let i = 0; i < numTiles; i++) {
                const tileOffset = offset + (i * 32);
                if (tileOffset + 32 > buffer.length) {
                    console.warn(`Tile ${i} extends beyond file length, skipping`);
                    break;
                }
                
                const tileData = buffer.slice(tileOffset, tileOffset + 32);
                const tilePath = join(tilesDir, `tile_${i.toString().padStart(4, '0')}.bin`);
                writeFileSync(tilePath, tileData);
            }
            
            console.log(`✓ Extracted ${numTiles} tiles`);
        }
        
        extractPalettes(buffer, offset, outputDir) {
            console.log(`Extracting palettes...`);
            
            if (offset + 128 > buffer.length) {
                console.warn(`Palette data extends beyond file length`);
                return;
            }
            
            // Extract all 4 palettes (16 colors * 2 bytes * 4 palettes = 128 bytes)
            const paletteData = buffer.slice(offset, offset + 128);
            const palettePath = join(outputDir, 'palettes.bin');
            writeFileSync(palettePath, paletteData);
            
            // Also create human-readable palette files
            for (let pal = 0; pal < 4; pal++) {
                const colors = [];
                for (let col = 0; col < 16; col++) {
                    const colorOffset = offset + (pal * 32) + (col * 2);
                    const colorWord = buffer.readUInt16BE(colorOffset);
                    const rgb = this.genesisColorToRGB(colorWord);
                    colors.push({
                        genesis: colorWord,
                        hex: `#${rgb.map(c => c.toString(16).padStart(2, '0')).join('')}`,
                        rgb: rgb
                    });
                }
                
                const paletteInfo = {
                    palette: pal,
                    colors: colors
                };
                
                const paletteJsonPath = join(outputDir, `palette_${pal}.json`);
                writeFileSync(paletteJsonPath, JSON.stringify(paletteInfo, null, 2));
            }
            
            console.log(`✓ Extracted palettes`);
        }
        
        extractMapData(buffer, offset, outputDir) {
            console.log(`Extracting map data...`);
            
            if (offset + 4 > buffer.length) {
                console.warn(`Map header extends beyond file length`);
                return;
            }
            
            const mapWidth = buffer.readUInt16BE(offset);
            const mapHeight = buffer.readUInt16BE(offset + 2);
            const mapDataSize = mapWidth * mapHeight * 2;
            
            console.log(`Map dimensions: ${mapWidth} x ${mapHeight}`);
            
            if (offset + 4 + mapDataSize > buffer.length) {
                console.warn(`Map data extends beyond file length`);
                return;
            }
            
            const mapData = buffer.slice(offset + 4, offset + 4 + mapDataSize);
            const mapPath = join(outputDir, 'map.bin');
            writeFileSync(mapPath, mapData);
            
            // Create map metadata
            const mapInfo = {
                width: mapWidth,
                height: mapHeight,
                dataSize: mapDataSize
            };
            
            const mapJsonPath = join(outputDir, 'map.json');
            writeFileSync(mapJsonPath, JSON.stringify(mapInfo, null, 2));
            
            console.log(`✓ Extracted map data`);
        }
        
        createMetadata(baseName, numTiles, paletteOffset, mapOffset, outputDir) {
            const metadata = {
                sourceFile: baseName,
                format: 'JIM',
                tiles: {
                    count: numTiles,
                    size: '8x8',
                    format: '4bpp'
                },
                palettes: {
                    count: 4,
                    colorsPerPalette: 16,
                    offset: paletteOffset
                },
                map: {
                    offset: mapOffset
                },
                extractedFiles: {
                    tiles: 'tiles/',
                    palettes: 'palettes.bin',
                    map: 'map.bin'
                }
            };
            
            const metadataPath = join(outputDir, 'metadata.json');
            writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
            console.log(`✓ Created metadata.json`);
        }
        
        // Convert Genesis color format to RGB
        genesisColorToRGB(word) {
            const blue = (word >> 9) & 0x07;
            const green = (word >> 5) & 0x07;
            const red = (word >> 1) & 0x07;
            
            return [
                Math.round(red * 252 / 7),
                Math.round(green * 252 / 7),
                Math.round(blue * 252 / 7)
            ];        }
    }
}

// CLI interface
function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
        console.log('Enhanced JIM Extractor with Decompression Support');
        console.log('Usage: node enhanced-extract-jim.js <input.map.jim> [output-dir]');
        console.log('');
        console.log('Features:');
        console.log('  - Automatic detection of compressed .map.jim files');
        console.log('  - Decompression using NHL94 algorithm');
        console.log('  - Full JIM structure extraction');
        console.log('  - Compatible with existing JIM-Tools workflow');
        return;
    }
    
    const inputPath = args[0];
    const outputDir = args[1] || `${basename(inputPath, '.jim')}_extracted`;
    
    const extractor = new EnhancedJimExtractor();
    extractor.extract(inputPath, outputDir);
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { EnhancedJimExtractor };
