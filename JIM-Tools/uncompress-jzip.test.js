import { test, describe, expect } from 'vitest';
import { TileDecompressor } from './uncompress-jzip.js';

// Helper function to convert hex string to byte array
function hexToBytes(hexString) {
    if (typeof hexString !== 'string') {
        return hexString; // Return as-is if not a string
    }
    
    // Remove spaces and ensure even length
    const cleanHex = hexString.replace(/\s+/g, '');
    if (cleanHex.length % 2 !== 0) {
        throw new Error(`Invalid hex string length: ${cleanHex.length}`);
    }
    
    const bytes = [];
    for (let i = 0; i < cleanHex.length; i += 2) {
        const byte = parseInt(cleanHex.substr(i, 2), 16);
        if (isNaN(byte)) {
            throw new Error(`Invalid hex byte: ${cleanHex.substr(i, 2)}`);
        }
        bytes.push(byte);
    }
    return bytes;
}

// Helper function to convert byte array to hex string for display
function bytesToHex(bytes) {
    return bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
}

function testCommand(initialOutput, commandByte, additionalBytes, expectedResult) {
    const decompressor = new TileDecompressor();
    
    // Convert hex strings to byte arrays if needed
    const initialBytes = hexToBytes(initialOutput);
    const additionalBytesArray = hexToBytes(additionalBytes);
    const expectedBytes = hexToBytes(expectedResult);
    
    decompressor.setOutput(initialBytes);
    
    const result = decompressor.processCommand(commandByte, additionalBytesArray);
    console.log('AA2',result);
    const actualOutput = Array.from(decompressor.getOutput().slice(initialBytes.length));
    console.log('AA3',actualOutput, decompressor.getOutput(), initialBytes.length);
    // Custom assertion with hex display
    if (!actualOutput.every((b, i) => b === expectedBytes[i]) || actualOutput.length !== expectedBytes.length) {
        const actualHex = bytesToHex(actualOutput);
        const expectedHex = bytesToHex(expectedBytes);
        
        throw new Error(
            `Byte mismatch:\n` +
            `Expected: [${expectedHex}]\n` +
            `Actual:   [${actualHex}]\n` +
            `Expected length: ${expectedBytes.length}, Actual length: ${actualOutput.length}`
        );
    }
    
    return result;
}

// Helper function to test command sequences with state carried over
function testCommandSequence(initialOutput, firstCommand, firstAdditionalBytes, secondCommand, secondAdditionalBytes, expectedResult) {
    const decompressor = new TileDecompressor();
    
    // Convert hex strings to byte arrays if needed
    const initialBytes = hexToBytes(initialOutput);
    const firstAdditionalBytesArray = hexToBytes(firstAdditionalBytes);
    const secondAdditionalBytesArray = hexToBytes(secondAdditionalBytes);
    const expectedBytes = hexToBytes(expectedResult);
    
    decompressor.setOutput(initialBytes);
    
    // Execute first command
    const firstResult = decompressor.processCommand(firstCommand, firstAdditionalBytesArray);
    
    // Execute second command with the state from first command
    const secondResult = decompressor.processCommand(secondCommand, secondAdditionalBytesArray);
    
    // Get output after both commands (excluding initial output)
    const actualOutput = Array.from(decompressor.getOutput().slice(initialBytes.length));
    
    // Custom assertion with hex display
    if (!actualOutput.every((b, i) => b === expectedBytes[i]) || actualOutput.length !== expectedBytes.length) {
        const actualHex = bytesToHex(actualOutput);
        const expectedHex = bytesToHex(expectedBytes);
        
        throw new Error(
            `Byte mismatch in command sequence:\n` +
            `First command: 0x${firstCommand.toString(16)}, consumed: ${firstResult.consumed}\n` +
            `Second command: 0x${secondCommand.toString(16)}, consumed: ${secondResult.consumed}\n` +
            `Expected: [${expectedHex}]\n` +
            `Actual:   [${actualHex}]\n` +
            `Expected length: ${expectedBytes.length}, Actual length: ${actualOutput.length}`
        );
    }
    
    return { firstResult, secondResult };
}

// Helper function to test full file decompression with hex input/output
function testFullDecompression(inputHex, expectedOutputHex) {
    // Convert hex strings to byte arrays if needed
    const inputBytes = hexToBytes(inputHex);
    const expectedBytes = hexToBytes(expectedOutputHex);
    
    // Create a buffer from input bytes
    const inputBuffer = Buffer.from(inputBytes);
    
    // Parse header to validate format
    if (inputBuffer.length < 10) {
        throw new Error('Input too short for JZIP header');
    }
    
    const paletteOffset = inputBuffer.readUInt32BE(0);
    const mapOffset = inputBuffer.readUInt32BE(4);
    const paletteSize = inputBuffer.readUInt8(8);
    const numTiles = inputBuffer.readUInt8(9);
    
    // Find compressed data section
    const compressedDataStart = 10;
    const compressedDataEnd = Math.min(paletteOffset, inputBuffer.length);
    
    // Check for end marker
    let actualEnd = compressedDataEnd;
    if (compressedDataEnd >= 4 && inputBuffer.readUInt32BE(compressedDataEnd - 4) === 0xFFFFFFFF) {
        actualEnd = compressedDataEnd - 4;
    }
    
    // Decompress tile data
    const decompressor = new TileDecompressor();
    let pos = compressedDataStart;
    
    while (pos < actualEnd) {
        const commandByte = inputBuffer.readUInt8(pos);
        pos++;
        
        const cmd = commandByte >> 4;
        let additionalBytesNeeded = 0;
        
        switch (cmd) {
            case 0x0: additionalBytesNeeded = (commandByte & 0xF) + 1; break;
            case 0x1: additionalBytesNeeded = (commandByte & 0xF) + 17; break;
            case 0x3: case 0x8: case 0x9: case 0xA: case 0xE: additionalBytesNeeded = 1; break;
            case 0x4: case 0x5: case 0x6: case 0x7: case 0xC: case 0xD: additionalBytesNeeded = 0; break;
            default:
                throw new Error(`Unknown command: 0x${cmd.toString(16)} at position ${pos - 1}`);
        }
        
        const additionalBytes = [];
        for (let i = 0; i < additionalBytesNeeded; i++) {
            if (pos >= actualEnd) {
                throw new Error(`Unexpected end of compressed data at position ${pos}`);
            }
            additionalBytes.push(inputBuffer.readUInt8(pos));
            pos++;
        }
        
        try {
            decompressor.processCommand(commandByte, additionalBytes);
        } catch (error) {
            throw new Error(`Error processing command 0x${commandByte.toString(16)} at position ${pos - 1}: ${error.message}`);
        }
    }
    
    // Get decompressed tile data
    const decompressedTiles = Array.from(decompressor.getOutput());
    
    // Custom assertion with hex display
    if (!decompressedTiles.every((b, i) => b === expectedBytes[i]) || decompressedTiles.length !== expectedBytes.length) {
        const actualHex = bytesToHex(decompressedTiles);
        const expectedHex = bytesToHex(expectedBytes);
        
        // Show first few bytes for debugging
        const previewLength = Math.min(32, Math.max(decompressedTiles.length, expectedBytes.length));
        const actualPreview = bytesToHex(decompressedTiles.slice(0, previewLength));
        const expectedPreview = bytesToHex(expectedBytes.slice(0, previewLength));
        
        throw new Error(
            `Full decompression mismatch:\n` +
            `Expected length: ${expectedBytes.length}, Actual length: ${decompressedTiles.length}\n` +
            `Expected tiles: ${numTiles}, Actual bytes: ${decompressedTiles.length} (${decompressedTiles.length / 32} tiles)\n` +
            `First ${previewLength} bytes:\n` +
            `Expected: [${expectedPreview}]\n` +
            `Actual:   [${actualPreview}]\n` +
            `Full expected: [${expectedHex}]\n` +
            `Full actual:   [${actualHex}]`
        );
    }
    
    return {
        decompressedLength: decompressedTiles.length,
        expectedLength: expectedBytes.length,
        numTiles: numTiles,
        paletteOffset: paletteOffset,
        mapOffset: mapOffset,
        paletteSize: paletteSize
    };
}

