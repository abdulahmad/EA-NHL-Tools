// Create test file to debug offset selection issue
const fs = require('fs');

// Test data: 31 66 00 65 30 55 00 65 30 44 03 65 47 77 77 8D 04 31 66
const testData = [0x31, 0x66, 0x00, 0x65, 0x30, 0x55, 0x00, 0x65, 0x30, 0x44, 0x03, 0x65, 0x47, 0x77, 0x77, 0x8D, 0x04, 0x31, 0x66];

console.log('=== Debugging offset selection issue ===');
console.log('Input data:', testData.map(b => b.toString(16).padStart(2, '0')).join(' '));
console.log('Input length:', testData.length);

// Write test file
fs.writeFileSync('test_offset_debug.bin', Buffer.from(testData));

// Test with the actual decompressor
const { execSync } = require('child_process');

console.log('\n--- Running decompressor on test file ---');
try {
    const output = execSync('node nhl94-decompressor.js test_offset_debug.bin test_output_debug.bin --verbose', { encoding: 'utf8' });
    console.log(output);
    
    // Read the output
    const outputData = fs.readFileSync('test_output_debug.bin');
    console.log('\nOutput data:', Array.from(outputData.slice(0, 32)).map(b => b.toString(16).padStart(2, '0')).join(' '));
    
    // Expected output should start with: 66 66 66 66 65 55 55 55 65 44 44 44 65 47 77 77
    const expected = [0x66, 0x66, 0x66, 0x66, 0x65, 0x55, 0x55, 0x55, 0x65, 0x44, 0x44, 0x44, 0x65, 0x47, 0x77, 0x77];
    const matches = outputData.length >= 16 && expected.every((val, i) => outputData[i] === val);
    console.log(`\nMatches expected start: ${matches}`);
    if (!matches) {
        console.log('Expected:', expected.map(b => b.toString(16).padStart(2, '0')).join(' '));
        console.log('Actual  :', Array.from(outputData.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' '));
    }
    
} catch (error) {
    console.error('Error running decompressor:', error.message);
}

// Clean up
try {
    fs.unlinkSync('test_offset_debug.bin');
    fs.unlinkSync('test_output_debug.bin');
} catch (e) {
    // Ignore cleanup errors
}
