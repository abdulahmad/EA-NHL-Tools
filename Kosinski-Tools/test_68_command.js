// Test script to understand the 0x68 command behavior
const { NHL94Decompressor } = require('./nhl94-decompressor.js');

// Test data that ends with 0x68
const testData = [
    0x31, 0x66, 0x00, 0x65, 0x30, 0x55, 0x00, 0x65, 0x30, 0x44, 0x03, 0x65, 0x47, 0x77, 0x77, 0x8D, 
    0x04, 0x31, 0x66, 0x31, 0x55, 0x31, 0x44, 0x3F, 0x77, 0x9B, 0x1F, 0x00, 0x18, 0x51, 0x00, 0x88, 
    0x51, 0x00, 0x92, 0x8A, 0x20, 0x31, 0x11, 0x0E, 0x22, 0x28, 0x82, 0x22, 0x33, 0x32, 0x22, 0x34, 
    0x44, 0x32, 0x98, 0x22, 0x99, 0x98, 0x88, 0x89, 0x20, 0x00, 0x11, 0x30, 0x77, 0x01, 0x99, 0x88, 
    0x68
];

console.log('Test data length:', testData.length);
console.log('Last few bytes:', testData.slice(-10).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));

const decompressor = new NHL94Decompressor();

// Let's see what output we have just before the 0x68 command
const partialData = testData.slice(0, -1); // Everything except the 0x68
console.log('\nDecompressing up to 0x68 command:');
const partialResult = decompressor.decompress(partialData, 0, true);
console.log('Output length before 0x68:', partialResult.length);
console.log('Last 20 bytes of output:', Array.from(partialResult.slice(-20)).map(b => b.toString(16).padStart(2, '0')).join(' '));

// Now let's see what we expect after 0x68
console.log('\nExpected final output should end with: 11 77');

// Let's examine what's at various positions from the end
console.log('\nAnalyzing output buffer for potential source of "11 77":');
for (let i = 1; i <= 20; i++) {
    const pos = partialResult.length - i;
    if (pos >= 0 && pos + 1 < partialResult.length) {
        const byte1 = partialResult[pos].toString(16).padStart(2, '0');
        const byte2 = partialResult[pos + 1].toString(16).padStart(2, '0');
        console.log(`  Position -${i}: ${byte1} ${byte2}`);
        if (byte1 === '11' && byte2 === '77') {
            console.log(`    *** Found "11 77" at position -${i}!`);
        }
    }
}
