#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { NHL94Decompressor } = require('./nhl94-decompressor.js');

/**
 * CLI tool for decompressing NHL94 .map.jim files
 */

function showUsage() {
    console.log('NHL94 Map.jim Decompressor');
    console.log('Usage: node decompress-jim.js <input.map.jim> [output.bin] [options]');
    console.log('');
    console.log('Options:');
    console.log('  --offset N    Start decompression at byte offset N (default: auto-detect)');
    console.log('  --analyze     Show detailed analysis of decompressed data');
    console.log('  --verbose     Show detailed decompression log');
    console.log('  --help        Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  node decompress-jim.js tiles.map.jim');
    console.log('  node decompress-jim.js tiles.map.jim tiles.bin --analyze');
    console.log('  node decompress-jim.js tiles.map.jim --offset 12 --verbose');
}

function analyzeData(data, label = "Decompressed Data") {
    console.log(`\n=== ${label} Analysis ===`);
    console.log(`Length: ${data.length} bytes`);
    
    if (data.length === 0) return;
    
    // Show first 32 bytes
    console.log('\nFirst 32 bytes:');
    const first32 = Array.from(data.slice(0, 32))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ');
    console.log(first32);
    
    // Byte frequency
    const freq = new Map();
    for (const byte of data) {
        freq.set(byte, (freq.get(byte) || 0) + 1);
    }
    
    console.log(`\nTop 5 bytes:`);
    Array.from(freq.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([byte, count]) => {
            const percent = ((count / data.length) * 100).toFixed(1);
            console.log(`  0x${byte.toString(16).padStart(2, '0')}: ${count} times (${percent}%)`);
        });
    
    console.log(`\nStatistics:`);
    console.log(`  Unique values: ${freq.size}`);
    console.log(`  Min: ${Math.min(...data)}`);
    console.log(`  Max: ${Math.max(...data)}`);
}

function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args.includes('--help')) {
        showUsage();
        return;
    }
    
    const inputFile = args[0];
    let outputFile = args[1];
    let startOffset = null;
    let showAnalysis = false;
    let verbose = false;
    
    // Parse options
    for (let i = 1; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--offset' && i + 1 < args.length) {
            startOffset = parseInt(args[i + 1]);
            i++; // Skip next arg
        } else if (arg === '--analyze') {
            showAnalysis = true;
        } else if (arg === '--verbose') {
            verbose = true;
        } else if (!outputFile && !arg.startsWith('--')) {
            outputFile = arg;
        }
    }
    
    // Default output file
    if (!outputFile) {
        const baseName = path.basename(inputFile, path.extname(inputFile));
        outputFile = `${baseName}-decompressed.bin`;
    }
    
    try {
        // Read input file
        console.log(`Reading: ${inputFile}`);
        const inputBuffer = fs.readFileSync(inputFile);
        console.log(`Input size: ${inputBuffer.length} bytes`);
        
        // Setup decompressor
        const decompressor = new NHL94Decompressor();
        
        // Suppress verbose output unless requested
        if (!verbose) {
            const originalLog = console.log;
            console.log = function(...args) {
                const message = args.join(' ');
                if (message.includes('Command byte:') || 
                    message.includes('Literal bytes:') ||
                    message.includes('Repeat') ||
                    message.includes('Copy') ||
                    message.includes('Extended')) {
                    return; // Suppress verbose decompression logs
                }
                originalLog.apply(console, args);
            };
        }
        
        let result;
        
        if (startOffset !== null) {
            // Use specified offset
            console.log(`Decompressing from offset ${startOffset}...`);
            result = decompressor.decompress(Array.from(inputBuffer), startOffset);
        } else {
            // Auto-detect offset
            console.log('Auto-detecting compression offset...');
            const possibleOffsets = [0, 10, 12, 16, 20, 24, 32];
            let bestResult = null;
            let bestScore = 0;
            
            for (const offset of possibleOffsets) {
                if (offset >= inputBuffer.length) continue;
                
                try {
                    const testResult = decompressor.decompress(Array.from(inputBuffer), offset);
                    if (testResult && testResult.length > 0) {
                        // Score based on length and diversity
                        const freq = new Map();
                        for (const byte of testResult) {
                            freq.set(byte, (freq.get(byte) || 0) + 1);
                        }
                        const diversity = freq.size;
                        const score = testResult.length + diversity * 10;
                        
                        if (score > bestScore) {
                            bestScore = score;
                            bestResult = testResult;
                            startOffset = offset;
                        }
                    }
                } catch (error) {
                    // Skip failed offsets
                }
            }
            
            if (bestResult) {
                console.log(`Best offset found: ${startOffset}`);
                result = bestResult;
            } else {
                console.error('Failed to find valid compression data');
                return;
            }
        }
        
        // Restore console.log
        if (!verbose) {
            console.log = require('console').log;
        }
        
        if (result && result.length > 0) {
            console.log(`\nDecompression successful!`);
            console.log(`Output size: ${result.length} bytes`);
            
            // Write output file
            const outputBuffer = Buffer.from(result);
            fs.writeFileSync(outputFile, outputBuffer);
            console.log(`Saved: ${outputFile}`);
            
            // Show analysis if requested
            if (showAnalysis) {
                analyzeData(result, path.basename(outputFile));
            }
            
        } else {
            console.error('Decompression failed or produced no output');
        }
        
    } catch (error) {
        console.error(`Error: ${error.message}`);
    }
}

if (require.main === module) {
    main();
}

module.exports = { main, analyzeData };
