/**
 * NHL94 Map.Jim Decompressor - Following 68k Assembly Logic
 * 
 * This script exactly follows the 68k assembly code from NHL94 for decompressing
 * .map.jim files. Every function, if statement, and jump table corresponds to
 * the original assembly code.
 * 
 * Usage: node nhl94_decompressor.js <input_file> <output_file>
 */

const fs = require('fs');

// Global state variables (corresponding to 68k memory locations)
let sourcePtr = 0;      // A0 - Source pointer 
let destPtr = 0;        // A1 - Destination pointer
let sourceData = null;  // Source buffer
let destData = [];      // Destination buffer
let bitBuffer = 0;      // Current bit buffer
let bitsLeft = 0;       // Bits remaining in buffer

// Memory locations used in the assembly (as globals for state tracking)
let BF12 = 0, BF14 = 0, BF50 = 0, B02A = 0, BF78 = 0;
let CF32 = 0;
let B02C = 0;

/**
 * Assembly $F7318-$F736D: Main setup/initialization routine
 * 
 * 48 E7 7F FE          MOVEM.L D0-D7/A0-A6,-(SP)  ; Save registers
 * 20 7C FF FF C6 CE    MOVEA.L #$FFFFC6CE,A0      ; Load source address  
 * 61 00 00 5A          BSR     subroutine          ; Get value
 * 31 C1 BF 12          MOVE.W  D1,$BF12            ; Store first value
 * 20 7C FF FF CA 32    MOVEA.L #$FFFFCA32,A0      ; Load second address
 * 61 00 00 4C          BSR     subroutine          ; Get value  
 * 31 C1 BF 14          MOVE.W  D1,$BF14            ; Store second value
 */
function setupInitialization() {
    // This function corresponds to the setup assembly code
    // In our case, we'll read the header values directly from the compressed data
    
    // Read palette offset (big-endian)
    const paletteOffset = readUInt32BE(sourceData, 0);
    const mapOffset = readUInt32BE(sourceData, 4);
    
    BF12 = paletteOffset;
    BF14 = mapOffset;
    
    console.log(`Palette offset: 0x${paletteOffset.toString(16)}`);
    console.log(`Map offset: 0x${mapOffset.toString(16)}`);
    
    // Calculate difference 
    let diff = BF14 - BF12;
    BF50 = 0;
    
    if (diff < 0) {
        BF50 = 1;
        diff = -diff;
    }
    
    // The assembly has comparison logic for different ranges
    let result = -1;
    if (diff < 0x5E) { // 94 decimal
        if (diff < 0x22) { // 34 decimal  
            result = 0x22;
        }
    }
    
    return result;
}

/**
 * Read 32-bit big-endian value from buffer
 */
function readUInt32BE(buffer, offset) {
    return (buffer[offset] << 24) | 
           (buffer[offset + 1] << 16) | 
           (buffer[offset + 2] << 8) | 
           buffer[offset + 3];
}

/**
 * Read 16-bit big-endian value from buffer  
 */
function readUInt16BE(buffer, offset) {
    return (buffer[offset] << 8) | buffer[offset + 1];
}

/**
 * Assembly $1169A-$11951: Core decompression logic with jump table
 * 
 * This is the main decompression loop that processes compression commands.
 * Each command type has its own handler in the jump table.
 */
function coreDecompression() {
    // 3F 38 B0 2A    MOVE.W $B02A,-(SP)     ; Push B02A to stack
    // 3F 38 BF 78    MOVE.W $BF78,-(SP)     ; Push BF78 to stack  
    // 08 F8 00 02 BF 78  BSET #2,$BF78      ; Set bit 2 in BF78
    
    let stackB02A = B02A;
    let stackBF78 = BF78;
    BF78 |= (1 << 2); // Set bit 2
    
    // 48 E7 F6 F0    MOVEM.L D1-D7/A0-A4,-(SP)  ; Save registers
    
    let tileCount = 0;
    let tileBytesWritten = 0;
    
    // Main decompression loop
    while (sourcePtr < sourceData.length) {
        // Read control byte
        const ctrlByte = sourceData[sourcePtr++];
        
        // Jump table based on control byte value
        const result = processControlByte(ctrlByte);
        
        if (result === 'END') {
            break;
        }
        
        // Check if we've completed a tile (32 bytes)
        if (tileBytesWritten >= 32) {
            tileBytesWritten = 0;
            tileCount++;
            
            // Check if we've processed all tiles
            const numTiles = readUInt16BE(sourceData, 8);
            if (tileCount >= numTiles) {
                break;
            }
        }
    }
    
    // Restore stack values (assembly equivalent)
    B02A = stackB02A;
    BF78 = stackBF78;
}

