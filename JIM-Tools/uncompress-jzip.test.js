import { test, describe, expect } from 'vitest';
import { TileDecompressor } from './uncompress-jzip.js';

function testCommand(initialOutput, commandByte, additionalBytes, expectedResult) {
    const decompressor = new TileDecompressor();
    decompressor.setOutput(initialOutput);
    
    const result = decompressor.processCommand(commandByte, additionalBytes);
    const actualOutput = Array.from(decompressor.getOutput().slice(initialOutput.length));
    
    expect(actualOutput).toEqual(expectedResult);
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
            0x33, // command: 0x3, param: 3 (4 times)
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
    
    test('RLE Single Byte (repeat 1 time)', () => {
        testCommand(
            [],
            0x30, // command: 0x3, param: 0 (1 time)
            [0xFF],
            [0xFF]
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
            expect(result.count).toBe(3);
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

describe('ronbarr.map.jzip decompression', () => {
    
    test('31 66 - RLE (repeat 66, 4 times)', () => {
        testCommand(
            [],
            0x31, // command: 0x3, param: 3 (4 times)
            [0x66], // byte to repeat
            [0x66, 0x66, 0x66, 0x66] // expected result
        );
    });
    
   
});