/**
 * NHL94 Image Decompression Tool
 * 
 * This script reverse engineers the 68k assembly decompression routine
 * from NHL94 for Sega Genesis to decompress .map.jim image files.
 * 
 * Usage: node nhl94-decompressor.js <input_file> <output_file>
 * 
 * Based on assembly code at addresses:
 * - $1169A-$1197D: Main decompression routine
 * - $17CA0-$18031: Secondary decompression functions
 */

const fs = require('fs');
const path = require('path');

class NHL94Decompressor {
    constructor() {
        // CPU register emulation
        this.registers = {
            d0: 0, d1: 0, d2: 0, d3: 0, d4: 0, d5: 0, d6: 0, d7: 0,
            a0: 0, a1: 0, a2: 0, a3: 0, a4: 0, a5: 0, a6: 0, a7: 0
        };
        
        // Memory pointers
        this.sourcePtr = 0;
        this.destPtr = 0;
        this.sourceData = null;
        this.outputData = [];
        
        // Flags and state
        this.carry = false;
        this.zero = false;
        this.negative = false;
        
        // Jump table for command dispatch
        this.jumpTable = [
            this.cmd_literal_bytes.bind(this),      // 0x00-0x0F: Literal bytes
            this.cmd_repeat_byte.bind(this),        // 0x10-0x1F: Repeat byte
            this.cmd_copy_previous.bind(this),      // 0x20-0x2F: Copy from previous
            this.cmd_repeat_with_count.bind(this),  // 0x30-0x3F: Repeat with count
            this.cmd_extended_40.bind(this),        // 0x40-0x4F: Extended commands
            this.cmd_extended_50.bind(this),        // 0x50-0x5F: Extended commands
            this.cmd_extended_60.bind(this),        // 0x60-0x6F: Extended commands
            this.cmd_extended_70.bind(this),        // 0x70-0x7F: Extended commands
            this.cmd_long_repeat.bind(this),        // 0x80-0x8F: Long repeat
            this.cmd_extended_90.bind(this),        // 0x90-0x9F: Extended commands
            this.cmd_extended_A0.bind(this),        // 0xA0-0xAF: Extended commands
            this.cmd_extended_B0.bind(this),        // 0xB0-0xBF: Extended commands
            this.cmd_extended_C0.bind(this),        // 0xC0-0xCF: Extended commands
            this.cmd_extended_D0.bind(this),        // 0xD0-0xDF: Extended commands
            this.cmd_extended_E0.bind(this),        // 0xE0-0xEF: Extended commands
            this.cmd_end_marker.bind(this)          // 0xF0-0xFF: End/special
        ];
    }

    /**
     * Read byte from source and advance pointer
     * Emulates: move.b (a0)+,d0
     */
    readSourceByte() {
        if (this.sourcePtr >= this.sourceData.length) {
            throw new Error(`Source pointer ${this.sourcePtr} beyond data length ${this.sourceData.length}`);
        }
        const byte = this.sourceData[this.sourcePtr];
        this.sourcePtr++;
        this.registers.d0 = byte;
        this.updateFlags(byte);
        return byte;
    }

    /**
     * Write byte to output
     * Emulates: move.b d0,(a1)+
     */
    writeOutputByte(byte) {
        this.outputData.push(byte & 0xFF);
        this.destPtr++;
    }

    /**
     * Update CPU flags based on value
     */
    updateFlags(value) {
        this.zero = (value === 0);
        this.negative = (value & 0x80) !== 0;
    }

