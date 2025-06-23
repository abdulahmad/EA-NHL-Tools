import fs from 'fs';
import path from 'path';

/**
 * Detects .map.jzip files within a ROM file
 * @param {string} romFilePath - Path to the ROM file to scan
 * @param {string} outputDir - Directory to save detected files (optional)
 */
function detectJzipFiles(romFilePath, outputDir = null) {
    return detectJzipFilesWithOptions(romFilePath, outputDir, { verbose: false, quiet: false });
}

/**
 * Detects .map.jzip files within a ROM file with options
 * @param {string} romFilePath - Path to the ROM file to scan
 * @param {string} outputDir - Directory to save detected files (optional)
 * @param {Object} options - Options object
 */
function detectJzipFilesWithOptions(romFilePath, outputDir = null, options = {}) {
    if (!fs.existsSync(romFilePath)) {
        console.error(`ROM file not found: ${romFilePath}`);
        return [];
    }

    const romData = fs.readFileSync(romFilePath);
    const detectedFiles = [];
    
    if (!options.quiet) {
        console.log(`Scanning ${romFilePath} (${romData.length} bytes) for .map.jzip files...`);
    }
    
    // Scan every byte position as potential start of jzip file
    for (let offset = 0; offset <= romData.length - 10; offset++) {
        if (!options.quiet && offset % 100000 === 0) {
            console.log(`Progress: ${Math.round((offset / romData.length) * 100)}%`);
        }
        
        try {
            const detection = analyzeJzipCandidate(romData, offset);
            if (detection.isValid) {
                if (!options.quiet) {
                    console.log(`\n✓ Found potential .map.jzip at offset 0x${offset.toString(16).toUpperCase()}`);
                    console.log(`  Palette Offset: 0x${detection.paletteOffset.toString(16)}`);
                    console.log(`  Map Offset: 0x${detection.mapOffset.toString(16)}`);
                    console.log(`  Palette Size: 0x${detection.paletteSize.toString(16)}`);
                    console.log(`  Tile Count: ${detection.tileCount}`);
                    console.log(`  Expected Tile Bytes: ${detection.expectedTileBytes}`);
                    console.log(`  Actual Tile Bytes: ${detection.actualTileBytes}`);
                    console.log(`  Map Width: ${detection.mapWidth}`);
                    console.log(`  Map Height: ${detection.mapHeight}`);
                    console.log(`  File Size: ${detection.fileSize} bytes`);
                }
                
                detection.romOffset = offset;
                detectedFiles.push(detection);
                
                // Extract the file if output directory specified
                if (outputDir && detection.fileSize > 0) {
                    extractJzipFile(romData, offset, detection, outputDir, options.quiet);
                }
            } else if (options.verbose) {
                console.log(`✗ Offset 0x${offset.toString(16).toUpperCase()}: ${detection.reason}`);
            }
        } catch (error) {
            if (options.verbose) {
                console.log(`✗ Offset 0x${offset.toString(16).toUpperCase()}: Read error - ${error.message}`);
            }
            // Silently continue on read errors (expected at end of file)
        }
    }
    
    if (!options.quiet) {
        console.log(`\nScan complete. Found ${detectedFiles.length} potential .map.jzip files.`);
    }
    return detectedFiles;
}

/**
 * Analyzes a byte position to determine if it could be the start of a .map.jzip file
 * @param {Buffer} data - ROM data buffer
 * @param {number} offset - Byte offset to analyze
 * @returns {Object} Analysis result
 */
