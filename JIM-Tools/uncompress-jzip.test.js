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
    const expectedBytes = hexToBytes(expectedResult);
    
    decompressor.setOutput(initialBytes);
    
    const result = decompressor.processCommand(commandByte, additionalBytes);
    const actualOutput = Array.from(decompressor.getOutput().slice(initialBytes.length));
    
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
    
    test('0x5 - Short Back Reference (2 bytes from 2 back)', () => {
        testCommand(
            [0x11, 0x22, 0x33, 0x44], // initial output
            0x55, // command: 0x5, offset bits: 01 (2 bytes back), count bits: 01 (2 bytes)
            [], // no additional bytes
            [0x33, 0x44] // expected result (bytes at positions -2 and -1)
        );
    });
    
    test('0x8 - Back Reference with offset (2 bytes from 3 back)', () => {
        testCommand(
            [0xAA, 0xBB, 0xCC, 0xDD], // initial output
            0x81, // command: 0x8, param: 1 (2 bytes)
            [0x03], // offset: 3 bytes back
            [0xBB, 0xCC] // expected result
        );
    });
    
    test('0x9 - Alternative Back Reference (1 byte from 2 back)', () => {
        testCommand(
            [0x11, 0x22, 0x33], // initial output
            0x90, // command: 0x9, param: 0 (1 byte)
            [0x02], // offset: 2 bytes back
            [0x22] // expected result
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
    
    test('RLE Single Byte (repeat 3 times)', () => {
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
            [0xEE]
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
            decompressor.setOutput([0x11, 0x22, 0x33, 0x44]);
            const result = decompressor.processCommand(0x55, []);
            expect(result.command).toBe('short_back_ref');
            expect(result.offset).toBe(2);
            expect(result.count).toBe(2);
        });

        test('should correctly parse command 0x8X (back ref with offset)', () => {
            const decompressor = new TileDecompressor();
            decompressor.setOutput([0x11, 0x22, 0x33, 0x44]);
            const result = decompressor.processCommand(0x81, [0x02]);
            expect(result.command).toBe('back_ref_8');
            expect(result.offset).toBe(2);
            expect(result.count).toBe(2);
        });

        test('should correctly parse command 0x9X (alt back ref with offset)', () => {
            const decompressor = new TileDecompressor();
            decompressor.setOutput([0x11, 0x22, 0x33, 0x44]);
            const result = decompressor.processCommand(0x91, [0x02]);
            expect(result.command).toBe('back_ref_9');
            expect(result.offset).toBe(2);
            expect(result.count).toBe(2);
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
            "11223344", // initial output as hex string
            0x55, // command: 0x5, offset bits: 01 (2 bytes back), count bits: 01 (2 bytes)
            [], // no additional bytes
            "3344" // expected result as hex string
        );
    });
    
    test('Back Reference with hex strings and spaces', () => {
        testCommand(
            "AA BB CC DD", // initial output with spaces
            0x81, // command: 0x8, param: 1 (2 bytes)
            [0x03], // offset: 3 bytes back
            "BB CC" // expected result with spaces
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
            [0x11, 0x22, 0x33, 0x44], // initial output as array
            0x55,
            [],
            "3344" // expected result as hex string
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
    
    test('00 65 - Literal Copy single byte', () => {
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
            0x30, // command: 0x3, param: 3 (4 times)
            [0x55], // byte to repeat
            "55 55 55" // expected result
        );
    });
    
    // 03 65 47 77 77 
    // 8D 04 
    // 3F 77 
    // 9B 1F 
    // 51 
    // 8A 20 
    // 0E 22 28 82 22 33 32 22 34 44 32 98 22 99 98 88 
    // 89 20 
    // 01 99 88 
    // 68 
    // 04 98 11 18 77 81 
    // 34 11 
    // 9C FF 
    // 82 80 
    // 07 21 44 44 43 21 77 77 73 
    // 8E 04 
    // 8F D4 
    // 8B 04 
    // 38 77 
    // 83 B8 
    // 5E
   
});