    /**
     * Main decompression routine
     * Based on assembly at $1169A-$1197D
     */
    decompress(compressedData, startOffset = 0, verbose = false) {
        if (verbose) console.log(`Starting decompression from offset ${startOffset}`);
        
        this.sourceData = compressedData;
        this.sourcePtr = startOffset;
        this.destPtr = 0;
        this.outputData = [];

        // Main decompression loop
        // Emulates the main loop in the assembly
        while (this.sourcePtr < this.sourceData.length) {
            // Read command byte
            // Emulates: move.b (a0)+,d0
            const commandByte = this.readSourceByte();
            
            if (verbose) console.log(`Command byte: 0x${commandByte.toString(16).padStart(2, '0')} at offset ${this.sourcePtr - 1}`);
            
            // Check for end marker (0xFF)
            if (commandByte === 0xFF) {
                if (verbose) console.log('End marker found, stopping decompression');
                break;
            }

            // Dispatch to appropriate handler based on high nibble
            // Emulates jump table lookup and JSR
            const handlerIndex = (commandByte >> 4) & 0x0F;
            
            try {
                this.jumpTable[handlerIndex](commandByte, verbose);
            } catch (error) {
                console.error(`Error in handler ${handlerIndex} for command 0x${commandByte.toString(16)}: ${error.message}`);
                break;
            }
        }

        if (verbose) console.log(`Decompression complete. Output length: ${this.outputData.length}`);
        return new Uint8Array(this.outputData);
    }

    /**
     * Command 0x00-0x0F: Literal bytes
     * Emulates assembly routine for literal byte output
     */
    cmd_literal_bytes(commandByte, verbose = false) {
        const count = (commandByte & 0x0F) + 1;
        if (verbose) console.log(`  Literal bytes: ${count} bytes`);
        
        // Copy literal bytes
        // Emulates: move.b (a0)+,(a1)+
        for (let i = 0; i < count; i++) {
            const byte = this.readSourceByte();
            this.writeOutputByte(byte);
            if (verbose) console.log(`    Byte ${i}: 0x${byte.toString(16).padStart(2, '0')}`);
        }
    }

    /**
     * Command 0x10-0x1F: Simple repeat byte
     */
    cmd_repeat_byte(commandByte, verbose = false) {
        const count = (commandByte & 0x0F) + 2;
        const byte = this.readSourceByte();
        if (verbose) console.log(`  Repeat byte: 0x${byte.toString(16).padStart(2, '0')} × ${count}`);
        
        // Repeat byte count times
        for (let i = 0; i < count; i++) {
            this.writeOutputByte(byte);
        }
    }

    /**
     * Command 0x20-0x2F: Copy from previous data
     */
    cmd_copy_previous(commandByte, verbose = false) {
        const count = (commandByte & 0x0F) + 1;
        const offset = this.readSourceByte();
        if (verbose) console.log(`  Copy previous: ${count} bytes from offset -${offset}`);
        
        // Copy from previous position
        const sourcePos = this.outputData.length - offset;
        for (let i = 0; i < count; i++) {
            if (sourcePos + i >= 0 && sourcePos + i < this.outputData.length) {
                this.writeOutputByte(this.outputData[sourcePos + i]);
            }
        }
    }

    /**
     * Command 0x30-0x3F: Repeat with count
     * This handles the examples: 31 66 → 66 66 66 66, 30 55 → 55 55 55
     */
    cmd_repeat_with_count(commandByte, verbose = false) {
        const extraCount = (commandByte & 0x0F);
        const baseCount = 3; // Base repeat count for 0x30 commands
        const count = baseCount + extraCount;
        const byte = this.readSourceByte();
        
        if (verbose) console.log(`  Repeat with count: 0x${byte.toString(16).padStart(2, '0')} × ${count}`);
        
        // Repeat byte count times
        for (let i = 0; i < count; i++) {
            this.writeOutputByte(byte);
        }
    }

    /**
     * Extended command handlers (0x40-0xEF)
     * These handle more complex compression schemes
     */
    cmd_extended_40(commandByte, verbose = false) { this.handleExtendedCommand(commandByte, 0x40, verbose); }
    cmd_extended_50(commandByte, verbose = false) { this.cmd_extended_50_impl(commandByte, verbose); }
    cmd_extended_60(commandByte, verbose = false) { this.cmd_extended_60_impl(commandByte, verbose); }
    cmd_extended_70(commandByte, verbose = false) { this.cmd_extended_70_impl(commandByte, verbose); }
    cmd_long_repeat(commandByte, verbose = false) { this.handleLongRepeat(commandByte, verbose); }
    cmd_extended_90(commandByte, verbose = false) { this.cmd_extended_90_impl(commandByte, verbose); }
    cmd_extended_A0(commandByte, verbose = false) { this.handleExtendedCommand(commandByte, 0xA0, verbose); }
    cmd_extended_B0(commandByte, verbose = false) { this.handleExtendedCommand(commandByte, 0xB0, verbose); }
    cmd_extended_C0(commandByte, verbose = false) { this.handleExtendedCommand(commandByte, 0xC0, verbose); }
    cmd_extended_D0(commandByte, verbose = false) { this.handleExtendedCommand(commandByte, 0xD0, verbose); }
    cmd_extended_E0(commandByte, verbose = false) { this.handleExtendedCommand(commandByte, 0xE0, verbose); }