// Test cases for full file decompression
describe('Full file decompression tests', () => {
    test('ronbarr.map.jzip', () => {
        testFullDecompression(
            // Compressed input as hex string
            "00 00 04 C4 00 00 05 44 80 3D 31 66 00 65 30 55 00 65 30 44 03 65 47 77 77 8D 04 31 66 31 55 31 44 3F 77 9B 1F 00 18 51 00 88 51 00 92 8A 20 31 11 0E 22 28 82 22 33 32 22 34 44 32 98 22 99 98 88 89 20 00 11 30 77 01 99 88 68 04 98 11 18 77 81 34 11 9C FF 01 82 87 82 80 00 61 30 55 07 21 44 44 43 21 77 77 73 8E 04 8F D4 8B 04 38 77 00 71 83 B8 5E 00 71 80 8F 00 11 CC 03 88 89 22 18 58 08 99 88 88 81 11 88 11 11 18 48 12 89 AB 11 AC CD DC 18 BD DD DD 8A DD EE EE 99 98 11 88 81 80 AD 06 18 88 88 9A 9A AB BC 30 CC 00 CD 33 DD 04 FF 66 FE EF F6 CC E0 37 04 98 88 89 AC CA 30 CC 00 CB E1 18 58 04 DE DC DE EE ED C0 59 07 FF FF FE DD 18 81 17 77 80 40 13 77 A8 82 21 77 B8 11 21 17 CA 81 12 17 CB A1 12 11 DC A1 11 58 80 11 3F 77 37 77 00 17 6B 8F F4 8B 04 E2 C3 9B 03 00 8C 30 DD 00 9A 80 B3 00 89 5F 02 DD DE 8A 79 03 8B CD DE ED CC 02 DF 66 FF 30 66 00 DE 30 EE 34 DD 80 09 05 EE EF DE EE FF FF 81 14 00 FD 81 E7 03 FF EE DD DE 82 1E 81 12 05 EE FE FF F6 6F FE E0 32 80 22 02 FF FD DD 30 CC 03 DD C9 11 11 58 00 81 5B 00 ED 59 00 DC 5A 00 CA 80 10 01 CC 91 78 02 CD A1 11 81 C4 5A 80 8D 99 03 8B B0 01 19 91 58 01 7A C1 59 00 CA 58 00 79 59 02 78 CB 9C 80 65 10 9C DC A9 88 9C DB AD DC BD DC DB A1 CD DD CA 48 BC 80 14 00 AB 30 DD 00 BA 80 9E 0D CF FD DD DC 81 8C CD DC CA 18 CD ED 11 19 58 05 18 49 CD 6D DD CA 58 01 DC CB 79 00 DB 58 1C CC BA 99 99 BB 98 18 88 C9 81 8B ED C9 A1 11 1A C9 A6 81 96 CD 9C CD DC CC DD CC BC DC 80 D8 09 CC CD B1 11 9C CD C8 11 C9 DC 58 00 BD 58 01 8C AC 58 80 1E 02 CA AC DE 58 04 BC EF EC BA BC 89 AC 00 97 59 00 A7 59 00 B7 59 00 B8 84 0C 41 00 DC 5D 00 DF 59 00 CE 59 00 7D 59 E0 B9 44 0A CA DD F6 66 DA CD E6 66 EA CD DF 58 06 CC DE ED CA BC DD EC 58 0D CD CB BA BB CC BA 78 9B BC BB 6F DC CD 66 58 12 DE E6 FC DD EF ED B9 CA BC CC 9C CC A8 11 BC DD CB A9 BC 80 2B 0B C9 CD DD DD DC CE EF F6 DD CC DF 66 80 09 01 FF BA 80 93 04 AB CD DA CD AC 80 B7 01 BC DE 80 C3 07 DD DC 9C FF DC BA CD FE 58 00 DD 5A 00 ED 58 C4 03 CC BA C9 DD 58 00 77 5A 02 DC CC B9 82 B4 00 87 3F 77 A8 40 00 72 59 00 21 81 A4 07 77 98 BB CB 77 88 BA BC 58 1F 8A AC 77 38 8A 9B 72 31 88 A9 21 48 88 AA 11 43 88 8A BB 19 99 99 BC 92 45 55 BC AC AA AA CC CA 02 DD FE CC D1 05 DD CC BB BB 9D DC 60 01 9A CD 60 11 99 BB 91 CC 55 32 19 CC AC DD BD DC ED CA DD DC AA AD 80 BC 02 CC CC CA 50 04 CD CB CD ED ED 78 02 CB A9 77 58 03 A8 77 CB BA E0 65 04 B9 88 77 AA A8 59 0A 98 91 27 AA 89 81 12 A8 9A C2 11 3F 77 E8 09 00 27 58 01 65 47 8A 04 00 72 58 08 72 21 65 42 21 11 65 41 11 5B 80 C3 58 50 01 11 72 30 11 71 3F 11 06 44 A8 88 11 36 28 A8 58 11 2A 8A 11 26 42 9A 11 14 64 98 11 13 66 29 11 11 46 42 58 14 36 64 9A CD EE EE 89 BC DD EE 98 AB CC CA A8 99 AB AB 8A 88 88 30 89 06 81 11 98 88 99 99 29 30 88 0F FF FF CC CA FF ED CC 99 AA CC C9 89 BA AB 98 9A 31 88 04 18 88 98 89 99 80 21 30 88 1A 92 89 AB 22 11 9A AB 43 11 AA A2 63 11 A9 C4 62 11 9A 26 51 11 A2 46 31 11 24 64 80 62 00 63 31 11 00 27 E0 A3 60 3F 11 44 02 77 77 73 E0 C1 58 00 27 59 01 12 27 58 02 11 11 23 59 00 13 5F 85 E8 9A 83 9F 80 01 26 66 58 00 16 5D 00 14 59 00 13 59 00 11 E0 9B 01 11 36 81 1D 00 42 80 C9 01 64 29 58 00 66 61 02 66 66 53 58 02 65 31 11 70 01 11 8C 70 01 18 BB 70 01 99 BC E0 1D 01 24 88 C0 05 56 89 92 46 66 82 50 01 66 13 59 01 B1 14 58 05 BB 81 46 66 CB A9 80 09 00 62 E0 4D 00 61 59 80 8C 01 66 31 58 00 64 80 B6 81 F7 80 17 00 11 80 17 41 87 CC 98 83 8F DC 5D 30 22 83 40 99 80 31 22 34 11 00 15 59 E0 D9 00 11 E3 69 8C 20 06 31 18 99 BC 11 18 9A 58 00 88 58 0B 18 28 8A BC 26 62 89 CB 26 41 88 AA 85 20 17 CA 98 81 56 CA A8 81 24 AB 88 12 12 AB 81 33 21 AA 12 44 42 A1 14 66 43 85 20 00 51 59 80 8F 00 11 E1 48 80 B1 43 7A 87 80 8F D8 5A 30 22 82 2F E0 00 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 08 0E 00 00 04 44 06 66 0A AA 0C CC 0E EE 08 40 00 04 00 06 00 08 00 2A 02 4C 06 8C 08 AE 0A CE 00 08 00 09 60 00 60 01 60 02 60 03 60 04 60 05 60 01 60 06 60 07 60 08 60 09 60 0A 60 0B 60 0C 60 0D 60 0E 60 07 60 0F 60 10 60 11 60 12 60 13 60 14 60 0E 60 07 60 15 60 16 60 17 60 18 60 19 60 1A 60 0E 60 07 60 1B 60 1C 60 1D 60 1E 60 1F 60 20 60 0E 60 07 60 21 60 22 60 23 60 24 60 25 60 26 60 0E 60 27 60 28 60 29 60 2A 60 2B 60 2C 60 2D 60 2E 60 2F 60 30 60 31 60 32 60 33 60 34 60 30 60 35 60 36 60 37 60 38 60 39 60 3A 60 3B 60 37 60 3C FF FF FF FF",
            "66 66 66 66 65 55 55 55 65 44 44 44 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 18 77 77 18 88 77 18 88 92 66 66 66 66 55 55 55 55 44 44 44 44 77 11 11 11 11 22 28 82 22 33 32 22 34 44 32 98 22 99 98 88 66 66 66 66 55 55 55 55 44 44 44 44 11 77 77 77 99 88 11 77 98 11 18 77 81 11 11 11 11 11 11 11 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 82 87 77 77 66 66 66 61 55 55 55 21 44 44 43 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 77 77 77 77 77 77 77 77 77 77 77 71 77 77 77 18 77 77 77 18 77 77 77 18 77 77 71 11 77 77 11 11 71 88 89 22 18 88 89 99 88 88 81 11 88 11 11 18 11 18 89 AB 11 AC CD DC 18 BD DD DD 8A DD EE EE 99 98 11 88 81 81 11 11 18 88 88 9A 9A AB BC CC CC CC CD DD DD DD DD DD DD FF 66 FE EF F6 66 FF 88 88 99 98 88 89 AC CA CC CC CC CB DD DD CD CC DD DD DE DC DE EE ED ED EE EE ED ED FF FF FE DD 18 81 17 77 81 81 11 77 A8 82 21 77 B8 11 21 17 CA 81 12 17 CB A1 12 11 DC A1 11 11 DC B8 11 21 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 17 77 77 77 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 8C DD DD DD 9A CD DD DD 89 CD DD DD 89 CD DD DD 89 CD DD DE 8A CD DD DD 8B CD DE ED 8B DD DF 66 FF 66 66 66 DE EE EE EE DD DD DD DD DD DD DD EE EE DD EE EF DE EE FF FF DE EE EE EE FD DD DD DD FF FF EE DD DE EE DD DD DD DD DE EE EE EE EE FE FF F6 6F FE 66 66 FF EE FF FF FF FD DD CC CC CC DD C9 11 11 DD C9 81 11 DD C9 81 11 ED C9 81 11 DC C9 81 11 DC CA 81 11 DD CC 91 11 DC CD A1 11 17 77 77 77 17 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 77 77 11 11 77 77 11 11 77 77 11 11 77 77 19 91 77 77 7A C1 77 77 7A CA 77 77 79 CA 77 77 78 CB 9C DD CC CC 9C DC A9 88 9C DB AD DC BD DC DB A1 CD DD CA 48 BC DD CC CC AB DD DD DD BA DD FF FF CF FD DD DC 81 8C CD DC CA 18 CD ED 11 19 CD ED 18 49 CD 6D DD CA CD 6D DC CB CD 6D DD DB CD 6D CC BA 99 99 BB 98 18 88 C9 81 8B ED C9 A1 11 1A C9 A6 81 96 CD 9C CD DC CC DD CC BC DC EE DD DD CC CD B1 11 9C CD C8 11 C9 DC C8 11 BD DC C8 8C AC DC C8 9C CD DC CA AC DE DC CA BC EF EC BA BC 11 77 77 77 11 77 77 77 11 77 77 77 97 77 77 77 A7 77 77 77 B7 77 77 77 B8 77 77 77 A7 77 77 77 77 77 77 DC 77 77 77 DC 77 77 77 DF 77 77 77 CE 77 77 77 7D 77 77 77 78 77 77 77 77 77 77 77 77 CA DD F6 66 DA CD E6 66 EA CD DF 66 EA CC DE ED CA BC DD EC CA BC CD CB BA BB CC BA 78 9B BC BB 6F DC CD 66 6F DC DE E6 FC DD EF ED B9 CA BC CC 9C CC A8 11 BC DD CB A9 BC DE ED CA C9 CD DD DD DC CE EF F6 DD CC DF 66 DD DC CE FF BA CA BC EF AB CD DA CD AC DD DD CC BC DE DC CC DD DD DC 9C FF DC BA CD FE DC BA DD FE DC BA DD ED DC BA DC ED CC BA C9 DD CC BA 77 DD CC BA 77 DC CC B9 77 97 77 77 77 87 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 72 77 77 77 21 78 9B BC BB 77 98 BB CB 77 88 BA BC 77 88 8A AC 77 38 8A 9B 72 31 88 A9 21 48 88 AA 11 43 88 8A BB 19 99 99 BC 92 45 55 BC AC AA AA CC CA DD FE CC CC AA AA DD CC BB BB 9D DC CC BB 9A CD DC CC 99 BB 91 CC 55 32 19 CC AC DD BD DC ED CA DD DC AA AD DD CC BC CC CC CA CC CC CD CB CD ED ED CA CC CB A9 77 CC CB A8 77 CB BA 98 77 BB B9 88 77 AA A8 88 77 AA 98 91 27 AA 89 81 12 A8 9A C2 11 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 11 27 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 72 65 47 72 21 65 42 21 11 65 41 11 11 65 41 11 11 77 77 21 11 77 21 11 11 72 11 11 11 21 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 44 A8 88 11 36 28 A8 11 36 2A 8A 11 26 42 9A 11 14 64 98 11 13 66 29 11 11 46 42 11 11 36 64 9A CD EE EE 89 BC DD EE 98 AB CC CA A8 99 AB AB 8A 88 88 89 89 89 81 11 98 88 99 99 29 88 88 88 FF FF CC CA FF ED CC 99 AA CC C9 89 BA AB 98 9A 88 88 88 88 18 88 98 89 99 98 88 99 88 88 88 92 89 AB 22 11 9A AB 43 11 AA A2 63 11 A9 C4 62 11 9A 26 51 11 A2 46 31 11 24 64 11 11 46 63 11 11 11 11 27 77 11 11 11 27 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 77 77 73 21 77 77 73 21 27 77 73 21 12 27 73 21 11 11 23 21 11 11 13 21 11 11 13 21 11 11 13 21 65 41 11 11 65 41 11 11 65 41 11 11 65 41 11 11 65 41 11 11 65 41 11 11 65 41 11 11 65 41 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 26 66 11 11 16 66 11 11 16 66 11 11 14 66 11 11 13 66 11 11 11 46 11 11 11 36 11 11 11 26 42 99 98 88 64 29 98 88 66 64 29 98 66 66 53 98 66 65 31 11 66 53 11 8C 65 31 18 BB 53 11 99 BC 88 98 99 24 88 88 24 56 89 92 46 66 82 46 66 66 13 46 66 66 B1 14 66 66 BB 81 46 66 CB A9 14 66 66 62 11 11 66 61 11 11 66 41 11 11 66 31 11 11 64 21 11 11 63 11 11 11 62 11 11 11 61 11 11 11 11 11 13 21 11 11 13 21 11 11 13 21 11 11 13 21 11 11 13 21 11 11 13 21 11 11 13 21 11 11 13 21 65 41 11 11 65 41 11 11 65 41 11 11 65 41 11 11 65 41 11 11 65 41 11 11 65 22 22 22 61 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 22 22 22 22 11 11 11 11 11 11 11 15 11 11 11 14 11 11 11 13 11 11 11 11 11 11 11 11 11 11 11 11 22 22 22 22 11 11 11 11 31 18 99 BC 11 18 9A BC 11 88 9A BC 18 28 8A BC 26 62 89 CB 26 41 88 AA 22 22 22 22 11 11 11 11 CA 98 81 56 CA A8 81 24 AB 88 12 12 AB 81 33 21 AA 12 44 42 A1 14 66 43 22 22 22 22 11 11 11 11 51 11 11 11 41 11 11 11 31 11 11 11 21 11 11 11 11 11 11 11 21 11 11 11 22 22 22 22 11 11 11 11 11 11 13 21 11 11 13 21 11 11 13 21 11 11 13 21 11 11 13 21 11 11 13 21 22 22 22 21 11 11 11 11" // Expected output as hex string
        );
    });

    test('eabg.map.jzip', () => {
        testFullDecompression(
            // Compressed input as hex string
            "00 00 04 16 00 00 04 96 80 40 30 DD 00 DC 51 00 BB 51 00 CD 51 D8 50 C0 38 DD 8D 10 41 00 DE 51 00 FF 51 04 ED DE FB DF FD 8A 10 50 D8 50 C0 38 DD 8D 10 8D 70 01 DD DB 30 DD 5D 80 16 8F 70 00 EF 81 3E E1 46 01 DE FE 61 00 DF 3F DD E7 4E 81 8D 8C 2F 01 FE BC 81 5B 00 BD 61 00 CB 81 56 81 5E 81 66 88 80 9E 00 81 50 00 FE 80 2D 00 FD 80 3C 78 0A BC DD EF DD CB DE DF ED DC EF DE 81 6D 80 19 12 DD BD EF DD CD BD DF ED BB DD DE FD DE FF DD FE FF EC BD 80 33 02 BC DF DC 80 28 03 BB ED DB CD 80 2C 00 BC 81 6C 82 7B 82 88 50 80 17 03 DD FD DC BD 80 3F 80 9E 80 51 01 DD DF 80 65 83 51 80 CC 81 A0 37 DD 00 EE 81 31 88 43 8D B2 8F C3 00 DD E0 4A 80 8A 50 00 ED 51 D8 00 EB 80 5E 00 DB 30 DD 98 03 81 6A 80 7A 01 DD FF 81 35 E1 7B 00 DF 81 84 81 F2 83 13 31 DD 80 7B 80 B4 82 B9 81 6A 81 9C E2 13 82 2F 3F DD 81 D2 01 DD DB 82 34 84 68 99 A6 80 64 01 EF FB 50 01 FE DB 84 C0 E0 0D 01 EF FE 52 81 88 03 DF ED DD CB CC 02 DB BC CF 82 B9 80 6C 80 24 00 DC 81 83 82 5D E3 5B 00 DB 81 10 00 EF 80 B0 01 DF EC 81 94 85 44 81 11 80 5C 00 DE 81 C9 81 A3 02 DC CE FE 80 3A 02 EF DD BC E0 19 00 DB 80 1E 80 96 80 D2 02 DC BB CD 51 00 DD 81 7C 80 17 81 43 02 CD DE FB 83 89 A9 C0 81 31 02 FC BB FF 80 6E 81 6D 8B 04 01 DC FD C0 04 BB FD FC BB CD 81 0F E0 71 00 DC 80 A4 00 DB 80 30 81 D0 8B 04 81 84 8C 7A E0 BD 01 DE FF 51 00 ED 51 D8 30 DD 80 63 39 DD 83 50 84 C4 89 4F 81 66 84 50 E0 D7 01 EF FE 52 45 83 10 C0 68 00 ED C5 05 DB CF EC DD DC BD 80 2E 00 BC 81 16 00 DC 80 19 84 A4 00 CB 68 08 ED DB CD BB FD DC BD CD FE 81 1D 02 DD CB BE 80 0C 03 BD FE DD CF E2 40 00 DF 81 8A 00 FE E0 25 87 A8 00 EF 80 0F 00 FE 81 DC 0F CD DC BD CB BE DD BC BC EF ED CB DD DE FD DB FF 58 81 C6 EC AC 44 81 F0 00 BD 5D F8 0B 82 58 51 00 ED 51 8B 19 00 FB 58 01 FF EB 58 00 ED 88 F4 40 00 FD 80 64 CE 99 83 00 BC 81 27 81 69 00 CB 81 6A 80 E3 01 DD DC 82 13 3F DD 37 DD 89 2F 00 BB 78 FC 44 5A 00 DB 80 B0 00 DB E0 97 9B 00 80 A0 01 DC BB 51 00 CD 51 81 50 81 F4 00 DF 30 DD 00 EF 80 E6 00 EF 84 10 81 F3 00 CB 80 F0 00 DC 81 F3 82 F6 01 DC BC 70 08 DB CE FD DF FE DD DC DE FD 80 8A 78 09 BD BD EF DD CB BC DF ED DB CB 80 11 01 DB CD 80 19 80 11 06 BB ED CB DD CD FE DB C8 04 DF DC BD DD EF C4 01 EF FE 78 00 FE 81 BE 82 E7 00 CB 60 80 30 02 DD DE FD 80 84 00 FE 81 73 59 00 DF 80 5F 80 41 84 11 80 7C 00 FE 80 F0 00 EF 80 2E 00 DF E1 2E 80 4A 80 58 E1 39 81 83 32 DD 80 17 02 CB BC ED 80 4B 51 98 00 81 4B 98 03 80 63 80 D0 3B DD 00 DB 80 18 01 DB EF 80 D8 01 DD FF 59 E0 96 82 E8 CA 81 72 E3 68 45 81 9D 00 DF E8 5B 80 97 01 DD BB 8B 2F 85 13 8D 7D 00 FC 84 18 46 80 FC 01 DC BB 51 00 CD 51 D8 80 36 50 01 DE FF 81 9D 81 A0 80 10 00 DE 85 10 CC 80 B0 0D EF DD DB EC DF ED DB CB DE FD DC DB CD FE 80 13 04 BC DF ED DD CB E0 8B 05 DB CE CB BE DC BD 80 0E 80 82 09 FD CB BD DE FD DB BE FF ED CB 80 C4 0D FE ED DB CD EF FD DC BD DF FE DD BC DE EF 80 C7 80 3F 00 CD 80 3F 00 BD 80 C5 00 BC 48 81 3F 01 DE FD 80 13 00 FE 80 13 00 EF 80 13 00 DF 80 24 00 DE 80 24 81 28 06 DD DC FE DD CB DC BF 80 EE 00 BC 80 1B E0 17 80 28 80 C5 80 3B 02 CB BC DD E0 4D 80 41 E0 7A 81 F4 80 EF 00 FC 81 F7 3C DD 81 1B 9C 80 81 D3 E0 AE 89 04 00 DC 58 01 DC BB CC 02 BB CD FC 80 FD E0 00 00 04 00 0E E2 00 00 02 22 04 44 06 66 08 88 0A AA 0C CC 0E EE 00 EE 0E 00 0C 00 0A 00 08 00 06 00 04 00 0C CC 08 88 04 44 02 22 00 8C 00 6A 00 00 08 22 06 00 00 42 00 20 00 4A 00 06 06 6A 02 46 04 00 00 EE 00 00 06 66 06 66 06 66 06 66 06 66 06 66 06 66 06 66 06 66 06 66 0A 00 06 66 06 66 04 00 00 E0 00 00 06 66 06 66 06 66 06 66 06 66 06 66 06 66 06 66 06 66 06 66 00 00 06 66 06 66 00 28 00 1C 00 00 00 01 00 02 00 03 00 04 00 05 00 06 00 07 00 08 00 08 00 09 00 0A 00 0B 00 0C 00 0D 00 08 00 08 00 08 00 08 00 0E 00 02 00 0F 00 10 00 11 00 12 00 08 00 13 00 14 00 15 00 08 00 16 00 17 00 18 00 19 00 08 00 08 00 08 00 08 00 08 00 1A 00 02 00 0F 00 10 00 11 00 12 00 08 00 13 00 14 00 15 00 08 00 16 00 17 00 18 00 19 00 08 00 08 00 08 00 08 00 08 00 1A 00 1B 00 1C 00 02 00 1D 00 1E 00 1F 00 20 00 21 00 22 00 23 00 08 00 24 00 25 00 26 00 27 00 28 00 08 00 08 00 08 00 29 00 1B 00 1C 00 02 00 1D 00 1E 00 1F 00 20 00 21 00 22 00 23 00 08 00 24 00 25 00 26 00 27 00 28 00 08 00 08 00 08 00 29 00 2A 00 03 00 2B 00 2C 00 2D 00 2E 00 2F 00 30 00 31 00 24 00 02 00 03 00 04 00 32 00 33 00 34 00 35 00 08 00 08 00 36 00 2A 00 03 00 2B 00 2C 00 2D 00 2E 00 2F 00 30 00 31 00 24 00 02 00 03 00 04 00 32 00 33 00 34 00 35 00 08 00 08 00 36 00 37 00 38 00 39 00 3A 00 3B 00 3C 00 3D 00 3E 00 08 00 3F 00 00 00 01 00 02 00 03 00 04 00 05 00 06 00 07 00 08 00 08 00 37 00 38 00 39 00 3A 00 3B 00 3C 00 3D 00 3E 00 08 00 3F 00 00 00 01 00 02 00 03 00 04 00 05 00 06 00 07 00 08 00 08 00 09 00 0A 00 0B 00 0C 00 0D 00 08 00 08 00 08 00 08 00 0E 00 02 00 0F 00 10 00 11 00 12 00 08 00 13 00 14 00 15 00 08 00 09 00 0A 00 0B 00 0C 00 0D 00 08 00 08 00 08 00 08 00 0E 00 02 00 0F 00 10 00 11 00 12 00 08 00 13 00 14 00 15 00 08 00 16 00 17 00 18 00 19 00 08 00 08 00 08 00 08 00 08 00 1A 00 1B 00 1C 00 02 00 1D 00 1E 00 1F 00 20 00 21 00 22 00 23 00 16 00 17 00 18 00 19 00 08 00 08 00 08 00 08 00 08 00 1A 00 1B 00 1C 00 02 00 1D 00 1E 00 1F 00 20 00 21 00 22 00 23 00 08 00 24 00 25 00 26 00 27 00 28 00 08 00 08 00 08 00 29 00 2A 00 03 00 2B 00 2C 00 2D 00 2E 00 2F 00 30 00 31 00 24 00 08 00 24 00 25 00 26 00 27 00 28 00 08 00 08 00 08 00 29 00 2A 00 03 00 2B 00 2C 00 2D 00 2E 00 2F 00 30 00 31 00 24 00 02 00 03 00 04 00 32 00 33 00 34 00 35 00 08 00 08 00 36 00 37 00 38 00 39 00 3A 00 3B 00 3C 00 3D 00 3E 00 08 00 3F 00 02 00 03 00 04 00 32 00 33 00 34 00 35 00 08 00 08 00 36 00 37 00 38 00 39 00 3A 00 3B 00 3C 00 3D 00 3E 00 08 00 3F 00 00 00 01 00 02 00 03 00 04 00 05 00 06 00 07 00 08 00 08 00 09 00 0A 00 0B 00 0C 00 0D 00 08 00 08 00 08 00 08 00 0E 00 00 00 01 00 02 00 03 00 04 00 05 00 06 00 07 00 08 00 08 00 09 00 0A 00 0B 00 0C 00 0D 00 08 00 08 00 08 00 08 00 0E 00 02 00 0F 00 10 00 11 00 12 00 08 00 13 00 14 00 15 00 08 00 16 00 17 00 18 00 19 00 08 00 08 00 08 00 08 00 08 00 1A 00 02 00 0F 00 10 00 11 00 12 00 08 00 13 00 14 00 15 00 08 00 16 00 17 00 18 00 19 00 08 00 08 00 08 00 08 00 08 00 1A 00 1B 00 1C 00 02 00 1D 00 1E 00 1F 00 20 00 21 00 22 00 23 00 08 00 24 00 25 00 26 00 27 00 28 00 08 00 08 00 08 00 29 00 1B 00 1C 00 02 00 1D 00 1E 00 1F 00 20 00 21 00 22 00 23 00 08 00 24 00 25 00 26 00 27 00 28 00 08 00 08 00 08 00 29 00 2A 00 03 00 2B 00 2C 00 2D 00 2E 00 2F 00 30 00 31 00 24 00 02 00 03 00 04 00 32 00 33 00 34 00 35 00 08 00 08 00 36 00 2A 00 03 00 2B 00 2C 00 2D 00 2E 00 2F 00 30 00 31 00 24 00 02 00 03 00 04 00 32 00 33 00 34 00 35 00 08 00 08 00 36 00 37 00 38 00 39 00 3A 00 3B 00 3C 00 3D 00 3E 00 08 00 3F 00 00 00 01 00 02 00 03 00 04 00 05 00 06 00 07 00 08 00 08 00 37 00 38 00 39 00 3A 00 3B 00 3C 00 3D 00 3E 00 08 00 3F 00 00 00 01 00 02 00 03 00 04 00 05 00 06 00 07 00 08 00 08 00 09 00 0A 00 0B 00 0C 00 0D 00 08 00 08 00 08 00 08 00 0E 00 02 00 0F 00 10 00 11 00 12 00 08 00 13 00 14 00 15 00 08 00 09 00 0A 00 0B 00 0C 00 0D 00 08 00 08 00 08 00 08 00 0E 00 02 00 0F 00 10 00 11 00 12 00 08 00 13 00 14 00 15 00 08 00 16 00 17 00 18 00 19 00 08 00 08 00 08 00 08 00 08 00 1A 00 1B 00 1C 00 02 00 1D 00 1E 00 1F 00 20 00 21 00 22 00 23 00 16 00 17 00 18 00 19 00 08 00 08 00 08 00 08 00 08 00 1A 00 1B 00 1C 00 02 00 1D 00 1E 00 1F 00 20 00 21 00 22 00 23 00 08 00 24 00 25 00 26 00 27 00 28 00 08 00 08 00 08 00 29 00 2A 00 03 00 2B 00 2C 00 2D 00 2E 00 2F 00 30 00 31 00 24 00 08 00 24 00 25 00 26 00 27 00 28 00 08 00 08 00 08 00 29 00 2A 00 03 00 2B 00 2C 00 2D 00 2E 00 2F 00 30 00 31 00 24 00 02 00 03 00 04 00 32 00 33 00 34 00 35 00 08 00 08 00 36 00 37 00 38 00 39 00 3A 00 3B 00 3C 00 3D 00 3E 00 08 00 3F 00 02 00 03 00 04 00 32 00 33 00 34 00 35 00 08 00 08 00 36 00 37 00 38 00 39 00 3A 00 3B 00 3C 00 3D 00 3E 00 08 00 3F 00 00 00 01 00 02 00 03 00 04 00 05 00 06 00 07 00 08 00 08 00 09 00 0A 00 0B 00 0C 00 0D 00 08 00 08 00 08 00 08 00 0E 00 00 00 01 00 02 00 03 00 04 00 05 00 06 00 07 00 08 00 08 00 09 00 0A 00 0B 00 0C 00 0D 00 08 00 08 00 08 00 08 00 0E 00 02 00 0F 00 10 00 11 00 12 00 08 00 13 00 14 00 15 00 08 00 16 00 17 00 18 00 19 00 08 00 08 00 08 00 08 00 08 00 1A 00 02 00 0F 00 10 00 11 00 12 00 08 00 13 00 14 00 15 00 08 00 16 00 17 00 18 00 19 00 08 00 08 00 08 00 08 00 08 00 1A 00 1B 00 1C 00 02 00 1D 00 1E 00 1F 00 20 00 21 00 22 00 23 00 08 00 24 00 25 00 26 00 27 00 28 00 08 00 08 00 08 00 29 00 1B 00 1C 00 02 00 1D 00 1E 00 1F 00 20 00 21 00 22 00 23 00 08 00 24 00 25 00 26 00 27 00 28 00 08 00 08 00 08 00 29 00 2A 00 03 00 2B 00 2C 00 2D 00 2E 00 2F 00 30 00 31 00 24 00 02 00 03 00 04 00 32 00 33 00 34 00 35 00 08 00 08 00 36 00 2A 00 03 00 2B 00 2C 00 2D 00 2E 00 2F 00 30 00 31 00 24 00 02 00 03 00 04 00 32 00 33 00 34 00 35 00 08 00 08 00 36 00 37 00 38 00 39 00 3A 00 3B 00 3C 00 3D 00 3E 00 08 00 3F 00 00 00 01 00 02 00 03 00 04 00 05 00 06 00 07 00 08 00 08 00 37 00 38 00 39 00 3A 00 3B 00 3C 00 3D 00 3E 00 08 00 3F 00 00 00 01 00 02 00 03 00 04 00 05 00 06 00 07 00 08 00 08 00 09 00 0A 00 0B 00 0C 00 0D 00 08 00 08 00 08 00 08 00 0E 00 02 00 0F 00 10 00 11 00 12 00 08 00 13 00 14 00 15 00 08 00 09 00 0A 00 0B 00 0C 00 0D 00 08 00 08 00 08 00 08 00 0E 00 02 00 0F 00 10 00 11 00 12 00 08 00 13 00 14 00 15 00 08 00 16 00 17 00 18 00 19 00 08 00 08 00 08 00 08 00 08 00 1A 00 1B 00 1C 00 02 00 1D 00 1E 00 1F 00 20 00 21 00 22 00 23 00 16 00 17 00 18 00 19 00 08 00 08 00 08 00 08 00 08 00 1A 00 1B 00 1C 00 02 00 1D 00 1E 00 1F 00 20 00 21 00 22 00 23 00 08 00 24 00 25 00 26 00 27 00 28 00 08 00 08 00 08 00 29 00 2A 00 03 00 2B 00 2C 00 2D 00 2E 00 2F 00 30 00 31 00 24 00 08 00 24 00 25 00 26 00 27 00 28 00 08 00 08 00 08 00 29 00 2A 00 03 00 2B 00 2C 00 2D 00 2E 00 2F 00 30 00 31 00 24 00 02 00 03 00 04 00 32 00 33 00 34 00 35 00 08 00 08 00 36 00 37 00 38 00 39 00 3A 00 3B 00 3C 00 3D 00 3E 00 08 00 3F 00 02 00 03 00 04 00 32 00 33 00 34 00 35 00 08 00 08 00 36 00 37 00 38 00 39 00 3A 00 3B 00 3C 00 3D 00 3E 00 08 00 3F 00 00 00 01 00 02 00 03 00 04 00 05 00 06 00 07 00 08 00 08 00 09 00 0A 00 0B 00 0C 00 0D 00 08 00 08 00 08 00 08 00 0E 00 00 00 01 00 02 00 03 00 04 00 05 00 06 00 07 00 08 00 08 00 09 00 0A 00 0B 00 0C 00 0D 00 08 00 08 00 08 00 08 00 0E 00 02 00 0F 00 10 00 11 00 12 00 08 00 13 00 14 00 15 00 08 00 16 00 17 00 18 00 19 00 08 00 08 00 08 00 08 00 08 00 1A FF FF FF FF",
            "DD DD DD DC DD DD DC BB DD DC BB CD DC BB CD DD BB CD DD DD CD DD DD DD DD DD DD DD DD DD DD DD BB CD DD DD CD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DE DD DD DE FF DD DE FF ED DE FB DF FD DD DD DD DE DD DD DE FF DD DE FF ED DE FF ED DD FF ED DD DD ED DD DD DD DD DD DD DD DD DD DD DD FF ED DD DD ED DD DD DD DD DD DD DD DD DD DD DD DD DD DD DC DD DD DC BB DD DC BB CD DC BB CD DD DD DB DD DD DD DB DD DD DD DB DD DD DC BB DD DD BB CD DD DD CD DD DD DD DD DD DD DD DD DD DD DD DD EF ED DD DD DD FF DD DD DD DE FE DD DD DD DF DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DC DD DD DD DD DD DD DD DD FD DD DD DD EF ED DD DD DD FF DD DD DD DE FE DD DD DD DF FE BC DD DD DD DB BD DD DD DD CB CD DD DD DD BB CD DD DD DC BB DD DD DC BB DD DC BB CD DC BB CD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD EF ED DD DD FE DD DC BB FD DD BB CD FE DD BC DD EF DD CB DE DF ED DC EF DE FD DD DD DD FE DD DC DD BD EF DD CD BD DF ED BB DD DE FD DE FF DD FE FF EC BD EF ED DD BC DF DC DD CB DE BB ED DB CD DF ED DC BC DD DC BB CD DD BB CD DD DD BD DD DD DD CB DD DD ED DB CD DD FD DC BD DD FE DD BC DD DD EF DD CB DD DF ED DD DD DE FD DD DD DD FE DC DD DD DC BB DD DD DD DD DD DD DD DD DD DD DD DD EE DD CB DD DD DC BC DD DC BB CD DD BB CD DD DD CD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD BB CD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DE DD DD DE FF DD DE FF ED DE FF ED DD FF EB DD DF ED DB DD DD DD DB DD DD DD DB DD DD DD DB DD DD DD DB DD DD DD DB DD DD DC BB DD DD ED DD DD DD FF DD DD DD DE FE DD DD DD DF FD DD DD DD EF ED DD DD DD FF DD DD DD DE DD DD DD DD DC BC DD DD DD CB BD DD DD DD CB CD DD DD DD BB DD DD DD DC DD DD DD DD FE DD DD DD DF DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD BC DD DD DD DB BC DD DD DD CB DD DD DD DB DD DD DD DD DD DF DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD ED DD DD EF FB DD EF FE DB BB CD DD DD DD DD DD EF DD DD EF FE DD EF FE DD DE FE DD DD DF ED DD CB DF DD DB BC CF ED DB DD DD DD DD DD FE CD DD DD DC BD DD DD DD BC DD DD DD DB DD DD BC DB DD DD DB BD DD DD DD EF FD DD DD DF EC BB DD DD DD DD DD DD DD EF DD DD EF FD DD DD DF ED DD DD DE FD DD DD DD FE DD DD DD DC CE FE DC BD DD EF DD BC FD EF DD DB EF FD DD CB DD DD DC BC DD DC BB CD DC BB CD DD BB CD DD DD EF DD DB DD DF EC BB CD DE FB CD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD FB CD DD DD FC BB FF ED DD DD FD DD DD DD FD DD DD DD FD DD DD DD FD DD DD DD FD DD DC FD FD DC BB FD FC BB CD FD DD DD DD DC DD DD DC BB DD DD DB CD DD DD DB DD DD DD DB DD DD DD DB DD DD DD DB DD DD DD DB DD BB CD DD DD CD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DE DD DD DE FF DD DE FF ED DE FF ED DD FF DD DD DD ED DD DD DD DD DD DD DD DD DD DD DD DD DD DD DC DD DD DC BB DD DC BB CD DC BB CD DD DD DB DD DD DD DB DD DD DD DB DD DD DC BB DD DD BB CD DD DD CD DD DD EF DD DD EF FE DD EF FE DD DD DD DD DD DD DD DD EF DD DD EF FE DD DD FE DD EF ED EF DD FE DB CF EC DD DC BD BB DD DD BC DD EF FE DD DC FE DD DD DC DD DD DC BB DD DD CB DD DC ED DB CD BB FD DC BD CD FE DD BC DD EF DD CB BE FD DC BD BD FE DD CF DD EF DD DD DD DF ED DD DD DD FE CB DD DD DD DD DD DD DD DE DD DD DE FF EF FE CB DD FE DD DB CD DD CD DC BD CB BE DD BC BC EF ED CB DD DE FD DB FF DE FD DD DE FF DD DC DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD CD DD DD DD BD DD DD DD BD DD DD DD CD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DE DD DD DE FF DD DE FF ED DE FF ED DD DD DD DD DD DD DD DD DD DD DD DD DD DE FB DD DD FF EB DD DD ED DB DD DD DD DB DD DD DD DB DD DD DD DD FD DC DD DD FD DD DD DD FD DD DD DD FD DD DD DD FD DD DD DD FD DD DD DD FD DD DD DD FD DD BC DD DD DD DB BD DD DD DD CB CD DD DD DD BB DD DD DD DC BC DD DD DD DB DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD BD DD DD DD CB CD DD DD DD BB DD DD BB CD DD FD DD DD DD FD DD DD DD FD DD DD DD FD DD DD DD FD DD DD DD FD DD DD DD FD DD DD DD FD DD DD DB DE DD DD DB FF DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DC DD DD DC BB DD DC BB CD DC BB CD DD BB CD DD DD CD DD DD DF DD DD DD EF DE FF DD EF BB CD DD DD CD DD DD DD DD DE FF CB DE FF ED DC FF ED DD DD ED DD DD DD DD DC BC ED DD DB CE FD DF FE DD DC DE FD DD BB DD FE DD BD BD EF DD CB BC DF ED DB CB DE FD DD DB CD FE DD DC BD EF DD BB ED CB DD CD FE DB CD DD DF DC BD DD EF DD BD EF FE DC BD FE DD CB CD DD DC BC DD DD DD CB BC DD DF ED DB DD DE FD DC DD DD FE DD DD DD EF DD DD DD DF ED DD DD DE FD DD DD DD FE DD DD DD EF CD DD DD FE BD DD DD EF BC DD DD DF CB DD DD DD DB CD DD DD DC BD DD DD DD BC DD DD DC BC DD DD DD DD DD CB DD DD CB BC ED CB BC DD CB BC DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD FD DD DD DD FD DD DD DD FD DD DD DD FD DD DD DD FD DD DD DD FD DD DD DE FD DD DE FF ED DD DD DD DD DD DD DD DD DD DD DD DD DD DD DB FD DD DD DB EF ED DD DB DD FF DD DB DD DE DD DB DD DD DD DC BC DD DD DD DB BD DD DD DD CB DD DD DD DD DD DD DD DD DD DD DD DD FE DD DD DD DF FD DD DD DD DD DD DD DD DD DD DD CD DD DD DD BB DD DD DD DC BC DD DD DD DB BD DD DD DD CB CD DD DD DD BB DD DD DD FD DD DD DD FD DD DD DD FD DD DD DD FD DD DD DD FC DD DD DD BB DD DD DD DD DD DD DD DD DD DD DD DC DD DD DC BB DD DC BB CD DC BB CD DD BB CD DD DD CD DD DE FF DD DE FF ED DE FF ED DD BB CD DD DE CD DD DE FF DD DE FF ED DD FF ED DD DD EF DD DB EC DF ED DB CB DE FD DC DB CD FE DD FF ED BC DF ED DD CB DF DD DD DB CE CB BE DC BD BC DF ED BC DD DD FD CB BD DE FD DB BE FF ED CB DD DB DD FE ED DB CD EF FD DC BD DF FE DD BC DE EF DD CB DD DF ED DB CD DE FD DC BD DD FE DD BC DD BC DF ED DD CB DE FD ED DB CD FE FD DC BD EF FE DD BC DF EF DD CB DE DF ED DB DD DF ED DB DD DC FE DD CB DC BF FE DD DD BC EF FE DD CB DD EF ED DB CD DD FD DD BD DD FE CB BC DD DE BC DD DD BC DD DD DF CB BC DD DD DD CB CD DD FC BD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD BC DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD DD FF ED DD DD FD DD DD DD FD DD DD DD FD DD DD DD FD DD DD DC FD DD DC BB FD DC BB CD FC BB CD DD" // Expected output as hex string
        );
    });
});


