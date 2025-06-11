const { NHL94Decompressor } = require('./nhl94-decompressor.js');

// Test what happens when we use findBestOffset
console.log('=== Testing findBestOffset behavior ===\n');

const problemData = [0x31, 0x66, 0x00, 0x65, 0x30, 0x55, 0x00, 0x65, 0x30, 0x44, 0x03, 0x65, 0x47, 0x77, 0x77];

const decompressor = new NHL94Decompressor();

// Test different offsets
for (let offset = 0; offset <= 10; offset++) {
    try {
        console.log(`\n--- Testing offset ${offset} ---`);
        const result = decompressor.decompress(problemData, offset, false);
        const score = decompressor.scoreDecompression(result);
        
        console.log(`Offset ${offset}: ${result.length} bytes, score: ${score.toFixed(2)}`);
        console.log(`  Result: ${Array.from(result.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
        
        if (result.length === 16) {
            const expected = [0x66, 0x66, 0x66, 0x66, 0x65, 0x55, 0x55, 0x55, 0x65, 0x44, 0x44, 0x44, 0x65, 0x47, 0x77, 0x77];
            const matches = expected.every((val, i) => i < result.length && result[i] === val);
            console.log(`  Matches expected: ${matches}`);
        }
    } catch (error) {
        console.log(`Offset ${offset}: ERROR - ${error.message}`);
    }
}

// Test findBestOffset
console.log('\n=== Testing findBestOffset ===');
const bestResult = decompressor.findBestOffset(Buffer.from(problemData));
if (bestResult) {
    console.log(`Best offset: ${bestResult.offset}, score: ${bestResult.score.toFixed(2)}`);
    console.log(`Result: ${Array.from(bestResult.data.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
} else {
    console.log('No best result found');
}