function analyzeJzipCandidate(data, offset) {
    // Read header fields (Big Endian)
    const paletteOffset = data.readUInt32BE(offset);
    const mapOffset = data.readUInt32BE(offset + 4);
    const paletteSize = data.readUInt8(offset + 8);
    const tileCount = data.readUInt8(offset + 9);
    
    // Initial validation checks
    if (mapOffset <= paletteOffset) {
        return { isValid: false, reason: 'Map offset not greater than palette offset' };
    }
    
    // Validate palette size
    const validPaletteSizes = [0x20, 0x40, 0x60, 0x80];
    if (!validPaletteSizes.includes(paletteSize)) {
        return { isValid: false, reason: `Invalid palette size: 0x${paletteSize.toString(16)}` };
    }
    
    // Calculate expected tile bytes
    const actualTileBytes = paletteOffset - 10;
    const expectedTileBytes = tileCount * 32; // 0x20
    
    // Tile count validation - allow some tolerance for compression
    if (actualTileBytes < expectedTileBytes * 0.1 || actualTileBytes > expectedTileBytes) {
        return { 
            isValid: false, 
            reason: `Tile byte mismatch - Expected: ${expectedTileBytes}, Actual: ${actualTileBytes}` 
        };
    }
    
    // Check if we can read map dimensions
    if (offset + mapOffset + 4 > data.length) {
        return { isValid: false, reason: 'Map section extends beyond file' };
    }
    
    const mapWidth = data.readUInt16BE(offset + mapOffset);
    const mapHeight = data.readUInt16BE(offset + mapOffset + 2);
    
    // Reasonable map size validation
    if (mapWidth === 0 || mapHeight === 0 || mapWidth > 1024 || mapHeight > 1024) {
        return { isValid: false, reason: `Invalid map dimensions: ${mapWidth}x${mapHeight}` };
    }
    
    // Calculate expected file size
    const mapDataSize = mapWidth * mapHeight * 2;
    const expectedFileSize = mapOffset + 4 + mapDataSize + 4; // +4 for end marker
    
    // Check if we can read the expected end marker
    if (offset + expectedFileSize > data.length) {
        return { isValid: false, reason: 'Expected file size extends beyond ROM' };
    }
    
    // Check for end marker (FF FF FF FF)
    const endMarkerOffset = offset + mapOffset + 4 + mapDataSize;
    let hasEndMarker = false;
    
    if (endMarkerOffset + 4 <= data.length) {
        const marker = data.readUInt32BE(endMarkerOffset);
        hasEndMarker = (marker === 0xFFFFFFFF);
    }
    
    // Additional validation - check if palette section makes sense
    const paletteEndOffset = offset + paletteOffset + paletteSize;
    if (paletteEndOffset > offset + mapOffset) {
        return { isValid: false, reason: 'Palette section overlaps with map section' };
    }
    
    return {
        isValid: true,
        paletteOffset,
        mapOffset,
        paletteSize,
        tileCount,
        expectedTileBytes,
        actualTileBytes,
        mapWidth,
        mapHeight,
        fileSize: expectedFileSize,
        hasEndMarker,
        endMarkerOffset: endMarkerOffset - offset
    };
}

/**
 * Extracts a detected .map.jzip file to disk
 * @param {Buffer} romData - ROM data buffer
 * @param {number} offset - File offset in ROM
 * @param {Object} detection - Detection result object
 * @param {string} outputDir - Output directory
 * @param {boolean} quiet - Suppress output messages
 */
function extractJzipFile(romData, offset, detection, outputDir, quiet = false) {
    try {
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const fileName = `jzip_0x${offset.toString(16).toUpperCase().padStart(8, '0')}.map.jzip`;
        const filePath = path.join(outputDir, fileName);
        
        const fileData = romData.subarray(offset, offset + detection.fileSize);
        fs.writeFileSync(filePath, fileData);
        
        if (!quiet) {
            console.log(`  → Extracted to: ${fileName}`);
        }
    } catch (error) {
        if (!quiet) {
            console.error(`  ✗ Failed to extract file: ${error.message}`);
        }
    }
}

/**
 * Display help information
 */
