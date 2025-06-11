const { NHL94Decompressor } = require('./nhl94-decompressor');

// Debug the offset calculation for 8A command
const testDataWithout8A = [
    0x31, 0x66, 0x00, 0x65, 0x30, 0x55, 0x00, 0x65, 0x30, 0x44, 0x03, 0x65, 0x47, 0x77, 0x77, 0x8D, 
    0x04, 0x31, 0x66, 0x31, 0x55, 0x31, 0x44, 0x3F, 0x77, 0x9B, 0x1F, 0x00, 0x18, 0x51, 0x00, 0x88, 
    0x51, 0x00, 0x92
];

const decompressor = new NHL94Decompressor();
const resultBefore = decompressor.decompress(testDataWithout8A, 0, false);

console.log('Output before 8A command:');
console.log('Length:', resultBefore.length); // Should be 96
console.log('Full output:');
const outputArray = Array.from(resultBefore);

// Print output with positions
for (let i = 0; i < outputArray.length; i++) {
    console.log(`Position ${i} (offset -${outputArray.length - i}): 0x${outputArray[i].toString(16).padStart(2, '0')}`);
}

console.log('\nLooking for the expected pattern:');
console.log('Expected: 66 66 66 66 55 55 55 55 44 44 44 44 77');

// Find where we need to copy from to get this pattern
console.log('\nTo get 66 66 66 66:');
for (let i = 0; i <= outputArray.length - 4; i++) {
    if (outputArray[i] === 0x66 && outputArray[i+1] === 0x66 && 
        outputArray[i+2] === 0x66 && outputArray[i+3] === 0x66) {
        console.log(`  Found at position ${i}-${i+3}, offset from end: -${outputArray.length - i} to -${outputArray.length - (i+3)}`);
    }
}

console.log('\nTo get 55 55 55 55:');
for (let i = 0; i <= outputArray.length - 4; i++) {
    if (outputArray[i] === 0x55 && outputArray[i+1] === 0x55 && 
        outputArray[i+2] === 0x55 && outputArray[i+3] === 0x55) {
        console.log(`  Found at position ${i}-${i+3}, offset from end: -${outputArray.length - i} to -${outputArray.length - (i+3)}`);
    }
}

console.log('\nTo get 44 44 44 44:');
for (let i = 0; i <= outputArray.length - 4; i++) {
    if (outputArray[i] === 0x44 && outputArray[i+1] === 0x44 && 
        outputArray[i+2] === 0x44 && outputArray[i+3] === 0x44) {
        console.log(`  Found at position ${i}-${i+3}, offset from end: -${outputArray.length - i} to -${outputArray.length - (i+3)}`);
    }
}

console.log('\nTo get single 77:');
for (let i = 0; i < outputArray.length; i++) {
    if (outputArray[i] === 0x77) {
        console.log(`  Found at position ${i}, offset from end: -${outputArray.length - i}`);
    }
}
