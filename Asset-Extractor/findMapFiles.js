const fs = require('fs');
const path = require('path');

/**
 * Searches a binary file for potential .map.jim and .map.jzip files
 * Based on the file format specifications provided in the JIM-Tools documentation
 */

function readUInt32BE(buffer, offset) {
    return buffer.readUInt32BE(offset);
}

function readUInt16BE(buffer, offset) {
    return buffer.readUInt16BE(offset);
}

function readUInt8(buffer, offset) {
    return buffer.readUInt8(offset);
}

function calculateJimFileEnd(startOffset, paletteOffset, mapOffset, buffer) {
    try {
        // Read map dimensions
        const mapWidth = readUInt16BE(buffer, startOffset + mapOffset);
        const mapHeight = readUInt16BE(buffer, startOffset + mapOffset + 2);
        
        // Calculate end of map data section
        const mapDataEnd = startOffset + mapOffset + 4 + (mapWidth * mapHeight * 2);
        
        return {
            mapWidth,
            mapHeight,
            endOffset: mapDataEnd
        };
    } catch (error) {
        return null;
    }
}

function calculateJzipFileEnd(startOffset, paletteOffset, mapOffset, paletteSize, buffer) {
    try {
        // Read map dimensions
        const mapWidth = readUInt16BE(buffer, startOffset + mapOffset);
        const mapHeight = readUInt16BE(buffer, startOffset + mapOffset + 2);
        
        // Calculate end of map data section
        const mapDataEnd = startOffset + mapOffset + 4 + (mapWidth * mapHeight * 2);
        
        // JZIP files have a 4-byte end marker (FF FF FF FF) after the map data
        const endMarkerOffset = mapDataEnd;
        const fileEndOffset = endMarkerOffset + 4;
        
        // Verify the end marker exists
        if (endMarkerOffset + 4 <= buffer.length) {
            const endMarker = buffer.readUInt32BE(endMarkerOffset);
            if (endMarker === 0xFFFFFFFF) {
                return {
                    mapWidth,
                    mapHeight,
                    endOffset: fileEndOffset,
                    hasValidEndMarker: true
                };
            }
        }
        
        return {
            mapWidth,
            mapHeight,
            endOffset: fileEndOffset,
            hasValidEndMarker: false
        };
    } catch (error) {
        return null;
    }
}