describe('Tile Decompressor', () => {
    
    test('0x0 - Literal Copy (3 bytes)', () => {
        testCommand(
            [], // empty initial output
            0x02, // command: 0x0, param: 2 (3 bytes)
            [0x66, 0x77, 0x88], // bytes to copy
            [0x66, 0x77, 0x88] // expected result
        );
    });
    
    test('0x3 - RLE (repeat byte 4 times)', () => {
        testCommand(
            [],
            0x31, // command: 0x3, param: 3 (4 times)
            [0xAA], // byte to repeat
            [0xAA, 0xAA, 0xAA, 0xAA] // expected result
        );
    });
    
    test('0x5 - Short Back Reference (copy last 2+2 bytes)', () => {
        testCommand(
            [0x11, 0x22, 0x33, 0x44], // initial output
            0x52, // command: 0x5, offset bits: 01 (2 bytes back), count bits: 01 (2 bytes)
            [], // no additional bytes
            "22 33 44 22" // expected result (bytes at positions -2 and -1)
        );
    });
    
    test('0x8 - Copy Back Reference Pattern (Sequence is 1+3 bytes long, copy pattern from 3 bytes back)', () => {
        testCommand(
            [0xAA, 0xBB, 0xCC, 0xDD], // initial output
            0x81, // command: 0x8, param: 1 (2 bytes)
            [0x03], // offset: 3 bytes back
            [0xBB, 0xCC, 0xDD, 0xBB] // expected result
        );
    });
    
    test('0x9 - Copy Back Reference ( (0*2)+1 bytes from offset 2+1 back)', () => {
        testCommand(
            [0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88], // initial output
            0x98, // command: 0x9, param: 0 (1 byte)
            [0x04], // offset: 2 bytes back
            "44 55 66 77 88 44 55 66 77 88 44 55 66 77 88 44 55 66 77 88" // expected result
        );
    });
    
    // test('0xC - Fixed Back Reference (3 bytes from 32 back)', () => {
    //     const initialOutput = new Array(35).fill(0).map((_, i) => i < 32 ? 0x10 + (i % 16) : 0xFF);
    //     testCommand(
    //         initialOutput, // 32 bytes + 3 more
    //         0xC2, // command: 0xC, param: 2 (3 bytes)
    //         [], // no additional bytes
    //         [0x10, 0x11, 0x12] // expected result (first 3 bytes from 32 positions back)
    //     );
    // });
    
    test('0x3 - RLE Single Byte (repeat 3 times)', () => {
        testCommand(
            [],
            0x30, // command: 0x3, param: 0 (1 time)
            [0xFF],
            "FF FF FF"
        );
    });
    
    // test('Overlapping Back Reference (pattern repeat)', () => {
    //     testCommand(
    //         [0xAB, 0xCD],
    //         0x83, // copy 4 bytes from 2 bytes back
    //         [0x02],
    //         [0xAB, 0xCD, 0xAB, 0xCD] // should repeat the pattern
    //     );
    // });
    
    test('0x0 - Literal Copy single byte', () => {
        testCommand(
            [],
            0x00, // command: 0x0, param: 0 (1 byte)
            [0x42],
            [0x42]
        );
    });
    
    test('0x5 - Short Back Reference minimum values', () => {
        testCommand(
            [0xFF, 0xEE, 0xFF, 0xEE, 0xFF, 0xEE, 0xFF, 0xEE],
            0x50, // command: 0x5, offset: 1 byte back, count: 1 byte
            [],
            [0xEE, 0xFF]
        );
    });
    
    test('Error: Back reference out of bounds', () => {
        const decompressor = new TileDecompressor();
        decompressor.setOutput([0x11, 0x22]);
        
        expect(() => {
            decompressor.processCommand(0x84, [0x05]); // try to copy from 5 bytes back
        }).toThrow(/Back reference out of bounds/);
    });
    
    test('Error: Not enough bytes for literal copy', () => {
        const decompressor = new TileDecompressor();
        
        expect(() => {
            decompressor.processCommand(0x02, [0x11]); // need 3 bytes, only provide 1
        }).toThrow(/Not enough bytes for literal copy/);
    });
    
    test('Error: Unknown command', () => {
        const decompressor = new TileDecompressor();
        
        expect(() => {
            decompressor.processCommand(0xF0, []); // command 0xF doesn't exist
        }).toThrow(/Unknown command: 0xf/);
    });

    describe('Command type parsing', () => {
        test('should correctly parse command 0x0X (literal)', () => {
            const decompressor = new TileDecompressor();
            const result = decompressor.processCommand(0x01, [0xAB, 0xCD]);
            expect(result.command).toBe('literal');
            expect(result.count).toBe(2);
        });

        test('should correctly parse command 0x3X (RLE)', () => {
            const decompressor = new TileDecompressor();
            const result = decompressor.processCommand(0x32, [0xFF]);
            expect(result.command).toBe('rle');
            expect(result.count).toBe(5);
            expect(result.byte).toBe(0xFF);
        });

        test('should correctly parse command 0x5X (short back ref)', () => {
            const decompressor = new TileDecompressor();
            decompressor.setOutput([0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77]);
            const result = decompressor.processCommand(0x55, []);
            expect(result.command).toBe('short_back_ref');
            expect(result.offset).toBe(3);
            expect(result.count).toBe(7);
        });

        test('should correctly parse command 0x8X (back ref with offset)', () => {
            const decompressor = new TileDecompressor();
            decompressor.setOutput([0x11, 0x22, 0x33, 0x44]);
            const result = decompressor.processCommand(0x81, [0x02]);
            expect(result.command).toBe('back_ref_8');
            expect(result.offset).toBe(2);
            expect(result.count).toBe(4);
        });

        test('should correctly parse command 0x9X (alt back ref with offset)', () => {
            const decompressor = new TileDecompressor();
            decompressor.setOutput([0x11, 0x22, 0x33, 0x44, 0x55, 0x66]);
            const result = decompressor.processCommand(0x98, [0x04]);
            expect(result.command).toBe('back_ref_9');
            expect(result.offset).toBe(5);
            expect(result.count).toBe(20);
        });

        test('should correctly parse command 0xCX (fixed back ref)', () => {
            const initialOutput = new Array(35).fill(0x10);
            const decompressor = new TileDecompressor();
            decompressor.setOutput(initialOutput);
            const result = decompressor.processCommand(0xC1, []);
            expect(result.command).toBe('backwards_ref');
            expect(result.offset).toBe(1);
            expect(result.count).toBe(3);
        });
    });
});

