#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { NHL94Decompressor } = require('./nhl94-decompressor');

/**
 * Process a .map.jim file using the NHL94 decompressor
 */
function processMapJimFile(inputPath, outputPath, verbose = false) {
    try {
        console.log(`Processing ${inputPath}...`);
        
        // Read input file
        if (!fs.existsSync(inputPath)) {
            throw new Error(`Input file not found: ${inputPath}`);
        }
        
        const inputBuffer = fs.readFileSync(inputPath);
        console.log(`Input file size: ${inputBuffer.length} bytes`);
        
        // Extract compressed data section from .map.jim file
        // .map.jim format: [header][palette][compressed_data]
        // Compressed data starts at offset 0x208 (520 decimal)
        const COMPRESSED_DATA_OFFSET = 0x208;
        
        if (inputBuffer.length <= COMPRESSED_DATA_OFFSET) {
            throw new Error(`Input file too small. Expected at least ${COMPRESSED_DATA_OFFSET + 1} bytes, got ${inputBuffer.length}`);
        }
        
        const compressedData = inputBuffer.slice(COMPRESSED_DATA_OFFSET);
        console.log(`Compressed data size: ${compressedData.length} bytes`);
        
        if (verbose) {
            console.log(`First 32 bytes of compressed data: ${Array.from(compressedData.slice(0, 32)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
        }
        
        // Decompress using the NHL94 decompressor
        const decompressor = new NHL94Decompressor();
        const decompressed = decompressor.decompress(Array.from(compressedData), 0, verbose);
        
        console.log(`Decompressed data size: ${decompressed.length} bytes`);
        
        // Write decompressed data to output file
        const outputBuffer = Buffer.from(decompressed);
        fs.writeFileSync(outputPath, outputBuffer);
        
        console.log(`Successfully wrote decompressed data to ${outputPath}`);
        
        if (verbose) {
            console.log(`First 32 bytes of decompressed data: ${Array.from(decompressed.slice(0, 32)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
            console.log(`Last 32 bytes of decompressed data: ${Array.from(decompressed.slice(-32)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
        }
        
        return true;
        
    } catch (error) {
        console.error(`Error processing file: ${error.message}`);
        return false;
    }
}

// Main function
function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
        console.log('NHL94 .map.jim Decompressor');
        console.log('Usage: node decompress-mapjim.js <input.map.jim> <output.bin> [--verbose]');
        console.log('');
        console.log('This tool decompresses the graphics data from NHL94 .map.jim files.');
        console.log('The output will be raw decompressed binary data.');
        process.exit(1);
    }
    
    const inputPath = args[0];
    const outputPath = args[1];
    const verbose = args.includes('--verbose') || args.includes('-v');
    
    if (verbose) {
        console.log('Verbose mode enabled');
    }
    
    const success = processMapJimFile(inputPath, outputPath, verbose);
    
    if (success) {
        console.log('Decompression completed successfully!');
        process.exit(0);
    } else {
        console.log('Decompression failed.');
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { processMapJimFile };