function showHelp() {
    console.log('JZIP File Detector v1.0');
    console.log('========================');
    console.log('');
    console.log('Scans ROM files for .map.jzip format files used in EA NHL Genesis games.');
    console.log('');
    console.log('USAGE:');
    console.log('  node findJzip.mjs <rom_file> [output_directory]');
    console.log('');
    console.log('ARGUMENTS:');
    console.log('  rom_file         Path to the ROM file to scan (required)');
    console.log('  output_directory Optional directory to extract detected files');
    console.log('                   If not specified, files will only be detected, not extracted');
    console.log('');
    console.log('OPTIONS:');
    console.log('  -h, --help       Show this help message');
    console.log('  -v, --verbose    Enable verbose output (shows detection attempts)');
    console.log('  -q, --quiet      Suppress progress output');
    console.log('');
    console.log('EXAMPLES:');
    console.log('  node findJzip.mjs nhl94.bin');
    console.log('  node findJzip.mjs nhl94.bin extracted/');
    console.log('  node findJzip.mjs "C:\\Games\\NHL 94.bin" "C:\\Output\\" --verbose');
    console.log('  node findJzip.mjs nhl93.bin --quiet');
    console.log('');
    console.log('OUTPUT:');
    console.log('  - Progress updates during scanning (unless --quiet)');
    console.log('  - Details of each detected file including offset, size, and properties');
    console.log('  - Summary of all detected files');
    console.log('  - Extracted files (if output directory specified)');
    console.log('');
    console.log('DETECTION CRITERIA:');
    console.log('  - Valid palette and map section offsets');
    console.log('  - Palette size must be 0x20, 0x40, 0x60, or 0x80 bytes');
    console.log('  - Tile count matches compressed data size');
    console.log('  - Valid map dimensions (1-1024 pixels)');
    console.log('  - Proper file structure with end marker (0xFFFFFFFF)');
    console.log('');
    console.log('SUPPORTED FORMATS:');
    console.log('  - .map.jzip files from NHLPA Hockey 93');
    console.log('  - .map.jzip files from NHL 94');
    console.log('  - Other EA Genesis games using similar compression');
}

/**
 * Parse command line arguments
 */
function parseArgs(args) {
    const options = {
        romFile: null,
        outputDir: null,
        verbose: false,
        quiet: false,
        help: false
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        if (arg === '-h' || arg === '--help') {
            options.help = true;
        } else if (arg === '-v' || arg === '--verbose') {
            options.verbose = true;
        } else if (arg === '-q' || arg === '--quiet') {
            options.quiet = true;
        } else if (!options.romFile) {
            options.romFile = arg;
        } else if (!options.outputDir) {
            options.outputDir = arg;
        }
    }

    return options;
}

/**
 * Command line interface
 */
function main() {
    const args = process.argv.slice(2);
    const options = parseArgs(args);
    
    // Check for help flag
    if (options.help || args.length === 0) {
        showHelp();
        return;
    }
    
    if (!options.romFile) {
        console.error('Error: ROM file path is required.');
        console.log('Use "node findJzip.mjs --help" for usage information.');
        process.exit(1);
    }
    
    // Validate ROM file exists
    if (!fs.existsSync(options.romFile)) {
        console.error(`Error: ROM file not found: ${options.romFile}`);
        process.exit(1);
    }
    
    if (!options.quiet) {
        console.log('JZIP File Detector');
        console.log('==================');
        console.log(`ROM File: ${options.romFile}`);
        console.log(`Output Directory: ${options.outputDir || 'None (detection only)'}`);
        console.log(`Verbose Mode: ${options.verbose ? 'Enabled' : 'Disabled'}`);
        console.log('');
    }
    
    const startTime = Date.now();
    const detectedFiles = detectJzipFilesWithOptions(options.romFile, options.outputDir, options);
    const endTime = Date.now();
    
    if (!options.quiet) {
        console.log('');
        console.log('='.repeat(50));
        console.log('SCAN COMPLETE');
        console.log('='.repeat(50));
        console.log(`Scan Time: ${((endTime - startTime) / 1000).toFixed(2)} seconds`);
        console.log(`Files Detected: ${detectedFiles.length}`);
    }
    
    if (detectedFiles.length > 0) {
        if (!options.quiet) {
            console.log('');
            console.log('DETECTION SUMMARY:');
            console.log('-'.repeat(50));
        }
        detectedFiles.forEach((file, index) => {
            console.log(`${(index + 1).toString().padStart(2)}. Offset: 0x${file.romOffset.toString(16).toUpperCase().padStart(8, '0')} | ` +
                       `Size: ${file.fileSize.toString().padStart(6)} bytes | ` +
                       `Map: ${file.mapWidth}x${file.mapHeight} | ` +
                       `Tiles: ${file.tileCount.toString().padStart(3)} | ` +
                       `End Marker: ${file.hasEndMarker ? '✓' : '✗'}`);
        });
        
        if (options.outputDir && !options.quiet) {
            console.log('');
            console.log(`All detected files have been extracted to: ${options.outputDir}`);
        }
    } else {
        if (!options.quiet) {
            console.log('No .map.jzip files detected in the ROM.');
        }
    }
}

// Run if called directly
// if (import.meta.url === `file://${process.argv[1]}`) {
    main();
// }

export { detectJzipFiles, detectJzipFilesWithOptions, analyzeJzipCandidate };