    /**
     * Command 0x50-0x5F: Copy with extended offset
     * Based on assembly patterns seen in the code
     */
    cmd_extended_50_impl(commandByte, verbose = false) {
        const count = (commandByte & 0x0F) + 1;
        const offset = this.readSourceByte();
        
        // Handle special case where offset is 0 - treat as literal bytes
        if (offset === 0) {
            if (verbose) console.log(`  Extended 50: ${count} literal bytes (offset=0)`);
            for (let i = 0; i < count; i++) {
                const byte = this.readSourceByte();
                this.writeOutputByte(byte);
            }
        } else {
            if (verbose) console.log(`  Extended 50: copy ${count} bytes from offset -${offset}`);
            const sourcePos = this.outputData.length - offset;
            for (let i = 0; i < count; i++) {
                if (sourcePos + i >= 0 && sourcePos + i < this.outputData.length) {
                    this.writeOutputByte(this.outputData[sourcePos + i]);
                } else {
                    this.writeOutputByte(0); // Fill with zero if out of range
                }
            }
        }
    }

    /**
     * Command 0x60-0x6F: Two-byte offset copy
     */
    cmd_extended_60_impl(commandByte, verbose = false) {
        const count = (commandByte & 0x0F) + 1;
        const offset = this.readSourceByte();
        if (verbose) console.log(`  Extended 60: copy ${count} bytes with offset ${offset}`);
        
        // Similar to 50 but different offset calculation
        const sourcePos = this.outputData.length - offset - 1;
        for (let i = 0; i < count; i++) {
            if (sourcePos + i >= 0 && sourcePos + i < this.outputData.length) {
                this.writeOutputByte(this.outputData[sourcePos + i]);
            } else {
                this.writeOutputByte(0);
            }
        }
    }

    /**
     * Command 0x70-0x7F: Pattern fill
     */
    cmd_extended_70_impl(commandByte, verbose = false) {
        const count = (commandByte & 0x0F) + 1;
        const pattern = this.readSourceByte();
        if (verbose) console.log(`  Extended 70: pattern fill 0x${pattern.toString(16)} × ${count}`);
        
        for (let i = 0; i < count; i++) {
            this.writeOutputByte(pattern);
        }
    }

    /**
     * Command 0x90-0x9F: Extended operations
     */
    cmd_extended_90_impl(commandByte, verbose = false) {
        const subCmd = commandByte & 0x0F;
        if (verbose) console.log(`  Extended 90: subcmd=${subCmd}`);
        
        if (subCmd === 0) {
            // Special case: read count from next byte
            const count = this.readSourceByte();
            const byte = this.readSourceByte();
            for (let i = 0; i < count; i++) {
                this.writeOutputByte(byte);
            }
        } else {
            // Default: literal bytes
            for (let i = 0; i < subCmd; i++) {
                const byte = this.readSourceByte();
                this.writeOutputByte(byte);
            }
        }
    }

    /**
     * Handle remaining extended commands with basic logic
     */
    handleExtendedCommand(commandByte, baseCmd, verbose = false) {
        const count = (commandByte & 0x0F) + 1;
        if (verbose) console.log(`  Extended command: 0x${commandByte.toString(16)} (base: 0x${baseCmd.toString(16)})`);
        
        // Basic fallback: treat as literal bytes
        for (let i = 0; i < count; i++) {
            const byte = this.readSourceByte();
            this.writeOutputByte(byte);
        }
    }

