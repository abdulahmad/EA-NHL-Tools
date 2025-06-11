const { NHL94Decompressor } = require('./nhl94-decompressor');

// Test without the 8A 20 command first
const testDataWithout8A = [
    0x31, 0x66, 0x00, 0x65, 0x30, 0x55, 0x00, 0x65, 0x30, 0x44, 0x03, 0x65, 0x47, 0x77, 0x77, 0x8D, 
    0x04, 0x31, 0x66, 0x31, 0x55, 0x31, 0x44, 0x3F, 0x77, 0x9B, 0x1F, 0x00, 0x18, 0x51, 0x00, 0x88, 
    0x51, 0x00, 0x92
];

// Test with the 8A 20 command
const testDataWith8A = [
    0x31, 0x66, 0x00, 0x65, 0x30, 0x55, 0x00, 0x65, 0x30, 0x44, 0x03, 0x65, 0x47, 0x77, 0x77, 0x8D, 
    0x04, 0x31, 0x66, 0x31, 0x55, 0x31, 0x44, 0x3F, 0x77, 0x9B, 0x1F, 0x00, 0x18, 0x51, 0x00, 0x88, 
    0x51, 0x00, 0x92, 0x8A, 0x20
];

const decompressor1 = new NHL94Decompressor();
const decompressor2 = new NHL94Decompressor();

console.log('Testing output before and after 8A 20...');

const resultWithout = decompressor1.decompress(testDataWithout8A, 0, false);
const resultWith = decompressor2.decompress(testDataWith8A, 0, false);

console.log('Output without 8A 20:', resultWithout.length, 'bytes');
console.log('Output with 8A 20:', resultWith.length, 'bytes');
console.log('Difference:', resultWith.length - resultWithout.length, 'bytes');

if (resultWith.length === resultWithout.length + 1) {
    console.log('✅ 8A 20 added exactly 1 byte as expected!');
    
    // Check if all bytes except the last one are the same
    let samePrefix = true;
    for (let i = 0; i < resultWithout.length; i++) {
        if (resultWith[i] !== resultWithout[i]) {
            console.log(`❌ Difference at position ${i}: ${resultWith[i]} vs ${resultWithout[i]}`);
            samePrefix = false;
            break;
        }
    }
    
    if (samePrefix) {
        console.log('✅ All bytes before 8A 20 are unchanged!');
        console.log(`Added byte: 0x${resultWith[resultWith.length - 1].toString(16)}`);
        
        if (resultWith[resultWith.length - 1] === 0x77) {
            console.log('✅ SUCCESS: 8A 20 correctly added 0x77!');
        } else {
            console.log('❌ FAILED: 8A 20 added wrong byte');
        }
    }
} else {
    console.log('❌ 8A 20 added wrong number of bytes');
}

console.log('\nOutput without 8A (hex):');
console.log(Array.from(resultWithout).map(b => b.toString(16).padStart(2, '0')).join(' '));

console.log('\nOutput with 8A (hex):');
console.log(Array.from(resultWith).map(b => b.toString(16).padStart(2, '0')).join(' '));