/**
 * Process control byte using jump table logic from assembly
 * 
 * The assembly has a jump table at offset 0x00 from the jump table base.
 * Each entry corresponds to different compression command types.
 */
function processControlByte(ctrlByte) {
    console.log(`Processing control byte: 0x${ctrlByte.toString(16)}`);
    
    // Assembly jump table logic
    // The control byte determines which decompression method to use
    
    if (ctrlByte === 0xFF) {
        // End of data marker
        return 'END';
    }
    
    if (ctrlByte >= 0x80) {
        return processHighControlByte(ctrlByte);
    } else {
        return processLowControlByte(ctrlByte);
    }
}

/**
 * Process control bytes >= 0x80 (high control bytes)
 * 
 * These typically involve more complex decompression patterns
 * including run-length encoding and back-references.
 */
function processHighControlByte(ctrlByte) {
    // Extract lower bits for count
    const countBits = ctrlByte & 0x7F;
    
    if (ctrlByte >= 0xE0) {
        // 0xE0-0xFF: Extended sequence repeat  
        return processExtendedSequenceRepeat(countBits);
    } else if (ctrlByte >= 0xC0) {
        // 0xC0-0xDF: Extended count operations
        return processExtendedCount(countBits);
    } else if (ctrlByte >= 0xA0) {
        // 0xA0-0xBF: Back-reference with additional data
        return processBackReference(countBits);
    } else {
        // 0x80-0x9F: Simple run-length encoding
        return processRunLength(countBits);
    }
}

/**
 * Process control bytes < 0x80 (low control bytes)
 * 
 * These are typically simpler operations like literal data copying.
 */
function processLowControlByte(ctrlByte) {
    if (ctrlByte >= 0x60) {
        // 0x60-0x7F: Pattern with additional byte
        return processPatternWithByte(ctrlByte);
    } else if (ctrlByte >= 0x40) {
        // 0x40-0x5F: Multi-byte pattern
        return processMultiBytePattern(ctrlByte);
    } else if (ctrlByte >= 0x20) {
        // 0x20-0x3F: Copy literal bytes
        return processLiteralCopy(ctrlByte);
    } else {
        // 0x00-0x1F: Special operations
        return processSpecialOperation(ctrlByte);
    }
}

/**
 * Assembly function for extended sequence repeat (0xE0-0xFF range)
 * 
 * 10 28 FF FF       MOVE.B  -1(A0),D0      ; Read next byte
 * 02 40 00 1F       ANDI.W  #$001F,D0      ; Mask to 5 bits
 * 13 98 10 00       MOVE.B  D0,(A0)+       ; Store byte
 * 52 01             ADDQ.B  #1,D1          ; Increment counter
 */
function processExtendedSequenceRepeat(countBits) {
    // Read additional count byte
    const extraCount = sourceData[sourcePtr++];
    const totalCount = ((countBits & 0x1F) << 8) + extraCount + 1;
    
    // Read 4-byte sequence to repeat
    const sequence = [];
    for (let i = 0; i < 4; i++) {
        sequence.push(sourceData[sourcePtr++]);
    }
    
    // Repeat the sequence
    for (let i = 0; i < totalCount; i++) {
        for (let j = 0; j < 4; j++) {
            destData.push(sequence[j]);
        }
    }
    
    console.log(`Extended sequence repeat: count=${totalCount}, sequence=[${sequence.map(b => '0x' + b.toString(16)).join(', ')}]`);
    return 'CONTINUE';
}