describe('Command Bytes Consumed test', () => {
    // 0x0 (literal) command followed by consumed = 0 command (0x5 short back ref)
    test('0x0 literal -> 0x5 short back ref (consumed 0)', () => {
        testCommandSequence(
            [0x10, 0x20, 0x30], // initial output with enough data for back ref
            0x01, [0x66, 0x77], // literal: copy 2 bytes
            0x52, [], // short back ref: copy last 2+2 bytes, offset bits: 01 (2 bytes back), count bits: 01 (2 bytes)
            [0x66, 0x77, 0x30, 0x66, 0x77, 0x30] // expected: literal bytes + back ref bytes // 66 77 20 30 66 77
        );
    });

    // 0x0 (literal) command followed by consumed = 1 command (0x3 RLE)
    test('0x0 literal -> 0x3 RLE (consumed 1)', () => {
        testCommandSequence(
            [], // empty initial output
            0x02, [0xAA, 0xBB, 0xCC], // literal: copy 3 bytes
            0x32, [0xFF], // RLE: repeat FF 5 times
            [0xAA, 0xBB, 0xCC, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF] // expected: literal + RLE
        );
    });

    // 0x3 (RLE) command followed by consumed = 0 command (0xC fixed back ref)
    test('0x3 RLE -> 0xC fixed back ref (consumed 0)', () => {
        // Create initial output with 32+ bytes for fixed back ref
        const initialOutput = new Array(35).fill(0x10).map((_, i) => i < 32 ? 0x20 + (i % 8) : 0xFF);
        console.log('Initial Output:', initialOutput);
        testCommandSequence(
            initialOutput,
            0x31, [0x99], // RLE: repeat 0x99 4 times
            0xC1, [], // fixed back ref: copy 2 bytes from 32 back
            [0x99, 0x99, 0x99, 0x99, 0x99, 0x99, 0x99] // RLE bytes + first 2 from 32 back
        );
    });

    // 0x3 (RLE) command followed by consumed = 1 command (0x8 back ref)
    test('0x3 RLE -> 0x8 back ref (consumed 1)', () => {
        testCommandSequence(
            [0x11, 0x22, 0x33, 0x44], // initial output for back ref
            0x30, [0x88], // RLE: repeat 0x88 3 times
            0x81, [0x04], // back ref: copy pattern from 3 bytes back, count 4
            [0x88, 0x88, 0x88, 0x44, 0x88, 0x88, 0x88] // RLE + back ref pattern
        );
    });

    // 0x5 (short back ref) command followed by consumed = 0 command (0xC fixed back ref)
    test('0x5 short back ref -> 0xC fixed back ref (consumed 0)', () => {
        // Create initial output with enough data
        const initialOutput = new Array(40).fill(0).map((_, i) => i < 32 ? 0x30 + (i % 8) : 0x40 + (i % 4));
        console.log('Initial Output:', initialOutput);
        testCommandSequence(
            initialOutput,
            0x53, [], // short back ref: copy from 3+2=5 bytes back, count 3+2=5
            0xC2, [], // fixed back ref: copy 3 bytes from 32 back
            "41 42 43 41 42 42 41 43 42" // short back ref + fixed back ref
        );
    });

    // 0x5 (short back ref) command followed by consumed = 1 command (0x9 alt back ref)
    test('0x5 short back ref -> 0x9 alt back ref (consumed 1)', () => {
        testCommandSequence(
            [0x11, 0x22, 0x33, 0x44, 0x55, 0x66], // initial output
            0x51, [], // short back ref: copy from 1+2=3 bytes back, count 1+2=3
            0x98, [0x05], // alt back ref: copy (2*2)+1=5 bytes from (2+1)=3 bytes back
            "44 55 66 44 55 66 44 55 66 44 55 66 44 55 66 44 55 66 44 55 66 44 55" // short back ref + alt back ref
        );
    });

    // 0x8 (back ref) command followed by consumed = 0 command (0x5 short back ref)
    test('0x8 back ref -> 0x5 short back ref (consumed 0)', () => {
        testCommandSequence(
            [0xAA, 0xBB, 0xCC, 0xDD, 0xEE], // initial output
            0x80, [0x03], // back ref: copy pattern from 3 bytes back, count 3
            0x52, [], // short back ref: copy from 2+2=4 bytes back, count 2+2=4
            "CC DD EE CC DD EE CC" // back ref + short back ref
        );
    });

    // 0x8 (back ref) command followed by consumed = 1 command (0x3 RLE)
    test('0x8 back ref -> 0x3 RLE (consumed 1)', () => {
        testCommandSequence(
            [0x77, 0x88, 0x99], // initial output
            0x81, [0x02], // back ref: copy pattern from 2 bytes back, count 4
            0x31, [0xAA], // RLE: repeat AA 4 times
            [0x88, 0x99, 0x88, 0x99, 0xAA, 0xAA, 0xAA, 0xAA] // back ref + RLE
        );
    });

    // 0x9 (alt back ref) command followed by consumed = 0 command (0xC fixed back ref)
    test('0x9 alt back ref -> 0xC fixed back ref (consumed 0)', () => {
        // Create initial output with 32+ bytes
        const initialOutput = new Array(36).fill(0).map((_, i) => i < 32 ? 0x50 + (i % 8) : 0x60 + (i % 4));
        console.log('Initial Output:', initialOutput);
        testCommandSequence(
            initialOutput,
            0x98, [0x05], // alt back ref: copy (1*2)+1=3 bytes from (1+1)=2 bytes back
            0xC1, [], // fixed back ref: copy 2 bytes from 32 back
            "56 57 60 61 62 63 56 57 60 61 62 63 56 57 60 61 62 63 56 57 57 56 63" // alt back ref + fixed back ref
        );
    });

    // 0x9 (alt back ref) command followed by consumed = 1 command (0x8 back ref)
    test('0x9 alt back ref -> 0x8 back ref (consumed 1)', () => {
        testCommandSequence(
            [0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77], // initial output
            0x98, [0x05], // alt back ref: copy (0*2)+1=1 byte from (2+1)=3 bytes back
            0x80, [0x02], // back ref: copy pattern from 2 bytes back, count 3
            "22 33 44 55 66 77 22 33 44 55 66 77 22 33 44 55 66 77 22 33 22 33 22" // alt back ref + back ref
        );
    });

    // Additional test to avoid same command twice: 0xC followed by 0x0
    test('0xC fixed back ref -> 0x0 literal (consumed varies)', () => {
        const initialOutput = new Array(34).fill(0).map((_, i) => i < 32 ? 0x70 + (i % 8) : 0x80 + i);
        console.log('Initial Output:', initialOutput);
        testCommandSequence(
            initialOutput,
            0xC0, [], // fixed back ref: copy 1 byte from 32 back
            0x01, [0xFE, 0xFD], // literal: copy 2 bytes
            "A1 A0 FE FD" // fixed back ref + literal
        );
    });

    // Edge case: commands that produce overlapping patterns
    test('0x3 RLE -> 0x8 back ref with overlap', () => {
        testCommandSequence(
            [0x01, 0x02], // minimal initial output
            0x30, [0xAB], // RLE: repeat AB 3 times
            0x82, [0x04], // back ref: copy pattern from 4 bytes back, count 5
            [0xAB, 0xAB, 0xAB, 0x02, 0xAB, 0xAB, 0xAB, 0x02] // RLE + overlapping back ref
        );
    });
});

describe('Hex String Input Tests', () => {
    
    test('Literal Copy using hex strings', () => {
        testCommand(
            "", // empty initial output as hex string
            0x02, // command: 0x0, param: 2 (3 bytes)
            [0x66, 0x77, 0x88], // bytes to copy
            "667788" // expected result as hex string
        );
    });
    
    test('RLE using hex strings', () => {
        testCommand(
            "",
            0x31, // command: 0x3, param: 3 (4 times)
            [0xAA], // byte to repeat
            "AAAAAAAA" // expected result as hex string
        );
    });
    
    test('Short Back Reference using hex strings', () => {
        testCommand(
            "11223344556677", // initial output as hex string
            0x55, // command: 0x5, offset bits: 01 (2 bytes back), count bits: 01 (2 bytes)
            [], // no additional bytes
            "55 66 77 55 66 77 55" // expected result as hex string
        );
    });
    
    test('Copy Back Reference Pattern with hex strings and spaces', () => {
        testCommand(
            "AA BB CC DD", // initial output with spaces
            0x81, // command: 0x8, param: 1 (2 bytes)
            [0x03], // offset: 3 bytes back
            "BB CC DD BB" // expected result with spaces
        );
    });
    
    // test('Complex pattern with hex strings', () => {
    //     testCommand(
    //         "66 66 66 66 65 55 55 55 65 44 44 44 65 47 77 77",
    //         0x83, // copy 4 bytes from 2 bytes back
    //         [0x02],
    //         "77 77 77 77" // should repeat the last two 77s
    //     );
    // });
    
    test('Mixed array and hex string inputs', () => {
        testCommand(
            [0x11, 0x22, 0x33, 0x44, 0x11, 0x22, 0x33, 0x44], // initial output as array
            0x55,
            [],
            "22 33 44 22 33 44 22" // expected result as hex string
        );
    });
    
    test('Error handling for invalid hex strings', () => {
        expect(() => {
            testCommand(
                "ZZ", // invalid hex
                0x30,
                [0xFF],
                "FF"
            );
        }).toThrow(/Invalid hex byte/);
    });
    
    test('Error handling for odd length hex strings', () => {
        expect(() => {
            testCommand(
                "ABC", // odd length
                0x30,
                [0xFF],
                "FF"
            );
        }).toThrow(/Invalid hex string length/);
    });
    
});

