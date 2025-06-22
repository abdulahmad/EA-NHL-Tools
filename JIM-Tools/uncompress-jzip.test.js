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
            [0x11, 0x22, 0x33, 0x44] // expected result (bytes at positions -2 and -1)
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
            0x94, // command: 0x9, param: 0 (1 byte)
            [0x04], // offset: 2 bytes back
            "44 55 66 77" // expected result
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
            [0xFF, 0xEE],
            0x50, // command: 0x5, offset: 1 byte back, count: 1 byte
            [],
            [0xFF, 0xEE]
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
            expect(result.offset).toBe(7);
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
            const result = decompressor.processCommand(0x91, [0x04]);
            expect(result.command).toBe('back_ref_9');
            expect(result.offset).toBe(5);
            expect(result.count).toBe(-5);
        });

        test('should correctly parse command 0xCX (fixed back ref)', () => {
            const initialOutput = new Array(35).fill(0x10);
            const decompressor = new TileDecompressor();
            decompressor.setOutput(initialOutput);
            const result = decompressor.processCommand(0xC1, []);
            expect(result.command).toBe('fixed_back_ref');
            expect(result.offset).toBe(32);
            expect(result.count).toBe(2);
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
            [0x66, 0x77, 0x20, 0x30, 0x66, 0x77] // expected: literal bytes + back ref bytes // 66 77 20 30 66 77
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
            [0x99, 0x99, 0x99, 0x99, 0x27, 0x20] // RLE bytes + first 2 from 32 back
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
            [0x43, 0x40, 0x41, 0x42, 0x43, 0x35, 0x36, 0x37] // short back ref + fixed back ref
        );
    });

    // 0x5 (short back ref) command followed by consumed = 1 command (0x9 alt back ref)
    test('0x5 short back ref -> 0x9 alt back ref (consumed 1)', () => {
        testCommandSequence(
            [0x11, 0x22, 0x33, 0x44, 0x55, 0x66], // initial output
            0x51, [], // short back ref: copy from 1+2=3 bytes back, count 1+2=3
            0x91, [0x05], // alt back ref: copy (2*2)+1=5 bytes from (2+1)=3 bytes back
            [0x44, 0x55, 0x66] // short back ref + alt back ref
        );
    });

    // 0x8 (back ref) command followed by consumed = 0 command (0x5 short back ref)
    test('0x8 back ref -> 0x5 short back ref (consumed 0)', () => {
        testCommandSequence(
            [0xAA, 0xBB, 0xCC, 0xDD, 0xEE], // initial output
            0x80, [0x03], // back ref: copy pattern from 3 bytes back, count 3
            0x52, [], // short back ref: copy from 2+2=4 bytes back, count 2+2=4
            [0xCC, 0xDD, 0xEE, 0xEE, 0xCC, 0xDD, 0xEE] // back ref + short back ref
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
            0x91, [0x05], // alt back ref: copy (1*2)+1=3 bytes from (1+1)=2 bytes back
            0xC1, [], // fixed back ref: copy 2 bytes from 32 back
            [0x54, 0x55] // alt back ref + fixed back ref
        );
    });

    // 0x9 (alt back ref) command followed by consumed = 1 command (0x8 back ref)
    test('0x9 alt back ref -> 0x8 back ref (consumed 1)', () => {
        testCommandSequence(
            [0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77], // initial output
            0x90, [0x05], // alt back ref: copy (0*2)+1=1 byte from (2+1)=3 bytes back
            0x80, [0x02], // back ref: copy pattern from 2 bytes back, count 3
            "66 77 66" // alt back ref + back ref
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
            [0x72, 0xFE, 0xFD] // fixed back ref + literal
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
            "11223344556677" // expected result as hex string
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
            "22334411223344" // expected result as hex string
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
            "77 11 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77 11 77 77 77" // expected result -- count = 28
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
});