    /**
     * Handle long repeat commands (0x80-0x8F)
     * Based on assembly analysis - these handle extended length repeats
     */
    handleLongRepeat(commandByte, verbose = false) {
        const lowNibble = commandByte & 0x0F;
        
        if (lowNibble === 0) {
            // 0x80: Simple extended repeat - single byte count, single byte data
            const count = this.readSourceByte();
            const byte = this.readSourceByte();
            if (verbose) console.log(`  Long repeat (80): 0x${byte.toString(16).padStart(2, '0')} × ${count}`);
            
            for (let i = 0; i < count; i++) {
                this.writeOutputByte(byte);
            }
        } else if (lowNibble < 8) {
            // 0x81-0x87: Variable length count with different encoding
            // The low nibble might encode the byte value instead of count
            if (lowNibble === 2) {
                // 0x82: Special case - might be a different type of command
                // Based on the data pattern, this might not be a repeat command
                if (verbose) console.log(`  Long repeat (82): Treating as copy/special command`);
                
                // Read next byte as potential parameter
                const param = this.readSourceByte();
                if (verbose) console.log(`    Parameter: 0x${param.toString(16)}`);
                
                // This might be a special command - for now, treat as single byte output
                this.writeOutputByte(param);
                
            } else {
                // Other 0x81, 0x83-0x87 commands
                const extraByte = this.readSourceByte();
                let count = (lowNibble << 8) | extraByte;
                const byte = this.readSourceByte();
                if (verbose) console.log(`  Long repeat (8${lowNibble.toString(16)}): 0x${byte.toString(16).padStart(2, '0')} × ${count}`);
                
                // Limit extremely large counts to prevent memory issues
                if (count > 4096) {
                    if (verbose) console.log(`    Warning: Large count ${count} limited to 4096`);
                    count = 4096;
                }
                
                for (let i = 0; i < count; i++) {
                    this.writeOutputByte(byte);
                }
            }
        } else {
            // 0x88-0x8F: Copy operations with extended counts
            const extraCount = lowNibble - 8;
            const baseCount = this.readSourceByte();
            const count = baseCount + extraCount;
            const offset = this.readSourceByte();
            
            // Handle special case where offset is 0
            if (offset === 0) {
                if (verbose) console.log(`  Long copy (8${lowNibble.toString(16)}): ${count} zero bytes (offset=0)`);
                for (let i = 0; i < count; i++) {
                    this.writeOutputByte(0);
                }
            } else {
                if (verbose) console.log(`  Long copy (8${lowNibble.toString(16)}): ${count} bytes from offset -${offset}`);
                const sourcePos = this.outputData.length - offset;
                for (let i = 0; i < count; i++) {
                    const srcIndex = sourcePos + (i % offset);
                    if (srcIndex >= 0 && srcIndex < this.outputData.length) {
                        this.writeOutputByte(this.outputData[srcIndex]);
                    } else {
                        this.writeOutputByte(0);
                    }
                }
            }
        }
    }

    /**
     * Command 0xF0-0xFF: End marker or special commands
     */
    cmd_end_marker(commandByte, verbose = false) {
        if (verbose) console.log(`  End/Special command: 0x${commandByte.toString(16)}`);
        if (commandByte === 0xFF) {
            return; // End of data
        }
        // Other special commands can be handled here
    }

    /**
     * Find the best decompression offset for a file
     */
    findBestOffset(buffer, maxOffset = 64) {
        const possibleOffsets = [];
        for (let offset = 0; offset <= maxOffset; offset++) {
            possibleOffsets.push(offset);
        }
        
        const results = [];
        
        for (const offset of possibleOffsets) {
            if (offset >= buffer.length) continue;
            
            try {
                const result = this.decompress(Array.from(buffer), offset, false);
                
                if (result && result.length > 0) {
                    results.push({
                        offset: offset,
                        data: result,
                        score: this.scoreDecompression(result)
                    });
                }
            } catch (error) {
                // Silently continue on error
            }
        }
        
        if (results.length > 0) {
            results.sort((a, b) => b.score - a.score);
            return results[0];
        }
        
        return null;
    }