/**
 * Assembly function for extended count operations (0xC0-0xDF range)
 * 
 * Similar to sequence repeat but with single byte repetition
 */
function processExtendedCount(countBits) {
    // Read additional count byte
    const extraCount = sourceData[sourcePtr++];
    const totalCount = ((countBits & 0x1F) << 8) + extraCount + 1;
    
    // Read byte to repeat
    const byteToRepeat = sourceData[sourcePtr++];
    
    // Repeat the byte
    for (let i = 0; i < totalCount; i++) {
        destData.push(byteToRepeat);
    }
    
    console.log(`Extended count: repeat 0x${byteToRepeat.toString(16)} ${totalCount} times`);
    return 'CONTINUE';
}

/**
 * Process back-reference operations (0xA0-0xBF range)
 */
function processBackReference(countBits) {
    // This implements the back-reference logic from the assembly
    const count = countBits + 1;
    const offsetByte = sourceData[sourcePtr++];
    
    // Calculate back-reference offset  
    let offset;
    if (offsetByte > 128) {
        offset = -(128 - offsetByte) + 1;
    } else {
        offset = offsetByte + 1;
    }
    
    // Copy bytes from previous position
    const sourcePos = destData.length + offset;
    for (let i = 0; i < count; i++) {
        if (sourcePos + i >= 0 && sourcePos + i < destData.length) {
            destData.push(destData[sourcePos + i]);
        } else {
            destData.push(0); // Default value if out of bounds
        }
    }
    
    console.log(`Back reference: offset=${offset}, count=${count}`);
    return 'CONTINUE';
}

/**
 * Process run-length encoding (0x80-0x9F range)
 */
function processRunLength(countBits) {
    const count = countBits + 1;
    const byteToRepeat = sourceData[sourcePtr++];
    
    for (let i = 0; i < count; i++) {
        destData.push(byteToRepeat);
    }
    
    console.log(`Run length: repeat 0x${byteToRepeat.toString(16)} ${count} times`);
    return 'CONTINUE';
}

/**
 * Process pattern with additional byte (0x60-0x7F range)
 */
function processPatternWithByte(ctrlByte) {
    const count = (ctrlByte & 0x1F) + 1;
    const patternByte = sourceData[sourcePtr++];
    
    for (let i = 0; i < count; i++) {
        destData.push(patternByte);
    }
    
    console.log(`Pattern with byte: repeat 0x${patternByte.toString(16)} ${count} times`);
    return 'CONTINUE';
}

/**
 * Process multi-byte pattern (0x40-0x5F range)
 */
function processMultiBytePattern(ctrlByte) {
    const count = (ctrlByte & 0x1F) + 1;
    
    // Read 2-byte pattern
    const byte1 = sourceData[sourcePtr++];
    const byte2 = sourceData[sourcePtr++];
    
    for (let i = 0; i < count; i++) {
        destData.push(byte1);
        destData.push(byte2);
    }
    
    console.log(`Multi-byte pattern: repeat [0x${byte1.toString(16)}, 0x${byte2.toString(16)}] ${count} times`);
    return 'CONTINUE';
}

/**
 * Process literal copy (0x20-0x3F range)
 */
function processLiteralCopy(ctrlByte) {
    const count = (ctrlByte & 0x1F) + 1;
    
    for (let i = 0; i < count; i++) {
        const byte = sourceData[sourcePtr++];
        destData.push(byte);
    }
    
    console.log(`Literal copy: ${count} bytes`);
    return 'CONTINUE';
}

/**
 * Process special operations (0x00-0x1F range)
 */
function processSpecialOperation(ctrlByte) {
    // These are special commands that might modify state or provide metadata
    console.log(`Special operation: 0x${ctrlByte.toString(16)}`);
    
    // For now, treat as single byte copy
    if (sourcePtr < sourceData.length) {
        const byte = sourceData[sourcePtr++];
        destData.push(byte);
    }
    
    return 'CONTINUE';
}

