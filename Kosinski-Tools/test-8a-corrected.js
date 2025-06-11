const { NHL94Decompressor } = require('./nhl94-decompressor');

// Test the corrected 8A 20 command implementation
const testData = [
    0x31, 0x66, 0x00, 0x65, 0x30, 0x55, 0x00, 0x65, 0x30, 0x44, 0x03, 0x65, 0x47, 0x77, 0x77, 0x8D, 
    0x04, 0x31, 0x66, 0x31, 0x55, 0x31, 0x44, 0x3F, 0x77, 0x9B, 0x1F, 0x00, 0x18, 0x51, 0x00, 0x88, 
    0x51, 0x00, 0x92, 0x8A, 0x20
];

const testDataWithout8A = [
    0x31, 0x66, 0x00, 0x65, 0x30, 0x55, 0x00, 0x65, 0x30, 0x44, 0x03, 0x65, 0x47, 0x77, 0x77, 0x8D, 
    0x04, 0x31, 0x66, 0x31, 0x55, 0x31, 0x44, 0x3F, 0x77, 0x9B, 0x1F, 0x00, 0x18, 0x51, 0x00, 0x88, 
    0x51, 0x00, 0x92
];

const decompressor1 = new NHL94Decompressor();
const decompressor2 = new NHL94Decompressor();

console.log('Testing corrected 8A 20 command...');

const resultWithout = decompressor1.decompress(testDataWithout8A, 0, false);
const resultWith = decompressor2.decompress(testData, 0, false);

console.log('Output without 8A:', resultWithout.length, 'bytes');
console.log('Output with 8A:', resultWith.length, 'bytes');
console.log('Added by 8A:', resultWith.length - resultWithout.length, 'bytes');

// Extract the bytes added by 8A command
const addedBytes = Array.from(resultWith.slice(resultWithout.length));
console.log('\nBytes added by 8A 20:');
console.log('Hex:', addedBytes.map(b => b.toString(16).padStart(2, '0')).join(' '));
console.log('Length:', addedBytes.length);

// Expected pattern
const expectedPattern = [0x66, 0x66, 0x66, 0x66, 0x55, 0x55, 0x55, 0x55, 0x44, 0x44, 0x44, 0x44, 0x77];
console.log('\nExpected pattern:');
console.log('Hex:', expectedPattern.map(b => b.toString(16).padStart(2, '0')).join(' '));
console.log('Length:', expectedPattern.length);

// Compare
if (addedBytes.length === expectedPattern.length) {
    console.log('\n✅ Length matches!');
    
    let matches = true;
    for (let i = 0; i < expectedPattern.length; i++) {
        if (addedBytes[i] !== expectedPattern[i]) {
            console.log(`❌ Mismatch at position ${i}: got 0x${addedBytes[i].toString(16)}, expected 0x${expectedPattern[i].toString(16)}`);
            matches = false;
        }
    }
    
    if (matches) {
        console.log('✅ SUCCESS: 8A 20 command produces the correct pattern!');
    }
} else {
    console.log(`❌ Length mismatch: got ${addedBytes.length}, expected ${expectedPattern.length}`);
}

// Verify the pattern breakdown
console.log('\nPattern breakdown:');
console.log('Expected:');
console.log('  66 66 66 66 (4 bytes from offset -32)');
console.log('  55 55 55 55 (4 bytes from offset -28)');
console.log('  44 44 44 44 (4 bytes from offset -24)');
console.log('  77          (1 byte from offset -20)');

if (addedBytes.length >= 13) {
    console.log('\nActual:');
    console.log(`  ${addedBytes.slice(0, 4).map(b => b.toString(16).padStart(2, '0')).join(' ')} (first 4 bytes)`);
    console.log(`  ${addedBytes.slice(4, 8).map(b => b.toString(16).padStart(2, '0')).join(' ')} (next 4 bytes)`);
    console.log(`  ${addedBytes.slice(8, 12).map(b => b.toString(16).padStart(2, '0')).join(' ')} (next 4 bytes)`);
    console.log(`  ${addedBytes.slice(12, 13).map(b => b.toString(16).padStart(2, '0')).join(' ')}          (last 1 byte)`);
}