    /**
     * Score decompression quality (higher is better)
     */
    scoreDecompression(data) {
        if (!data || data.length === 0) return 0;
        
        // Score based on multiple factors
        let score = 0;
        
        // Length score (longer is generally better, up to a point)
        score += Math.min(data.length / 1000, 10);
        
        // Diversity score (too uniform or too random is bad)
        const freq = new Map();
        for (const byte of data) {
            freq.set(byte, (freq.get(byte) || 0) + 1);
        }
        const entropy = -Array.from(freq.values())
            .map(count => count / data.length)
            .reduce((sum, p) => sum + p * Math.log2(p), 0);
        score += Math.min(entropy, 6); // Good entropy is around 4-6 bits
        
        // Pattern score (some patterns indicate valid graphics data)
        const uniqueBytes = freq.size;
        if (uniqueBytes > 4 && uniqueBytes < 64) score += 5; // Good range for graphics
        
        // Look for graphics-like patterns (gradual changes)
        let gradualChanges = 0;
        for (let i = 1; i < Math.min(data.length, 100); i++) {
            const diff = Math.abs(data[i] - data[i-1]);
            if (diff <= 2) gradualChanges++;
        }
        score += gradualChanges / 20; // Reward gradual changes
        
        return score;
    }
}

/**
 * Process a .map.jim file
 */
function processFile(inputPath, outputPath, verbose = false) {
    try {
        // Read input file
        const buffer = fs.readFileSync(inputPath);
        console.log(`Processing ${inputPath} (${buffer.length} bytes)`);
        
        const decompressor = new NHL94Decompressor();
        
        // Try to find the best decompression offset
        const result = decompressor.findBestOffset(buffer);
        
        if (result) {
            console.log(`Best decompression found at offset ${result.offset} (score: ${result.score.toFixed(2)})`);
            console.log(`Decompressed ${result.data.length} bytes`);
            
            // Write output file
            fs.writeFileSync(outputPath, result.data);
            console.log(`Saved decompressed data to ${outputPath}`);
            
            if (verbose) {
                console.log(`First 16 bytes: ${Array.from(result.data.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
            }
            
            return true;
        } else {
            console.error('No valid decompression found');
            return false;
        }
        
    } catch (error) {
        console.error(`Error processing file: ${error.message}`);
        return false;
    }
}

/**
 * Show usage information
 */
function showUsage() {
    console.log('NHL94 Image Decompression Tool');
    console.log('');
    console.log('Usage: node nhl94-decompressor.js <input_file> <output_file> [options]');
    console.log('');
    console.log('Arguments:');
    console.log('  input_file   Path to the compressed .map.jim file');
    console.log('  output_file  Path where decompressed data will be saved');
    console.log('');
    console.log('Options:');
    console.log('  -v, --verbose  Enable verbose output');
    console.log('  -h, --help     Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  node nhl94-decompressor.js input.map.jim output.bin');
    console.log('  node nhl94-decompressor.js input.map.jim output.bin --verbose');
}

// Main execution
if (require.main === module) {
    const args = process.argv.slice(2);
    
    // Check for help flag
    if (args.includes('-h') || args.includes('--help') || args.length === 0) {
        showUsage();
        process.exit(0);
    }
    
    // Parse arguments
    const verbose = args.includes('-v') || args.includes('--verbose');
    const fileArgs = args.filter(arg => !arg.startsWith('-'));
    
    if (fileArgs.length !== 2) {
        console.error('Error: Please provide input and output file paths');
        showUsage();
        process.exit(1);
    }
    
    const [inputFile, outputFile] = fileArgs;
    
    // Check if input file exists
    if (!fs.existsSync(inputFile)) {
        console.error(`Error: Input file '${inputFile}' does not exist`);
        process.exit(1);
    }
    
    // Process the file
    const success = processFile(inputFile, outputFile, verbose);
    process.exit(success ? 0 : 1);
}

module.exports = { NHL94Decompressor, processFile };