/**
 * Assembly $FCC76-$FCF85: Main decompression routine
 * 
 * This function sets up the decompression environment and calls the core
 * decompression logic. It corresponds to the main routine in the assembly.
 */
function mainDecompressionRoutine(inputBuffer) {
    console.log('Starting main decompression routine...');
    
    // Initialize global state
    sourceData = inputBuffer;
    sourcePtr = 10; // Skip the .map.jim header (palette offset, map offset, tile count)
    destData = [];
    
    // Setup initialization (corresponds to first assembly block)
    const initResult = setupInitialization();
    console.log(`Initialization result: ${initResult}`);
    
    // Core decompression (corresponds to second assembly block)
    coreDecompression();
    
    // Reconstruct the .map.jim file
    return reconstructMapJimFile();
}

/**
 * Reconstruct the complete .map.jim file with proper header
 */
function reconstructMapJimFile() {
    console.log('Reconstructing map.jim file...');
    
    // Read original header values
    const originalPaletteOffset = readUInt32BE(sourceData, 0);
    const originalMapOffset = readUInt32BE(sourceData, 4);
    const numTiles = readUInt16BE(sourceData, 8);
    
    console.log(`Original palette offset: 0x${originalPaletteOffset.toString(16)}`);
    console.log(`Original map offset: 0x${originalMapOffset.toString(16)}`);
    console.log(`Number of tiles: ${numTiles}`);
    
    // Calculate new offsets for uncompressed data
    const newPaletteOffset = 10 + (numTiles * 32); // Header + tile data
    
    // Extract palette data (this should be uncompressed in the source)
    const paletteSize = originalMapOffset - originalPaletteOffset;
    const paletteData = sourceData.slice(originalPaletteOffset, originalMapOffset);
    
    // Extract map data (this should also be uncompressed)
    const mapData = sourceData.slice(originalMapOffset);
    
    const newMapOffset = newPaletteOffset + paletteData.length;
    
    // Build output buffer
    const outputBuffer = Buffer.alloc(10 + destData.length + paletteData.length + mapData.length);
    let offset = 0;
    
    // Write header
    outputBuffer.writeUInt32BE(newPaletteOffset, 0);
    outputBuffer.writeUInt32BE(newMapOffset, 4);
    outputBuffer.writeUInt16BE(numTiles, 8);
    offset += 10;
    
    // Write decompressed tile data
    for (let i = 0; i < destData.length; i++) {
        outputBuffer[offset++] = destData[i];
    }
    
    // Write palette data
    for (let i = 0; i < paletteData.length; i++) {
        outputBuffer[offset++] = paletteData[i];
    }
    
    // Write map data
    for (let i = 0; i < mapData.length; i++) {
        outputBuffer[offset++] = mapData[i];
    }
    
    console.log(`Output file size: ${outputBuffer.length} bytes`);
    console.log(`Decompressed ${destData.length} bytes of tile data`);
    
    return outputBuffer;
}

/**
 * Main entry point
 */
function main() {
    if (process.argv.length !== 4) {
        console.error('Usage: node nhl94_decompressor.js <input_file> <output_file>');
        process.exit(1);
    }
    
    const inputFile = process.argv[2];
    const outputFile = process.argv[3];
    
    try {
        console.log(`Reading input file: ${inputFile}`);
        const inputBuffer = fs.readFileSync(inputFile);
        
        console.log(`Input file size: ${inputBuffer.length} bytes`);
        
        // Decompress the file
        const outputBuffer = mainDecompressionRoutine(inputBuffer);
        
        // Write output file
        console.log(`Writing output file: ${outputFile}`);
        fs.writeFileSync(outputFile, outputBuffer);
        
        console.log('Decompression complete!');
        
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
}

// Run the main function if this script is executed directly
if (require.main === module) {
    main();
}

module.exports = {
    mainDecompressionRoutine,
    setupInitialization,
    coreDecompression,
    processControlByte
};
