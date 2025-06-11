const { NHL94Decompressor } = require('./nhl94-decompressor');

// Test to understand what 8A 20 should actually do
const testData = [
    0x31, 0x66, 0x00, 0x65, 0x30, 0x55, 0x00, 0x65, 0x30, 0x44, 0x03, 0x65, 0x47, 0x77, 0x77, 0x8D, 
    0x04, 0x31, 0x66, 0x31, 0x55, 0x31, 0x44, 0x3F, 0x77, 0x9B, 0x1F, 0x00, 0x18, 0x51, 0x00, 0x88, 
    0x51, 0x00, 0x92
];

const decompressor = new NHL94Decompressor();
console.log('Analyzing 8A command...');

// Get output before 8A command
const resultBefore = decompressor.decompress(testData, 0, false);
console.log('Output before 8A command:');
console.log('Length:', resultBefore.length);
console.log('Last 32 bytes:', Array.from(resultBefore.slice(-32)).map(b => b.toString(16).padStart(2, '0')).join(' '));

// Expected output after 8A 20
const expected8AOutput = [0x66, 0x66, 0x66, 0x66, 0x55, 0x55, 0x55, 0x55, 0x44, 0x44, 0x44, 0x44, 0x77];
console.log('\nExpected 8A 20 output:');
console.log('Length:', expected8AOutput.length);
console.log('Bytes:', expected8AOutput.map(b => b.toString(16).padStart(2, '0')).join(' '));

// Analyze the pattern
console.log('\nAnalyzing the pattern:');
console.log('66 66 66 66 - 4 bytes of 0x66');
console.log('55 55 55 55 - 4 bytes of 0x55'); 
console.log('44 44 44 44 - 4 bytes of 0x44');
console.log('77          - 1 byte of 0x77');

console.log('\nLooking at the output before 8A:');
// Find where these patterns exist in the previous output
const outputArray = Array.from(resultBefore);

// Look for pattern of 66 66 66 66
for (let i = 0; i <= outputArray.length - 4; i++) {
    if (outputArray[i] === 0x66 && outputArray[i+1] === 0x66 && 
        outputArray[i+2] === 0x66 && outputArray[i+3] === 0x66) {
        console.log(`Found 66 66 66 66 at position ${i} (offset from end: ${outputArray.length - i})`);
    }
}

// Look for pattern of 55 55 55 55
for (let i = 0; i <= outputArray.length - 4; i++) {
    if (outputArray[i] === 0x55 && outputArray[i+1] === 0x55 && 
        outputArray[i+2] === 0x55 && outputArray[i+3] === 0x55) {
        console.log(`Found 55 55 55 55 at position ${i} (offset from end: ${outputArray.length - i})`);
    }
}

// Look for pattern of 44 44 44 44
for (let i = 0; i <= outputArray.length - 4; i++) {
    if (outputArray[i] === 0x44 && outputArray[i+1] === 0x44 && 
        outputArray[i+2] === 0x44 && outputArray[i+3] === 0x44) {
        console.log(`Found 44 44 44 44 at position ${i} (offset from end: ${outputArray.length - i})`);
    }
}

console.log('\nHypothesis: 8A 20 might copy specific chunks from earlier in the output');
console.log('8A = lowNibble A = 10');
console.log('20 = parameter = 32');

// Maybe it copies from multiple offsets?
// Or copies a specific pattern from way back in the output?