describe('ronbarr.map.jzip decompression', () => {
    
    test('31 66 - RLE (repeat 66, 4 times)', () => {
        testCommand(
            "", // empty initial output
            0x31, // command: 0x3, param: 3 (4 times)
            [0x66], // byte to repeat
            "66 66 66 66" // expected result
        );
    });
    
    test('00 65 - Literal Copy, 1 byte', () => {
        testCommand(
            "66 66 66 66",
            0x00, // command: 0x0, param: 0 (1 byte)
            [0x65],
            "65"
        );
    });

    test('30 55 - RLE (repeat 55, 3 times)', () => {
        testCommand(
            "66 66 66 66 65", // empty initial output
            0x30,
            [0x55], // byte to repeat
            "55 55 55" // expected result
        );
    });

    test('03 65 47 77 77 - Literal Copy, 3 bytes', () => {
        testCommand(
            "66 66 66 66 65 55 55 55 65 44 44 44",
            0x03,
            "65 47 77 77", // bytes to copy
            "65 47 77 77"
        );
    });

    test('8D 04 - Copy Back Reference Pattern (Sequence is 0xD+3 bytes long, copy pattern from 4 bytes back)', () => {
        testCommand(
            "66 66 66 66 65 55 55 55 65 44 44 44 65 47 77 77", // initial output
            0x8D, // command: 0x8, param: D (D+3 bytes)
            [0x04], // offset: 4 bytes back
            "65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77" // expected result
        );
    });
    
    test('3F 77 - RLE (repeat 77, 0xF+3 times)', () => {
        testCommand(
            "", // empty initial output
            0x3F,
            [0x77], // byte to repeat
            "77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77" // expected result
        );
    });

    test('9B 1F - Copy Back Reference ( (B*2)+1 bytes from offset 1F+1 back)', () => {
        testCommand(
            "66 66 66 66 65 55 55 55 65 44 44 44 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77", // initial output
            0x9B, // command: 0x9, param: 0 (1 byte)
            [0x1F], // offset: 2 bytes back
            "77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77" // expected result
        );
    });

    test('0x51 - Short Back Reference (copy from last upper+3 bytes, repeat lower times)', () => {
        testCommand(
            "66 66 66 66 65 55 55 55 65 44 44 44 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 18",
            0x51, // command: 0x5, offset: 1 byte back, count: 1 byte
            [],
            "77 77 18"
        );
    });

    test('8A 20 - Copy Back Reference Pattern (Sequence is A+3 bytes long, copy pattern from 20 bytes back)', () => {
        testCommand(
            "66 66 66 66 65 55 55 55 65 44 44 44 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 18 77 77 18 88 77 18 88 92", // initial output
            0x8A, // command: 0x8, param: 0xA (0xA+3 = 0xD = 13 bytes)
            [0x20], // offset: 0x20 = 32 bytes back
            "66 66 66 66 55 55 55 55 44 44 44 44 77" // expected result
        );
    });

    // 0E 22 28 82 22 33 32 22 34 44 32 98 22 99 98 88 
    // 89 20 
    // 01 99 88 
    // 68 
    test('0x68 (8 -> 2, 0) - Back Reference (copy 0+2 bytes from 2+2 bytes back)', () => {
        testCommand(
            "66 66 66 66 65 55 55 55 65 44 44 44 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 18 77 77 18 88 77 18 88 92 66 66 66 66 55 55 55 55 44 44 44 44 77 11 11 11 11 22 28 82 22 33 32 22 34 44 32 98 22 99 98 88 66 66 66 66 55 55 55 55 44 44 44 44 11 77 77 77 99 88",
            0x68, // command: 0x5, offset: 1 byte back, count: 1 byte
            [],
            "11 77"
        );
    });
    // 04 98 11 18 77 81 
    // 34 11 
    // 9C FF
    test('9C FF - Copy Back Reference ( (C*2)+1 bytes from offset FF+1 back)', () => {
        testCommand(
            "66 66 66 66 65 55 55 55 65 44 44 44 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 18 77 77 18 88 77 18 88 92 66 66 66 66 55 55 55 55 44 44 44 44 77 11 11 11 11 22 28 82 22 33 32 22 34 44 32 98 22 99 98 88 66 66 66 66 55 55 55 55 44 44 44 44 11 77 77 77 99 88 11 77 98 11 18 77 81 11 11 11 11 11 11 11", // initial output
            0x9C, // command: 0x9, param: 0 (1 byte)
            [0xFF], // offset: 2 bytes back -- end position = 0x64, start position = 0x80
            "66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77" // expected result -- count = 28
        );
    });
    // 82 80 
    // 07 21 44 44 43 21 77 77 73 
    // 8E 04 
    // 8F D4 
    // 8B 04 
    // 38 77 
    // 83 B8 
    test('83 B8 - Copy Back Reference Pattern (Sequence is 3+3 bytes long, copy pattern from B8 bytes back)', () => {
        testCommand(
            "66 66 66 66 65 55 55 55 65 44 44 44 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 18 77 77 18 88 77 77 18 92 66 66 66 66 55 55 55 55 44 44 44 44 77 11 11 11 11 22 28 82 22 33 32 22 34 44 32 98 22 99 98 88 66 66 66 66 55 55 55 55 44 44 44 44 11 77 77 77 99 88 11 77 98 11 18 77 81 11 11 11 11 11 11 11 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 82 87 77 77 66 66 66 61 55 55 55 21 44 44 43 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 77 77 77 77 77 77 77 77 77 77 77 71", // initial output
            0x83, // command: 0x8, param: 0xA (0xA+3 = 0xD = 13 bytes)
            [0xB8], // offset: 0x20 = 32 bytes back
            "77 77 77 18 77 77" // expected result
        );
    });
    // 5E
    test('0x5E - Short Back Reference (copy from last upper+3 bytes, repeat lower times)', () => {
        testCommand(
            "66 66 66 66 65 55 55 55 65 44 44 44 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 18 77 77 18 88 77 18 88 92 66 66 66 66 55 55 55 55 44 44 44 44 77 11 11 11 11 22 28 82 22 33 32 22 34 44 32 98 22 99 98 88 66 66 66 66 55 55 55 55 44 44 44 44 11 77 77 77 99 88 11 77 98 11 18 77 81 11 11 11 11 11 11 11 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 82 87 77 77 66 66 66 61 55 55 55 21 44 44 43 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 77 77 77 77 77 77 77 77 77 77 77 71 77 77 77 18 77 77",
            0x5E, // command: 0x5, offset: 1 byte back, count: 1 byte -> E -> 11 10 -> 3, 2
            [],
            "77 18 77 77 77 18 77 77"
        );
    });

    // 80 8F
    test('80 8F - Copy Back Reference Pattern (Sequence is 0+3 bytes long, copy pattern from 8F bytes back)', () => {
        testCommand(
            "66 66 66 66 65 55 55 55 65 44 44 44 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 18 77 77 18 88 77 77 18 92 66 66 66 66 55 55 55 55 44 44 44 44 77 11 11 11 11 22 28 82 22 33 32 22 34 44 32 98 22 99 98 88 66 66 66 66 55 55 55 55 44 44 44 44 11 77 77 77 99 88 11 77 98 11 18 77 81 11 11 11 11 11 11 11 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 82 87 77 77 66 66 66 61 55 55 55 21 44 44 43 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 77 77 77 77 77 77 77 77 77 77 77 71 77 77 77 18 77 77 77 18 77 77 77 18 77 77 71", // initial output
            0x80, // command: 0x8, param: 0xA (0xA+3 = 0xD = 13 bytes)
            [0x8F], // offset: 0x20 = 32 bytes back
            "11 77 77" // expected result
        );
    });

    // CC
   test('CC - Copy Back Reference Backwards (Copy 0+2 bytes backwards from offset 3)', () => {
        testCommand(
            "66 66 66 66 65 55 55 55 65 44 44 44 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 18 77 77 18 88 77 77 18 92 66 66 66 66 55 55 55 55 44 44 44 44 77 11 11 11 11 22 28 82 22 33 32 22 34 44 32 98 22 99 98 88 66 66 66 66 55 55 55 55 44 44 44 44 11 77 77 77 99 88 11 77 98 11 18 77 81 11 11 11 11 11 11 11 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 82 87 77 77 66 66 66 61 55 55 55 21 44 44 43 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 77 77 77 77 77 77 77 77 77 77 77 71 77 77 77 18 77 77 77 18 77 77 77 18 77 77 71 11 77 77 11", // initial output
            0xCC, // command: 0x8, param: 0xA (0xA+3 = 0xD = 13 bytes)
            [], // offset: 0x20 = 32 bytes back
            "11 71" // expected result
        );
    });

    // 58 -> 1000 -> 2, 0
    test('58 - Short Back Reference (copy from last upper+3 bytes, repeat lower times)', () => {
        testCommand(
            "66 66 66 66 65 55 55 55 65 44 44 44 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 18 77 77 18 88 77 18 88 92 66 66 66 66 55 55 55 55 44 44 44 44 77 11 11 11 11 22 28 82 22 33 32 22 34 44 32 98 22 99 98 88 66 66 66 66 55 55 55 55 44 44 44 44 11 77 77 77 99 88 11 77 98 11 18 77 81 11 11 11 11 11 11 11 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 82 87 77 77 66 66 66 61 55 55 55 21 44 44 43 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 77 77 77 77 77 77 77 77 77 77 77 71 77 77 77 18 77 77 77 18 77 77 77 18 77 77 71 11 77 77 11 11 71 88 89 22 18",
            0x58, // command: 0x5, offset: 1 byte back, count: 1 byte -> E -> 11 10 -> 3, 2
            [],
            "88 89"
            // 03 88 89 22 18   58      08 99 88 88 81 11 88 11 11 18 
            //    88 89 22 18   88 89      99 88 88 81 11 88 11 11 18

            // If param = 1 then copy last 3 bytes, repeat 1 time
            // If param = 8 then copy last 2 bytes, repeat 1 time
            // If param = E then copy last 4 bytes, repeat 2 times

            // If param = 1 then copy from offset 3, length 3
            // If param = 8 then copy from offset 4, length 2
            // If param = E then copy from offset 8, length 8
        );
    });

    // 48 -> 10 00 -> 2, 0
    test('48 - Short Back Reference (copy from last 2 bytes, length 0+2)', () => {
        testCommand(
            "66 66 66 66 65 55 55 55 65 44 44 44 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 18 77 77 18 88 77 18 88 92 66 66 66 66 55 55 55 55 44 44 44 44 77 11 11 11 11 22 28 82 22 33 32 22 34 44 32 98 22 99 98 88 66 66 66 66 55 55 55 55 44 44 44 44 11 77 77 77 99 88 11 77 98 11 18 77 81 11 11 11 11 11 11 11 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 82 87 77 77 66 66 66 61 55 55 55 21 44 44 43 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 77 77 77 77 77 77 77 77 77 77 77 71 77 77 77 18 77 77 77 18 77 77 77 18 77 77 71 11 77 77 11 11 71 88 89 22 18 88 89 99 88 88 81 11 88 11 11 18",
            0x48, // command: 0x5, offset: 1 byte back, count: 1 byte -> E -> 11 10 -> 3, 2
            [],
            "11 18"
        );
    });

    // 12 89 AB 11 AC CD DC 18 BD DD DD 8A DD EE EE 99 98 11 88 81
    test('12 - Extended Literal Copy, 2+17 bytes', () => {
        testCommand(
            "66 66 66 66 65 55 55 55 65 44 44 44 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 18 77 77 18 88 77 18 88 92 66 66 66 66 55 55 55 55 44 44 44 44 77 11 11 11 11 22 28 82 22 33 32 22 34 44 32 98 22 99 98 88 66 66 66 66 55 55 55 55 44 44 44 44 11 77 77 77 99 88 11 77 98 11 18 77 81 11 11 11 11 11 11 11 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 82 87 77 77 66 66 66 61 55 55 55 21 44 44 43 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 77 77 77 77 77 77 77 77 77 77 77 71 77 77 77 18 77 77 77 18 77 77 77 18 77 77 71 11 77 77 11 11 71 88 89 22 18 88 89 99 88 88 81 11 88 11 11 18 11 18 89 AB 11 AC CD DC 18 BD DD DD 8A DD EE EE 99 98 11 88 81",
            0x12,
            "89 AB 11 AC CD DC 18 BD DD DD 8A DD EE EE 99 98 11 88 81", // bytes to copy
            "89 AB 11 AC CD DC 18 BD DD DD 8A DD EE EE 99 98 11 88 81"
        );
    });

    // E0 37
    test('E0 37 - Copy Back Reference Backwards Extended (Copy 0+3 bytes backwards from offset 37)', () => {
        testCommand(
            "66 66 66 66 65 55 55 55 65 44 44 44 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 18 77 77 18 88 77 18 88 92 66 66 66 66 55 55 55 55 44 44 44 44 77 11 11 11 11 22 28 82 22 33 32 22 34 44 32 98 22 99 98 88 66 66 66 66 55 55 55 55 44 44 44 44 11 77 77 77 99 88 11 77 98 11 18 77 81 11 11 11 11 11 11 11 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 82 87 77 77 66 66 66 61 55 55 55 21 44 44 43 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 77 77 77 77 77 77 77 77 77 77 77 71 77 77 77 18 77 77 77 18 77 77 77 18 77 77 71 11 77 77 11 11 71 88 89 22 18 88 89 99 88 88 81 11 88 11 11 18 11 18 89 AB 11 AC CD DC 18 BD DD DD 8A DD EE EE 99 98 11 88 81 81 11 11 18 88 88 9A 9A AB BC CC CC CC CD DD DD DD DD DD DD FF 66 FE EF F6 66 FF", // initial output
            0xE0, // command: 0x8, param: 0xA (0xA+3 = 0xD = 13 bytes)
            [0x37], // offset: 0x20 = 32 bytes back
            "88 88 99" // expected result
        );
    });

    // E1 18

    //00 17     6B                  8F F4                                                   8B 04      
    //17        77 77 77 77 77      73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21   77 77 73 21 77 77 73 21 77 77 73 21 77 77  

    //E2 C3             9B 03                                                                           00 8C     30 DD       00 9A
    //11 11 77 77 11    11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11      8C        DD DD DD    9A

    // 9B 03 - $21F
    test('9B 03 - Copy Back Reference ( (B*2)+1 bytes from offset 3+1 back)', () => {
        testCommand(
            "66 66 66 66 65 55 55 55 65 44 44 44 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 18 77 77 18 88 77 18 88 92 66 66 66 66 55 55 55 55 44 44 44 44 77 11 11 11 11 22 28 82 22 33 32 22 34 44 32 98 22 99 98 88 66 66 66 66 55 55 55 55 44 44 44 44 11 77 77 77 99 88 11 77 98 11 18 77 81 11 11 11 11 11 11 11 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 82 87 77 77 66 66 66 61 55 55 55 21 44 44 43 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 77 77 77 77 77 77 77 77 77 77 77 71 77 77 77 18 77 77 77 18 77 77 77 18 77 77 71 11 77 77 11 11 71 88 89 22 18 88 89 99 88 88 81 11 88 11 11 18 11 18 89 AB 11 AC CD DC 18 BD DD DD 8A DD EE EE 99 98 11 88 81 81 11 11 18 88 88 9A 9A AB BC CC CC CC CD DD DD DD DD DD DD FF 66 FE EF F6 66 FF 88 88 99 98 88 89 AC CA CC CC CC CB DD DD CD CC DD DD DE DC DE EE ED ED EE EE ED ED FF FF FE DD 18 81 17 77 81 81 11 77 A8 82 21 77 B8 11 21 17 CA 81 12 17 CB A1 12 11 DC A1 11 11 DC B8 11 21 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 17 77 77 77 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 11 11 77 77 11", // initial output
            0x9B, // command: 0x9, param: 0 (1 byte)
            [0x03], // offset: 2 bytes back -- end position = 0x64, start position = 0x80
            "11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11" // expected result -- count = 28
        );
    });


    // 02 DD DE 8A  79          03 8B CD DE ED
    // DD DE 8A     CD DD DD    8B CD DE ED

    // 79
    test('79 - Short Back Reference (copy from offset 2+6, length = 1+2)', () => {
        testCommand(
            "66 66 66 66 65 55 55 55 65 44 44 44 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 18 77 77 18 88 77 18 88 92 66 66 66 66 55 55 55 55 44 44 44 44 77 11 11 11 11 22 28 82 22 33 32 22 34 44 32 98 22 99 98 88 66 66 66 66 55 55 55 55 44 44 44 44 11 77 77 77 99 88 11 77 98 11 18 77 81 11 11 11 11 11 11 11 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 82 87 77 77 66 66 66 61 55 55 55 21 44 44 43 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 77 77 77 77 77 77 77 77 77 77 77 71 77 77 77 18 77 77 77 18 77 77 77 18 77 77 71 11 77 77 11 11 71 88 89 22 18 88 89 99 88 88 81 11 88 11 11 18 11 18 89 AB 11 AC CD DC 18 BD DD DD 8A DD EE EE 99 98 11 88 81 81 11 11 18 88 88 9A 9A AB BC CC CC CC CD DD DD DD DD DD DD FF 66 FE EF F6 66 FF 88 88 99 98 88 89 AC CA CC CC CC CB DD DD CD CC DD DD DE DC DE EE ED ED EE EE ED ED FF FF FE DD 18 81 17 77 81 81 11 77 A8 82 21 77 B8 11 21 17 CA 81 12 17 CB A1 12 11 DC A1 11 11 DC B8 11 21 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 17 77 77 77 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 8C DD DD DD 9A CD DD DD 89 CD DD DD 89",
            0x79, 
            [],
            "CD DD DD"
        );
    });

    // mismatch at output $284 

    // input $15F-$178; output $284-$2C5
    // 01 CC 91     78      02 CD A1 11     81 C4   5A  80 8D    99 03  8B B0
    // CC 91        11 DC   CD A1 11        17 77 77 77 17 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 77 77 11 11 77 77 11 11 77 77 11 11 77 77
    // 01 19 91    58       01 7A C1    59          00 CA
    // 19 91       77 77    7A C1       77 77 7A    CA      77 77 79 CA
    // 79 -> offset -8, length 3 | 9 -> 10 01 -> 2, 1
    // 78 -> offset -8, length 2 | 8 -> 10 00 -> 2, 0
    test('78 - Short Back Reference (copy from offset 2+6, length = 0+2)', () => {
        testCommand(
            "66 66 66 66 65 55 55 55 65 44 44 44 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 18 77 77 18 88 77 18 88 92 66 66 66 66 55 55 55 55 44 44 44 44 77 11 11 11 11 22 28 82 22 33 32 22 34 44 32 98 22 99 98 88 66 66 66 66 55 55 55 55 44 44 44 44 11 77 77 77 99 88 11 77 98 11 18 77 81 11 11 11 11 11 11 11 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 82 87 77 77 66 66 66 61 55 55 55 21 44 44 43 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 77 77 77 77 77 77 77 77 77 77 77 71 77 77 77 18 77 77 77 18 77 77 77 18 77 77 71 11 77 77 11 11 71 88 89 22 18 88 89 99 88 88 81 11 88 11 11 18 11 18 89 AB 11 AC CD DC 18 BD DD DD 8A DD EE EE 99 98 11 88 81 81 11 11 18 88 88 9A 9A AB BC CC CC CC CD DD DD DD DD DD DD FF 66 FE EF F6 66 FF 88 88 99 98 88 89 AC CA CC CC CC CB DD DD CD CC DD DD DE DC DE EE ED ED EE EE ED ED FF FF FE DD 18 81 17 77 81 81 11 77 A8 82 21 77 B8 11 21 17 CA 81 12 17 CB A1 12 11 DC A1 11 11 DC B8 11 21 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 17 77 77 77 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 8C DD DD DD 9A CD DD DD 89 CD DD DD 89 CD DD DD 89 CD DD DE 8A CD DD DD 8B CD DE ED 8B DD DF 66 FF 66 66 66 DE EE EE EE DD DD DD DD DD DD DD EE EE DD EE EF DE EE FF FF DE EE EE EE FD DD DD DD FF FF EE DD DE EE DD DD DD DD DE EE EE EE EE FE FF F6 6F FE 66 66 FF EE FF FF FF FD DD CC CC CC DD C9 11 11 DD C9 81 11 DD C9 81 11 ED C9 81 11 DC C9 81 11 DC CA 81 11 DD CC 91",
            0x78, 
            [],
            "11 DC"
        );
    });

    // mismatch at input $16D, output $2A8
    // 80 8D     99 03                                                                  8B B0                                01 19 91
    // 11 77 77  77 11 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 77 77   11 11 77 77 11 11 77 77 11 11 77 77  19 91

    // 9B 1F -> 25 in length
    // 9C FF -> 28 in length
    // 9B 03 -> 25 in length
    // 99 03 -> should be 23 in length
    test('99 03 - Copy Back Reference ( 6 * Math.floor(9 / 4) + (9 % 4) + 10 bytes from offset 3+1 back)', () => {
        testCommand(
            "66 66 66 66 65 55 55 55 65 44 44 44 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 18 77 77 18 88 77 18 88 92 66 66 66 66 55 55 55 55 44 44 44 44 77 11 11 11 11 22 28 82 22 33 32 22 34 44 32 98 22 99 98 88 66 66 66 66 55 55 55 55 44 44 44 44 11 77 77 77 99 88 11 77 98 11 18 77 81 11 11 11 11 11 11 11 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 82 87 77 77 66 66 66 61 55 55 55 21 44 44 43 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 77 77 77 77 77 77 77 77 77 77 77 71 77 77 77 18 77 77 77 18 77 77 77 18 77 77 71 11 77 77 11 11 71 88 89 22 18 88 89 99 88 88 81 11 88 11 11 18 11 18 89 AB 11 AC CD DC 18 BD DD DD 8A DD EE EE 99 98 11 88 81 81 11 11 18 88 88 9A 9A AB BC CC CC CC CD DD DD DD DD DD DD FF 66 FE EF F6 66 FF 88 88 99 98 88 89 AC CA CC CC CC CB DD DD CD CC DD DD DE DC DE EE ED ED EE EE ED ED FF FF FE DD 18 81 17 77 81 81 11 77 A8 82 21 77 B8 11 21 17 CA 81 12 17 CB A1 12 11 DC A1 11 11 DC B8 11 21 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 17 77 77 77 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 8C DD DD DD 9A CD DD DD 89 CD DD DD 89 CD DD DD 89 CD DD DE 8A CD DD DD 8B CD DE ED 8B DD DF 66 FF 66 66 66 DE EE EE EE DD DD DD DD DD DD DD EE EE DD EE EF DE EE FF FF DE EE EE EE FD DD DD DD FF FF EE DD DE EE DD DD DD DD DE EE EE EE EE FE FF F6 6F FE 66 66 FF EE FF FF FF FD DD CC CC CC DD C9 11 11 DD C9 81 11 DD C9 81 11 ED C9 81 11 DC C9 81 11 DC CA 81 11 DD CC 91 11 DC CD A1 11 17 77 77 77 17 77 77 77 11 77 77", // initial output
            0x99, // command: 0x9, param: 0 (1 byte)
            [0x03], // offset: 2 bytes back -- end position = 0x64, start position = 0x80
            "77 11 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77" // expected result -- count = 21
        );
    });

    // 8B B0
    test('8B B0 - Copy Back Reference Pattern (Sequence is B+3 bytes long, copy pattern from B0 bytes back)', () => {
        testCommand(
            "66 66 66 66 65 55 55 55 65 44 44 44 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 18 77 77 18 88 77 18 88 92 66 66 66 66 55 55 55 55 44 44 44 44 77 11 11 11 11 22 28 82 22 33 32 22 34 44 32 98 22 99 98 88 66 66 66 66 55 55 55 55 44 44 44 44 11 77 77 77 99 88 11 77 98 11 18 77 81 11 11 11 11 11 11 11 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 82 87 77 77 66 66 66 61 55 55 55 21 44 44 43 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 77 77 77 77 77 77 77 77 77 77 77 71 77 77 77 18 77 77 77 18 77 77 77 18 77 77 71 11 77 77 11 11 71 88 89 22 18 88 89 99 88 88 81 11 88 11 11 18 11 18 89 AB 11 AC CD DC 18 BD DD DD 8A DD EE EE 99 98 11 88 81 81 11 11 18 88 88 9A 9A AB BC CC CC CC CD DD DD DD DD DD DD FF 66 FE EF F6 66 FF 88 88 99 98 88 89 AC CA CC CC CC CB DD DD CD CC DD DD DE DC DE EE ED ED EE EE ED ED FF FF FE DD 18 81 17 77 81 81 11 77 A8 82 21 77 B8 11 21 17 CA 81 12 17 CB A1 12 11 DC A1 11 11 DC B8 11 21 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 17 77 77 77 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 8C DD DD DD 9A CD DD DD 89 CD DD DD 89 CD DD DD 89 CD DD DE 8A CD DD DD 8B CD DE ED 8B DD DF 66 FF 66 66 66 DE EE EE EE DD DD DD DD DD DD DD EE EE DD EE EF DE EE FF FF DE EE EE EE FD DD DD DD FF FF EE DD DE EE DD DD DD DD DE EE EE EE EE FE FF F6 6F FE 66 66 FF EE FF FF FF FD DD CC CC CC DD C9 11 11 DD C9 81 11 DD C9 81 11 ED C9 81 11 DC C9 81 11 DC CA 81 11 DD CC 91 11 DC CD A1 11 17 77 77 77 17 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77", // initial output
            0x8B, // command: 0x8, param: 0xA (0xA+3 = 0xD = 13 bytes)
            [0xB0], // offset: 0x20 = 32 bytes back
            "77 77 11 11 77 77 11 11 77 77 11 11 77 77" // expected result
        );
    });

    // 84 0C                    41          00 DC
    // 77 77 77 A7 77 77 77     77 77 77    DC

    // 48 -> 1000 -> 2, 0 copy last 2 bytes, length 2
    // 41 -> 0010 -> 0, 2 copy last (3) byte, length 3
    test('41 - Short Back Reference (copy from last 2 bytes, length 0+2)', () => {
        testCommand(
            "66 66 66 66 65 55 55 55 65 44 44 44 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 18 77 77 18 88 77 18 88 92 66 66 66 66 55 55 55 55 44 44 44 44 77 11 11 11 11 22 28 82 22 33 32 22 34 44 32 98 22 99 98 88 66 66 66 66 55 55 55 55 44 44 44 44 11 77 77 77 99 88 11 77 98 11 18 77 81 11 11 11 11 11 11 11 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 82 87 77 77 66 66 66 61 55 55 55 21 44 44 43 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 77 77 77 77 77 77 77 77 77 77 77 71 77 77 77 18 77 77 77 18 77 77 77 18 77 77 71 11 77 77 11 11 71 88 89 22 18 88 89 99 88 88 81 11 88 11 11 18 11 18 89 AB 11 AC CD DC 18 BD DD DD 8A DD EE EE 99 98 11 88 81 81 11 11 18 88 88 9A 9A AB BC CC CC CC CD DD DD DD DD DD DD FF 66 FE EF F6 66 FF 88 88 99 98 88 89 AC CA CC CC CC CB DD DD CD CC DD DD DE DC DE EE ED ED EE EE ED ED FF FF FE DD 18 81 17 77 81 81 11 77 A8 82 21 77 B8 11 21 17 CA 81 12 17 CB A1 12 11 DC A1 11 11 DC B8 11 21 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 17 77 77 77 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 8C DD DD DD 9A CD DD DD 89 CD DD DD 89 CD DD DD 89 CD DD DE 8A CD DD DD 8B CD DE ED 8B DD DF 66 FF 66 66 66 DE EE EE EE DD DD DD DD DD DD DD EE EE DD EE EF DE EE FF FF DE EE EE EE FD DD DD DD FF FF EE DD DE EE DD DD DD DD DE EE EE EE EE FE FF F6 6F FE 66 66 FF EE FF FF FF FD DD CC CC CC DD C9 11 11 DD C9 81 11 DD C9 81 11 ED C9 81 11 DC C9 81 11 DC CA 81 11 DD CC 91 11 DC CD A1 11 17 77 77 77 17 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 77 77 11 11 77 77 11 11 77 77 11 11 77 77 19 91 77 77 7A C1 77 77 7A CA 77 77 79 CA 77 77 78 CB 9C DD CC CC 9C DC A9 88 9C DB AD DC BD DC DB A1 CD DD CA 48 BC DD CC CC AB DD DD DD BA DD FF FF CF FD DD DC 81 8C CD DC CA 18 CD ED 11 19 CD ED 18 49 CD 6D DD CA CD 6D DC CB CD 6D DD DB CD 6D CC BA 99 99 BB 98 18 88 C9 81 8B ED C9 A1 11 1A C9 A6 81 96 CD 9C CD DC CC DD CC BC DC EE DD DD CC CD B1 11 9C CD C8 11 C9 DC C8 11 BD DC C8 8C AC DC C8 9C CD DC CA AC DE DC CA BC EF EC BA BC 11 77 77 77 11 77 77 77 11 77 77 77 97 77 77 77 A7 77 77 77 B7 77 77 77 B8 77 77 77 A7 77 77 77",
            0x41,
            [],
            "77 77 77"
        );
    });

    // 00 87 3F 77                                                  A8 40 
    // 87    77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77  77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 
    // 00 72    59          00 21
    // 72       77 77 77    21


    test('A8 40 - Copy last 8+1 bytes, 4 times', () => {
        testCommand(
            "66 66 66 66 65 55 55 55 65 44 44 44 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 18 77 77 18 88 77 18 88 92 66 66 66 66 55 55 55 55 44 44 44 44 77 11 11 11 11 22 28 82 22 33 32 22 34 44 32 98 22 99 98 88 66 66 66 66 55 55 55 55 44 44 44 44 11 77 77 77 99 88 11 77 98 11 18 77 81 11 11 11 11 11 11 11 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 82 87 77 77 66 66 66 61 55 55 55 21 44 44 43 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 77 77 77 77 77 77 77 77 77 77 77 71 77 77 77 18 77 77 77 18 77 77 77 18 77 77 71 11 77 77 11 11 71 88 89 22 18 88 89 99 88 88 81 11 88 11 11 18 11 18 89 AB 11 AC CD DC 18 BD DD DD 8A DD EE EE 99 98 11 88 81 81 11 11 18 88 88 9A 9A AB BC CC CC CC CD DD DD DD DD DD DD FF 66 FE EF F6 66 FF 88 88 99 98 88 89 AC CA CC CC CC CB DD DD CD CC DD DD DE DC DE EE ED ED EE EE ED ED FF FF FE DD 18 81 17 77 81 81 11 77 A8 82 21 77 B8 11 21 17 CA 81 12 17 CB A1 12 11 DC A1 11 11 DC B8 11 21 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 17 77 77 77 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 8C DD DD DD 9A CD DD DD 89 CD DD DD 89 CD DD DD 89 CD DD DE 8A CD DD DD 8B CD DE ED 8B DD DF 66 FF 66 66 66 DE EE EE EE DD DD DD DD DD DD DD EE EE DD EE EF DE EE FF FF DE EE EE EE FD DD DD DD FF FF EE DD DE EE DD DD DD DD DE EE EE EE EE FE FF F6 6F FE 66 66 FF EE FF FF FF FD DD CC CC CC DD C9 11 11 DD C9 81 11 DD C9 81 11 ED C9 81 11 DC C9 81 11 DC CA 81 11 DD CC 91 11 DC CD A1 11 17 77 77 77 17 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 77 77 11 11 77 77 11 11 77 77 11 11 77 77 19 91 77 77 7A C1 77 77 7A CA 77 77 79 CA 77 77 78 CB 9C DD CC CC 9C DC A9 88 9C DB AD DC BD DC DB A1 CD DD CA 48 BC DD CC CC AB DD DD DD BA DD FF FF CF FD DD DC 81 8C CD DC CA 18 CD ED 11 19 CD ED 18 49 CD 6D DD CA CD 6D DC CB CD 6D DD DB CD 6D CC BA 99 99 BB 98 18 88 C9 81 8B ED C9 A1 11 1A C9 A6 81 96 CD 9C CD DC CC DD CC BC DC EE DD DD CC CD B1 11 9C CD C8 11 C9 DC C8 11 BD DC C8 8C AC DC C8 9C CD DC CA AC DE DC CA BC EF EC BA BC 11 77 77 77 11 77 77 77 11 77 77 77 97 77 77 77 A7 77 77 77 B7 77 77 77 B8 77 77 77 A7 77 77 77 77 77 77 DC 77 77 77 DC 77 77 77 DF 77 77 77 CE 77 77 77 7D 77 77 77 78 77 77 77 77 CA DD F6 66 DA CD E6 66 EA CD DF 66 EA CC DE ED CA BC DD EC CA BC CD CB BA BB CC BA 78 9B BC BB 6F DC CD 66 6F DC DE E6 FC DD EF ED B9 CA BC CC 9C CC A8 11 BC DD CB A9 BC DE ED CA C9 CD DD DD DC CE EF F6 DD CC DF 66 DD DC CE FF BA CA AC DE AB CD DA CD AC CC BC DC BC DE 96 CD 9C DD DC 9C FF DC BA CD FE DC BA DD FE DC BA DD ED DC BA DC ED CC BA C9 DD CC BA 77 DD CC BA 77 DC CC B9 77 11 77 77 77 87 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77",
            0xA8,
            [0x40],
            "77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77"
        );
    });

    // 02 DD FE CC  D1          05 DD CC BB BB 9D DC
    // DD FE CC     CC AA AA    DD CC BB BB 9D DC

    // D1 -> 00 01 -> 0, 1
    test('D1 - Copy Back Reference Backwards (Copy 0+3 bytes from 1+3 bytes ago)', () => {
        testCommand(
            "66 66 66 66 65 55 55 55 65 44 44 44 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 18 77 77 18 88 77 18 88 92 66 66 66 66 55 55 55 55 44 44 44 44 77 11 11 11 11 22 28 82 22 33 32 22 34 44 32 98 22 99 98 88 66 66 66 66 55 55 55 55 44 44 44 44 11 77 77 77 99 88 11 77 98 11 18 77 81 11 11 11 11 11 11 11 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 82 87 77 77 66 66 66 61 55 55 55 21 44 44 43 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 77 77 77 77 77 77 77 77 77 77 77 71 77 77 77 18 77 77 77 18 77 77 77 18 77 77 71 11 77 77 11 11 71 88 89 22 18 88 89 99 88 88 81 11 88 11 11 18 11 18 89 AB 11 AC CD DC 18 BD DD DD 8A DD EE EE 99 98 11 88 81 81 11 11 18 88 88 9A 9A AB BC CC CC CC CD DD DD DD DD DD DD FF 66 FE EF F6 66 FF 88 88 99 98 88 89 AC CA CC CC CC CB DD DD CD CC DD DD DE DC DE EE ED ED EE EE ED ED FF FF FE DD 18 81 17 77 81 81 11 77 A8 82 21 77 B8 11 21 17 CA 81 12 17 CB A1 12 11 DC A1 11 11 DC B8 11 21 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 17 77 77 77 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 8C DD DD DD 9A CD DD DD 89 CD DD DD 89 CD DD DD 89 CD DD DE 8A CD DD DD 8B CD DE ED 8B DD DF 66 FF 66 66 66 DE EE EE EE DD DD DD DD DD DD DD EE EE DD EE EF DE EE FF FF DE EE EE EE FD DD DD DD FF FF EE DD DE EE DD DD DD DD DE EE EE EE EE FE FF F6 6F FE 66 66 FF EE FF FF FF FD DD CC CC CC DD C9 11 11 DD C9 81 11 DD C9 81 11 ED C9 81 11 DC C9 81 11 DC CA 81 11 DD CC 91 11 DC CD A1 11 17 77 77 77 17 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 77 77 11 11 77 77 11 11 77 77 11 11 77 77 19 91 77 77 7A C1 77 77 7A CA 77 77 79 CA 77 77 78 CB 9C DD CC CC 9C DC A9 88 9C DB AD DC BD DC DB A1 CD DD CA 48 BC DD CC CC AB DD DD DD BA DD FF FF CF FD DD DC 81 8C CD DC CA 18 CD ED 11 19 CD ED 18 49 CD 6D DD CA CD 6D DC CB CD 6D DD DB CD 6D CC BA 99 99 BB 98 18 88 C9 81 8B ED C9 A1 11 1A C9 A6 81 96 CD 9C CD DC CC DD CC BC DC EE DD DD CC CD B1 11 9C CD C8 11 C9 DC C8 11 BD DC C8 8C AC DC C8 9C CD DC CA AC DE DC CA BC EF EC BA BC 11 77 77 77 11 77 77 77 11 77 77 77 97 77 77 77 A7 77 77 77 B7 77 77 77 B8 77 77 77 A7 77 77 77 77 77 77 DC 77 77 77 DC 77 77 77 DF 77 77 77 CE 77 77 77 7D 77 77 77 78 77 77 77 77 CA DD F6 66 DA CD E6 66 EA CD DF 66 EA CC DE ED CA BC DD EC CA BC CD CB BA BB CC BA 78 9B BC BB 6F DC CD 66 6F DC DE E6 FC DD EF ED B9 CA BC CC 9C CC A8 11 BC DD CB A9 BC DE ED CA C9 CD DD DD DC CE EF F6 DD CC DF 66 DD DC CE FF BA CA AC DE AB CD DA CD AC CC BC DC BC DE 96 CD 9C DD DC 9C FF DC BA CD FE DC BA DD FE DC BA DD ED DC BA DC ED CC BA C9 DD CC BA 77 DD CC BA 77 DC CC B9 77 11 77 77 77 87 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 72 77 77 77 21 6F DC CD 66 77 98 BB CB 77 88 BA BC 77 88 8A AC 77 38 8A 9B 72 31 88 A9 21 48 88 AA 11 43 88 8A BB 19 99 99 BC 92 45 55 BC AC AA AA CC CA DD FE CC", // initial output
            0xD1, // command: 0x8, param: 0xA (0xA+3 = 0xD = 13 bytes)
            [], // offset: 0x20 = 32 bytes back
            "CC AA AA" // expected result
        );
    });

    // 00 7D    59          E0 B9       44                        0A CA DD F6 66 DA CD E6 66 EA CD DF
    // 7D       77 77 77    78 77 77    77 77 77 77 77 77         CA DD F6 66 DA CD E6 66 EA CD DF

    // current E0 B9: 78 77 77
    // current 44: 77 77

    // 48 -> 1000 -> 2, 0 copy last 2 bytes, length 2
    // 41 -> 0010 -> 0, 2 copy last (3) byte, length 3
    // 44 -> 0100 -> 1, 0 copy last byte, length 6
    test('44 - Short Back Reference (copy from last 2 bytes, length 0+2)', () => {
        testCommand(
            "66 66 66 66 65 55 55 55 65 44 44 44 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 18 77 77 18 88 77 18 88 92 66 66 66 66 55 55 55 55 44 44 44 44 77 11 11 11 11 22 28 82 22 33 32 22 34 44 32 98 22 99 98 88 66 66 66 66 55 55 55 55 44 44 44 44 11 77 77 77 99 88 11 77 98 11 18 77 81 11 11 11 11 11 11 11 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 82 87 77 77 66 66 66 61 55 55 55 21 44 44 43 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 77 77 77 77 77 77 77 77 77 77 77 71 77 77 77 18 77 77 77 18 77 77 77 18 77 77 71 11 77 77 11 11 71 88 89 22 18 88 89 99 88 88 81 11 88 11 11 18 11 18 89 AB 11 AC CD DC 18 BD DD DD 8A DD EE EE 99 98 11 88 81 81 11 11 18 88 88 9A 9A AB BC CC CC CC CD DD DD DD DD DD DD FF 66 FE EF F6 66 FF 88 88 99 98 88 89 AC CA CC CC CC CB DD DD CD CC DD DD DE DC DE EE ED ED EE EE ED ED FF FF FE DD 18 81 17 77 81 81 11 77 A8 82 21 77 B8 11 21 17 CA 81 12 17 CB A1 12 11 DC A1 11 11 DC B8 11 21 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 17 77 77 77 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 8C DD DD DD 9A CD DD DD 89 CD DD DD 89 CD DD DD 89 CD DD DE 8A CD DD DD 8B CD DE ED 8B DD DF 66 FF 66 66 66 DE EE EE EE DD DD DD DD DD DD DD EE EE DD EE EF DE EE FF FF DE EE EE EE FD DD DD DD FF FF EE DD DE EE DD DD DD DD DE EE EE EE EE FE FF F6 6F FE 66 66 FF EE FF FF FF FD DD CC CC CC DD C9 11 11 DD C9 81 11 DD C9 81 11 ED C9 81 11 DC C9 81 11 DC CA 81 11 DD CC 91 11 DC CD A1 11 17 77 77 77 17 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 77 77 11 11 77 77 11 11 77 77 11 11 77 77 19 91 77 77 7A C1 77 77 7A CA 77 77 79 CA 77 77 78 CB 9C DD CC CC 9C DC A9 88 9C DB AD DC BD DC DB A1 CD DD CA 48 BC DD CC CC AB DD DD DD BA DD FF FF CF FD DD DC 81 8C CD DC CA 18 CD ED 11 19 CD ED 18 49 CD 6D DD CA CD 6D DC CB CD 6D DD DB CD 6D CC BA 99 99 BB 98 18 88 C9 81 8B ED C9 A1 11 1A C9 A6 81 96 CD 9C CD DC CC DD CC BC DC EE DD DD CC CD B1 11 9C CD C8 11 C9 DC C8 11 BD DC C8 8C AC DC C8 9C CD DC CA AC DE DC CA BC EF EC BA BC 11 77 77 77 11 77 77 77 11 77 77 77 97 77 77 77 A7 77 77 77 B7 77 77 77 B8 77 77 77 A7 77 77 77 77 77 77 DC 77 77 77 DC 77 77 77 DF 77 77 77 CE 77 77 77 7D 77 77 77 78 77 77",
            0x44,
            [],
            "77 77 77 77 77 77"
        );
    });

    // 05 DD CC BB BB 9D DC     60      01 9A CD
    // DD CC BB BB 9D DC        CC BB   9A CD
    // actual: BB BB
    // '0x68 (8 -> 2, 0) - Back Reference (copy 0+2 bytes from 2+2 bytes back)', OR copy 2 bytes from 8-2 bytes back?
    // '0x60 (8 -> 0, 0) - Back Reference (copy 0+2 bytes from 0+2 bytes back)', 
    test('0x60 (8 -> 2, 0) - Back Reference (copy 0+2 bytes from 2+2 bytes back)', () => {
        testCommand(
            "66 66 66 66 65 55 55 55 65 44 44 44 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 18 77 77 18 88 77 18 88 92 66 66 66 66 55 55 55 55 44 44 44 44 77 11 11 11 11 22 28 82 22 33 32 22 34 44 32 98 22 99 98 88 66 66 66 66 55 55 55 55 44 44 44 44 11 77 77 77 99 88 11 77 98 11 18 77 81 11 11 11 11 11 11 11 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 82 87 77 77 66 66 66 61 55 55 55 21 44 44 43 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 77 77 77 77 77 77 77 77 77 77 77 71 77 77 77 18 77 77 77 18 77 77 77 18 77 77 71 11 77 77 11 11 71 88 89 22 18 88 89 99 88 88 81 11 88 11 11 18 11 18 89 AB 11 AC CD DC 18 BD DD DD 8A DD EE EE 99 98 11 88 81 81 11 11 18 88 88 9A 9A AB BC CC CC CC CD DD DD DD DD DD DD FF 66 FE EF F6 66 FF 88 88 99 98 88 89 AC CA CC CC CC CB DD DD CD CC DD DD DE DC DE EE ED ED EE EE ED ED FF FF FE DD 18 81 17 77 81 81 11 77 A8 82 21 77 B8 11 21 17 CA 81 12 17 CB A1 12 11 DC A1 11 11 DC B8 11 21 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 17 77 77 77 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 8C DD DD DD 9A CD DD DD 89 CD DD DD 89 CD DD DD 89 CD DD DE 8A CD DD DD 8B CD DE ED 8B DD DF 66 FF 66 66 66 DE EE EE EE DD DD DD DD DD DD DD EE EE DD EE EF DE EE FF FF DE EE EE EE FD DD DD DD FF FF EE DD DE EE DD DD DD DD DE EE EE EE EE FE FF F6 6F FE 66 66 FF EE FF FF FF FD DD CC CC CC DD C9 11 11 DD C9 81 11 DD C9 81 11 ED C9 81 11 DC C9 81 11 DC CA 81 11 DD CC 91 11 DC CD A1 11 17 77 77 77 17 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 77 77 11 11 77 77 11 11 77 77 11 11 77 77 19 91 77 77 7A C1 77 77 7A CA 77 77 79 CA 77 77 78 CB 9C DD CC CC 9C DC A9 88 9C DB AD DC BD DC DB A1 CD DD CA 48 BC DD CC CC AB DD DD DD BA DD FF FF CF FD DD DC 81 8C CD DC CA 18 CD ED 11 19 CD ED 18 49 CD 6D DD CA CD 6D DC CB CD 6D DD DB CD 6D CC BA 99 99 BB 98 18 88 C9 81 8B ED C9 A1 11 1A C9 A6 81 96 CD 9C CD DC CC DD CC BC DC EE DD DD CC CD B1 11 9C CD C8 11 C9 DC C8 11 BD DC C8 8C AC DC C8 9C CD DC CA AC DE DC CA BC EF EC BA BC 11 77 77 77 11 77 77 77 11 77 77 77 97 77 77 77 A7 77 77 77 B7 77 77 77 B8 77 77 77 A7 77 77 77 77 77 77 DC 77 77 77 DC 77 77 77 DF 77 77 77 CE 77 77 77 7D 77 77 77 78 77 77 77 77 77 77 77 77 CA DD F6 66 DA CD E6 66 EA CD DF 66 EA CC DE ED CA BC DD EC CA BC CD CB BA BB CC BA 78 9B BC BB 6F DC CD 66 6F DC DE E6 FC DD EF ED B9 CA BC CC 9C CC A8 11 BC DD CB A9 BC DE ED CA C9 CD DD DD DC CE EF F6 DD CC DF 66 DD DC CE FF BA CA BC EF AB CD DA CD AC DD DD CC BC DE DC CC DD DD DC 9C FF DC BA CD FE DC BA DD FE DC BA DD ED DC BA DC ED CC BA C9 DD CC BA 77 DD CC BA 77 DC CC B9 77 97 77 77 77 87 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 72 77 77 77 21 78 9B BC BB 77 98 BB CB 77 88 BA BC 77 88 8A AC 77 38 8A 9B 72 31 88 A9 21 48 88 AA 11 43 88 8A BB 19 99 99 BC 92 45 55 BC AC AA AA CC CA DD FE CC CC AA AA DD CC BB BB 9D DC",
            0x60, // command: 0x5, offset: 1 byte back, count: 1 byte
            [],
            "CC BB"
        );
    });

    // output $516 mismatch
    // 01 11 72     30 11       71          3F 11                                                   06 44 A8 88 11 36 28 A8
    // 11 72        11 11 11    21 11 11    11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11   44 A8 88 11 36 28 A8
    // actual -- 11 11 72
    // 79 -> offset -8, length 3 | 9 -> 10 01 -> 2, 1 | length = 1+2, endOffset = 5, startOffset = 8 5+2+1 = 8
    // 78 -> offset -8, length 2 | 8 -> 10 00 -> 2, 0 | length = 0+2, endOffset = 6, startOffset = 8 5+2+0 = 7
    // 71 -> offset -7, length 3 | 1 -> 00 01 -> 0, 1 | length = 1+2, endOffset = 4, startOffset = 7 5+0+1 = 6
    test('71 - Short Back Reference (copy from offset 2+6, length = 0+2)', () => {
        testCommand(
            "66 66 66 66 65 55 55 55 65 44 44 44 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 18 77 77 18 88 77 18 88 92 66 66 66 66 55 55 55 55 44 44 44 44 77 11 11 11 11 22 28 82 22 33 32 22 34 44 32 98 22 99 98 88 66 66 66 66 55 55 55 55 44 44 44 44 11 77 77 77 99 88 11 77 98 11 18 77 81 11 11 11 11 11 11 11 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 82 87 77 77 66 66 66 61 55 55 55 21 44 44 43 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 77 77 77 77 77 77 77 77 77 77 77 71 77 77 77 18 77 77 77 18 77 77 77 18 77 77 71 11 77 77 11 11 71 88 89 22 18 88 89 99 88 88 81 11 88 11 11 18 11 18 89 AB 11 AC CD DC 18 BD DD DD 8A DD EE EE 99 98 11 88 81 81 11 11 18 88 88 9A 9A AB BC CC CC CC CD DD DD DD DD DD DD FF 66 FE EF F6 66 FF 88 88 99 98 88 89 AC CA CC CC CC CB DD DD CD CC DD DD DE DC DE EE ED ED EE EE ED ED FF FF FE DD 18 81 17 77 81 81 11 77 A8 82 21 77 B8 11 21 17 CA 81 12 17 CB A1 12 11 DC A1 11 11 DC B8 11 21 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 17 77 77 77 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 8C DD DD DD 9A CD DD DD 89 CD DD DD 89 CD DD DD 89 CD DD DE 8A CD DD DD 8B CD DE ED 8B DD DF 66 FF 66 66 66 DE EE EE EE DD DD DD DD DD DD DD EE EE DD EE EF DE EE FF FF DE EE EE EE FD DD DD DD FF FF EE DD DE EE DD DD DD DD DE EE EE EE EE FE FF F6 6F FE 66 66 FF EE FF FF FF FD DD CC CC CC DD C9 11 11 DD C9 81 11 DD C9 81 11 ED C9 81 11 DC C9 81 11 DC CA 81 11 DD CC 91 11 DC CD A1 11 17 77 77 77 17 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 77 77 11 11 77 77 11 11 77 77 11 11 77 77 19 91 77 77 7A C1 77 77 7A CA 77 77 79 CA 77 77 78 CB 9C DD CC CC 9C DC A9 88 9C DB AD DC BD DC DB A1 CD DD CA 48 BC DD CC CC AB DD DD DD BA DD FF FF CF FD DD DC 81 8C CD DC CA 18 CD ED 11 19 CD ED 18 49 CD 6D DD CA CD 6D DC CB CD 6D DD DB CD 6D CC BA 99 99 BB 98 18 88 C9 81 8B ED C9 A1 11 1A C9 A6 81 96 CD 9C CD DC CC DD CC BC DC EE DD DD CC CD B1 11 9C CD C8 11 C9 DC C8 11 BD DC C8 8C AC DC C8 9C CD DC CA AC DE DC CA BC EF EC BA BC 11 77 77 77 11 77 77 77 11 77 77 77 97 77 77 77 A7 77 77 77 B7 77 77 77 B8 77 77 77 A7 77 77 77 77 77 77 DC 77 77 77 DC 77 77 77 DF 77 77 77 CE 77 77 77 7D 77 77 77 78 77 77 77 77 77 77 77 77 CA DD F6 66 DA CD E6 66 EA CD DF 66 EA CC DE ED CA BC DD EC CA BC CD CB BA BB CC BA 78 9B BC BB 6F DC CD 66 6F DC DE E6 FC DD EF ED B9 CA BC CC 9C CC A8 11 BC DD CB A9 BC DE ED CA C9 CD DD DD DC CE EF F6 DD CC DF 66 DD DC CE FF BA CA BC EF AB CD DA CD AC DD DD CC BC DE DC CC DD DD DC 9C FF DC BA CD FE DC BA DD FE DC BA DD ED DC BA DC ED CC BA C9 DD CC BA 77 DD CC BA 77 DC CC B9 77 97 77 77 77 87 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 72 77 77 77 21 78 9B BC BB 77 98 BB CB 77 88 BA BC 77 88 8A AC 77 38 8A 9B 72 31 88 A9 21 48 88 AA 11 43 88 8A BB 19 99 99 BC 92 45 55 BC AC AA AA CC CA DD FE CC CC AA AA DD CC BB BB 9D DC CC BB 9A CD DC CC 99 BB 91 CC 55 32 19 CC AC DD BD DC ED CA DD DC AA AD DD CC BC CC CC CA CC CC CD CB CD ED ED CA CC CB A9 77 CC CB A8 77 CB BA 98 77 BB B9 88 77 AA A8 88 77 AA 98 91 27 AA 89 81 12 A8 9A C2 11 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 11 27 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 72 65 47 72 21 65 42 21 11 65 41 11 11 65 41 11 11 77 77 21 11 77 21 11 11 72 11 11 11",
            0x71, 
            [],
            "21 11 11"
        );
    });

    // 02 11 11 23  59          00 13   5F                          85 E8                       9A 83 
    // 11 11 23     21 11 11    13      21 11 11 13 21 11 11 13 21  65 41 11 11 65 41 11 11     65 41 11 11 65 41 11 11 65 41 11 11 65 41 11 11 65 41 11 11 65 41 11 
    // 9F 80                                                                                                    01 26 66
    // 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11    26 66
    
    // 9B 1F -> 25 in length
    // 9C FF -> 28 in length
    // 9B 03 -> 25 in length
    // 99 03 -> should be 23 in 
    // 9A 83 -> should be 24 in length
    // 9F 80 -> should be 34 in length
    test('9A 83 - Copy Back Reference ( 6 * Math.floor(A / 4) + (A % 4) + 10 bytes from offset 0x83+1 back)', () => {
        testCommand(
            "66 66 66 66 65 55 55 55 65 44 44 44 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 18 77 77 18 88 77 18 88 92 66 66 66 66 55 55 55 55 44 44 44 44 77 11 11 11 11 22 28 82 22 33 32 22 34 44 32 98 22 99 98 88 66 66 66 66 55 55 55 55 44 44 44 44 11 77 77 77 99 88 11 77 98 11 18 77 81 11 11 11 11 11 11 11 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 82 87 77 77 66 66 66 61 55 55 55 21 44 44 43 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 77 77 77 77 77 77 77 77 77 77 77 71 77 77 77 18 77 77 77 18 77 77 77 18 77 77 71 11 77 77 11 11 71 88 89 22 18 88 89 99 88 88 81 11 88 11 11 18 11 18 89 AB 11 AC CD DC 18 BD DD DD 8A DD EE EE 99 98 11 88 81 81 11 11 18 88 88 9A 9A AB BC CC CC CC CD DD DD DD DD DD DD FF 66 FE EF F6 66 FF 88 88 99 98 88 89 AC CA CC CC CC CB DD DD CD CC DD DD DE DC DE EE ED ED EE EE ED ED FF FF FE DD 18 81 17 77 81 81 11 77 A8 82 21 77 B8 11 21 17 CA 81 12 17 CB A1 12 11 DC A1 11 11 DC B8 11 21 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 17 77 77 77 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 8C DD DD DD 9A CD DD DD 89 CD DD DD 89 CD DD DD 89 CD DD DE 8A CD DD DD 8B CD DE ED 8B DD DF 66 FF 66 66 66 DE EE EE EE DD DD DD DD DD DD DD EE EE DD EE EF DE EE FF FF DE EE EE EE FD DD DD DD FF FF EE DD DE EE DD DD DD DD DE EE EE EE EE FE FF F6 6F FE 66 66 FF EE FF FF FF FD DD CC CC CC DD C9 11 11 DD C9 81 11 DD C9 81 11 ED C9 81 11 DC C9 81 11 DC CA 81 11 DD CC 91 11 DC CD A1 11 17 77 77 77 17 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 77 77 11 11 77 77 11 11 77 77 11 11 77 77 19 91 77 77 7A C1 77 77 7A CA 77 77 79 CA 77 77 78 CB 9C DD CC CC 9C DC A9 88 9C DB AD DC BD DC DB A1 CD DD CA 48 BC DD CC CC AB DD DD DD BA DD FF FF CF FD DD DC 81 8C CD DC CA 18 CD ED 11 19 CD ED 18 49 CD 6D DD CA CD 6D DC CB CD 6D DD DB CD 6D CC BA 99 99 BB 98 18 88 C9 81 8B ED C9 A1 11 1A C9 A6 81 96 CD 9C CD DC CC DD CC BC DC EE DD DD CC CD B1 11 9C CD C8 11 C9 DC C8 11 BD DC C8 8C AC DC C8 9C CD DC CA AC DE DC CA BC EF EC BA BC 11 77 77 77 11 77 77 77 11 77 77 77 97 77 77 77 A7 77 77 77 B7 77 77 77 B8 77 77 77 A7 77 77 77 77 77 77 DC 77 77 77 DC 77 77 77 DF 77 77 77 CE 77 77 77 7D 77 77 77 78 77 77 77 77 77 77 77 77 CA DD F6 66 DA CD E6 66 EA CD DF 66 EA CC DE ED CA BC DD EC CA BC CD CB BA BB CC BA 78 9B BC BB 6F DC CD 66 6F DC DE E6 FC DD EF ED B9 CA BC CC 9C CC A8 11 BC DD CB A9 BC DE ED CA C9 CD DD DD DC CE EF F6 DD CC DF 66 DD DC CE FF BA CA BC EF AB CD DA CD AC DD DD CC BC DE DC CC DD DD DC 9C FF DC BA CD FE DC BA DD FE DC BA DD ED DC BA DC ED CC BA C9 DD CC BA 77 DD CC BA 77 DC CC B9 77 97 77 77 77 87 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 72 77 77 77 21 78 9B BC BB 77 98 BB CB 77 88 BA BC 77 88 8A AC 77 38 8A 9B 72 31 88 A9 21 48 88 AA 11 43 88 8A BB 19 99 99 BC 92 45 55 BC AC AA AA CC CA DD FE CC CC AA AA DD CC BB BB 9D DC CC BB 9A CD DC CC 99 BB 91 CC 55 32 19 CC AC DD BD DC ED CA DD DC AA AD DD CC BC CC CC CA CC CC CD CB CD ED ED CA CC CB A9 77 CC CB A8 77 CB BA 98 77 BB B9 88 77 AA A8 88 77 AA 98 91 27 AA 89 81 12 A8 9A C2 11 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 11 27 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 72 65 47 72 21 65 42 21 11 65 41 11 11 65 41 11 11 77 77 21 11 77 21 11 11 72 11 11 11 21 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 44 A8 88 11 36 28 A8 11 36 2A 8A 11 26 42 9A 11 14 64 98 11 13 66 29 11 11 46 42 11 11 36 64 9A CD EE EE 89 BC DD EE 98 AB CC CA A8 99 AB AB 8A 88 88 89 89 89 81 11 98 88 99 99 29 88 88 88 FF FF CC CA FF ED CC 99 AA CC C9 89 BA AB 98 9A 88 88 88 88 18 88 98 89 99 98 88 99 88 88 88 92 89 AB 22 11 9A AB 43 11 AA A2 63 11 A9 C4 62 11 9A 26 51 11 A2 46 31 11 24 64 11 11 46 63 11 11 11 11 27 77 11 11 11 27 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 77 77 73 21 77 77 73 21 27 77 73 21 12 27 73 21 11 11 23 21 11 11 13 21 11 11 13 21 11 11 13 21 65 41 11 11 65 41 11 11", // initial output
            0x9A, // command: 0x9, param: A (1 byte)
            [0x83], // offset: 2 bytes back -- end position = 0x64, start position = 0x80
            "65 41 11 11 65 41 11 11 65 41 11 11 65 41 11 11 65 41 11 11 65 41 11 11" // expected result -- count = 34
        );
    });
    test('9F 80 - Copy Back Reference ( ??? bytes from offset 80+1 back)', () => {
        testCommand(
            "66 66 66 66 65 55 55 55 65 44 44 44 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 18 77 77 18 88 77 18 88 92 66 66 66 66 55 55 55 55 44 44 44 44 77 11 11 11 11 22 28 82 22 33 32 22 34 44 32 98 22 99 98 88 66 66 66 66 55 55 55 55 44 44 44 44 11 77 77 77 99 88 11 77 98 11 18 77 81 11 11 11 11 11 11 11 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 82 87 77 77 66 66 66 61 55 55 55 21 44 44 43 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 77 77 77 77 77 77 77 77 77 77 77 71 77 77 77 18 77 77 77 18 77 77 77 18 77 77 71 11 77 77 11 11 71 88 89 22 18 88 89 99 88 88 81 11 88 11 11 18 11 18 89 AB 11 AC CD DC 18 BD DD DD 8A DD EE EE 99 98 11 88 81 81 11 11 18 88 88 9A 9A AB BC CC CC CC CD DD DD DD DD DD DD FF 66 FE EF F6 66 FF 88 88 99 98 88 89 AC CA CC CC CC CB DD DD CD CC DD DD DE DC DE EE ED ED EE EE ED ED FF FF FE DD 18 81 17 77 81 81 11 77 A8 82 21 77 B8 11 21 17 CA 81 12 17 CB A1 12 11 DC A1 11 11 DC B8 11 21 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 17 77 77 77 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 8C DD DD DD 9A CD DD DD 89 CD DD DD 89 CD DD DD 89 CD DD DE 8A CD DD DD 8B CD DE ED 8B DD DF 66 FF 66 66 66 DE EE EE EE DD DD DD DD DD DD DD EE EE DD EE EF DE EE FF FF DE EE EE EE FD DD DD DD FF FF EE DD DE EE DD DD DD DD DE EE EE EE EE FE FF F6 6F FE 66 66 FF EE FF FF FF FD DD CC CC CC DD C9 11 11 DD C9 81 11 DD C9 81 11 ED C9 81 11 DC C9 81 11 DC CA 81 11 DD CC 91 11 DC CD A1 11 17 77 77 77 17 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 77 77 11 11 77 77 11 11 77 77 11 11 77 77 19 91 77 77 7A C1 77 77 7A CA 77 77 79 CA 77 77 78 CB 9C DD CC CC 9C DC A9 88 9C DB AD DC BD DC DB A1 CD DD CA 48 BC DD CC CC AB DD DD DD BA DD FF FF CF FD DD DC 81 8C CD DC CA 18 CD ED 11 19 CD ED 18 49 CD 6D DD CA CD 6D DC CB CD 6D DD DB CD 6D CC BA 99 99 BB 98 18 88 C9 81 8B ED C9 A1 11 1A C9 A6 81 96 CD 9C CD DC CC DD CC BC DC EE DD DD CC CD B1 11 9C CD C8 11 C9 DC C8 11 BD DC C8 8C AC DC C8 9C CD DC CA AC DE DC CA BC EF EC BA BC 11 77 77 77 11 77 77 77 11 77 77 77 97 77 77 77 A7 77 77 77 B7 77 77 77 B8 77 77 77 A7 77 77 77 77 77 77 DC 77 77 77 DC 77 77 77 DF 77 77 77 CE 77 77 77 7D 77 77 77 78 77 77 77 77 77 77 77 77 CA DD F6 66 DA CD E6 66 EA CD DF 66 EA CC DE ED CA BC DD EC CA BC CD CB BA BB CC BA 78 9B BC BB 6F DC CD 66 6F DC DE E6 FC DD EF ED B9 CA BC CC 9C CC A8 11 BC DD CB A9 BC DE ED CA C9 CD DD DD DC CE EF F6 DD CC DF 66 DD DC CE FF BA CA BC EF AB CD DA CD AC DD DD CC BC DE DC CC DD DD DC 9C FF DC BA CD FE DC BA DD FE DC BA DD ED DC BA DC ED CC BA C9 DD CC BA 77 DD CC BA 77 DC CC B9 77 97 77 77 77 87 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 72 77 77 77 21 78 9B BC BB 77 98 BB CB 77 88 BA BC 77 88 8A AC 77 38 8A 9B 72 31 88 A9 21 48 88 AA 11 43 88 8A BB 19 99 99 BC 92 45 55 BC AC AA AA CC CA DD FE CC CC AA AA DD CC BB BB 9D DC CC BB 9A CD DC CC 99 BB 91 CC 55 32 19 CC AC DD BD DC ED CA DD DC AA AD DD CC BC CC CC CA CC CC CD CB CD ED ED CA CC CB A9 77 CC CB A8 77 CB BA 98 77 BB B9 88 77 AA A8 88 77 AA 98 91 27 AA 89 81 12 A8 9A C2 11 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 11 27 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 72 65 47 72 21 65 42 21 11 65 41 11 11 65 41 11 11 77 77 21 11 77 21 11 11 72 11 11 11 21 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 44 A8 88 11 36 28 A8 11 36 2A 8A 11 26 42 9A 11 14 64 98 11 13 66 29 11 11 46 42 11 11 36 64 9A CD EE EE 89 BC DD EE 98 AB CC CA A8 99 AB AB 8A 88 88 89 89 89 81 11 98 88 99 99 29 88 88 88 FF FF CC CA FF ED CC 99 AA CC C9 89 BA AB 98 9A 88 88 88 88 18 88 98 89 99 98 88 99 88 88 88 92 89 AB 22 11 9A AB 43 11 AA A2 63 11 A9 C4 62 11 9A 26 51 11 A2 46 31 11 24 64 11 11 46 63 11 11 11 11 27 77 11 11 11 27 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 77 77 73 21 77 77 73 21 27 77 73 21 12 27 73 21 11 11 23 21 11 11 13 21 11 11 13 21 11 11 13 21 65 41 11 11 65 41 11 11 65 41 11 11 65 41 11 11 65 41 11 11 65 41 11 11 65 41 11 11 65 41 11", // initial output
            0x9F, // command: 0x9, param: 0 (1 byte)
            [0x80], // offset: 2 bytes back -- end position = 0x64, start position = 0x80
            "11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11" // expected result -- count = 34
        );
    });

    test('99 80 - Copy Back Reference (??? bytes from offset 80+1 back)', () => {
        testCommand(
            "66 66 66 66 65 55 55 55 65 44 44 44 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 18 77 77 18 88 77 18 88 92 66 66 66 66 55 55 55 55 44 44 44 44 77 11 11 11 11 22 28 82 22 33 32 22 34 44 32 98 22 99 98 88 66 66 66 66 55 55 55 55 44 44 44 44 11 77 77 77 99 88 11 77 98 11 18 77 81 11 11 11 11 11 11 11 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 82 87 77 77 66 66 66 61 55 55 55 21 44 44 43 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 77 77 77 77 77 77 77 77 77 77 77 71 77 77 77 18 77 77 77 18 77 77 77 18 77 77 71 11 77 77 11 11 71 88 89 22 18 88 89 99 88 88 81 11 88 11 11 18 11 18 89 AB 11 AC CD DC 18 BD DD DD 8A DD EE EE 99 98 11 88 81 81 11 11 18 88 88 9A 9A AB BC CC CC CC CD DD DD DD DD DD DD FF 66 FE EF F6 66 FF 88 88 99 98 88 89 AC CA CC CC CC CB DD DD CD CC DD DD DE DC DE EE ED ED EE EE ED ED FF FF FE DD 18 81 17 77 81 81 11 77 A8 82 21 77 B8 11 21 17 CA 81 12 17 CB A1 12 11 DC A1 11 11 DC B8 11 21 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 17 77 77 77 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 77 77 11 11 8C DD DD DD 9A CD DD DD 89 CD DD DD 89 CD DD DD 89 CD DD DE 8A CD DD DD 8B CD DE ED 8B DD DF 66 FF 66 66 66 DE EE EE EE DD DD DD DD DD DD DD EE EE DD EE EF DE EE FF FF DE EE EE EE FD DD DD DD FF FF EE DD DE EE DD DD DD DD DE EE EE EE EE FE FF F6 6F FE 66 66 FF EE FF FF FF FD DD CC CC CC DD C9 11 11 DD C9 81 11 DD C9 81 11 ED C9 81 11 DC C9 81 11 DC CA 81 11 DD CC 91 11 DC CD A1 11 17 77 77 77 17 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 77 77 11 11 77 77 11 11 77 77 11 11 77 77 19 91 77 77 7A C1 77 77 7A CA 77 77 79 CA 77 77 78 CB 9C DD CC CC 9C DC A9 88 9C DB AD DC BD DC DB A1 CD DD CA 48 BC DD CC CC AB DD DD DD BA DD FF FF CF FD DD DC 81 8C CD DC CA 18 CD ED 11 19 CD ED 18 49 CD 6D DD CA CD 6D DC CB CD 6D DD DB CD 6D CC BA 99 99 BB 98 18 88 C9 81 8B ED C9 A1 11 1A C9 A6 81 96 CD 9C CD DC CC DD CC BC DC EE DD DD CC CD B1 11 9C CD C8 11 C9 DC C8 11 BD DC C8 8C AC DC C8 9C CD DC CA AC DE DC CA BC EF EC BA BC 11 77 77 77 11 77 77 77 11 77 77 77 97 77 77 77 A7 77 77 77 B7 77 77 77 B8 77 77 77 A7 77 77 77 77 77 77 DC 77 77 77 DC 77 77 77 DF 77 77 77 CE 77 77 77 7D 77 77 77 78 77 77 77 77 77 77 77 77 CA DD F6 66 DA CD E6 66 EA CD DF 66 EA CC DE ED CA BC DD EC CA BC CD CB BA BB CC BA 78 9B BC BB 6F DC CD 66 6F DC DE E6 FC DD EF ED B9 CA BC CC 9C CC A8 11 BC DD CB A9 BC DE ED CA C9 CD DD DD DC CE EF F6 DD CC DF 66 DD DC CE FF BA CA BC EF AB CD DA CD AC DD DD CC BC DE DC CC DD DD DC 9C FF DC BA CD FE DC BA DD FE DC BA DD ED DC BA DC ED CC BA C9 DD CC BA 77 DD CC BA 77 DC CC B9 77 97 77 77 77 87 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 72 77 77 77 21 78 9B BC BB 77 98 BB CB 77 88 BA BC 77 88 8A AC 77 38 8A 9B 72 31 88 A9 21 48 88 AA 11 43 88 8A BB 19 99 99 BC 92 45 55 BC AC AA AA CC CA DD FE CC CC AA AA DD CC BB BB 9D DC CC BB 9A CD DC CC 99 BB 91 CC 55 32 19 CC AC DD BD DC ED CA DD DC AA AD DD CC BC CC CC CA CC CC CD CB CD ED ED CA CC CB A9 77 CC CB A8 77 CB BA 98 77 BB B9 88 77 AA A8 88 77 AA 98 91 27 AA 89 81 12 A8 9A C2 11 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 11 27 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 72 65 47 72 21 65 42 21 11 65 41 11 11 65 41 11 11 77 77 21 11 77 21 11 11 72 11 11 11 21 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 44 A8 88 11 36 28 A8 11 36 2A 8A 11 26 42 9A 11 14 64 98 11 13 66 29 11 11 46 42 11 11 36 64 9A CD EE EE 89 BC DD EE 98 AB CC CA A8 99 AB AB 8A 88 88 89 89 89 81 11 98 88 99 99 29 88 88 88 FF FF CC CA FF ED CC 99 AA CC C9 89 BA AB 98 9A 88 88 88 88 18 88 98 89 99 98 88 99 88 88 88 92 89 AB 22 11 9A AB 43 11 AA A2 63 11 A9 C4 62 11 9A 26 51 11 A2 46 31 11 24 64 11 11 46 63 11 11 11 11 27 77 11 11 11 27 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 77 77 73 21 77 77 73 21 27 77 73 21 12 27 73 21 11 11 23 21 11 11 13 21 11 11 13 21 11 11 13 21 65 41 11 11 65 41 11 11 65 41 11 11 65 41 11 11 65 41 11 11 65 41 11 11 65 41 11 11 65 41 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 26 66 11 11 16 66 11 11 16 66 11 11 14 66 11 11 13 66 11 11 11 46 11 11 11 36 11 11 11 26 42 99 98 88 64 29 98 88 66 64 29 98 66 66 53 98 66 65 31 11 66 53 11 8C 65 31 18 BB 53 11 99 BC 88 98 99 24 88 88 24 56 89 92 46 66 82 46 66 66 13 46 66 66 B1 14 66 66 BB 81 46 66 CB A9 14 66 66 62 11 11 66 61 11 11 66 41 11 11 66 31 11 11 64 21 11 11 63 11 11 11 62 11 11 11 61 11 11 11 11 11 13 21 11 11 13 21 11 11 13 21 11 11 13 21 11 11 13 21 11 11 13 21 11 11 13 21 11 11 13 21 65 41 11 11 65 41 11 11 65 41 11 11 65 41 11 11 65 41 11 11 65 41 11 11 65 22 22 22 61 11 11 11 11 11", // initial output
            0x99, // command: 0x9, param: 0 (1 byte)
            [0x80], // offset: 2 bytes back -- end position = 0x64, start position = 0x80
            "11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11 11" // expected result -- count = 22
        );
    });
});