function searchMapFiles(filePath, options = {}) {
    const verbose = options.verbose || false;
    const outputFile = options.outputFile || null;
    
    console.log(`Searching for .map.jim and .map.jzip files in: ${filePath}`);
    console.log('=' .repeat(80));
    
    let results = [];
    let output = [`Searching for .map.jim and .map.jzip files in: ${filePath}`, '=' .repeat(80)];
    
    try {
        const buffer = fs.readFileSync(filePath);
        const fileLength = buffer.length;
        
        console.log(`File size: ${fileLength} bytes (0x${fileLength.toString(16)})`);
        output.push(`File size: ${fileLength} bytes (0x${fileLength.toString(16)})`);
        output.push('');
        
        let foundCount = 0;
        
        for (let i = 0; i < fileLength - 12; i++) {
            try {
                // Read potential offsets
                const paletteOffset = readUInt32BE(buffer, i);
                const mapOffset = readUInt32BE(buffer, i + 4);
                
                // Basic validation checks
                if (i + paletteOffset >= fileLength) continue;
                if (i + mapOffset >= fileLength) continue;
                if (paletteOffset >= mapOffset) continue;
                if (paletteOffset < 10) continue; // Must have at least header + some data
                
                // Additional filtering to reduce false positives
                if (paletteOffset > 0x10000) continue; // Reasonable palette offset limit
                if (mapOffset > 0x20000) continue; // Reasonable map offset limit
                if (mapOffset - paletteOffset < 4) continue; // Map should be after palette with some gap
                
                const logEntry = [];
                logEntry.push(`\nPotential file at offset 0x${i.toString(16)} (${i})`);
                logEntry.push(`  Palette Section Offset: 0x${paletteOffset.toString(16)} (${paletteOffset})`);
                logEntry.push(`  Map Section Offset: 0x${mapOffset.toString(16)} (${mapOffset})`);
                
                if (verbose) {
                    console.log(logEntry.join('\n'));
                }
                
                // Check for .map.jzip (has compression)
                let isJzip = false;
                let isJim = false;
                
                try {
                    const paletteSize = readUInt8(buffer, i + 8);
                    const numberOfTiles = readUInt8(buffer, i + 9);
                    
                    logEntry.push(`  JZIP Check:`);
                    logEntry.push(`    Palette Size: 0x${paletteSize.toString(16)} (${paletteSize})`);
                    
                    // Warn if palette size is not standard
                    if (![0x20, 0x40, 0x60, 0x80].includes(paletteSize)) {
                        logEntry.push(`    ⚠️  Warning: Unusual palette size (expected 0x20, 0x40, 0x60, or 0x80)`);
                    }
                    
                    logEntry.push(`    Number of Tiles: ${numberOfTiles}`);
                    
                    // For JZIP, compressed tile data comes before palette
                    // We can't easily calculate the expected palette offset due to compression
                    // But we can check if the structure makes sense
                    
                    if (numberOfTiles > 0 && numberOfTiles < 255 && paletteOffset > 10) {
                        const fileEndInfo = calculateJzipFileEnd(i, paletteOffset, mapOffset, paletteSize, buffer);
                        
                        if (fileEndInfo && fileEndInfo.endOffset <= fileLength && 
                            fileEndInfo.mapWidth > 0 && fileEndInfo.mapHeight > 0 &&
                            fileEndInfo.mapWidth < 1000 && fileEndInfo.mapHeight < 1000) {
                            
                            logEntry.push(`    Map Dimensions: ${fileEndInfo.mapWidth} x ${fileEndInfo.mapHeight}`);
                            
                            if (fileEndInfo.hasValidEndMarker) {
                                logEntry.push(`    End Marker (0xFFFFFFFF): ✅ Found at expected location`);
                                logEntry.push(`    ✅ LIKELY .map.jzip file`);
                                logEntry.push(`    File Range: 0x${i.toString(16)} - 0x${fileEndInfo.endOffset.toString(16)} (${fileEndInfo.endOffset - i} bytes)`);
                                isJzip = true;
                            } else {
                                logEntry.push(`    End Marker (0xFFFFFFFF): ❌ Not found at expected location`);
                                logEntry.push(`    ❌ Invalid .map.jzip file (missing end marker)`);
                            }
                        } else {
                            logEntry.push(`    ❌ Map data extends beyond file or invalid dimensions`);
                        }
                    }
                } catch (error) {
                    logEntry.push(`    ❌ JZIP check failed: ${error.message}`);
                }
                
                // Check for .map.jim (uncompressed)
                try {
                    const numberOfTiles = readUInt16BE(buffer, i + 8);
                    
                    logEntry.push(`  JIM Check:`);
                    logEntry.push(`    Number of Tiles: ${numberOfTiles}`);
                    
                    const expectedPaletteOffset = 10 + (numberOfTiles * 32);
                    logEntry.push(`    Expected Palette Offset: 0x${expectedPaletteOffset.toString(16)} (${expectedPaletteOffset})`);
                    logEntry.push(`    Actual Palette Offset: 0x${paletteOffset.toString(16)} (${paletteOffset})`);
                    
                    if (expectedPaletteOffset === paletteOffset && numberOfTiles > 0 && numberOfTiles < 1000) {
                        const fileEndInfo = calculateJimFileEnd(i, paletteOffset, mapOffset, buffer);
                        
                        if (fileEndInfo && fileEndInfo.endOffset <= fileLength && 
                            fileEndInfo.mapWidth > 0 && fileEndInfo.mapHeight > 0 &&
                            fileEndInfo.mapWidth < 1000 && fileEndInfo.mapHeight < 1000) {
                            logEntry.push(`    Map Dimensions: ${fileEndInfo.mapWidth} x ${fileEndInfo.mapHeight}`);
                            logEntry.push(`    ✅ LIKELY .map.jim file`);
                            logEntry.push(`    File Range: 0x${i.toString(16)} - 0x${fileEndInfo.endOffset.toString(16)} (${fileEndInfo.endOffset - i} bytes)`);
                            isJim = true;
                        } else {
                            logEntry.push(`    ❌ Map data extends beyond file or invalid dimensions`);
                        }
                    } else {
                        logEntry.push(`    ❌ Palette offset mismatch or invalid tile count`);
                    }
                } catch (error) {
                    logEntry.push(`    ❌ JIM check failed: ${error.message}`);
                }
                
                if (isJzip || isJim) {
                    foundCount++;
                    console.log(logEntry.join('\n'));
                    output.push(...logEntry);
                    
                    results.push({
                        offset: i,
                        type: isJzip ? 'jzip' : 'jim',
                        paletteOffset,
                        mapOffset,
                        endOffset: isJzip ? 
                            calculateJzipFileEnd(i, paletteOffset, mapOffset, readUInt8(buffer, i + 8), buffer)?.endOffset :
                            calculateJimFileEnd(i, paletteOffset, mapOffset, buffer)?.endOffset
                    });
                    
                    // Limit output to avoid overwhelming console
                    if (foundCount >= 50) {
                        console.log(`\n⚠️  Found ${foundCount} files so far, stopping output to avoid overwhelming console...`);
                        console.log(`Use --output flag to save all results to a file.`);
                        break;
                    }
                } else if (verbose) {
                    // Only show failed attempts in verbose mode
                    console.log(logEntry.join('\n'));
                    output.push(...logEntry);
                }
                
            } catch (error) {
                if (verbose) {
                    console.log(`Error at offset 0x${i.toString(16)}: ${error.message}`);
                }
            }
        }
        
        console.log('\n' + '=' .repeat(80));
        console.log(`Search completed. Found ${foundCount} potential map files.`);
        
        output.push('');
        output.push('=' .repeat(80));
        output.push(`Search completed. Found ${foundCount} potential map files.`);
        
        if (outputFile) {
            fs.writeFileSync(outputFile, output.join('\n'));
            console.log(`Results saved to: ${outputFile}`);
        }
        
        return results;
        
    } catch (error) {
        console.error(`Error reading file: ${error.message}`);
        return [];
    }
}

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        inputFile: null,
        verbose: false,
        outputFile: null
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        if (arg === '-h' || arg === '--help') {
            displayHelp();
            process.exit(0);
        } else if (arg === '-v' || arg === '--verbose') {
            options.verbose = true;
        } else if (arg === '-o' || arg === '--output') {
            if (i + 1 < args.length) {
                options.outputFile = args[++i];
            } else {
                console.error('Error: Output file not specified');
                displayHelp();
                process.exit(1);
            }
        } else if (!options.inputFile) {
            options.inputFile = arg;
        }
    }

    return options;
}

// Display help information
function displayHelp() {
    console.log(`
Map File Scanner - .map.jim and .map.jzip File Finder
====================================================

This script searches binary files for embedded .map.jim and .map.jzip files
based on their file format specifications.

Usage: node findMapFiles.js [options] <binary_file_path>

Options:
  -h, --help              Display this help message
  -v, --verbose           Display all potential matches (including false positives)
  -o, --output <file>     Save results to a text file

File Format Detection:
  .map.jim  - Uncompressed JIM format with predictable tile offset calculations
  .map.jzip - Compressed JIM format with palette size and tile count validation

Examples:
  node findMapFiles.js nhl92retail.bin
  node findMapFiles.js --verbose --output results.txt nhl92retail.bin
    `);
}

// Main execution
const options = parseArgs();

if (!options.inputFile) {
    console.error('Error: Input file path not provided');
    displayHelp();
    process.exit(1);
}

if (!fs.existsSync(options.inputFile)) {
    console.error(`Error: File not found: ${options.inputFile}`);
    process.exit(1);
}

searchMapFiles(options.inputFile, {
    verbose: options.verbose,
    outputFile: options.outputFile
});
