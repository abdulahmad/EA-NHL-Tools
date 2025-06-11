// Test different interpretations of the 0x68 command
const { NHL94Decompressor } = require('./nhl94-decompressor.js');

// Output buffer before 0x68: last 20 bytes are: 98 88 66 66 66 66 55 55 55 55 44 44 44 44 11 77 77 77 99 88
// We want to copy "11 77" which is at position -6

// For 0x68:
// - High nibble: 0x6 (command group)  
// - Low nibble: 0x8

// Hypothesis 1: Low nibble is the offset (8 bytes back), count is always 2
console.log('Hypothesis 1: offset=8, count=2');
const outputBuffer = [0x98, 0x88, 0x66, 0x66, 0x66, 0x66, 0x55, 0x55, 0x55, 0x55, 0x44, 0x44, 0x44, 0x44, 0x11, 0x77, 0x77, 0x77, 0x99, 0x88];
console.log('  Position -8:', outputBuffer[outputBuffer.length - 8].toString(16), outputBuffer[outputBuffer.length - 7].toString(16));

// Hypothesis 2: Low nibble encodes position differently  
console.log('Hypothesis 2: Different encoding');
console.log('  Position -6:', outputBuffer[outputBuffer.length - 6].toString(16), outputBuffer[outputBuffer.length - 5].toString(16));

// Hypothesis 3: Maybe the 0x60-0x6F commands have a pattern
// Let's see if the low nibble relates to the offset in some other way

// Since we found "11 77" at position -6, and the low nibble is 8:
// Maybe offset = low_nibble - 2 = 8 - 2 = 6?
console.log('Hypothesis 3: offset = low_nibble - 2 = 6');

// Or maybe it's a lookup table or some other transformation
console.log('Hypothesis 4: offset calculation');
console.log('  Low nibble 8 could map to offset 6');

// Let's also check if there are any other "11 77" patterns
console.log('\nAll "11 77" patterns in buffer:');
for (let i = 0; i < outputBuffer.length - 1; i++) {
    if (outputBuffer[i] === 0x11 && outputBuffer[i + 1] === 0x77) {
        console.log(`  Found at absolute position ${i}, relative position -${outputBuffer.length - i}`);
    }
}
