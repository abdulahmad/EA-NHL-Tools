const { TileDecompressor } = require('./uncompress-jim');

function runTest(testName, initialOutput, commandByte, additionalBytes, expectedResult) {
    console.log(`\n--- Testing: ${testName} ---`);
    
    const decompressor = new TileDecompressor();
    decompressor.setOutput(initialOutput);
    
    console.log(`Initial output: [${initialOutput.map(b => `0x${b.toString(16).padStart(2, '0')}`).join(', ')}]`);
    console.log(`Command: 0x${commandByte.toString(16).padStart(2, '0')}`);
    console.log(`Additional bytes: [${additionalBytes.map(b => `0x${b.toString(16).padStart(2, '0')}`).join(', ')}]`);
    
    try {
        const result = decompressor.processCommand(commandByte, additionalBytes);
        const actualOutput = Array.from(decompressor.getOutput().slice(initialOutput.length));
        
        console.log(`Expected: [${expectedResult.map(b => `0x${b.toString(16).padStart(2, '0')}`).join(', ')}]`);
        console.log(`Actual:   [${actualOutput.map(b => `0x${b.toString(16).padStart(2, '0')}`).join(', ')}]`);
        
        const success = actualOutput.length === expectedResult.length && 
                       actualOutput.every((b, i) => b === expectedResult[i]);
        
        console.log(`Result: ${success ? 'PASS' : 'FAIL'}`);
        
        if (!success) {
            console.log(`Command result:`, result);
        }
        
        return success;
    } catch (error) {
        console.log(`Error: ${error.message}`);
        console.log(`Result: FAIL`);
        return false;
    }
}

function runAllTests() {
    console.log('Running Tile Decompressor Tests...\n');
    
    let passed = 0;
    let total = 0;
    
    // Test 0x0 - Literal copy
    total++;
    if (runTest(
        'Literal Copy (0x02 - copy 3 bytes)',
        [], // empty initial output
        0x02, // command: 0x0, param: 2 (3 bytes)
        [0x66, 0x77, 0x88], // bytes to copy
        [0x66, 0x77, 0x88] // expected result
    )) passed++;
    
    // Test 0x3 - RLE
    total++;
    if (runTest(
        'RLE (0x33 - repeat byte 4 times)',
        [],
        0x33, // command: 0x3, param: 3 (4 times)
        [0xAA], // byte to repeat
        [0xAA, 0xAA, 0xAA, 0xAA] // expected result
    )) passed++;
    
    // Test 0x5 - Short back reference
    total++;
    if (runTest(
        'Short Back Reference (0x55 - copy 2 bytes from 2 bytes back)',
        [0x11, 0x22, 0x33, 0x44], // initial output
        0x55, // command: 0x5, offset bits: 01 (2 bytes back), count bits: 01 (2 bytes)
        [], // no additional bytes
        [0x33, 0x44] // expected result (bytes at positions -2 and -1)
    )) passed++;
    
    // Test 0x8 - Back reference with offset
    total++;
    if (runTest(
        'Back Reference 0x8 (0x81 - copy 2 bytes from offset)',
        [0xAA, 0xBB, 0xCC, 0xDD], // initial output
        0x81, // command: 0x8, param: 1 (2 bytes)
        [0x03], // offset: 3 bytes back
        [0xBB, 0xCC] // expected result
    )) passed++;
    
    // Test 0x9 - Alternative back reference
    total++;
    if (runTest(
        'Back Reference 0x9 (0x90 - copy 1 byte from offset)',
        [0x11, 0x22, 0x33], // initial output
        0x90, // command: 0x9, param: 0 (1 byte)
        [0x02], // offset: 2 bytes back
        [0x22] // expected result
    )) passed++;
    
    // Test 0xC - Fixed back reference (32 bytes)
    total++;
    if (runTest(
        'Fixed Back Reference (0xC2 - copy 3 bytes from 32 bytes back)',
        new Array(35).fill(0).map((_, i) => i < 32 ? 0x10 + (i % 16) : 0xFF), // 32 bytes + 3 more
        0xC2, // command: 0xC, param: 2 (3 bytes)
        [], // no additional bytes
        [0x10, 0x11, 0x12] // expected result (first 3 bytes from 32 positions back)
    )) passed++;
    
    // Test edge case - RLE with single byte
    total++;
    if (runTest(
        'RLE Single Byte (0x30 - repeat 1 time)',
        [],
        0x30, // command: 0x3, param: 0 (1 time)
        [0xFF],
        [0xFF]
    )) passed++;
    
    // Test back reference with overlapping copy
    total++;
    if (runTest(
        'Overlapping Back Reference (pattern repeat)',
        [0xAB, 0xCD],
        0x83, // copy 4 bytes from 2 bytes back
        [0x02],
        [0xAB, 0xCD, 0xAB, 0xCD] // should repeat the pattern
    )) passed++;
    
    console.log(`\n--- Test Summary ---`);
    console.log(`Passed: ${passed}/${total}`);
    console.log(`${passed === total ? 'All tests passed!' : 'Some tests failed.'}`);
    
    return passed === total;
}

// If run directly
if (require.main === module) {
    runAllTests();
}

module.exports = { runTest, runAllTests };