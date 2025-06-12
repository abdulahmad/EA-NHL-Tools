const { NHL94Decompressor } = require('./nhl94-decompressor');

describe('NHL94Decompressor - handleExtendedCommand', () => {
    let decompressor;

    beforeEach(() => {
        decompressor = new NHL94Decompressor();
        // Setup basic test data
        decompressor.sourceData = [0x40, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF];
        decompressor.sourcePtr = 1; // Skip the command byte
        decompressor.outputData = [];
        decompressor.destPtr = 0;
    });

    describe('0x40-0x4F range', () => {
        test('should handle 0x40 - copy 1 literal byte', () => {
            const result = decompressor.handleExtendedCommand(0x40, 0x40, false);
            
            expect(decompressor.outputData).toEqual([0x11]);
            expect(decompressor.sourcePtr).toBe(2);
        });

        test('should handle 0x45 - copy 6 literal bytes', () => {
            const result = decompressor.handleExtendedCommand(0x45, 0x40, false);
            
            expect(decompressor.outputData).toEqual([0x11, 0x22, 0x33, 0x44, 0x55, 0x66]);
            expect(decompressor.sourcePtr).toBe(7);
        });

        test('should handle 0x4F - copy 16 literal bytes', () => {
            const result = decompressor.handleExtendedCommand(0x4F, 0x40, false);
            
            expect(decompressor.outputData).toEqual([0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF]);
            expect(decompressor.sourcePtr).toBe(16);
        });
    });

    describe('0xA0-0xAF range', () => {
        test('should handle 0xA0 - copy 1 literal byte', () => {
            const result = decompressor.handleExtendedCommand(0xA0, 0xA0, false);
            
            expect(decompressor.outputData).toEqual([0x11]);
            expect(decompressor.sourcePtr).toBe(2);
        });

        test('should handle 0xA8 - copy 9 literal bytes', () => {
            const result = decompressor.handleExtendedCommand(0xA8, 0xA0, false);
            
            expect(decompressor.outputData).toEqual([0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99]);
            expect(decompressor.sourcePtr).toBe(10);
        });
    });

    describe('0xB0-0xBF range', () => {
        test('should handle 0xB3 - copy 4 literal bytes', () => {
            const result = decompressor.handleExtendedCommand(0xB3, 0xB0, false);
            
            expect(decompressor.outputData).toEqual([0x11, 0x22, 0x33, 0x44]);
            expect(decompressor.sourcePtr).toBe(5);
        });
    });

    describe('0xC0-0xCF range', () => {
        test('should handle 0xC7 - copy 8 literal bytes', () => {
            const result = decompressor.handleExtendedCommand(0xC7, 0xC0, false);
            
            expect(decompressor.outputData).toEqual([0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88]);
            expect(decompressor.sourcePtr).toBe(9);
        });
    });

    describe('0xD0-0xDF range', () => {
        test('should handle 0xD1 - copy 2 literal bytes', () => {
            const result = decompressor.handleExtendedCommand(0xD1, 0xD0, false);
            
            expect(decompressor.outputData).toEqual([0x11, 0x22]);
            expect(decompressor.sourcePtr).toBe(3);
        });
    });

    describe('0xE0-0xEF range', () => {
        test('should handle 0xEC - copy 13 literal bytes', () => {
            const result = decompressor.handleExtendedCommand(0xEC, 0xE0, false);
            
            expect(decompressor.outputData).toEqual([0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xAA, 0xBB, 0xCC, 0xDD]);
            expect(decompressor.sourcePtr).toBe(14);
        });
    });

    describe('Edge cases', () => {
        test('should handle empty source data gracefully', () => {
            decompressor.sourceData = [0x40];
            decompressor.sourcePtr = 1;
            
            expect(() => {
                decompressor.handleExtendedCommand(0x40, 0x40, false);
            }).toThrow('Source pointer 1 beyond data length 1');
        });

        test('should handle insufficient source data', () => {
            decompressor.sourceData = [0x40, 0x11, 0x22]; // Only 2 bytes available
            decompressor.sourcePtr = 1;
            
            expect(() => {
                decompressor.handleExtendedCommand(0x43, 0x40, false); // Needs 4 bytes
            }).toThrow('Source pointer 4 beyond data length 3');
        });

        test('should work with verbose logging', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            decompressor.handleExtendedCommand(0x42, 0x40, true);
            
            expect(consoleSpy).toHaveBeenCalledWith('  Extended command: 0x42 (base: 0x40)');
            expect(decompressor.outputData).toEqual([0x11, 0x22, 0x33]);
            
            consoleSpy.mockRestore();
        });
    });

    describe('Count calculation', () => {
        test('should calculate count correctly for all nibble values', () => {
            const testCases = [
                { cmd: 0x40, expectedCount: 1 },  // 0 + 1
                { cmd: 0x41, expectedCount: 2 },  // 1 + 1
                { cmd: 0x45, expectedCount: 6 },  // 5 + 1
                { cmd: 0x4A, expectedCount: 11 }, // 10 + 1
                { cmd: 0x4F, expectedCount: 16 }, // 15 + 1
            ];

            testCases.forEach(({ cmd, expectedCount }) => {
                decompressor.sourcePtr = 1; // Reset pointer
                decompressor.outputData = []; // Reset output
                
                decompressor.handleExtendedCommand(cmd, 0x40, false);
                
                expect(decompressor.outputData.length).toBe(expectedCount);
            });
        });
    });
});