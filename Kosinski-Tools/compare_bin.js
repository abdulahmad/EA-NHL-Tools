// Pragmatic comparison tool for debugging decompression
const fs = require('fs');

if (process.argv.length !== 4) {
    console.error('Usage: node compare_bin.js <expected> <actual>');
    process.exit(1);
}

const expected = fs.readFileSync(process.argv[2]);
const actual = fs.readFileSync(process.argv[3]);
const len = Math.min(expected.length, actual.length);

for (let i = 0; i < len; i++) {
    if (expected[i] !== actual[i]) {
        console.log(`Mismatch at offset 0x${i.toString(16).padStart(6, '0')}: expected 0x${expected[i].toString(16).padStart(2, '0')}, got 0x${actual[i].toString(16).padStart(2, '0')}`);
        // Print context
        console.log('Expected:', expected.slice(Math.max(0, i-8), i+8).toString('hex'));
        console.log('Actual  :', actual.slice(Math.max(0, i-8), i+8).toString('hex'));
        process.exit(1);
    }
}
console.log('Files match for first', len, 'bytes.');
if (expected.length !== actual.length) {
    console.log('File lengths differ:', expected.length, actual.length);
}
