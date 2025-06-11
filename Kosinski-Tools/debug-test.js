const { NHL94Decompressor } = require('./nhl94-decompressor.js');

// Test the problematic sequence
console.log('=== Debugging NHL94 Decompressor ===\n');

// First test: the working sequence
console.log('Test 1: Working sequence');
const workingData = [0x31, 0x66, 0x00, 0x65, 0x30, 0x55, 0x00, 0x65, 0x30, 0x44];
const decompressor1 = new NHL94Decompressor();
const result1 = decompressor1.decompress(workingData, 0, true);
console.log('Result:', Array.from(result1).map(b => b.toString(16).padStart(2, '0')).join(' '));
console.log('Expected: 66 66 66 66 65 55 55 55 65 44 44 44');
console.log('Match:', Array.from(result1).map(b => b.toString(16).padStart(2, '0')).join(' ') === '66 66 66 66 65 55 55 55 65 44 44 44');
console.log();

// Second test: the problematic sequence
console.log('Test 2: Problematic sequence');
const problemData = [0x31, 0x66, 0x00, 0x65, 0x30, 0x55, 0x00, 0x65, 0x30, 0x44, 0x03, 0x65, 0x47, 0x77, 0x77];
const decompressor2 = new NHL94Decompressor();
const result2 = decompressor2.decompress(problemData, 0, true);
console.log('Result:', Array.from(result2).map(b => b.toString(16).padStart(2, '0')).join(' '));
console.log('Expected: 66 66 66 66 65 55 55 55 65 44 44 44 65 47 77 77');
console.log('Match:', Array.from(result2).map(b => b.toString(16).padStart(2, '0')).join(' ') === '66 66 66 66 65 55 55 55 65 44 44 44 65 47 77 77');
console.log();

// Third test: just the 03 command in isolation
console.log('Test 3: Just the 03 command');
const isolatedData = [0x03, 0x65, 0x47, 0x77, 0x77];
const decompressor3 = new NHL94Decompressor();
const result3 = decompressor3.decompress(isolatedData, 0, true);
console.log('Result:', Array.from(result3).map(b => b.toString(16).padStart(2, '0')).join(' '));
console.log('Expected: 65 47 77 77');
console.log('Match:', Array.from(result3).map(b => b.toString(16).padStart(2, '0')).join(' ') === '65 47 77 77');

// Test 4: 8D command (copy last N bytes and repeat N times)
console.log('\nTest 4: 8D command');
const test4Data = [0x31, 0x66, 0x00, 0x65, 0x30, 0x55, 0x00, 0x65, 0x30, 0x44, 0x03, 0x65, 0x47, 0x77, 0x77, 0x8D, 0x04];
const expected4 = [0x66, 0x66, 0x66, 0x66, 0x65, 0x55, 0x55, 0x55, 0x65, 0x44, 0x44, 0x44, 0x65, 0x47, 0x77, 0x77, 0x65, 0x47, 0x77, 0x77, 0x65, 0x47, 0x77, 0x77, 0x65, 0x47, 0x77, 0x77, 0x65, 0x47, 0x77, 0x77];

const decompressor4 = new NHL94Decompressor();
try {
    const result4 = decompressor4.decompress(test4Data, 0, true);
    const result4Array = Array.from(result4);
    
    console.log('Result:', result4Array.map(b => b.toString(16).padStart(2, '0')).join(' '));
    console.log('Expected:', expected4.map(b => b.toString(16).padStart(2, '0')).join(' '));
    
    const match4 = result4Array.length === expected4.length && result4Array.every((val, i) => val === expected4[i]);
    console.log('Match:', match4);
    
    if (!match4) {
        console.log('Length - Result:', result4Array.length, 'Expected:', expected4.length);
        if (result4Array.length === expected4.length) {
            for (let i = 0; i < result4Array.length; i++) {
                if (result4Array[i] !== expected4[i]) {
                    console.log(`Mismatch at index ${i}: got ${result4Array[i].toString(16)}, expected ${expected4[i].toString(16)}`);
                    break;
                }
            }
        }
    }
} catch (error) {
    console.error('Error in test 4:', error.message);
}