// 0x4 and 0x6 seem to need rewrites? 
// 0x7 0x9 0xA 0xD 0xE maybe
// 0x0 0x1 0x3 0x5 0x8, 0xC super solid
// 0x2 0xF not found
//✓
/*                  command                 -3      -2      -1      0       1       2       3
0x9b 1f, count: 25  1001 1011 0001 1111     10110   10111   11000   11001   11010   11011   11100
0x9c ff, count: 28  1001 1100 1111 1111     11001   11010   11011   11100   11101   11110   11111
0x9b 03, count: 25
0x99 03, count: 21
0x9a 83, count: 24
0x9f 80, count: 34
0x98 83, count: 20
0x99 80, count: 21 -> should be 22


*/
// 30 DD        00 DC   51          00 BB   51          00 CD   51          D8              50     C0     38 DD 
// DD DD DD     DC      DD DD DC    BB      DD DC BB    CD      DC BB CD    DD BB CD DD DD  CD DD  DD CD  DD DD DD DD DD DD DD DD DD DD DD

// invalid D8 50: CD BB DC DD BB
// valid   D8 50: DD BB CD DD DD

//
describe('eabg.map.jzip decompression', () => {
    // D1 -> 00 01 -> 0, 1 Copy 0+3=3 bytes from ???=4 bytes ago
    // D8 -> 10 00 -> 2, 0 Copy 2+3=5 bytes from ???=6 bytes ago
    test('D8 - Copy Back Reference Backwards (Copy 2+3 bytes from 0+3 bytes ago)', () => {
        testCommand(
            "DD DD DD DC DD DD DC BB DD DC BB CD DC BB CD", // initial output
            0xD8, // command: 0x8, param: 0xA (0xA+3 = 0xD = 13 bytes)
            [], // offset: 0x20 = 32 bytes back
            "DD BB CD DD DD" // expected result
        );
    });
});

// 30 DD 00 DC 51 00 BB 51 00 CD 51 D8 50                   C0      38 DD                             8D 10 41                                                     00 DE
// DD DD DD DC DD DD DC BB DD DC BB CD DC BB CD DD BB CD DD DD CD   DD DD DD DD DD DD DD DD DD DD DD  BB CD DD DD CD DD DD DD DD DD DD DD DD DD DD DD DD DD DD     DE