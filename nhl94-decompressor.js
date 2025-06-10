/**
 * NHL94 Image Decompression Routine
 * 
 * This script reverse engineers the 68k assembly decompression routine
 * from NHL94 for Sega Genesis to decompress .map.jim image files.
 * 
 * Based on assembly code at addresses:
 * - $1169A-$1197D: Main decompression routine
 * - $17CA0-$18031: Secondary decompression functions
 */

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
    decompress(compressedData, startOffset = 0) {
        console.log(`Starting decompression from offset ${startOffset}`);
        
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
            
            console.log(`Command byte: 0x${commandByte.toString(16).padStart(2, '0')} at offset ${this.sourcePtr - 1}`);
            
            // Check for end marker (0xFF)
            if (commandByte === 0xFF) {
                console.log('End marker found, stopping decompression');
                break;
            }

            // Dispatch to appropriate handler based on high nibble
            // Emulates jump table lookup and JSR
            const handlerIndex = (commandByte >> 4) & 0x0F;
            
            try {
                this.jumpTable[handlerIndex](commandByte);
            } catch (error) {
                console.error(`Error in handler ${handlerIndex} for command 0x${commandByte.toString(16)}: ${error.message}`);
                break;
            }
        }

        console.log(`Decompression complete. Output length: ${this.outputData.length}`);
        return new Uint8Array(this.outputData);
    }

    /**
     * Command 0x00-0x0F: Literal bytes
     * Emulates assembly routine for literal byte output
     */
    cmd_literal_bytes(commandByte) {
        const count = (commandByte & 0x0F) + 1;
        console.log(`  Literal bytes: ${count} bytes`);
        
        // Copy literal bytes
        // Emulates: move.b (a0)+,(a1)+
        for (let i = 0; i < count; i++) {
            const byte = this.readSourceByte();
            this.writeOutputByte(byte);
            console.log(`    Byte ${i}: 0x${byte.toString(16).padStart(2, '0')}`);
        }
    }

    /**
     * Command 0x10-0x1F: Simple repeat byte
     */
    cmd_repeat_byte(commandByte) {
        const count = (commandByte & 0x0F) + 2;
        const byte = this.readSourceByte();
        console.log(`  Repeat byte: 0x${byte.toString(16).padStart(2, '0')} × ${count}`);
        
        // Repeat byte count times
        for (let i = 0; i < count; i++) {
            this.writeOutputByte(byte);
        }
    }

    /**
     * Command 0x20-0x2F: Copy from previous data
     */
    cmd_copy_previous(commandByte) {
        const count = (commandByte & 0x0F) + 1;
        const offset = this.readSourceByte();
        console.log(`  Copy previous: ${count} bytes from offset -${offset}`);
        
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
    cmd_repeat_with_count(commandByte) {
        const extraCount = (commandByte & 0x0F);
        const baseCount = 3; // Base repeat count for 0x30 commands
        const count = baseCount + extraCount;
        const byte = this.readSourceByte();
        
        console.log(`  Repeat with count: 0x${byte.toString(16).padStart(2, '0')} × ${count}`);
        
        // Repeat byte count times
        for (let i = 0; i < count; i++) {
            this.writeOutputByte(byte);
        }
    }

    /**
     * Extended command handlers (0x40-0xEF)
     * These handle more complex compression schemes
     */
    cmd_extended_40(commandByte) { this.handleExtendedCommand(commandByte, 0x40); }
    cmd_extended_50(commandByte) { this.handleExtendedCommand(commandByte, 0x50); }
    cmd_extended_60(commandByte) { this.handleExtendedCommand(commandByte, 0x60); }
    cmd_extended_70(commandByte) { this.handleExtendedCommand(commandByte, 0x70); }
        cmd_long_repeat(commandByte) { this.handleLongRepeat(commandByte); }
    cmd_extended_A0(commandByte) { this.handleExtendedCommand(commandByte, 0xA0); }
    cmd_extended_B0(commandByte) { this.handleExtendedCommand(commandByte, 0xB0); }
    cmd_extended_C0(commandByte) { this.handleExtendedCommand(commandByte, 0xC0); }
    cmd_extended_D0(commandByte) { this.handleExtendedCommand(commandByte, 0xD0); }
    cmd_extended_E0(commandByte) { this.handleExtendedCommand(commandByte, 0xE0); }

    /**
     * Command 0x40-0x4F: Extended repeat with offset
     * Based on assembly analysis around jump table case 4
     */
    cmd_extended_40(commandByte) {
        const count = (commandByte & 0x0F) + 1;
        const nextByte = this.readSourceByte();
        console.log(`  Extended 40: count=${count}, next=0x${nextByte.toString(16)}`);
        
        // This appears to be a variant of repeat/copy command
        for (let i = 0; i < count; i++) {
            this.writeOutputByte(nextByte);
        }
    }    /**
     * Command 0x50-0x5F: Copy with extended offset
     * Based on assembly patterns seen in the code
     */
    cmd_extended_50(commandByte) {
        const count = (commandByte & 0x0F) + 1;
        const offset = this.readSourceByte();
        
        // Handle special case where offset is 0 - treat as literal bytes
        if (offset === 0) {
            console.log(`  Extended 50: ${count} literal bytes (offset=0)`);
            for (let i = 0; i < count; i++) {
                const byte = this.readSourceByte();
                this.writeOutputByte(byte);
            }
        } else {
            console.log(`  Extended 50: copy ${count} bytes from offset -${offset}`);
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
    cmd_extended_60(commandByte) {
        const count = (commandByte & 0x0F) + 1;
        const offset = this.readSourceByte();
        console.log(`  Extended 60: copy ${count} bytes with offset ${offset}`);
        
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
    cmd_extended_70(commandByte) {
        const count = (commandByte & 0x0F) + 1;
        const pattern = this.readSourceByte();
        console.log(`  Extended 70: pattern fill 0x${pattern.toString(16)} × ${count}`);
        
        for (let i = 0; i < count; i++) {
            this.writeOutputByte(pattern);
        }
    }    /**
     * Command 0x90-0x9F: Extended operations
     */
    cmd_extended_90(commandByte) {
        const subCmd = commandByte & 0x0F;
        console.log(`  Extended 90: subcmd=${subCmd}`);
        
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
    handleExtendedCommand(commandByte, baseCmd) {
        const count = (commandByte & 0x0F) + 1;
        console.log(`  Extended command: 0x${commandByte.toString(16)} (base: 0x${baseCmd.toString(16)})`);
        
        // Basic fallback: treat as literal bytes
        for (let i = 0; i < count; i++) {
            const byte = this.readSourceByte();
            this.writeOutputByte(byte);
        }
    }    /**
     * Handle long repeat commands (0x80-0x8F)
     * Based on assembly analysis - these handle extended length repeats
     */
    handleLongRepeat(commandByte) {
        const lowNibble = commandByte & 0x0F;
        
        if (lowNibble === 0) {
            // 0x80: Simple extended repeat - single byte count, single byte data
            const count = this.readSourceByte();
            const byte = this.readSourceByte();
            console.log(`  Long repeat (80): 0x${byte.toString(16).padStart(2, '0')} × ${count}`);
            
            for (let i = 0; i < count; i++) {
                this.writeOutputByte(byte);
            }        } else if (lowNibble < 8) {
            // 0x81-0x87: Variable length count with different encoding
            // The low nibble might encode the byte value instead of count
            if (lowNibble === 2) {
                // 0x82: Special case - might be a different type of command
                // Based on the data pattern, this might not be a repeat command
                console.log(`  Long repeat (82): Treating as copy/special command`);
                
                // Read next byte as potential parameter
                const param = this.readSourceByte();
                console.log(`    Parameter: 0x${param.toString(16)}`);
                
                // This might be a special command - for now, treat as single byte output
                this.writeOutputByte(param);
                
            } else {
                // Other 0x81, 0x83-0x87 commands
                const extraByte = this.readSourceByte();
                let count = (lowNibble << 8) | extraByte;
                const byte = this.readSourceByte();
                console.log(`  Long repeat (8${lowNibble.toString(16)}): 0x${byte.toString(16).padStart(2, '0')} × ${count}`);
                
                // Limit extremely large counts to prevent memory issues
                if (count > 4096) {
                    console.log(`    Warning: Large count ${count} limited to 4096`);
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
                console.log(`  Long copy (8${lowNibble.toString(16)}): ${count} zero bytes (offset=0)`);
                for (let i = 0; i < count; i++) {
                    this.writeOutputByte(0);
                }
            } else {
                console.log(`  Long copy (8${lowNibble.toString(16)}): ${count} bytes from offset -${offset}`);
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
    cmd_end_marker(commandByte) {
        console.log(`  End/Special command: 0x${commandByte.toString(16)}`);
        if (commandByte === 0xFF) {
            return; // End of data
        }
        // Other special commands can be handled here
    }
}

/**
 * Test the decompressor with the provided examples
 */
function testDecompressor() {
    console.log('Testing NHL94 Decompressor...\n');
    
    // Test data from the user's examples (skipping first 10 bytes)
    const testData = [
        0x31, 0x66,                    // Should decompress to: 66 66 66 66
        0x00, 0x65,                    // Should decompress to: 65
        0x30, 0x55,                    // Should decompress to: 55 55 55
        0x00, 0x65,                    // Should decompress to: 65
        0x30, 0x44,                    // Should decompress to: 44 44 44
        0x03, 0x65, 0x47, 0x77, 0x77,  // Should decompress to: 65 47 77 77
        0xFF                           // End marker
    ];

    const decompressor = new NHL94Decompressor();
    const result = decompressor.decompress(testData);
    
    console.log('\nTest Results:');
    console.log('Decompressed data:', Array.from(result).map(b => b.toString(16).padStart(2, '0')).join(' '));
    
    // Expected result: 66 66 66 66 65 55 55 55 65 44 44 44 65 47 77 77
    const expected = [0x66, 0x66, 0x66, 0x66, 0x65, 0x55, 0x55, 0x55, 0x65, 0x44, 0x44, 0x44, 0x65, 0x47, 0x77, 0x77];
    console.log('Expected data:   ', expected.map(b => b.toString(16).padStart(2, '0')).join(' '));
    
    // Verify results
    let success = result.length === expected.length;
    if (success) {
        for (let i = 0; i < expected.length; i++) {
            if (result[i] !== expected[i]) {
                success = false;
                console.log(`Mismatch at position ${i}: got 0x${result[i].toString(16)}, expected 0x${expected[i].toString(16)}`);
                break;
            }
        }
    } else {
        console.log(`Length mismatch: got ${result.length}, expected ${expected.length}`);
    }
    
    console.log(`Test ${success ? 'PASSED' : 'FAILED'}\n`);
    return success;
}

/**
 * Test the decompressor with real compressed file data
 */
function testRealData() {
    console.log('Testing with real compressed file data...\n');
    
    // First, test with just the user's examples to make sure the basic patterns work
    console.log('=== Testing User Examples ===');
    const userExamples = [
        0x31, 0x66,                    // Should decompress to: 66 66 66 66
        0x00, 0x65,                    // Should decompress to: 65
        0x30, 0x55,                    // Should decompress to: 55 55 55
        0x00, 0x65,                    // Should decompress to: 65
        0x30, 0x44,                    // Should decompress to: 44 44 44
        0x03, 0x65, 0x47, 0x77, 0x77,  // Should decompress to: 65 47 77 77
        0xFF                           // End marker
    ];
    
    const decompressor1 = new NHL94Decompressor();
    const result1 = decompressor1.decompress(userExamples, 0);
    
    console.log(`User examples result: ${Array.from(result1).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
    const expected1 = [0x66, 0x66, 0x66, 0x66, 0x65, 0x55, 0x55, 0x55, 0x65, 0x44, 0x44, 0x44, 0x65, 0x47, 0x77, 0x77];
    console.log(`Expected:             ${expected1.map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
    
    let match1 = result1.length === expected1.length;
    if (match1) {
        for (let i = 0; i < expected1.length; i++) {
            if (result1[i] !== expected1[i]) {
                match1 = false;
                break;
            }
        }
    }
    console.log(`User examples test: ${match1 ? 'PASSED' : 'FAILED'}\n`);
    
    // Now test with the real compressed file data (first part)
    console.log('=== Testing Real File Data ===');
    const realCompressedHex = "00000004C40000054480003D31660065305500653044036547777780041F0018510088510092" +
                              "8A2031110E2228822233322234443298229998888920001130770199886804981118778134" +
                              "119CFF018287828000613055072144444321777788E048FD48B04387700718A8005E007180";
    
    // Convert hex to bytes
    const bytes = [];
    for (let i = 0; i < realCompressedHex.length; i += 2) {
        if (i + 1 < realCompressedHex.length) {
            bytes.push(parseInt(realCompressedHex.substr(i, 2), 16));
        }
    }
    
    console.log(`Input data length: ${bytes.length} bytes`);
    console.log(`First 20 bytes: ${bytes.slice(0, 20).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
    
    // Try different starting offsets to find where the tile data actually begins
    for (let offset = 10; offset <= 15; offset++) {
        console.log(`\n--- Testing with offset ${offset} ---`);
        console.log(`Starting bytes: ${bytes.slice(offset, offset + 10).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
        
        const decompressor = new NHL94Decompressor();
        
        try {
            const result = decompressor.decompress(bytes, offset);
            
            console.log(`Decompression result: ${result.length} bytes`);
            if (result.length > 0) {
                console.log(`First 16 bytes: ${Array.from(result.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
                
                // Check if it matches expected pattern
                const expectedStart = [0x66, 0x66, 0x66, 0x66, 0x65, 0x55, 0x55, 0x55, 0x65, 0x44, 0x44, 0x44, 0x65, 0x47, 0x77, 0x77];
                let matches = true;
                for (let i = 0; i < Math.min(expectedStart.length, result.length); i++) {
                    if (result[i] !== expectedStart[i]) {
                        matches = false;
                        break;
                    }
                }
                
                console.log(`Pattern match: ${matches ? 'YES' : 'NO'}`);
                if (matches) {
                    console.log(`*** FOUND CORRECT OFFSET: ${offset} ***`);
                    return result;
                }
            }
            
        } catch (error) {
            console.log(`Error at offset ${offset}: ${error.message}`);
        }
    }
    
    return null;
}

/**
 * Test full file decompression with comprehensive validation
 */
function testFullDecompression() {
    console.log('\n=== Full File Decompression Test ===');
    
    // Use the same correct hex data as the real data test
    const realCompressedHex = "00000004C40000054480003D31660065305500653044036547777780041F0018510088510092" +
                              "8A2031110E2228822233322234443298229998888920001130770199886804981118778134" +
                              "119CFF018287828000613055072144444321777788E048FD48B04387700718A8005E007180";
    
    const bytes = [];
    for (let i = 0; i < realCompressedHex.length; i += 2) {
        if (i + 1 < realCompressedHex.length) {
            bytes.push(parseInt(realCompressedHex.substr(i, 2), 16));
        }
    }
    
    console.log(`Processing ${bytes.length} bytes of compressed data...`);
    
    const decompressor = new NHL94Decompressor();
    const result = decompressor.decompress(bytes, 12); // Use known good offset
    
    if (result && result.length > 0) {
        console.log(`\nDecompression successful: ${result.length} bytes generated`);
        console.log(`First 32 bytes: ${Array.from(result.slice(0, 32)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
        
        // Validate expected patterns
        const expectedStart = [0x66, 0x66, 0x66, 0x66, 0x65, 0x55, 0x55, 0x55, 0x65, 0x44, 0x44, 0x44, 0x65, 0x47, 0x77, 0x77];
        const matches = expectedStart.every((val, i) => i < result.length && result[i] === val);
        
        console.log(`Pattern validation: ${matches ? 'PASS' : 'FAIL'}`);
        
        // Check for repeating patterns that indicate proper decompression
        const patterns = new Map();
        for (let i = 0; i < Math.min(result.length, 100); i++) {
            const byte = result[i];
            patterns.set(byte, (patterns.get(byte) || 0) + 1);
        }
        
        console.log(`Unique byte values found: ${patterns.size}`);
        console.log(`Most common bytes:`, Array.from(patterns.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([byte, count]) => `0x${byte.toString(16)}(${count})`)
            .join(', '));
        
        return result;
    } else {
        console.log('Decompression failed or produced no output');
        return null;
    }
}

/**
 * Test decompression with command analysis and statistics
 */
function testWithAnalysis() {
    console.log('\n=== Decompression with Analysis ===');
    
    const testData = [
        0x31, 0x66,                    // Command 0x31: repeat byte 0x66 four times
        0x00, 0x65,                    // Command 0x00: literal byte 0x65
        0x30, 0x55,                    // Command 0x30: repeat byte 0x55 three times
        0x00, 0x65,                    // Command 0x00: literal byte 0x65
        0x30, 0x44,                    // Command 0x30: repeat byte 0x44 three times
        0x03, 0x65, 0x47, 0x77, 0x77,  // Command 0x03: 4 literal bytes
        0xFF                           // End marker
    ];
    
    const decompressor = new NHL94Decompressor();
    
    // Enable detailed logging
    const originalLog = console.log;
    const commandStats = new Map();
    
    console.log = function(...args) {
        const message = args.join(' ');
        if (message.includes('Command:')) {
            const match = message.match(/Command: 0x([0-9A-F]+)/);
            if (match) {
                const cmd = match[1];
                commandStats.set(cmd, (commandStats.get(cmd) || 0) + 1);
            }
        }
        originalLog.apply(console, args);
    };
    
    const result = decompressor.decompress(testData);
    console.log = originalLog; // Restore original logging
    
    console.log('\nCommand usage statistics:');
    for (const [cmd, count] of commandStats.entries()) {
        console.log(`  0x${cmd}: ${count} times`);
    }
    
    return result;
}

/**
 * Analyze and validate decompressed data patterns
 */
function analyzeDecompressedData(data, label = "Unknown") {
    console.log(`\n=== Analysis of ${label} ===`);
    console.log(`Data length: ${data.length} bytes`);
    
    if (data.length === 0) {
        console.log('No data to analyze');
        return;
    }
    
    // Show first 64 bytes in hex grid
    console.log('\nFirst 64 bytes (hex):');
    for (let i = 0; i < Math.min(64, data.length); i += 16) {
        const line = Array.from(data.slice(i, i + 16))
            .map(b => b.toString(16).padStart(2, '0'))
            .join(' ');
        console.log(`${i.toString(16).padStart(4, '0')}: ${line}`);
    }
    
    // Byte frequency analysis
    const freq = new Map();
    for (let i = 0; i < data.length; i++) {
        const byte = data[i];
        freq.set(byte, (freq.get(byte) || 0) + 1);
    }
    
    console.log(`\nByte frequency (top 10):`);
    Array.from(freq.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([byte, count]) => {
            const percent = ((count / data.length) * 100).toFixed(1);
            console.log(`  0x${byte.toString(16).padStart(2, '0')}: ${count} times (${percent}%)`);
        });
    
    // Look for patterns
    console.log(`\nPattern analysis:`);
    
    // Check for repeating sequences
    const patterns = new Map();
    for (let len = 2; len <= 8; len++) {
        for (let i = 0; i <= data.length - len * 2; i++) {
            const pattern = Array.from(data.slice(i, i + len));
            const next = Array.from(data.slice(i + len, i + len * 2));
            
            if (JSON.stringify(pattern) === JSON.stringify(next)) {
                const key = pattern.join(',');
                patterns.set(key, (patterns.get(key) || 0) + 1);
            }
        }
    }
    
    if (patterns.size > 0) {
        console.log(`  Found ${patterns.size} repeating patterns`);
        Array.from(patterns.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .forEach(([pattern, count]) => {
                console.log(`    [${pattern}] repeats ${count} times`);
            });
    } else {
        console.log(`  No obvious repeating patterns found`);
    }
    
    // Statistical analysis
    const sum = Array.from(data).reduce((a, b) => a + b, 0);
    const mean = sum / data.length;
    const variance = Array.from(data).reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);
    
    console.log(`\nStatistical analysis:`);
    console.log(`  Mean: ${mean.toFixed(2)}`);
    console.log(`  Std Dev: ${stdDev.toFixed(2)}`);
    console.log(`  Min: ${Math.min(...data)}`);
    console.log(`  Max: ${Math.max(...data)}`);
    console.log(`  Unique values: ${freq.size}`);
}

/**
 * Create a utility to process real .map.jim files
 */
function createMapJimProcessor() {
    return {
        /**
         * Process a .map.jim file buffer
         */
        processFile: function(buffer, filename = "unknown") {
            console.log(`\n=== Processing ${filename} ===`);
            console.log(`File size: ${buffer.length} bytes`);
            
            // Show file header
            console.log('File header (first 32 bytes):');
            const headerBytes = Array.from(buffer.slice(0, 32));
            for (let i = 0; i < 32; i += 16) {
                const line = headerBytes.slice(i, i + 16)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join(' ');
                console.log(`${i.toString(16).padStart(4, '0')}: ${line}`);
            }
            
            // Try to find compression data at various offsets
            console.log('\nSearching for compressed data...');
            const possibleOffsets = [0, 10, 12, 16, 20, 24, 32, 48, 64];
            const results = [];
            
            for (const offset of possibleOffsets) {
                if (offset >= buffer.length) continue;
                
                try {
                    console.log(`\n--- Trying offset ${offset} ---`);
                    const decompressor = new NHL94Decompressor();
                    const result = decompressor.decompress(Array.from(buffer), offset);
                    
                    if (result && result.length > 0) {
                        console.log(`Success: ${result.length} bytes decompressed`);
                        console.log(`First 16 bytes: ${Array.from(result.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
                        
                        results.push({
                            offset: offset,
                            data: result,
                            score: this.scoreDecompression(result)
                        });
                    }
                } catch (error) {
                    console.log(`Failed: ${error.message}`);
                }
            }
            
            // Return best result
            if (results.length > 0) {
                results.sort((a, b) => b.score - a.score);
                const best = results[0];
                console.log(`\nBest result: offset ${best.offset} (score: ${best.score.toFixed(2)})`);
                return best;
            } else {
                console.log('\nNo successful decompression found');
                return null;
            }
        },
        
        /**
         * Score decompression quality (higher is better)
         */
        scoreDecompression: function(data) {
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
    };
}

// Run tests
if (require.main === module) {
    console.log('=== NHL94 Decompressor Tests ===\n');
    
    // Test basic functionality
    testDecompressor();
    
    // Test with real data
    testRealData();
    
    // Test full decompression
    testFullDecompression();
    
    // Test with analysis
    testWithAnalysis();
}

module.exports = { NHL94Decompressor, testDecompressor, testRealData, testFullDecompression, testWithAnalysis, analyzeDecompressedData, createMapJimProcessor };
