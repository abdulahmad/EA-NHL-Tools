const { NHL94Decompressor } = require('./nhl94-decompressor');

// Test the specific case that's failing
const testData = [
    0x31, 0x66, 0x00, 0x65, 0x30, 0x55, 0x00, 0x65, 0x30, 0x44, 0x03, 0x65, 0x47, 0x77, 0x77, 0x8D, 
    0x04, 0x31, 0x66, 0x31, 0x55, 0x31, 0x44, 0x3F, 0x77, 0x9B, 0x1F, 0x00, 0x18, 0x51, 0x00, 0x88, 
    0x51, 0x00, 0x92, 0x8A, 0x20
];

const decompressor = new NHL94Decompressor();
console.log('Testing 8A 20 command...');
console.log('Input data length:', testData.length);

// Decompress with verbose output
const result = decompressor.decompress(testData, 0, true);

console.log('\nExpected output length: around 84 bytes (original 80 + 4 more bytes)');
console.log('Actual output length:', result.length);

if (result.length < 200) {
    console.log('\nFull output:');
    console.log(Array.from(result).map(b => b.toString(16).padStart(2, '0')).join(' '));
} else {
    console.log('\nFirst 100 bytes:');
    console.log(Array.from(result.slice(0, 100)).map(b => b.toString(16).padStart(2, '0')).join(' '));
    console.log('\nLast 20 bytes:');
    console.log(Array.from(result.slice(-20)).map(b => b.toString(16).padStart(2, '0')).join(' '));
}

// Check what the output buffer looks like before the 8A command
console.log('\nAnalyzing step by step...');
const decompressor2 = new NHL94Decompressor();
const partialData = testData.slice(0, -2); // Remove 8A 20
const partialResult = decompressor2.decompress(partialData, 0, false);
console.log('Output before 8A 20 command:');
console.log('Length:', partialResult.length);
console.log('Last 32 bytes:', Array.from(partialResult.slice(-32)).map(b => b.toString(16).padStart(2, '0')).join(' '));
